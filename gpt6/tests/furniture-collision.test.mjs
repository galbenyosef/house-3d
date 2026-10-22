import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCanvas } from '@napi-rs/canvas';
import { captureCollisionBoxes, createFurnitureCollision } from '../src/furniture-collision.js';
import { applyTransform, editTransform, furnitureBounds, readTransform } from '../src/furniture-transform.js';
import { buildFurniture } from '../src/furniture.js';
import { buildArchitecture } from '../src/architecture.js';
import { STYLE_IDS } from '../src/design-styles.js';

globalThis.document = { createElement: () => createCanvas(1, 1) };

const material = new THREE.MeshBasicMaterial();
const roomy = [[-30,-30],[30,-30],[30,30],[-30,30]];
function part(parent, size, center) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...center); parent.add(mesh); return mesh;
}
function item(id, size=[1,1,1], position=[0,0,0], rotation=0) {
  const object = new THREE.Group();
  part(object,size,[0,size[1]/2,0]);
  object.position.set(...position); object.rotation.y=rotation;
  return {id,name:id,object,defaultTransform:readTransform(object)};
}
const moved=(source,position)=>({...source,position:[...position]});
const engine=(items,options={})=>createFurnitureCollision({items,walls:[],footprint:roomy,height:10,...options});
const wall={id:'partition',a:[0,-5],b:[0,5]};
const pose=i=>readTransform(i.object);
const layout=items=>Object.fromEntries(items.map(i=>[i.id,pose(i)]));
const unchanged=(actual,expected)=>assert.deepEqual(actual,expected);

test('快速拖动在实体墙前停止，终点在墙另一侧也不能穿过去',()=>{
  const a=item('sofa',[1,1,1],[-4,0,0]), collision=engine([a],{walls:[wall]});
  const result=collision.constrainDrag(a.id,pose(a),moved(pose(a),[4,0,0]));
  assert.equal(result.collision.kind,'wall');
  assert.ok(result.transform.position[0]<-.588);
  assert.ok(result.transform.position[0]>-.592);
});

test('连续拖动不会跨过仅 2 mm 厚的家具，停止后还能反向离开',()=>{
  const a=item('moving',[.2,.5,.2],[-4,0,0]), b=item('thin',[.002,1,1]);
  const collision=engine([a,b]), result=collision.constrainDrag(a.id,pose(a),moved(pose(a),[4,0,0]));
  assert.equal(result.collision.id,b.id);
  assert.ok(result.transform.position[0]<-.099);
  const retreat=collision.constrainDrag(a.id,result.transform,moved(result.transform,[-1,0,0]));
  assert.equal(retreat.collision,null); assert.equal(retreat.transform.position[0],-1);
});

test('门洞允许尺寸合适的家具通过，过宽家具与高于门楣的家具会被挡住',()=>{
  const doorway={...wall,openings:[{type:'door',offset:4.5,width:1,height:2.2}]};
  for(const [size,allowed] of [[[.6,1.8,.8],true],[[.6,1.8,1.2],false],[[.6,2.4,.8],false]]){
    const a=item('cabinet',size,[-2,0,0]), collision=engine([a],{walls:[doorway]});
    const result=collision.constrainDrag(a.id,pose(a),moved(pose(a),[2,0,0]));
    assert.equal(result.collision===null,allowed,JSON.stringify(size));
    if(allowed)assert.equal(result.transform.position[0],2);
    else assert.ok(result.transform.position[0]<0);
  }
});

test('窗户洞口保持封闭，家具不能穿过玻璃',()=>{
  const a=item('cabinet',[.5,.5,.5],[-2,1.2,0]);
  const collision=engine([a],{walls:[{...wall,openings:[{type:'window',offset:4,width:2,sill:1,height:2}]}]});
  assert.equal(collision.constrainDrag(a.id,pose(a),moved(pose(a),[2,1.2,0])).collision.kind,'wall');
});

test('调整尺寸碰到其他家具或墙时拒绝，原始对象保持不变',()=>{
  const a=item('cabinet',[1,1,1],[-2,0,0]), b=item('other',[1,1,1]);
  const before=pose(a), next=editTransform(furnitureBounds(a.object),before,{dimensions:[4,1,1]});
  assert.equal(engine([a,b]).validateChange(a.id,before,next).id,b.id);
  assert.equal(engine([a],{walls:[wall]}).validateChange(a.id,before,next).kind,'wall');
  unchanged(pose(a),before);
});

test('旋转拒绝最终交叠，也拒绝两端清楚但旋转途中扫过家具',()=>{
  const a=item('long-table',[3,.8,.2]), b=item('chair',[.25,1,.25],[0,0,1]);
  const collision=engine([a,b]), before=pose(a);
  for(const rotation of [Math.PI/2,Math.PI]){
    const next=editTransform(furnitureBounds(a.object),before,{rotation});
    assert.equal(collision.validateChange(a.id,before,next).id,b.id);
  }
  unchanged(pose(a),before);
});

test('旋转家具的外接矩形空角仍然可用，不按世界 AABB 误判',()=>{
  const a=item('diagonal',[2,1,.2],[0,0,0],Math.PI/4);
  const b=item('small',[.1,.5,.1],[.65,0,.65]), collision=engine([a,b]);
  assert.ok(new THREE.Box3().setFromObject(a.object).intersectsBox(new THREE.Box3().setFromObject(b.object)));
  const next=moved(pose(b),[.6,0,.6]);
  assert.equal(collision.validateChange(b.id,pose(b),next),null);
  assert.equal(collision.constrainDrag(b.id,pose(b),next).collision,null);
});

test('斜向打开的门扇保留方向，外接矩形的空角不能挡住家具',()=>{
  const group=new THREE.Group(), door=new THREE.Group(); group.add(door);
  door.userData.doorLeaf=true; door.name='斜向门扇'; door.rotation.y=Math.PI/4;
  part(door,[2,2,.04],[0,1,0]);
  const a=item('small',[.1,.5,.1],[.9,0,.65]);
  const collision=engine([a],{architecture:{group}}), next=moved(pose(a),[.65,0,.65]);
  assert.equal(collision.validateChange(a.id,pose(a),next),null);
  assert.equal(collision.constrainDrag(a.id,pose(a),next).collision,null);
});

test('保留桌下空腔，低矮物件可以放入桌下，高物件会撞到桌面',()=>{
  const table=item('table',[2,.1,1],[0,0,0]);
  table.object.clear(); part(table.object,[2,.1,1],[0,.9,0]);
  for(const x of [-.9,.9])for(const z of [-.4,.4])part(table.object,[.1,.85,.1],[x,.425,z]);
  const chair=item('stool',[.6,.7,.4],[0,0,2]), tall=item('tall',[.6,1.2,.4],[0,0,2]);
  const shortResult=engine([table,chair]).constrainDrag(chair.id,pose(chair),moved(pose(chair),[0,0,0]));
  assert.equal(shortResult.collision,null);
  assert.equal(engine([table,tall]).constrainDrag(tall.id,pose(tall),moved(pose(tall),[0,0,0])).collision.id,table.id);
});

test('地毯允许家具压在上面，挂画与下方家具按高度分开',()=>{
  const rug=item('living-rug',[4,.04,4]), a=item('chair',[.5,1,.5],[-3,0,0]);
  assert.equal(engine([rug,a]).constrainDrag(a.id,pose(a),moved(pose(a),[0,0,0])).collision,null);
  const painting=item('painting',[1,.5,.1],[0,1.5,0]);
  assert.equal(engine([painting,a]).constrainDrag(a.id,pose(a),moved(pose(a),[0,0,0])).collision,null);
  const tall=editTransform(furnitureBounds(a.object),moved(pose(a),[0,0,0]),{dimensions:[.5,2,.5]});
  assert.equal(engine([painting,a]).validateChange(a.id,pose(a),tall).id,painting.id);
});

test('地毯与地毯不能新增重叠，放大成厚垫后也不能继续穿过家具',()=>{
  const rug=item('living-rug',[1,.04,1],[-2,0,0]), another=item('study-rug',[1,.04,1]);
  assert.equal(engine([rug,another]).constrainDrag(rug.id,pose(rug),moved(pose(rug),[0,0,0])).collision?.id,another.id);
  const chair=item('chair',[.5,1,.5],[-2,0,0]);
  const next=editTransform(furnitureBounds(rug.object),pose(rug),{dimensions:[1,.3,1]});
  assert.equal(engine([rug,chair]).validateChange(rug.id,pose(rug),next)?.id,chair.id);
});

test('高度调整不能穿天花或地板，接触天花本身可以保留',()=>{
  const a=item('cabinet',[1,2,1]), collision=engine([a],{height:2.8}), before=pose(a);
  assert.equal(collision.validateChange(a.id,before,editTransform(furnitureBounds(a.object),before,{dimensions:[1,3,1]})).id,'above');
  assert.equal(collision.validateChange(a.id,before,moved(before,[0,-.2,0])).id,'below');
  assert.equal(collision.validateChange(a.id,before,editTransform(furnitureBounds(a.object),before,{dimensions:[1,2.8,1]})),null);
});

test('家具完整轮廓受户型边界约束，中心还在室内也不能把边角拖出去',()=>{
  const a=item('chair',[.5,1,.5]), collision=engine([a],{footprint:[[-2,-2],[2,-2],[2,2],[-2,2]]});
  const result=collision.constrainDrag(a.id,pose(a),moved(pose(a),[1.9,0,0]));
  assert.equal(result.collision.kind,'boundary');
  assert.ok(result.transform.position[0]<=1.751);
});

test('凹户型中即使四角在室内，家具跨越凹口仍然无效',()=>{
  const a=item('long-board',[2.8,.5,.1],[2,0,.5]);
  const collision=engine([a],{footprint:[[0,0],[4,0],[4,1],[1,1],[1,4],[0,4]]});
  const next={...pose(a),position:[1.5,0,1.5],rotation:Math.PI/4};
  assert.equal(collision.validateLayout({[a.id]:next}).kind,'boundary');
});

test('旧方案已有交叠可以移出，不能越陷越深或直接穿到另一侧',()=>{
  const a=item('moving'), b=item('existing',[1,1,1],[.8,0,0]), collision=engine([a,b]);
  const before=pose(a), away=collision.constrainDrag(a.id,before,moved(before,[-.1,0,0]));
  assert.equal(away.collision,null); assert.equal(away.transform.position[0],-.1);
  const deeper=collision.constrainDrag(a.id,before,moved(before,[.1,0,0]));
  assert.equal(deeper.collision.id,b.id); assert.ok(Math.abs(deeper.transform.position[0])<1e-6);
  const crossing=collision.constrainDrag(a.id,before,moved(before,[2,0,0]));
  assert.equal(crossing.collision.id,b.id); assert.ok(Math.abs(crossing.transform.position[0])<1e-6);
});

test('旧交叠完全移出后再次接近会停在接触处，不恢复原来的豁免',()=>{
  const a=item('moving'), b=item('existing',[1,1,1],[.8,0,0]), collision=engine([a,b]);
  const clear=collision.constrainDrag(a.id,pose(a),moved(pose(a),[-1,0,0]));
  assert.equal(clear.collision,null);
  const back=collision.constrainDrag(a.id,clear.transform,moved(clear.transform,[0,0,0]));
  assert.equal(back.collision.id,b.id); assert.ok(back.transform.position[0]<-.198);
});

test('反复微小拖动不能累计穿入旧交叠',()=>{
  const a=item('moving'), b=item('existing',[1,1,1],[.8,0,0]), collision=engine([a,b]);
  let current=pose(a);
  for(let i=0;i<100;i++)current=collision.constrainDrag(a.id,current,moved(current,[current.position[0]+.0001,0,0])).transform;
  assert.ok(Math.abs(current.position[0])<1e-6);
});

test('sync 后其他家具的位置改变会进入碰撞检测',()=>{
  const a=item('moving',[1,1,1],[-2,0,0]), b=item('other',[1,1,1],[0,0,4]), collision=engine([a,b]);
  const target=moved(pose(a),[2,0,0]);
  assert.equal(collision.constrainDrag(a.id,pose(a),target).collision,null);
  b.object.position.z=0; collision.sync();
  assert.equal(collision.constrainDrag(a.id,pose(a),target).collision.id,b.id);
});

test('导入方案对所有家具的目标位置一起校验，合法整体搬动通过，新交叠拒绝',()=>{
  const a=item('first',[1,1,1],[-2,0,0]), b=item('second',[1,1,1],[2,0,0]), collision=engine([a,b]);
  assert.equal(collision.validateLayout({first:moved(pose(a),[-2,0,2]),second:moved(pose(b),[2,0,2])}),null);
  assert.equal(collision.validateLayout({first:moved(pose(a),[0,0,0]),second:moved(pose(b),[0,0,0])}).kind,'furniture');
});

test('旧存档位置不替换原始默认参考，导入仍然拒绝存档新增的冲突',()=>{
  const a=item('saved',[1,1,1],[-2,0,0]), b=item('fixed');
  a.object.position.x=0;
  const collision=engine([a,b]);
  assert.equal(collision.validateLayout(layout([a,b])).kind,'furniture');
  assert.equal(collision.validateLayout({saved:a.defaultTransform,fixed:b.defaultTransform}),null);
  assert.equal(collision.constrainDrag(a.id,pose(a),moved(pose(a),[-2,0,0])).collision,null);
});

test('尺寸调整可减轻旧交叠，但不能借旋转尺寸中间包络的容差重新扩大交叠',()=>{
  const a=item('moving'), b=item('existing',[1,1,1],[.8,0,0]), collision=engine([a,b]);
  const bounds=furnitureBounds(a.object), before=pose(a);
  const smaller=editTransform(bounds,before,{dimensions:[.9,1,1]});
  assert.equal(collision.validateChange(a.id,before,smaller),null);
  const larger=editTransform(bounds,smaller,{dimensions:[1,1,1]});
  assert.equal(collision.validateChange(a.id,smaller,larger).id,b.id);
});

test('已合并的嵌套部件沿父级变换捕获，保留门片之间的空隙',()=>{
  const root=new THREE.Group(), child=new THREE.Group(); root.add(child);
  part(child,[.1,1,.1],[-.5,.5,0]); part(child,[.1,1,.1],[.5,.5,0]);
  child.userData.editorCollisionBoxes=captureCollisionBoxes(child);
  child.clear(); part(child,[1.1,1,.1],[0,.5,0]);
  child.position.set(1,0,0); child.rotation.y=Math.PI/2;
  root.position.set(20,0,20); root.scale.set(2,1,2);
  const boxes=captureCollisionBoxes(root);
  assert.equal(boxes.length,2);
  assert.ok(boxes.every(b=>Math.abs((b.min[0]+b.max[0])/2-1)<1e-6));
  assert.ok(boxes.every(b=>b.max[2]-b.min[2]<.101));
  assert.ok(Math.abs((boxes[0].min[2]+boxes[0].max[2])/2-.5)<1e-6);
});

const names=['wall','trim','oak','walnut','fabric','cream','sage','brass','marble','stone','glass','dark','white','rug','leaf','ceramic','light','metal','parquet','tile'];
for(const style of STYLE_IDS){
  test(`${style} 真实默认布局可保留，沙发不能拖穿东墙、放大到茶几上或增高穿顶`,()=>{
    const mats=Object.fromEntries(names.map(name=>[name,new THREE.MeshStandardMaterial({name})]));
    const furniture=buildFurniture(THREE,mats,style), architecture=buildArchitecture(THREE,mats,style);
    const collision=createFurnitureCollision({items:furniture.items,architecture});
    assert.equal(collision.validateLayout(layout(furniture.items)),null);
    const sofa=furniture.items.find(i=>i.id==='living-sofa'), before=pose(sofa);
    const wallHit=collision.constrainDrag(sofa.id,before,moved(before,[6.3,0,12.03]));
    assert.ok(wallHit.collision); assert.ok(wallHit.transform.position[0]<4.28);
    const bounds=furnitureBounds(sofa.object), dims=bounds.getSize(new THREE.Vector3()).multiply(sofa.object.scale).toArray();
    const bigger=editTransform(bounds,before,{dimensions:[dims[0],dims[1],3]});
    assert.ok(collision.validateChange(sofa.id,before,bigger));
    const taller=editTransform(bounds,before,{dimensions:[dims[0],3,dims[2]]});
    assert.ok(collision.validateChange(sofa.id,before,taller));
    const wardrobe=furniture.items.find(i=>i.id==='second-wardrobe');
    const leafGroups=[]; wardrobe.object.traverse(o=>{if(o.userData.slideRange)leafGroups.push(o);});
    assert.equal(leafGroups.length,2);
    assert.ok(wardrobe.object.userData.editorCollisionBoxes.length>leafGroups.length+10);
    assert.ok(leafGroups.every(o=>o.userData.editorCollisionBoxes.length>4));
    const fireplace=furniture.items.find(i=>i.id==='living-fireplace'), start=pose(fireplace);
    const exit=collision.constrainDrag(fireplace.id,start,moved(start,[start.position[0]+.1,start.position[1],start.position[2]]));
    assert.equal(exit.collision,null,'贴墙构件可沿墙法线退出原有接触');
    const balcony=furniture.items.find(i=>i.id==='balcony-table'), balconyStart=pose(balcony);
    assert.ok(collision.constrainDrag(balcony.id,balconyStart,moved(balconyStart,[2.68,0,16.22])).collision);
  });
}
