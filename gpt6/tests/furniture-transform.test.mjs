import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCanvas } from '@napi-rs/canvas';
import {
  furnitureBounds, readTransform, applyTransform, dimensionsOf, editTransform,
} from '../src/furniture-transform.js';
import { buildFurniture } from '../src/furniture.js';
import { createMaterials } from '../src/materials.js';
import { collectWalkBlockers } from '../src/collision.js';
import { canWalkTo } from '../src/navigation.js';
import { createFurniturePlan } from '../src/furniture-plan.js';
import { STYLE_IDS } from '../src/design-styles.js';

globalThis.document = { createElement: () => createCanvas(1, 1) };

function near(actual, expected, label = '', epsilon = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${label}：${actual} 应接近 ${expected}`);
}
function nearVector(actual, expected, label = '') {
  const values = actual.toArray ? actual.toArray() : actual;
  const targets = expected.toArray ? expected.toArray() : expected;
  values.forEach((value, index) => near(value, targets[index], `${label}[${index}]`));
}
function nearBox(actual, expected, label = '') {
  nearVector(actual.min, expected.min, `${label} min`);
  nearVector(actual.max, expected.max, `${label} max`);
}
function boxFurniture({ offset = [0, 0.5, 0], childRotation = 0 } = {}) {
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), new THREE.MeshBasicMaterial());
  mesh.position.fromArray(offset);
  mesh.rotation.y = childRotation;
  root.add(mesh);
  return root;
}
function bottomCenter(object, bounds) {
  object.updateWorldMatrix(true, true);
  const center = bounds.getCenter(new THREE.Vector3());
  center.y = bounds.min.y;
  return center.applyMatrix4(object.matrixWorld);
}

test('旋转家具不交换本地宽高深，世界包围盒随朝向正常旋转', () => {
  const root = boxFurniture();
  const bounds = furnitureBounds(root);
  nearVector(dimensionsOf(bounds, readTransform(root)), [2, 1, 4]);
  applyTransform(root, editTransform(bounds, readTransform(root), { rotation: Math.PI / 2 }));
  nearVector(dimensionsOf(bounds, readTransform(root)), [2, 1, 4], '本地尺寸保持');
  nearVector(new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()), [4, 1, 2], '世界尺寸转向');
  nearBox(furnitureBounds(root), bounds, '旋转后重新测量仍使用家具坐标');
});

test('偏心家具同时旋转和非等比缩放，底面高度与水平中心保持不动', () => {
  const root = boxFurniture({ offset: [2.5, 1.5, -1.5] });
  root.position.set(6, -1, 9);
  root.rotation.y = Math.PI / 5;
  root.scale.set(0.8, 1.5, 1.1);
  const bounds = furnitureBounds(root);
  const before = readTransform(root);
  const beforeBox = new THREE.Box3().setFromObject(root);
  const anchor = bottomCenter(root, bounds);
  const next = editTransform(bounds, before, { rotation: -Math.PI / 3, dimensions: [3, 0.75, 2] });
  applyTransform(root, next);
  const afterBox = new THREE.Box3().setFromObject(root);
  nearVector(bottomCenter(root, bounds), anchor, '底部中心世界坐标');
  near(afterBox.min.y, beforeBox.min.y, '不离地或下沉');
  near(afterBox.getCenter(new THREE.Vector3()).x, beforeBox.getCenter(new THREE.Vector3()).x, '中心 x');
  near(afterBox.getCenter(new THREE.Vector3()).z, beforeBox.getCenter(new THREE.Vector3()).z, '中心 z');
  nearVector(dimensionsOf(bounds, readTransform(root)), [3, 0.75, 2], '目标尺寸');
  assert.notDeepEqual(next.position, before.position, '偏心模型必须修正对象原点');
});

test('子模型与父容器已有旋转、平移和缩放时，仍能取得家具本地尺寸', () => {
  const root = boxFurniture({ offset: [2, 0.5, -3], childRotation: Math.PI / 2 });
  root.position.set(4, 0.2, 6);
  root.rotation.y = -Math.PI / 4;
  root.scale.set(1.2, 1.1, 0.7);
  const parent = new THREE.Group();
  parent.position.set(-7, 2, 9);
  parent.rotation.y = Math.PI / 6;
  parent.scale.set(1.3, 0.9, 0.8);
  parent.add(root);
  const bounds = furnitureBounds(root);
  nearVector(bounds.getSize(new THREE.Vector3()), [4, 1, 2], '包含子模型旋转，不包含父级变换');
  nearVector(dimensionsOf(bounds, readTransform(root)), [4.8, 1.1, 1.4], '根节点缩放计入一次');
  const anchor = bottomCenter(root, bounds);
  applyTransform(root, editTransform(bounds, readTransform(root), {
    rotation: Math.PI / 7, dimensions: [5.2, 0.8, 1.7],
  }));
  nearVector(bottomCenter(root, bounds), anchor, '父级变换下的底部中心');
  nearBox(furnitureBounds(root), bounds, '重新测量无累计误差');
});

test('应用后读回一致，修改输入或读回数组不会间接改变对象', () => {
  const root = boxFurniture();
  const transform = { position: [3.5, 0.1, 7.25], rotation: -0.7, scale: [1.2, 0.8, 1.1] };
  const expected = structuredClone(transform);
  applyTransform(root, transform);
  assert.deepEqual(readTransform(root), expected);
  transform.position[0] = 20;
  transform.scale[1] = 8;
  const read = readTransform(root);
  read.position[2] = 30;
  read.scale[0] = 5;
  assert.deepEqual(readTransform(root), expected);
  const local = new THREE.Vector3(0, 0, 0).applyMatrix4(root.matrixWorld);
  nearVector(local, expected.position, '应用立即更新世界矩阵');
});

test('纯平移采用明确的新位置，不改尺寸或旋转，也不修改原始参数', () => {
  const root = boxFurniture({ offset: [1, 0.5, -1] });
  root.rotation.y = 0.4;
  const current = readTransform(root);
  const before = structuredClone(current);
  const change = { position: [7, 0.4, 10] };
  const next = editTransform(furnitureBounds(root), current, change);
  assert.deepEqual(next.position, change.position);
  assert.deepEqual(next.scale, current.scale);
  assert.equal(next.rotation, current.rotation);
  assert.deepEqual(current, before);
  next.position[0] = 30;
  assert.equal(change.position[0], 7);
});

test('空模型无法获得可编辑尺寸', () => {
  assert.throws(() => furnitureBounds(new THREE.Group()), /没有可编辑的几何尺寸/);
});

test('非法尺寸全部拒绝，包含空项、非法数值和超过缩放范围的尺寸', () => {
  const root = boxFurniture();
  const bounds = furnitureBounds(root);
  const current = readTransform(root);
  const invalid = [
    null, {}, [2, 1], [2, 1, 4, 5], new Array(3), [2, , 4],
    [2, NaN, 4], [2, Infinity, 4], [2, '1', 4],
    [2, -1, 4], [2, 0, 4], [2, 0.004, 4], [2, 16, 4],
    [0.005, 1, 4], [2, 11, 4],
  ];
  for (const dimensions of invalid) {
    assert.throws(() => editTransform(bounds, current, { dimensions }), /尺寸/, String(dimensions));
    assert.deepEqual(readTransform(root), current, '拒绝输入不改变模型');
  }
  assert.throws(() => editTransform(bounds, current, { rotation: Infinity }), /旋转角度/);
  assert.throws(() => editTransform(bounds, current, { position: [1, NaN, 2] }), /位置/);
  assert.throws(() => editTransform(bounds, current, { position: new Array(3) }), /位置/);
});

function materials(style) {
  return createMaterials(style);
}

for (const style of STYLE_IDS) {
  test(`${style} 真实沙发、床与椅变换后更新通行阻挡，撤销后恢复默认几何`, () => {
    const { mats } = materials(style);
    const furniture = buildFurniture(THREE, mats, style);
    // 单独评估家具，避免建筑或其他家具遮蔽本次变换的碰撞结果。
    const architecture = { group: new THREE.Group() };
    const plan = createFurniturePlan({ storage: null });
    plan.registerStyle(style, Object.fromEntries(furniture.items.map(item => [item.id, readTransform(item.object)])));
    for (const id of ['living-sofa', 'master-bed', 'dining-chair-1']) {
      const item = furniture.items.find(value => value.id === id);
      assert.ok(item, id);
      const initial = readTransform(item.object);
      const bounds = furnitureBounds(item.object);
      const initialBox = new THREE.Box3().setFromObject(item.object);
      const initialAnchor = bottomCenter(item.object, bounds);
      const initialBlockers = collectWalkBlockers([item], architecture);
      assert.equal(initialBlockers.length, 1, `${id}默认有通行阻挡`);
      assert.equal(canWalkTo(initialAnchor.x, initialAnchor.z, 0.05, []), true, `${id}原位置没有墙体`);
      assert.equal(canWalkTo(initialAnchor.x, initialAnchor.z, 0.05, initialBlockers), false, `${id}原位置被家具阻挡`);
      const size = dimensionsOf(bounds, initial);
      const next = editTransform(bounds, initial, {
        rotation: initial.rotation + Math.PI / 3,
        dimensions: [size[0] * 1.2, size[1] * 0.8, size[2] * 0.9],
      });
      const target = id === 'dining-chair-1' ? [2, 12] : [2.25, 8.5];
      next.position[0] += target[0] - initialAnchor.x;
      next.position[2] += target[1] - initialAnchor.z;
      try {
        plan.setTransform(style, id, next);
        applyTransform(item.object, plan.getTransform(style, id));
        const changedBox = new THREE.Box3().setFromObject(item.object);
        const changedBlockers = collectWalkBlockers([item], architecture);
        assert.equal(changedBlockers.length, 1);
        assert.equal(changedBlockers[0].name, id);
        nearBox(changedBlockers[0], changedBox, `${id}碰撞外包与当前几何一致`);
        nearVector(dimensionsOf(bounds, readTransform(item.object)), [size[0] * 1.2, size[1] * 0.8, size[2] * 0.9], `${id}调整尺寸`);
        near(changedBox.min.y, initialBox.min.y, `${id}缩放后保持落地`);
        assert.equal(canWalkTo(target[0], target[1], 0.05, []), true, `${id}目标位置没有墙体`);
        assert.equal(canWalkTo(target[0], target[1], 0.05, changedBlockers), false, `${id}新位置被阻挡`);
        assert.equal(canWalkTo(initialAnchor.x, initialAnchor.z, 0.05, changedBlockers), true, `${id}原位置恢复通行`);
        assert.ok(plan.undo(style), `${id}能够撤销`);
        applyTransform(item.object, plan.getTransform(style, id));
        nearBox(new THREE.Box3().setFromObject(item.object), initialBox, `${id}撤销恢复几何`);
        const restoredBlockers = collectWalkBlockers([item], architecture);
        nearBox(restoredBlockers[0], initialBlockers[0], `${id}撤销恢复碰撞外包`);
        nearBox(restoredBlockers[0].walkShape.bounds, initialBlockers[0].walkShape.bounds, `${id}撤销恢复有向碰撞边界`);
        nearVector(restoredBlockers[0].walkShape.inverse, initialBlockers[0].walkShape.inverse, `${id}撤销恢复碰撞坐标系`);
        assert.equal(canWalkTo(initialAnchor.x, initialAnchor.z, 0.05, restoredBlockers), false);
      } finally {
        applyTransform(item.object, initial);
      }
    }
  });
}
