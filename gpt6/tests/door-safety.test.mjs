import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { buildArchitecture } from '../src/architecture.js';
import { buildFurniture } from '../src/furniture.js';
import { WALLS } from '../src/layout.js';

const names=['wall','trim','oak','walnut','fabric','cream','sage','brass','marble','stone','glass','dark','white','rug','leaf','ceramic','light','metal','parquet','tile'];
const mats=Object.fromEntries(names.map(name=>[name,new THREE.MeshStandardMaterial({name})]));
const architecture=buildArchitecture(THREE,mats), furniture=buildFurniture(THREE,mats);
architecture.group.updateMatrixWorld(true); furniture.group.updateMatrixWorld(true);
const leaves=[]; architecture.group.traverse(object=>{if(object.userData.doorLeaf)leaves.push(object);});
const items=new Map(furniture.items.map(item=>[item.id,item]));
const EPS=1e-6;
function leaf(name){const result=leaves.find(value=>value.name===name);assert.ok(result,`${name}应保留独立门叶`);return result;}
function pose(object,t){
  const motion=object.userData.doorMotion;
  if(motion.operation==='hinged')object.rotation.y=THREE.MathUtils.lerp(motion.closedRotation,motion.openRotation,t);
  else object.position.fromArray(motion.closedPosition).lerp(new THREE.Vector3(...motion.openPosition),t);
  object.updateMatrixWorld(true);
}
function slab(object){
  const m=object.userData.doorMotion;
  const center=new THREE.Vector3(m.width/2,m.height/2,0);
  const obb=new OBB(new THREE.Vector3(),new THREE.Vector3(m.width/2,(m.height-.08)/2,m.thickness/2)).applyMatrix4(object.matrixWorld);
  // OBB.applyMatrix4不旋转已有center，故显式由局部几何中心得到世界位置。
  obb.center.copy(center.applyMatrix4(object.matrixWorld)); return obb;
}
function touchesFurniture(object,id){
  assert.ok(items.has(id),`应有待核对家具${id}`);
  const item=items.get(id), motion=object.userData.doorMotion;
  // 分材质网格分别取局部外包，连同框线和把手检验，不只检查薄门板。
  const localBoxes=object.children.filter(child=>child.isMesh).map(child=>{child.geometry.computeBoundingBox();return child.geometry.boundingBox.clone().applyMatrix4(child.matrix);});
  if(!new THREE.Box3().setFromObject(object).intersectsBox(new THREE.Box3().setFromObject(item.object)))return false;
  const inverse=object.matrixWorld.clone().invert(), triangle=new THREE.Triangle();let hit=false;
  item.object.traverse(mesh=>{
    if(!mesh.isMesh||hit)return;
    const p=mesh.geometry.attributes.position,index=mesh.geometry.index,matrix=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
    for(let i=0;i<(index?.count||p.count);i+=3){
      triangle.a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(matrix);
      triangle.b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(matrix);
      triangle.c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(matrix);
      if(localBoxes.some(box=>box.intersectsTriangle(triangle))){hit=true;break;}
    }
  });
  return hit;
}

test('书房保持外开，次卧1内开贴西墙释放公卫接近区，门叶可单独纳入导航',()=>{
  const study=leaf('study-south · 开启木门'), bedroom=leaf('bedroom1-south · 开启木门');
  pose(study,1);pose(bedroom,1);
  assert.ok(new THREE.Vector3(1,0,0).applyQuaternion(study.quaternion).z>.9,'书房向南外开');
  assert.ok(new THREE.Vector3(1,0,0).applyQuaternion(bedroom.quaternion).z<-.9,'次卧1向北内开');
  assert.equal(leaves.length,10);
  for(const door of leaves)assert.ok(door.children.some(object=>object.isMesh),`${door.name}不可合并进全墙`);
});

test('公卫双联门完整行程避开台盆、坐便器及淋浴，南端停放不穿墙',()=>{
  const doors=[leaf('bathroom-west · 移门扇 1'),leaf('bathroom-west · 移门扇 2')];
  try {
    for(let i=0;i<=100;i++){
      for(const door of doors){pose(door,i/100);for(const id of ['bathroom-vanity','bathroom-toilet','bathroom-shower'])assert.equal(touchesFurniture(door,id),false,`${door.name}在${i}%行程碰到${id}`);}
      assert.equal(new THREE.Box3().setFromObject(doors[0]).intersectsBox(new THREE.Box3().setFromObject(doors[1])),false,'双轨扇含把手不得相碰');
    }
    const end=Math.max(...doors.map(door=>new THREE.Box3().setFromObject(door).max.z));
    const southFace=WALLS.find(wall=>wall.id==='bedroom2-north').a[1]-.09;
    assert.ok(southFace-end>=.006-EPS,'南端模型停放余量至少6mm；此处必须精确定制复尺');
  } finally {for(const door of doors)pose(door,1);}
});

test('次卧1内开门的0至90度完整扫掠避开床、床头柜和衣柜',()=>{
  const door=leaf('bedroom1-south · 开启木门');
  try {for(let i=0;i<=180;i++){pose(door,i/180);for(const id of ['second-bed','second-nightstand','second-wardrobe'])assert.equal(touchesFurniture(door,id),false,`次卧1门在${i*.5}度扫到${id}`);}}
  finally {pose(door,1);}
});

test('卧室和主卫移门完整行程避开相邻家具，双联门板分轨不相撞',()=>{
  const checks=[
    ['bedroom2-west · 移门扇 1',['dining-chair-3','guest-wardrobe']],
    ['master-west · 移门扇 1',['living-sofa','sconce-living-north','dining-chair-2']],
    ['ensuite-west · 移门扇 1',['ensuite-vanity','ensuite-toilet']],
    ['ensuite-west · 移门扇 2',['ensuite-vanity','ensuite-toilet']]
  ];
  for(const [name,ids] of checks){const door=leaf(name);try{for(let i=0;i<=50;i++){pose(door,i/50);for(const id of ids)assert.equal(touchesFurniture(door,id),false,`${name}在${i*2}%行程碰到${id}`);}}finally{pose(door,1);}}
  const a=leaf('ensuite-west · 移门扇 1'),b=leaf('ensuite-west · 移门扇 2');
  for(let i=0;i<=50;i++){pose(a,i/50);pose(b,i/50);assert.equal(new THREE.Box3().setFromObject(a).intersectsBox(new THREE.Box3().setFromObject(b)),false,'双联门含框线和五金必须分开');}
  pose(a,1);pose(b,1);
});

test('卫生间窗真实采用隐私磨砂材质，主卧无依据长窗默认为实墙',()=>{
  const frosted=[];architecture.windows.traverse(object=>{if(object.isMesh&&object.material.name==='卫生间磨砂隐私玻璃')frosted.push(object);});
  assert.ok(frosted.length>0,'磨砂标记必须落实到真实材质');
  for(const mesh of frosted){assert.ok(mesh.material.roughness>=.9);assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.opacity,1);}
  const masterEast=WALLS.find(wall=>wall.id==='east-south');
  assert.ok(masterEast.openings.every(opening=>masterEast.a[1]+opening.offset+opening.width<=10.68),'主卧东侧不默认新增窗洞');
});

test('新阳台栏杆从基座顶量起净高超过1.20m、竖杆净隙小于110mm且无中间横踏杆',()=>{
  const rail=architecture.group.getObjectByName('法式铁艺阳台栏杆');
  const base=new THREE.Box3().setFromObject(rail.getObjectByName('栏杆石材基座'));
  const top=new THREE.Box3().setFromObject(rail.getObjectByName('栏杆顶部扶手'));
  assert.ok(top.max.y-base.max.y>=1.20-EPS);
  const bars=rail.getObjectByName('栏杆连续竖杆'),xs=[],ys=new Set();
  bars.traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){xs.push(p.getX(i));ys.add(p.getY(i).toFixed(5));}});
  xs.sort((a,b)=>a-b);let maxGap=0;for(let i=1;i<xs.length;i++)maxGap=Math.max(maxGap,xs[i]-xs[i-1]);
  assert.ok(maxGap<=.11,`竖杆实际几何最大净隙为${Math.round(maxGap*1000)}mm`);
  assert.equal(ys.size,2,'竖杆只能在基座顶与扶手底结束，不能加入中部横杆或圆环');
  assert.equal(rail.children.length,3,'栏杆只含基座、顶扶手和连续竖杆');
});

test('所有实木门从关闭到展示位置的扫掠不穿实体墙',()=>{
  const solids=[];
  function add(wall,start,end,bottom=0,top=2.8){
    if(end-start<EPS||top-bottom<EPS)return;
    const horizontal=wall.a[1]===wall.b[1];
    const min=new THREE.Vector3(horizontal?wall.a[0]+start:wall.a[0]-.09,bottom,horizontal?wall.a[1]-.09:wall.a[1]+start);
    const max=new THREE.Vector3(horizontal?wall.a[0]+end:wall.a[0]+.09,top,horizontal?wall.a[1]+.09:wall.a[1]+end);
    solids.push({id:wall.id,box:new OBB().fromBox3(new THREE.Box3(min,max))});
  }
  for(const wall of WALLS){
    let previous=0;const length=Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]);
    for(const opening of wall.openings||[]){
      add(wall,previous,opening.offset);
      if(opening.sill)add(wall,opening.offset,opening.offset+opening.width,0,opening.sill);
      add(wall,opening.offset,opening.offset+opening.width,opening.sill+opening.height,2.8);
      previous=opening.offset+opening.width;
    }
    add(wall,previous,length);
  }
  for(const door of leaves){
    try {for(let i=0;i<=100;i++){pose(door,i/100);const body=slab(door);for(const solid of solids)assert.equal(body.intersectsOBB(solid.box),false,`${door.name}在${i}%行程穿入${solid.id}`);}}
    finally {pose(door,1);}
  }
});

test('阳台两组玻璃门真实叠放，保留600mm以上开口和低轨',()=>{
  const groups=[];architecture.windows.traverse(object=>{if(object.userData.glazedDoor)groups.push(object);});
  assert.equal(groups.length,2);
  const south=WALLS.find(wall=>wall.id==='south');
  for(const group of groups){
    const opening=south.openings.find(value=>value.offset===group.userData.openingOffset);
    const panels=group.children.filter(object=>object.userData.walkObstacle);
    assert.equal(panels.length,2,'两个玻璃扇必须独立成为导航障碍');
    const boxes=panels.map(panel=>new THREE.Box3().setFromObject(panel));
    const leftGlass=Math.min(...boxes.map(box=>box.min.x));
    const leftJamb=south.a[0]+opening.offset+.06;
    assert.ok(leftGlass-leftJamb>=.60,`${group.name}实际净口不足600mm`);
    assert.equal(boxes[0].intersectsBox(boxes[1]),false,'叠放扇需要分轨，不能把两片放在同一位置');
    const track=new THREE.Box3().setFromObject(group.getObjectByName('阳台低轨'));
    assert.ok(track.max.y-.012<=.02+EPS,'阳台门轨相对完成面凸起不超过20mm');
  }
});
