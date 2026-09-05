import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { HOUSE, WALLS } from '../src/layout.js';
import { buildArchitecture } from '../src/architecture.js';
import { buildFurniture } from '../src/furniture.js';

const names = ['wall','trim','oak','walnut','fabric','cream','sage','brass','marble','stone','glass','dark','white','rug','leaf','ceramic','light','metal','parquet','tile'];
const mats = Object.fromEntries(names.map(name => [name, new THREE.MeshStandardMaterial({name})]));
const furniture = buildFurniture(THREE, mats);
furniture.group.updateMatrixWorld(true);
const items = new Map(furniture.items.map(item => [item.id, item]));
const wall = id => WALLS.find(value => value.id === id);
const halfWall = HOUSE.wallThickness / 2;
const EPS = 1e-6; // Float32 几何的贴墙坐标误差，最多 0.001 mm。
function bounds(id) {
  assert.ok(items.has(id), `必须保留已验收家具 ${id}`);
  return new THREE.Box3().setFromObject(items.get(id).object);
}
function atLeast(actual, minimum, label) {
  assert.ok(actual >= minimum, `${label}：当前 ${Math.round(actual * 1000)} mm，至少 ${Math.round(minimum * 1000)} mm`);
}

// 仅检查曾发现问题的实物边界；不把压床地毯、壁挂饰品或植物当成通行障碍。
test('公卫台盆置于原图走廊干区，避开公卫门洞及次卧墙', () => {
  const vanity = bounds('bathroom-vanity');
  const bathroomWest = wall('bathroom-west');
  assert.ok(vanity.max.x < bathroomWest.a[0] - halfWall, '洗手台应位于公卫西侧外部干区');
  assert.ok(vanity.max.z <= wall('bedroom2-north').a[1] - halfWall + EPS, '干区柜体不能穿入次卧北墙');
  const door = bathroomWest.openings.find(opening => opening.type === 'door');
  atLeast(vanity.min.z - (bathroomWest.a[1] + door.offset), .55, '台盆前沿应退让公卫门口的北侧接近区域');
});

test('主卫台盆与坐便器之间保留超过700mm使用净空', () => {
  const vanity = bounds('ensuite-vanity'), toilet = bounds('ensuite-toilet');
  atLeast(toilet.min.z - vanity.max.z, .70, '主卫两件洁具前沿净距');
  assert.ok(vanity.min.z >= wall('bedroom2-south').a[1] + halfWall - EPS, '台盆背部不穿北墙');
  assert.ok(toilet.max.z <= wall('ensuite-south').a[1] - halfWall + EPS, '坐便器背部不穿南墙');
});

test('厨房冰箱避开入户转身区域，门内深度超过800mm', () => {
  const fridge = bounds('kitchen-fridge');
  atLeast(wall('kitchen-south').a[1] - halfWall - fridge.max.z, .80, '厨房门内至冰箱南沿');
  atLeast(fridge.min.x - bounds('kitchen-cooking').max.x, .95, '冰箱前的中间操作带');
  assert.ok(fridge.max.x <= wall('kitchen-east').a[0] - halfWall + EPS, '冰箱背部不穿厨房东墙');
});

test('次卧2浅柜与床之间保留600mm以上通道', () => {
  const wardrobe = bounds('guest-wardrobe'), bed = bounds('guest-bed');
  atLeast(bed.min.x - wardrobe.max.x, .60, '次卧2衣柜前至床边');
  assert.ok(wardrobe.min.x >= wall('bedroom2-west').a[0] + halfWall - EPS, '衣柜冠线不穿西墙');
  assert.ok(wardrobe.min.z >= wall('bedroom2-north').a[1] + halfWall - EPS, '衣柜不穿北墙');
});


test('主卧南墙衣柜前保留700mm，冠线和门洞位置不穿墙', () => {
  const wardrobe = bounds('master-wardrobe'), bed = bounds('master-bed');
  atLeast(wardrobe.min.z - bed.max.z, .70, '主卧床尾至衣柜前沿');
  const south = wall('south'), slider = south.openings.at(-1);
  assert.ok(wardrobe.min.x > south.a[0] + slider.offset + slider.width, '衣柜位于阳台滑门东侧实墙段');
  assert.ok(wardrobe.max.x <= wall('east-south').a[0] - halfWall + EPS, '衣柜冠线不穿东墙');
  assert.ok(wardrobe.max.z <= south.a[1] - halfWall + EPS, '衣柜冠线不穿南墙');
  if (items.has('master-dresser'))
    assert.equal(wardrobe.intersectsBox(bounds('master-dresser')), false, '衣柜不能与梳妆桌占用同一位置');
});

test('次卧1衣柜前保留600mm，床头柜不再阻挡右侧柜门', () => {
  const bed = bounds('second-bed'), wardrobe = bounds('second-wardrobe'), nightstand = bounds('second-nightstand');
  atLeast(wardrobe.min.z - bed.max.z, .60, '次卧1床边至衣柜前沿');
  assert.ok(wardrobe.max.z <= wall('bedroom1-south').a[1] - halfWall + EPS, '衣柜冠线不穿南墙');
  assert.ok(wardrobe.max.x <= wall('east-north').a[0] - halfWall + EPS, '衣柜不穿东墙');
  assert.ok(nightstand.max.z <= bed.min.z + EPS, '窄床头柜位于床北侧，避开南侧柜门');
  assert.ok(nightstand.min.z >= wall('north').a[1] + halfWall - EPS, '窄床头柜不穿北墙');
});

test('餐桌座椅保留东侧主通道和西侧拉椅余量', () => {
  const sideboard = bounds('dining-sideboard');
  for (const id of ['dining-chair-5','dining-chair-6'])
    atLeast(bounds(id).min.x - sideboard.max.x, .42, `${id}至餐边柜`);
  for (const id of ['dining-chair-2','dining-chair-3'])
    atLeast(wall('master-west').a[0] - halfWall - bounds(id).max.x, .80, `${id}后方东侧通道`);
});

test('入户门保留原图南端铰链并向西外开', () => {
  const architecture = buildArchitecture(THREE, mats);
  const entry = architecture.group.getObjectByName('west · 开启木门');
  assert.ok(entry, '入户门扇存在');
  const west = wall('west'), opening = west.openings.find(value => value.entry);
  assert.ok(Math.abs(entry.position.z - (west.a[1] + opening.offset + opening.width)) < .06, '铰链位于门洞南端');
  const direction = new THREE.Vector3(1,0,0).applyQuaternion(entry.quaternion);
  assert.ok(direction.x < -.9, '开启门叶指向室外西侧');
  architecture.group.updateMatrixWorld(true);
  assert.ok(new THREE.Box3().setFromObject(entry).max.x < west.a[0] + halfWall, '开门状态不伸入入户鞋柜区域');
});
