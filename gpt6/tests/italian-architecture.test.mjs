import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildArchitecture } from '../src/architecture.js';
import { createMaterials } from '../src/materials.js';

// Canvas 的绘图上下文仅在 Node 中替代；实际纹理生成和材质/配色逻辑均运行生产代码。
function materials(style) {
  const previous=globalThis.document;
  const context=new Proxy({
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    getImageData:(_x,_y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
  },{get:(target,key)=>target[key]??(()=>{})});
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
  try {return createMaterials(style);}
  finally {if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}
const frenchMaterials=materials(),italianMaterials=materials('italian');
const french=buildArchitecture(THREE,frenchMaterials.mats);
const italian=buildArchitecture(THREE,italianMaterials.mats,'italian');
function meshes(root) {const result=[];root.traverse(o=>{if(o.isMesh)result.push(o);});return result;}
function triangleCount(root) {return meshes(root).reduce((sum,o)=>sum+(o.geometry.index?.count??o.geometry.attributes.position.count)/3,0);}
function marked(root,key) {const result=[];root.traverse(o=>{if(o.userData[key])result.push(o);});return result;}
function localBounds(root) {
  const result=new THREE.Box3();
  for(const mesh of meshes(root)){mesh.geometry.computeBoundingBox();result.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix));}
  return result;
}

test('法式默认建筑保持既有几何，意式去除古典线框并采用实体大板墙',()=>{
  assert.equal(meshes(french.group).length,94);
  assert.equal(triangleCount(french.group),32856);
  assert.ok(triangleCount(italian.group)<triangleCount(french.group)*.5,'简约风格必须减少实际雕饰几何');
  const wall=italian.group.getObjectByName('意式客厅 · 大理石整板墙');
  assert.ok(wall);assert.equal(triangleCount(wall),24,'两块实体整板，各有完整厚度');
  assert.ok(meshes(wall).every(mesh=>mesh.material===italianMaterials.mats.travertine));
  const backing=italian.group.getObjectByName('意式客厅 · 深烟熏木底墙');
  assert.ok(backing);assert.ok(meshes(backing).every(mesh=>mesh.material===italianMaterials.mats.walnut));
  for(const mesh of meshes(italian.group))for(const value of mesh.geometry.attributes.position.array)assert.ok(Number.isFinite(value));
});

test('意式公共区使用1200mm石材大板、四处私密空间使用200mm宽直拼木地板',()=>{
  const floors=italian.group.children.filter(o=>o.userData.roomId);
  assert.equal(floors.length,9);
  for(const floor of floors) {
    const id=floor.userData.roomId;
    assert.equal(floor.material,['bathroom','ensuite'].includes(id)?italianMaterials.mats.tile:['living','kitchen','balcony'].includes(id)?italianMaterials.mats.stone:italianMaterials.mats.smokedWood);
    const old=french.group.children.find(o=>o.userData.roomId===id);
    assert.deepEqual(floor.geometry.attributes.position.array,old.geometry.attributes.position.array,'风格不能改变地坪轮廓');
  }
  assert.equal(italianMaterials.mats.stone.map.userData.pattern,'large-slab');
  assert.equal(italianMaterials.mats.stone.map.userData.veining,'branching');
  assert.equal(italianMaterials.mats.marble.map.userData.pattern,'branching-marble');
  assert.equal(italianMaterials.mats.smokedWood.map.userData.pattern,'straight-plank');
  assert.equal(italianMaterials.mats.smokedWood.map.rotation,0);
  assert.equal(frenchMaterials.mats.parquet.map.rotation,Math.PI/4);
});

test('意式配色只改变独立的皮革与织物，不串色到法式或墙面',()=>{
  const {mats,setPalette}=italianMaterials;
  for(const key of Object.keys(frenchMaterials.mats)) {
    assert.ok(mats[key]?.isMaterial,`保留基础材质${key}`);
    assert.notEqual(mats[key],frenchMaterials.mats[key]);
  }
  const palettes={burgundy:['444440','454c38'],olive:['555748','84735d'],ivory:['8e8575','51513e']};
  for(const [key,[fabric,sage]] of Object.entries(palettes)) {
    setPalette(key);
    assert.equal(mats.fabric.color.getHexString(),fabric);assert.equal(mats.leather.color.getHexString(),fabric);
    assert.equal(mats.sage.color.getHexString(),sage);assert.equal(mats.wall.color.getHexString(),'a59d90');
    assert.equal(frenchMaterials.mats.fabric.color.getHexString(),'693e37');
  }
  assert.equal(mats.leather.userData.paletteRole,'fabric');assert.equal(mats.sage.userData.paletteRole,'sage');
  assert.equal(mats.white.color.getHexString(),'c3bbad');assert.equal(mats.brass.color.getHexString(),'8d7754');
  setPalette('burgundy');
});

test('意式10片平板房门保留全部既有运动轨迹，含五金外包不扩大',()=>{
  const previous=marked(french.group,'doorLeaf'),current=marked(italian.group,'doorLeaf');
  assert.equal(current.length,10);assert.equal(current.length,previous.length);
  for(const door of current) {
    const original=previous.find(o=>o.name===door.name);assert.ok(original);
    assert.deepEqual(door.userData.doorMotion,original.userData.doorMotion);
    assert.deepEqual(door.position.toArray(),original.position.toArray());
    assert.deepEqual(door.quaternion.toArray(),original.quaternion.toArray());
    assert.deepEqual(door.parent.matrix.elements,original.parent.matrix.elements);
    assert.equal(door.userData.finish,'flush-panel');
    assert.ok(localBounds(original).expandByScalar(1e-6).containsBox(localBounds(door)),`${door.name}平板门全运动过程外包不能超过已核验法式门`);
    assert.ok(triangleCount(door)<triangleCount(original),'房门必须实际移除凸起门板与框线');
  }
});

test('意式细框阳台门仍有独立实体障碍、真实600mm通口及原低轨',()=>{
  const previous=marked(french.windows,'glazedDoor'),current=marked(italian.windows,'glazedDoor');
  assert.equal(current.length,2);
  italian.group.updateMatrixWorld(true);french.group.updateMatrixWorld(true);
  for(const [i,root] of current.entries()) {
    assert.equal(root.userData.openClearWidth,previous[i].userData.openClearWidth);assert.ok(root.userData.openClearWidth>=.6);
    const panels=root.children.filter(o=>o.userData.walkObstacle),old=previous[i].children.filter(o=>o.userData.walkObstacle);
    assert.equal(panels.length,2);
    for(const [j,panel] of panels.entries()) {
      assert.deepEqual(panel.matrixWorld.elements,old[j].matrixWorld.elements);
      assert.ok(new THREE.Box3().setFromObject(old[j]).expandByScalar(1e-6).containsBox(new THREE.Box3().setFromObject(panel)));
    }
    assert.equal(new THREE.Box3().setFromObject(panels[0]).intersectsBox(new THREE.Box3().setFromObject(panels[1])),false);
    const track=new THREE.Box3().setFromObject(root.getObjectByName('阳台低轨'));
    assert.ok(track.max.y-.012<=.02+1e-6);
  }
});

test('意式保留隐私磨砂窗、安全栏杆与完整剖切行为',()=>{
  const frosted=meshes(italian.windows).filter(o=>o.material.name==='卫生间磨砂隐私玻璃');
  assert.ok(frosted.length);for(const mesh of frosted){assert.ok(mesh.material.roughness>=.9);assert.equal(mesh.material.transparent,false);}
  const before=french.group.getObjectByName('法式铁艺阳台栏杆'),after=italian.group.getObjectByName('法式铁艺阳台栏杆');
  assert.deepEqual(after.userData,before.userData);assert.equal(after.children.length,3);
  for(const [i,mesh] of meshes(after).entries())assert.deepEqual(mesh.geometry.attributes.position.array,meshes(before)[i].geometry.attributes.position.array);
  italian.setCeiling(true);italian.setCutaway(true);
  assert.equal(italian.ceilings.visible,false);assert.equal(italian.walls.children[0].visible,false);
  const cutBounds=new THREE.Box3().setFromObject(italian.walls.children[1]);assert.ok(cutBounds.max.y<=.78+1e-6);
  italian.setCutaway(false);assert.equal(italian.ceilings.visible,true);italian.setCeiling(false);
});
