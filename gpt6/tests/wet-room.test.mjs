import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildFurniture } from '../src/furniture.js';
import { WALLS, HOUSE } from '../src/layout.js';

const materialNames = ['wall','trim','oak','walnut','fabric','cream','sage','brass','marble','stone','glass','dark','white','rug','leaf','ceramic','light','metal','parquet','tile'];
const mats = Object.fromEntries(materialNames.map(name => [name, new THREE.MeshStandardMaterial({name})]));
const furniture = buildFurniture(THREE, mats);
furniture.group.updateMatrixWorld(true);
const items = new Map(furniture.items.map(item => [item.id, item.object]));
const bounds = id => new THREE.Box3().setFromObject(items.get(id));
function hits(id, origin, direction, far = Infinity) {
  return new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction), 0, far)
    .intersectObject(items.get(id), true);
}

test('水槽口下方的实物表面是槽底，柜体及承托板不封堵水槽', () => {
  for (const dx of [-.14,0,.14]) for (const dz of [-.10,0,.10]) {
    const first = hits('kitchen-sink', [1.0096 + dx,1.10,3.25 + dz], [0,-1,0])[0];
    assert.ok(first, '水槽需要保留实体金属槽底');
    assert.ok(['metal','dark'].includes(first.object.material.name), `槽内被 ${first.object.material.name} 封堵`);
    assert.ok(first.point.y < .765 && first.point.y > .73, `槽底高度异常：${first.point.y}`);
  }
});

test('厨房转角台面沿洗切区到烹饪区连续，不留下贯通缝隙', () => {
  for (const x of [.30,.55,.70]) for (const z of [3.55,3.60,3.65]) {
    const surfaces = ['kitchen-sink','kitchen-cooking'].flatMap(id => hits(id,[x,1.20,z],[0,-1,0]));
    assert.ok(surfaces.some(hit => hit.object.material.name === 'marble' && Math.abs(hit.point.y - .904) < .001), `转角台面在 ${x}, ${z} 处断开`);
  }
});

test('两处淋浴入口至少有600mm连续开口，另半侧仍保留玻璃', () => {
  for (const [id,openingCenter,parkedCenter] of [
    ['bathroom-shower',4.1225,4.8375],
    ['ensuite-shower',10.1175,9.3225],
  ]) {
    for (const dz of [-.30,-.15,0,.15,.30]) for (const y of [.45,1.30]) {
      const blocked = hits(id,[6.88,y,openingCenter + dz],[1,0,0],.60);
      assert.equal(blocked.length, 0, `${id} 开口 ${openingCenter + dz} 被实体封堵`);
    }
    assert.ok(hits(id,[6.88,1.30,parkedCenter],[1,0,0],.60).some(hit => hit.object.material === mats.glass), `${id} 固定玻璃应存在`);
    const walkBoxes = items.get(id).userData.walkBoxes;
    assert.ok(walkBoxes?.length, '导航碰撞必须使用每片玻璃的边界');
    const ray = new THREE.Ray(new THREE.Vector3(6.88,1.30,openingCenter),new THREE.Vector3(1,0,0));
    for (const value of walkBoxes) {
      const box = new THREE.Box3(new THREE.Vector3(...value.min),new THREE.Vector3(...value.max))
        .applyMatrix4(items.get(id).matrixWorld);
      const intersection = ray.intersectBox(box,new THREE.Vector3());
      assert.ok(!intersection || intersection.x > 7.48, `${id} 导航碰撞盒跨越实际入口`);
    }
  }
});

test('主卫毛巾架不再穿进台盆镜灯、坐便器或淋浴隔断', () => {
  const rail = bounds('ensuite-towel');
  for (const id of ['ensuite-vanity','ensuite-toilet','ensuite-shower']) {
    assert.equal(rail.intersectsBox(bounds(id)),false, `毛巾架与 ${id} 交叠`);
  }
});

test('公卫坐便器前方与淋浴侧保留独立使用空间', () => {
  const wall=WALLS.find(wall=>wall.id==='bathroom-west');
  const toilet=bounds('bathroom-toilet'),shower=items.get('bathroom-shower');
  const glassLeft=Math.min(...shower.userData.walkBoxes.map(part=>new THREE.Box3(new THREE.Vector3(...part.min),new THREE.Vector3(...part.max)).applyMatrix4(shower.matrixWorld).min.x));
  assert.ok(toilet.min.z-(wall.a[1]+HOUSE.wallThickness/2)>.80,'便器前方应有至少800mm模型深度');
  assert.ok(glassLeft-toilet.max.x>.30,'便器侧面至淋浴玻璃至少300mm');
  // Door travel is checked against the actual final door leaves in door-safety.
});

// Rays hit the real brass riser/support on the solid south wall, rather than
// merely trusting a fixture placement label in front of the east window.
test('两处花洒立管及支架安装于南侧实墙并避开东窗', () => {
  for(const [id,wallId] of [['bathroom-shower','bedroom2-north'],['ensuite-shower','ensuite-south']]) {
    const wall=WALLS.find(w=>w.id===wallId),face=wall.a[1]-HOUSE.wallThickness/2;
    for(const y of [1.10,1.90]){
      const first=hits(id,[7.46,y,face-.25],[0,0,1],.30)[0];
      assert.ok(first,`${id}实墙前应有实际立管或支架`);
      assert.equal(first.object.material.name,'brass');
      assert.ok(first.point.z<face&&first.point.z>face-.08,'管身留在墙内面前，支架连接实墙');
    }
  }
});
