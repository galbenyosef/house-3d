import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { HOUSE, ROOMS, WALLS, FOOTPRINT } from '../src/layout.js';
import { buildArchitecture } from '../src/architecture.js';
import { buildFurniture } from '../src/furniture.js';
import { pointInPolygon, canWalkTo } from '../src/navigation.js';
import { collectWalkBlockers } from '../src/collision.js';
const materialNames=['wall','trim','oak','walnut','fabric','cream','sage','brass','marble','stone','glass','dark','white','rug','leaf','ceramic','light','metal','parquet','tile'];
const mats=Object.fromEntries(materialNames.map(name=>[name,new THREE.MeshStandardMaterial()]));

test('原图九个空间的面积标签完整且不重复',()=>{
  assert.equal(ROOMS.length,9);assert.equal(new Set(ROOMS.map(r=>r.id)).size,9);
  assert.ok(Math.abs(ROOMS.reduce((sum,r)=>sum+r.area,0)-110.71)<.001);
  for(const r of ROOMS)assert.ok(pointInPolygon(...r.center,r.polygon),`${r.id}中心必须在房间内部`);
});
test('墙开口有可用净宽，并处于所属墙段内',()=>{
  for(const wall of WALLS){const length=Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]);let end=0;
    for(const o of [...(wall.openings||[])].sort((a,b)=>a.offset-b.offset)){
      assert.ok(o.offset>=end,`${wall.id}开口互不重叠`);assert.ok(o.offset+o.width<=length+.001,`${wall.id}开口不超出墙段`);assert.ok(o.height+o.sill<=HOUSE.height+.001);end=o.offset+o.width;
    }
  }
});
test('室内移动阻挡实体墙，保留门洞通行',()=>{
  assert.equal(canWalkTo(-.1,10),false);assert.equal(canWalkTo(4.28,12),false);
  assert.equal(canWalkTo(4.28,9.56),true); // 主卧门中心
  assert.equal(canWalkTo(2.26,5.77),true); // 厨房门中心
  assert.equal(canWalkTo(4.68,1.5),false); // 北侧卧室分隔墙
  assert.equal(canWalkTo(2,16.3),false); // 阳台栏杆
  assert.equal(canWalkTo(2,10.1),true);
});
test('建筑剖切移除上部构件，恢复室内天花',()=>{
  const arch=buildArchitecture(THREE,mats);arch.setCeiling(true);assert.equal(arch.ceilings.visible,true);
  arch.setCutaway(true);assert.equal(arch.ceilings.visible,false);assert.equal(arch.walls.children[0].visible,false);
  arch.setCutaway(false);assert.equal(arch.ceilings.visible,true);assert.equal(arch.walls.children[0].visible,true);
  arch.group.traverse(o=>{if(o.isMesh){for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}});
});
test('家具具备独立可选对象、真实尺度和复刻信息',()=>{
  const {items}=buildFurniture(THREE,mats);assert.ok(items.length>50);assert.equal(items.length,new Set(items.map(it=>it.id)).size);
  for(const it of items){assert.ok(ROOMS.some(r=>r.id===it.room),it.id);assert.ok(it.name&&it.dimensions&&it.material&&it.note,it.id);assert.equal(it.object.userData.itemId,it.id);
    const box=new THREE.Box3().setFromObject(it.object);assert.ok(!box.isEmpty(),it.id);
    assert.ok(box.min.y>=-.02,`${it.id}不低于地坪`);assert.ok(box.max.y<=HOUSE.height,`${it.id}不高于天花`);
    const size=box.getSize(new THREE.Vector3());assert.ok(size.length()<6,`${it.id}尺度合理`);
  }
});
test('各室漫游起点位于可行走区域且不落入家具',()=>{
  const {items}=buildFurniture(THREE,mats);
  const blockers=collectWalkBlockers(items, buildArchitecture(THREE,mats));
  for(const room of ROOMS){const [x,,z]=room.view.position;assert.equal(canWalkTo(x,z,.18,blockers),true,room.id);}
  const sofa=items.find(it=>it.id==='living-sofa');
  assert.equal(canWalkTo(sofa.object.position.x,sofa.object.position.z,.18,blockers),false);
});
