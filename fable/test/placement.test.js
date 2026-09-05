import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TABLES, resolvePlacement, WALL_MOUNTED } from '../src/furnishings.js';
import { ROOMS, OPENINGS, pointInRect, rectsIntersect, roomAt } from '../src/plan.js';

const manifest = JSON.parse(readFileSync(new URL('../public/models/manifest.json', import.meta.url)));

// footprint rectangle (plan mm) of a placed asset, from its manifest bbox
function footprint(p) {
  const m = manifest[p.a];
  const k = p.s || 1;
  const [sx, sy, sz] = m.size.map((v) => v * k); // blender x (width), y (depth), z (height)
  const [mx, my] = m.min.map((v) => v * k);
  const [Mx, My] = m.max.map((v) => v * k);
  const pos = resolvePlacement(p, Math.max(0, My) * 1000); // blender +y = behind the origin
  // local plan coords: x east = blender x; y south = -blender y
  const local = [[mx, -My], [Mx, -my]]; // [x1,y1],[x2,y2] in metres, centred on the origin
  const rad = (p.r || 0) * Math.PI / 180;
  const corners = [[local[0][0], local[0][1]], [local[1][0], local[0][1]], [local[0][0], local[1][1]], [local[1][0], local[1][1]]];
  const rot = corners.map(([x, y]) => [x * Math.cos(rad) + y * Math.sin(rad), -x * Math.sin(rad) + y * Math.cos(rad)]);
  const xs = rot.map((c) => pos.x + c[0] * 1000), ys = rot.map((c) => pos.y + c[1] * 1000);
  return { rect: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], h: sz * 1000, z: p.z || 0 };
}

function inRoom(rect, roomId, tol) {
  const room = ROOMS.find((r) => r.id === roomId);
  const rects = [...room.rects, ...(room.bay ? [room.bay.rect] : [])];
  // annexes count as part of the parent (vestibule -> bed3)
  const grown = [rect[0] + tol, rect[1] + tol, rect[2] - tol, rect[3] - tol];
  const corners = [[grown[0], grown[1]], [grown[2], grown[1]], [grown[0], grown[3]], [grown[2], grown[3]], [(grown[0] + grown[2]) / 2, (grown[1] + grown[3]) / 2]];
  return corners.every(([x, y]) => rects.some((r) => pointInRect(x, y, r)) || (roomId === 'living' && roomAt(x, y)?.id === 'living'));
}

for (const [styleId, { placements: PLACEMENTS, rugs: RUGS }] of Object.entries(TABLES)) {
test(`[${styleId}] every placed asset exists in the manifest and its origin lies in its room`, () => {
  for (const p of PLACEMENTS.filter((p) => !p.skip)) {
    assert.ok(manifest[p.a], `${p.a} missing from manifest`);
    const origin = roomAt(p.x, p.y);
    assert.ok(origin, `${p.n} origin ${p.x},${p.y} is not inside any room`);
    assert.equal(origin.id, p.room, `${p.n} is labelled ${p.room} but sits in ${origin.id}`);
  }
});

test(`[${styleId}] floor-standing furniture footprints stay inside their room (wall-mounted pieces may touch the finish)`, () => {
  for (const p of PLACEMENTS.filter((p) => !p.skip && !p.corner)) {
    const f = footprint(p);
    const tol = p.z || WALL_MOUNTED.has(p.a) ? 20 : 40; // wall-hung pieces sit on the 12 mm finish board
    assert.ok(inRoom(f.rect, p.room, tol), `${p.n} (${p.a}) footprint ${f.rect.map(Math.round)} leaves ${p.room}`);
  }
});

test(`[${styleId}] floor-standing furniture does not overlap (items on top of others excluded)`, () => {
  const floor = PLACEMENTS.filter((p) => !p.skip && !p.corner && !p.z && !WALL_MOUNTED.has(p.a));
  const fps = floor.map((p) => ({ p, ...footprint(p) }));
  const bad = [];
  for (let i = 0; i < fps.length; i++) {
    for (let j = i + 1; j < fps.length; j++) {
      const a = fps[i], b = fps[j];
      if (a.p.room !== b.p.room) continue;
      // shrink by 30 mm so touching pieces (chairs tucked under tables) are fine
      const ra = [a.rect[0] + 30, a.rect[1] + 30, a.rect[2] - 30, a.rect[3] - 30];
      const rb = [b.rect[0] + 30, b.rect[1] + 30, b.rect[2] - 30, b.rect[3] - 30];
      if (rectsIntersect(ra, rb)) {
        // chairs under table tops / plants leaning over are legitimate; flag everything else
        const soft = /chair|plant|lamp|bergere|bistro/.test(a.p.a + b.p.a);
        if (!soft) bad.push(`${a.p.n} ↔ ${b.p.n}`);
      }
    }
  }
  assert.deepEqual(bad, [], 'overlapping furniture: ' + bad.join('; '));
});

test(`[${styleId}] doors can still swing: no floor furniture inside a door leaf sweep`, () => {
  const floor = PLACEMENTS.filter((p) => !p.skip && !p.corner && !p.z && !WALL_MOUNTED.has(p.a));
  const problems = [];
  for (const op of OPENINGS) {
    if (op.type !== 'door' || !op.hinge || !op.swing) continue;
    const [x1, y1, x2, y2] = op.rect;
    const horizontal = x2 - x1 > y2 - y1;
    const w = horizontal ? x2 - x1 : y2 - y1;
    // sweep rectangle: the door width squared, on the swing-room side
    let sweep;
    if (horizontal) {
      const south = roomAt((x1 + x2) / 2, y2 + 1)?.id === op.swing;
      sweep = south ? [x1, y2, x2, y2 + w] : [x1, y1 - w, x2, y1];
    } else {
      const east = roomAt(x2 + 1, (y1 + y2) / 2)?.id === op.swing;
      sweep = east ? [x2, y1, x2 + w, y2] : [x1 - w, y1, x1, y2];
    }
    for (const p of floor) {
      if (p.room !== op.swing) continue;
      const f = footprint(p);
      const shrunk = [f.rect[0] + 40, f.rect[1] + 40, f.rect[2] - 40, f.rect[3] - 40];
      if (rectsIntersect(shrunk, sweep)) problems.push(`${op.id}: ${p.n}`);
    }
  }
  assert.deepEqual(problems, [], 'door sweep blocked: ' + problems.join('; '));
});

test(`[${styleId}] rugs lie inside their rooms`, () => {
  for (const rg of RUGS) {
    const rect = [rg.x - rg.w / 2, rg.y - rg.d / 2, rg.x + rg.w / 2, rg.y + rg.d / 2];
    assert.ok(inRoom(rect, rg.room, 0), `${rg.n} leaves ${rg.room}`);
  }
});

}
