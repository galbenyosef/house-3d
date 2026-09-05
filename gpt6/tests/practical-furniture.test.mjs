import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildFurniture } from '../src/furniture.js';

const names=['wall','trim','oak','walnut','fabric','cream','sage','brass','marble','stone','glass','dark','white','rug','leaf','ceramic','light','metal'];
const mats=Object.fromEntries(names.map(name=>[name,new THREE.MeshStandardMaterial({name})]));
const scene=buildFurniture(THREE,mats);
scene.group.updateMatrixWorld(true);
const items=new Map(scene.items.map(item=>[item.id,item]));
const object=id=>items.get(id).object;
const bounds=id=>new THREE.Box3().setFromObject(object(id));
function localRay(id,point,direction) {
  const target=object(id);
  const origin=new THREE.Vector3(...point).applyMatrix4(target.matrixWorld);
  const vector=new THREE.Vector3(...direction).transformDirection(target.matrixWorld);
  return new THREE.Raycaster(origin,vector).intersectObject(target,true)[0];
}
const seatHeight=id=>localRay(id,[0,2,.10],[0,-1,0])?.point.y;

test('座高以可坐的坐垫顶面实测，不能把几何中心当作座高',()=>{
  const seats=[['living-sofa',.480],['living-chair',.470],['balcony-chair-left',.470],['balcony-chair-right',.470],['study-chair',.460],['guest-chair',.460]];
  for(let i=1;i<=6;i++)seats.push([`dining-chair-${i}`,.460]);
  for(const [id,expected] of seats){
    const actual=seatHeight(id);
    assert.ok(Number.isFinite(actual),`${id} 座面必须能够被射线命中`);
    assert.ok(Math.abs(actual-expected)<.002,`${id} 座面 ${actual} m，应为 ${expected} m`);
  }
});

test('书桌中央腿位至少675mm高，并在实际座面以上保留200mm',()=>{
  for(const [desk,chair,depth] of [['study-desk','study-chair',.52],['guest-desk','guest-chair',.49]]){
    const seat=seatHeight(chair);
    for(const x of [-.17,0,.17]){
      const hit=localRay(desk,[x,.50,depth/2-.035],[0,1,0]);
      assert.ok(hit,`${desk} 中央桌裙应存在`);
      assert.ok(hit.point.y>=.675,`${desk} 在 x=${x} 的腿位仅 ${hit.point.y} m`);
      assert.ok(hit.point.y-seat>=.20,`${desk} 不能用全宽抽屉挤占膝上空间`);
    }
  }
});

test('日间床避开北侧桌腿，另外两格抽屉拉出500mm不撞桌椅或书柜',()=>{
  const handleGroups=[[],[]];
  object('study-daybed').traverse(mesh=>{
    if(!mesh.isMesh||mesh.material!==mats.brass)return;
    const attr=mesh.geometry.attributes.position;
    for(let i=0;i<attr.count;i++){
      const point=new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld);
      assert.ok(point.z>1.25,'北段不能保留会撞书桌腿的向东抽屉拉手');
      handleGroups[point.z<1.9?0:1].push(point);
    }
  });
  for(const [index,points] of handleGroups.entries()){
    assert.ok(points.length>0,`需要保留第 ${index+1} 格可使用的侧抽屉`);
    const handle=new THREE.Box3().setFromPoints(points),center=handle.getCenter(new THREE.Vector3());
    const sweep=new THREE.Box3(
      new THREE.Vector3(handle.min.x-.025,center.y-.10,center.z-.29),
      new THREE.Vector3(handle.max.x+.50,center.y+.10,center.z+.29),
    );
    for(const id of ['study-desk','study-chair','study-bookcase'])
      assert.equal(sweep.intersectsBox(bounds(id)),false,`第 ${index+1} 格抽屉拉出500mm后不能碰到 ${id}`);
  }
  assert.match(items.get('study-daybed').note,/上翻/);
});

test('六份餐盘与六张实际餐椅正对，座面至桌裙至少200mm',()=>{
  const table=object('dining-table'),center=table.position.clone();
  for(let i=1;i<=6;i++){
    const chair=object(`dining-chair-${i}`),direction=chair.position.clone().sub(center).setY(0).normalize();
    const place=center.clone().addScaledVector(direction,.42);place.y=.84;
    const hit=new THREE.Raycaster(place,new THREE.Vector3(0,-1,0)).intersectObject(table,true)[0];
    assert.ok(hit&&hit.point.y>.793,`第 ${i} 席正前方应命中餐盘，而非裸露桌面`);
  }
  const apron=localRay('dining-table',[0,.52,.55],[0,1,0]);
  assert.ok(apron&&apron.point.y-seatHeight('dining-chair-1')>=.20,'餐桌裙下沿须给实际坐姿留膝上空间');
});

test('茶几置于沙发坐姿可用的位置，西侧保留通行',()=>{
  const coffee=bounds('living-coffee'),sofa=object('living-sofa');
  const hit=new THREE.Raycaster(new THREE.Vector3(coffee.max.x,.46,sofa.position.z),new THREE.Vector3(1,0,0)).intersectObject(sofa,true)[0];
  assert.ok(hit,'茶几东侧射线应命中沙发座垫');
  const gap=hit.point.x-coffee.max.x;
  assert.ok(gap>=.30&&gap<=.45,`茶几至座垫前沿应约350mm，实测 ${gap} m`);
  assert.ok(coffee.min.x-bounds('living-fireplace').max.x>1.40,'主要通行保持在茶几西侧');
});

test('实木衣柜落地，新增壁灯与油画均避开各自外包',()=>{
  for(const id of ['master-wardrobe','second-wardrobe','guest-wardrobe'])
    assert.ok(bounds(id).min.y<=.001,`${id} 踢脚不能悬空40mm`);
  assert.equal(bounds('sconce-living-north').intersectsBox(bounds('living-oil-painting')),false,'壁灯与油画框不应交叠');
});

test('次卧1双轨门片全行程不越出柜体或侵入床前步道，打开后确有850mm柜内开口',()=>{
  const wardrobe=object('second-wardrobe');
  const leaves=wardrobe.children.filter(child=>child.userData.slideRange);
  assert.equal(leaves.length,2,'需要两片独立的真实推拉门，不能只改名称');
  const before=bounds('second-wardrobe'),bed=bounds('second-bed');
  const envelope=new THREE.Box3(new THREE.Vector3(5.89,0,2.759),new THREE.Vector3(7.83,2.424,3.48));
  assert.ok(Math.abs(before.min.z-2.759)<1e-5&&Math.abs(before.max.z-3.48)<1e-5,'保持原柜体前后外包');
  assert.ok(Math.abs(leaves[0].position.z-leaves[1].position.z)>=.035,'前后门片必须分轨');
  try {
    for(const leaf of leaves){
      const [start,end]=leaf.userData.slideRange;
      assert.ok(end-start>=.85,'每片门应能实际平移到另一侧');
      for(let i=0;i<=24;i++){
        leaf.position.x=start+(end-start)*i/24;wardrobe.updateMatrixWorld(true);
        const moving=new THREE.Box3().setFromObject(leaf);
        assert.ok(envelope.clone().expandByScalar(1e-6).containsBox(moving),'真实门片扫掠不得越出原柜体外包');
        assert.equal(moving.intersectsBox(bed),false,'推拉门全行程不能与床相交');
        assert.ok(bounds('second-wardrobe').min.z-bed.max.z>=.60,'轨道和移动门片不得侵入床前600mm步道');
      }
      leaf.position.x=leaf.userData.closedX;
    }
    for(const side of [0,1]){
      for(const leaf of leaves)leaf.position.x=leaf.userData.slideRange[side];
      wardrobe.updateMatrixWorld(true);
      assert.equal(new THREE.Box3().setFromObject(leaves[0]).intersectsBox(new THREE.Box3().setFromObject(leaves[1])),false,'门片重叠停靠时两条轨道上的实体不得相交');
      const clear=[];
      for(let i=0;i<=360;i++){
        const x=-.90+i*.005,hit=localRay('second-wardrobe',[x,1.10,.50],[0,0,-1]);
        if(hit&&wardrobe.worldToLocal(hit.point.clone()).z<-.25)clear.push(x);
      }
      assert.ok(clear.length>0&&clear.at(-1)-clear[0]>=.85,'打开任一侧后必须能穿过至少850mm开口命中柜后板，不能仍被实心柜体封堵');
    }
  } finally {
    for(const leaf of leaves)leaf.position.x=leaf.userData.closedX;
    wardrobe.updateMatrixWorld(true);
  }
});
