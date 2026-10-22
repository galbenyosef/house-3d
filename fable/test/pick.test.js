import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { pickEditable, pointInOutline } from '../src/pick.js';

// A piece on the floor under a chandelier, all below the roof slab that the
// 布置 view hides (house.js puts it in the ceilings group, WALL_H .. +120 mm).
function scene() {
  const root = new THREE.Group();
  const box = (w, h, d, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial()); m.position.y = y; return m; };
  const table = new THREE.Group(); table.add(box(1.2, 0.75, 0.8, 0.375)); table.userData.layoutId = 'p1';
  const rug = new THREE.Group(); rug.add(box(2.4, 0.01, 2.4, 0.006)); rug.userData.layoutId = 'rug0';
  const chandelier = box(0.6, 0.6, 0.6, 2.0); // a fixture: not editable
  const ceilings = new THREE.Group(); ceilings.add(box(10, 0.12, 10, 2.86)); ceilings.visible = false;
  root.add(table, rug, chandelier, ceilings);
  root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(0.1, 20, 0.1), new THREE.Vector3(0, -1, 0));
  return { root, table, rug, ceilings, ray };
}

test('three.js raycasts hidden objects: straight down, the hidden roof is the first hit (the 布置 picking bug)', () => {
  const { root, ceilings, ray } = scene();
  const first = ray.intersectObject(root, true)[0];
  assert.equal(first.object.parent, ceilings);
});

test('picking skips hidden geometry and fixtures and returns the nearest editable piece', () => {
  const { table, rug, ray } = scene();
  const hit = pickEditable(ray, [table, rug]);
  assert.equal(hit?.obj, table);
  assert.ok(Math.abs(hit.point.y - 0.75) < 1e-6, 'hit point on the table top');
});

test('a piece on top wins over the rug beneath it; hidden pieces are ignored', () => {
  const { table, rug, ray } = scene();
  assert.equal(pickEditable(ray, [rug, table]).obj, table);
  table.visible = false;
  assert.equal(pickEditable(ray, [rug, table]).obj, rug);
  rug.visible = false;
  assert.equal(pickEditable(ray, [rug, table]), null);
});

test('pointInOutline handles rotated quads', () => {
  const diamond = [[0, -10], [10, 0], [0, 10], [-10, 0]];
  assert.ok(pointInOutline(diamond, 0, 0));
  assert.ok(pointInOutline(diamond, 4, 4));
  assert.ok(!pointInOutline(diamond, 8, 8));
});
