import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROOMS, OPENINGS, ENVELOPE, WALL_H,
  roomArea, rectsIntersect, rectIntersection, rectDifference, rectArea,
  pointInPolygon, computeWalls, wallPieces, unionOutline, edgeMinusOpenings,
  isWalkable, roomAt, planBounds,
} from '../src/plan.js';

test('reconstructed room areas match the plan labels within 5%', () => {
  for (const room of ROOMS) {
    if (!room.label) continue;
    const annexes = ROOMS.filter((r) => r.partOf === room.id);
    const area = roomArea(room) + (room.bay ? rectArea(room.bay.rect) / 1e6 : 0) + annexes.reduce((s, r) => s + roomArea(r), 0);
    const err = Math.abs(area - room.label) / room.label;
    assert.ok(err < 0.05, `${room.name}: got ${area.toFixed(2)} m², label ${room.label} (err ${(err * 100).toFixed(1)}%)`);
  }
});

test('overall envelope is 8853 x 16375 mm', () => {
  const b = planBounds();
  assert.equal(b.x2 - b.x1, 8853);
  assert.equal(b.y2 - b.y1, 16375);
});

test('room rectangles do not overlap each other', () => {
  const all = ROOMS.flatMap((r) => [...r.rects, ...(r.bay ? [r.bay.rect] : [])].map((rect) => ({ rect, id: r.id })));
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      assert.ok(!rectsIntersect(all[i].rect, all[j].rect), `${all[i].id} overlaps ${all[j].id}`);
    }
  }
});

test('every room rectangle lies inside the envelope', () => {
  for (const room of ROOMS) {
    for (const r of [...room.rects, ...(room.bay ? [room.bay.rect] : [])]) {
      const corners = [[r[0] + 1, r[1] + 1], [r[2] - 1, r[1] + 1], [r[0] + 1, r[3] - 1], [r[2] - 1, r[3] - 1]];
      for (const [x, y] of corners) assert.ok(pointInPolygon(x, y, ENVELOPE), `${room.id} corner ${x},${y} outside envelope`);
    }
  }
});

test('rectDifference tiles the original minus the cut', () => {
  const a = [0, 0, 100, 100];
  const b = [40, 30, 60, 70];
  const parts = rectDifference(a, b);
  const area = parts.reduce((s, r) => s + rectArea(r), 0);
  assert.equal(area, rectArea(a) - rectArea(b));
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) assert.ok(!rectsIntersect(parts[i], parts[j]));
  assert.deepEqual(rectDifference(a, [200, 200, 300, 300]), [a]);
});

test('derived walls are disjoint, fill the envelope minus rooms, and are >= 100 mm thick', () => {
  const walls = computeWalls();
  const roomsArea = ROOMS.reduce((s, r) => s + roomArea(r) * 1e6 + (r.bay ? rectArea(r.bay.rect) : 0), 0);
  // shoelace envelope area
  let env = 0;
  for (let i = 0; i < ENVELOPE.length; i++) {
    const [x1, y1] = ENVELOPE[i];
    const [x2, y2] = ENVELOPE[(i + 1) % ENVELOPE.length];
    env += x1 * y2 - x2 * y1;
  }
  env = Math.abs(env) / 2;
  const wallsArea = walls.reduce((s, r) => s + rectArea(r), 0);
  assert.ok(Math.abs(wallsArea - (env - roomsArea)) < 1, 'walls must exactly fill the envelope minus floors');
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    const thickness = Math.min(w[2] - w[0], w[3] - w[1]);
    assert.ok(thickness >= 100, `wall ${w} is only ${thickness} mm thick`);
    for (let j = i + 1; j < walls.length; j++) assert.ok(!rectsIntersect(w, walls[j]), 'walls overlap');
  }
});

test('every opening is fully embedded in wall mass and spans exactly one wall thickness', () => {
  const walls = computeWalls();
  for (const op of OPENINGS) {
    const covered = walls.reduce((s, w) => {
      const i = rectIntersection(w, op.rect);
      return s + (i ? rectArea(i) : 0);
    }, 0);
    assert.ok(Math.abs(covered - rectArea(op.rect)) < 1, `${op.id} is not entirely inside a wall (covered ${covered} of ${rectArea(op.rect)})`);
    const thickness = Math.min(op.rect[2] - op.rect[0], op.rect[3] - op.rect[1]);
    assert.ok([120, 200, 240, 300].includes(thickness), `${op.id} thickness ${thickness}`);
  }
});

test('interior doors connect two different rooms', () => {
  for (const op of OPENINGS) {
    if (op.type === 'window' || op.id === 'entry') continue;
    const [x1, y1, x2, y2] = op.rect;
    const horizontal = x2 - x1 > y2 - y1; // opening runs east-west -> wall separates north/south
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const a = horizontal ? roomAt(mx, y1 - 1) : roomAt(x1 - 1, my);
    const b = horizontal ? roomAt(mx, y2 + 1) : roomAt(x2 + 1, my);
    assert.ok(a && b, `${op.id}: sides ${a?.id} / ${b?.id}`);
    assert.notEqual(a.id, b.id, `${op.id} does not connect two rooms`);
  }
});

test('windows face the outside (or the enclosed balcony)', () => {
  for (const op of OPENINGS) {
    if (op.type !== 'window') continue;
    const [x1, y1, x2, y2] = op.rect;
    const horizontal = x2 - x1 > y2 - y1;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const sides = horizontal ? [[mx, y1 - 1], [mx, y2 + 1]] : [[x1 - 1, my], [x2 + 1, my]];
    const rooms = sides.map(([x, y]) => roomAt(x, y));
    const exterior = sides.map(([x, y]) => !pointInPolygon(x, y, ENVELOPE));
    const owner = rooms.filter(Boolean);
    assert.ok(owner.length >= 1, `${op.id} must open into a room`);
    // the far side is either outdoors, or the enclosed balcony seen from another room
    const ok = (exterior[0] && rooms[1]) || (exterior[1] && rooms[0]) ||
      (rooms[0]?.id === 'balcony' && rooms[1] && rooms[1].id !== 'balcony') ||
      (rooms[1]?.id === 'balcony' && rooms[0] && rooms[0].id !== 'balcony');
    assert.ok(ok, `${op.id}: sides ${rooms.map((r) => r?.id ?? 'exterior').join(' / ')}`);
  }
});

test('wallPieces cuts doors to the floor and windows to the sill, keeping a lintel', () => {
  const pieces = wallPieces(computeWalls());
  const byOpening = (id) => pieces.filter((p) => p.opening === id);
  const door = byOpening('bed1-door');
  assert.ok(door.some((p) => p.kind === 'lintel' && p.z0 === 2100 && p.z1 === WALL_H));
  assert.ok(!door.some((p) => p.kind === 'sill'));
  const win = byOpening('w-bed1');
  assert.ok(win.some((p) => p.kind === 'sill' && p.z0 === 0 && p.z1 === 900));
  assert.ok(win.some((p) => p.kind === 'lintel' && p.z0 === 2400));
  // no full-height wall piece may remain inside any opening footprint
  for (const op of OPENINGS) {
    for (const p of pieces) {
      if (p.kind === 'wall') assert.ok(!rectIntersection(p.rect, op.rect), `${op.id} still blocked by wall ${p.rect}`);
    }
  }
});

test('unionOutline of an L-shaped room yields 6 edges with inward normals', () => {
  const edges = unionOutline([[0, 0, 100, 100], [100, 0, 200, 50]]);
  assert.equal(edges.length, 6);
  const total = edges.reduce((s, e) => s + Math.hypot(e.x2 - e.x1, e.y2 - e.y1), 0);
  assert.equal(total, 600);
  // top edge merged into one 0..200 span with normal pointing south (+y)
  const top = edges.find((e) => e.y1 === 0 && e.y2 === 0);
  assert.deepEqual([top.x1, top.x2, top.nx, top.ny], [0, 200, 0, 1]);
});

test('edgeMinusOpenings removes the door span from a wall edge', () => {
  const edge = { x1: 4700, y1: 3563, x2: 7768, y2: 3563, nx: 0, ny: -1 }; // bed1 south wall
  const parts = edgeMinusOpenings(edge);
  assert.deepEqual(parts.map((p) => [p.x1, p.x2]), [[4700, 4800], [5650, 7768]]);
});

test('walkability: rooms and door footprints are walkable, wall mass is not', () => {
  assert.ok(isWalkable(2000, 10000)); // living
  assert.ok(isWalkable(4260, 8000)); // inside bed2 door footprint
  assert.ok(!isWalkable(4260, 7000)); // wall between living and bed2
  assert.ok(!isWalkable(100, 6500)); // entry door is not walkable (leads outside)
});
