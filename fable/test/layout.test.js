import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TABLES } from '../src/furnishings.js';
import {
  LAYOUT_VERSION, WALL_FINISH, baseItems, createContext, boundsFromManifest, itemState, footprint, roomOf,
  moveItem, rotateItem, resizeItem, resetItem, ridersOf, createHistory, collisions, contacts,
  transformItem, resizeFromCorner, rotationFromHandle, wallClearances, itemOutline,
  serializeLayout, parseLayout, loadLayout, saveLayout, storageKey,
} from '../src/layout.js';

const manifest = JSON.parse(readFileSync(new URL('../public/models/manifest.json', import.meta.url)));
const ctxFor = (styleId) => createContext(TABLES[styleId], (base) => boundsFromManifest(manifest[base.a]));
const french = ctxFor('french');
const find = (ctx, pred) => ctx.list.find(pred);
const coffee = find(french, (b) => b.a === 'coffee_table');
const sideTable = find(french, (b) => b.a === 'side_table' && b.room === 'bed3');
const sideLamp = find(french, (b) => b.a === 'table_lamp_white' && b.room === 'bed3');
const westArt = find(french, (b) => b.a === 'art_landscape' && b.room === 'living' && b.r === 90);
const firstRug = find(french, (b) => b.kind === 'rug');

function memoryStorage() {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k), data };
}

test('every style yields unique, stable item ids covering placements and rugs', () => {
  for (const [styleId, table] of Object.entries(TABLES)) {
    const items = baseItems(table);
    const ids = items.map((b) => b.id);
    assert.equal(new Set(ids).size, ids.length, `${styleId} has duplicate ids`);
    assert.equal(items.filter((b) => b.kind === 'rug').length, table.rugs.length);
    assert.equal(items.filter((b) => b.kind !== 'rug').length, table.placements.filter((p) => !p.skip).length);
    assert.deepEqual(baseItems(table).map((b) => b.id), ids, 'ids must not depend on call order');
  }
});

test('an empty layout reproduces the default placement table', () => {
  const st = itemState(coffee, {});
  assert.deepEqual(st, { x: coffee.x, y: coffee.y, z: 0, r: coffee.r, sx: 1, sy: 1, sz: 1 });
});

test('moving snaps to the 10 mm grid away from walls and stores only the moved item and what stands on it', () => {
  const next = moveItem(french, {}, coffee.id, 2503, 11997);
  assert.deepEqual(Object.keys(next).sort(), [coffee.id, ...ridersOf(french, {}, coffee.id)].sort());
  assert.equal(next[coffee.id].x, 2500);
  assert.equal(next[coffee.id].y, 12000);
});

test('moving close to a wall snaps the footprint flush against the wall finish', () => {
  const half = (footprint(french, coffee, itemState(coffee, {}))[2] - footprint(french, coffee, itemState(coffee, {}))[0]) / 2;
  const next = moveItem(french, {}, coffee.id, 240 + WALL_FINISH + half + 37, 13700);
  const fp = footprint(french, coffee, itemState(coffee, next));
  assert.ok(Math.abs(fp[0] - (240 + WALL_FINISH)) < 1, `footprint left edge ${fp[0]} should sit on the west wall finish`);
});

test('snapping can be disabled (Alt): positions are only rounded to whole millimetres', () => {
  const next = moveItem(french, {}, coffee.id, 2503.4, 11997.6, { snap: false });
  assert.equal(next[coffee.id].x, 2503);
  assert.equal(next[coffee.id].y, 11998);
});

test('a move whose footprint centre leaves the plan is rejected', () => {
  const layout = {};
  assert.equal(moveItem(french, layout, coffee.id, -3000, 12000), layout);
});

test('moved items report the room they now stand in', () => {
  const next = moveItem(french, {}, coffee.id, 6000, 12500, { collide: false });
  assert.equal(roomOf(french, coffee, itemState(coffee, next)), 'bed3');
});

test('wall-mounted pieces slide along their wall only', () => {
  const next = moveItem(french, {}, westArt.id, 1500, 9500);
  assert.equal(next[westArt.id].x, westArt.x, 'art on the west wall keeps its x');
  assert.equal(next[westArt.id].y, 9500);
});

test('pieces standing on a moved item ride along; moving the rider alone leaves the carrier', () => {
  assert.deepEqual(ridersOf(french, {}, sideTable.id), [sideLamp.id]);
  const next = moveItem(french, {}, sideTable.id, sideTable.x + 300, sideTable.y + 200, { snap: false, collide: false });
  assert.equal(next[sideLamp.id].x, sideLamp.x + 300);
  assert.equal(next[sideLamp.id].y, sideLamp.y + 200);
  const lampOnly = moveItem(french, {}, sideLamp.id, sideLamp.x + 100, sideLamp.y, { snap: false });
  assert.deepEqual(Object.keys(lampOnly), [sideLamp.id]);
});

test('rotation normalises to (-180, 180], skips wall-mounted pieces and orbits riders around the carrier', () => {
  assert.equal(rotateItem(french, {}, coffee.id, coffee.r + 180)[coffee.id].r, -90);
  const wall = {};
  assert.equal(rotateItem(french, wall, westArt.id, 0), wall);
  // carry the lamp off-centre, then turn the table half a turn: the lamp ends up mirrored
  const offset = moveItem(french, {}, sideLamp.id, sideTable.x + 100, sideTable.y, { snap: false });
  const turned = rotateItem(french, offset, sideTable.id, 180);
  assert.equal(turned[sideLamp.id].x, sideTable.x - 100);
  assert.equal(turned[sideLamp.id].y, sideTable.y);
  assert.equal(turned[sideLamp.id].r, 180);
});

test('resizing clamps to 100 mm minimum and 3x maximum, and scales rider offsets in the carrier frame', () => {
  const tiny = resizeItem(french, {}, coffee.id, { sx: 0.01, sz: 0.01 });
  const fp = footprint(french, coffee, itemState(coffee, tiny));
  assert.ok(fp[2] - fp[0] >= 99.5 && fp[3] - fp[1] >= 99.5, `footprint ${fp} below 100 mm`);
  assert.equal(resizeItem(french, {}, coffee.id, { sx: 10 }, { collide: false })[coffee.id].sx, 3);
  const offset = moveItem(french, {}, sideLamp.id, sideTable.x + 100, sideTable.y, { snap: false });
  const wider = resizeItem(french, offset, sideTable.id, { sx: 2, sz: 1 }, { collide: false });
  assert.equal(wider[sideLamp.id].x, sideTable.x + 200);
});

test('small pieces can always return to their own size', () => {
  const bowl = find(french, (b) => b.a === 'bowl');
  assert.deepEqual(resizeItem(french, resizeItem(french, {}, bowl.id, { sx: 2, sz: 2 }), bowl.id, { sx: 1, sz: 1 }), {});
});

test('returning an item to its defaults drops it from the layout; resetItem clears it', () => {
  const moved = moveItem(french, {}, coffee.id, 2500, 12000);
  assert.deepEqual(moveItem(french, moved, coffee.id, coffee.x, coffee.y, { snap: false }), {});
  assert.deepEqual(resetItem(french, moved, coffee.id), {}, 'the books and bowl on the coffee table go back with it');
  const turned = resizeItem(french, rotateItem(french, moved, coffee.id, 30), coffee.id, { sx: 1.5 });
  assert.deepEqual(resetItem(french, turned, coffee.id), {});
});

test('rugs move, rotate and resize like furniture', () => {
  let l = moveItem(french, {}, firstRug.id, firstRug.x - 200, firstRug.y, { snap: false });
  l = rotateItem(french, l, firstRug.id, 90, { collide: false });
  l = resizeItem(french, l, firstRug.id, { sx: 0.5, sz: 1 }, { collide: false });
  assert.deepEqual(l[firstRug.id], { x: firstRug.x - 200, y: firstRug.y, z: 0, r: 90, sx: 0.5, sy: 1, sz: 1 });
});

test('history: undo/redo walk snapshots, a new edit clears redo, depth is capped', () => {
  const h = createHistory(3);
  assert.equal(h.canUndo(), false);
  h.push({}); // before edit 1 → now {a}
  h.push({ a: 1 }); // before edit 2 → now {a, b}
  assert.deepEqual(h.undo({ a: 1, b: 2 }), { a: 1 });
  assert.deepEqual(h.undo({ a: 1 }), {});
  assert.equal(h.undo({}), null);
  assert.deepEqual(h.redo({}), { a: 1 });
  h.push({ a: 1 });
  assert.equal(h.canRedo(), false);
  for (let i = 0; i < 5; i++) h.push({ i });
  let n = 0;
  while (h.undo({})) n++;
  assert.equal(n, 3);
});

test('history snapshots are isolated from later mutation of the live layout', () => {
  const h = createHistory();
  const live = { a: { x: 1 } };
  h.push(live);
  live.a.x = 2;
  assert.deepEqual(h.undo(live), { a: { x: 1 } });
});

test('serialise → parse round-trips and records the asset of every entry', () => {
  let l = moveItem(french, {}, coffee.id, 2500, 12000);
  l = rotateItem(french, l, coffee.id, 45);
  const doc = serializeLayout('french', l, french);
  assert.equal(doc.v, LAYOUT_VERSION);
  assert.equal(doc.style, 'french');
  assert.equal(doc.items[coffee.id].a, 'coffee_table');
  assert.deepEqual(parseLayout(JSON.stringify(doc), 'french', french), l);
});

test('parsing rejects foreign or broken documents and skips stale entries', () => {
  const doc = serializeLayout('french', moveItem(french, {}, coffee.id, 2500, 12000), french);
  assert.throws(() => parseLayout('not json', 'french', french), /JSON/);
  assert.throws(() => parseLayout({ ...doc, v: 99 }, 'french', french), /版本/);
  assert.throws(() => parseLayout(doc, 'italian', ctxFor('italian')), /风格/);
  const stale = { ...doc, items: { ...doc.items, nope: { a: 'sofa', x: 1, y: 1, r: 0 }, [sideTable.id]: { a: 'not_this_asset', x: 1, y: 1, r: 0 } } };
  assert.deepEqual(Object.keys(parseLayout(stale, 'french', french)).sort(), Object.keys(doc.items).sort());
  const wild = { ...doc, items: { [coffee.id]: { a: 'coffee_table', x: 2500, y: 12000, r: 720, sx: 99, sy: 'x', sz: -1 } } };
  assert.deepEqual(parseLayout(wild, 'french', french)[coffee.id], { x: 2500, y: 12000, z: 0, r: 0, sx: 3, sy: 1, sz: 0.2 });
});

test('layouts persist per style and survive corrupted storage', () => {
  const storage = memoryStorage();
  const l = moveItem(french, {}, coffee.id, 2500, 12000);
  saveLayout(storage, 'french', l, french);
  assert.ok(storage.data.has(storageKey('french')));
  assert.deepEqual(loadLayout(storage, 'french', french), l);
  assert.deepEqual(loadLayout(storage, 'italian', ctxFor('italian')), {});
  storage.setItem(storageKey('french'), '{broken');
  assert.deepEqual(loadLayout(storage, 'french', french), {});
  saveLayout(storage, 'french', {}, french);
  assert.equal(storage.data.has(storageKey('french')), false, 'an empty layout clears its entry');
  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  assert.deepEqual(loadLayout(throwing, 'french', french), {});
  assert.doesNotThrow(() => saveLayout(throwing, 'french', l, french));
});

// ------------------------------------------------------------------ collisions
const sofa = find(french, (b) => b.a === 'sofa');
const wardrobe1 = find(french, (b) => b.a === 'wardrobe' && b.room === 'bed1');
const console0 = find(french, (b) => b.a === 'console');
const mirror0 = find(french, (b) => b.a === 'mirror_ornate');
const diningChair = find(french, (b) => b.a === 'dining_chair');
const diningTable = find(french, (b) => b.a === 'dining_table');
const fpWidth = (ctx, b, l) => { const f = footprint(ctx, b, itemState(b, l)); return [f[2] - f[0], f[3] - f[1]]; };

test('default tables: floor pieces do not overlap, decor rests on its carrier, wall contacts stay within the placement tolerance', () => {
  for (const styleId of Object.keys(TABLES)) {
    const ctx = ctxFor(styleId);
    const floor = (id) => { const it = ctx.items.get(id); return it && !it.z && !it.wall; };
    const bad = [];
    for (const b of ctx.list) {
      for (const [k, d] of contacts(ctx, {}, b.id)) {
        if (k === 'outside') bad.push(`${b.id} ${b.a} leaves the building`);
        // headboards and backs sit on the structural wall: 40 mm (placement.test.js) + the finish board
        else if (k.startsWith('wall:')) { if (!b.corner && d > 40 + WALL_FINISH) bad.push(`${b.id} ${b.a} → ${k} ${d.toFixed(0)} mm`); }
        // same scope as placement.test.js: floor-standing pieces against each other
        else if (floor(b.id) && floor(k)) bad.push(`${b.id} ${b.a} → ${k} ${d.toFixed(0)} mm`);
      }
    }
    assert.deepEqual(bad, [], `[${styleId}] ${bad.join('; ')}`);
  }
  const modern = ctxFor('modern');
  const console1 = find(modern, (b) => b.a === 'mo_console');
  assert.ok(ridersOf(modern, {}, console1.id).length >= 2, 'the vase and books ride on the Modern console (top below its bbox)');
});

test('an overlap already in the table does not trap the piece: it can move out, not further in', () => {
  // Modern master bedroom: the floating nightstand reaches ~30 mm into the bed
  const modern = ctxFor('modern');
  const stand = find(modern, (b) => b.a === 'mo_nightstand' && b.room === 'bed3');
  const bed = find(modern, (b) => b.a === 'mo_bed_queen');
  assert.ok(collisions(modern, {}, stand.id).includes(bed.id));
  assert.ok(moveItem(modern, {}, stand.id, stand.x, stand.y - 200, { snap: false })[stand.id], 'slides out along the wall');
  assert.equal(moveItem(modern, {}, stand.id, stand.x, stand.y + 100, { snap: false })[stand.id], undefined, 'not deeper into the bed');
});

test('a piece that starts against the structural wall can slide along it but not push further in', () => {
  const bed = find(french, (b) => b.a === 'bed_queen');
  const depth = () => Math.max(...contacts(french, {}, bed.id).values());
  assert.ok(depth() > WALL_FINISH, 'the master bed headboard starts inside the finish zone');
  assert.ok(moveItem(french, {}, bed.id, bed.x - 40, bed.y, { snap: false })[bed.id], 'slides along the wall (away from the east-wall corner)');
  assert.equal(moveItem(french, {}, bed.id, bed.x, bed.y - 50, { snap: false })[bed.id], undefined, 'cannot be pushed into it');
  assert.ok(moveItem(french, {}, bed.id, bed.x, bed.y + 50, { snap: false })[bed.id], 'can be pulled away');
});

test('a drag that would push furniture into another piece is refused', () => {
  const l = moveItem(french, {}, coffee.id, sofa.x - 300, coffee.y);
  assert.equal(l[coffee.id], undefined, 'the coffee table may not slide into the sofa');
  assert.ok(collisions(french, moveItem(french, {}, coffee.id, sofa.x - 300, coffee.y, { collide: false }), coffee.id).includes(sofa.id));
});

test('furniture may not cut into a wall, but may stand flush against its finish', () => {
  const half = fpWidth(french, coffee, {})[0] / 2;
  const into = moveItem(french, {}, coffee.id, 240 + WALL_FINISH + half - 30, 13700, { snap: false });
  assert.equal(into[coffee.id], undefined);
  const flush = moveItem(french, {}, coffee.id, 240 + WALL_FINISH + half, 13700, { snap: false });
  assert.equal(flush[coffee.id].x, 240 + WALL_FINISH + half);
});

test('rotating or resizing into a wall or a neighbour is refused', () => {
  const turned = {};
  assert.equal(rotateItem(french, turned, wardrobe1.id, 90), turned, 'a 1600 wardrobe turned 90° would pierce the bedroom wall');
  const grown = {};
  assert.equal(resizeItem(french, grown, coffee.id, { sz: 3 }), grown, 'a coffee table three times as deep would run into the sofa');
  assert.ok(resizeItem(french, {}, coffee.id, { sz: 1.1 })[coffee.id], 'a modest resize is fine');
});

test('pieces at different heights do not collide (mirror above the console)', () => {
  assert.ok(moveItem(french, {}, mirror0.id, console0.x + 200, mirror0.y, { snap: false })[mirror0.id]);
});

test('chairs may tuck under a table; rugs ignore furniture but not walls', () => {
  const toward = { x: Math.round((diningChair.x * 4 + diningTable.x) / 5), y: Math.round((diningChair.y * 4 + diningTable.y) / 5) };
  assert.ok(moveItem(french, {}, diningChair.id, toward.x, toward.y, { snap: false })[diningChair.id]);
  assert.ok(moveItem(french, {}, firstRug.id, firstRug.x - 400, firstRug.y, { snap: false })[firstRug.id], 'a rug slides under the armchairs and table');
  assert.equal(moveItem(french, {}, firstRug.id, 900, firstRug.y, { snap: false })[firstRug.id], undefined, 'but not through the west wall');
});

test('collision checks can be switched off', () => {
  assert.ok(moveItem(french, {}, coffee.id, sofa.x - 300, coffee.y, { collide: false })[coffee.id]);
  assert.ok(rotateItem(french, {}, wardrobe1.id, 90, { collide: false })[wardrobe1.id]);
  assert.ok(resizeItem(french, {}, coffee.id, { sz: 3 }, { collide: false })[coffee.id]);
});

test('vertical extent comes from the model, not just z: a hook rail hung above the bench does not collide', () => {
  const it = ctxFor('italian');
  const rail = find(it, (b) => b.a === 'it_hook_rail'), bench = find(it, (b) => b.a === 'it_bench');
  assert.ok(rail && bench);
  assert.deepEqual(collisions(it, {}, rail.id).filter((k) => k === bench.id), []);
});

// ------------------------------------------------------------------ review regressions
test('a uniform resize keeps the proportions: one shared factor clamped to the tightest axis', () => {
  const st = resizeItem(french, {}, westArt.id, { sx: 0.3, sy: 0.3, sz: 0.3 }, { collide: false })[westArt.id];
  assert.deepEqual([st.sx, st.sy, st.sz], [0.3, 0.3, 0.3], 'a 43 mm deep painting still scales down as a whole');
  const candle = find(french, (b) => b.a === 'candlestick');
  const small = resizeItem(french, {}, candle.id, { sx: 0.2, sy: 0.2, sz: 0.2 }, { collide: false })[candle.id];
  if (small) assert.ok(small.sx === small.sy && small.sy === small.sz, 'never distorted');
});

test('saving without storage reports failure', () => {
  assert.equal(saveLayout(null, 'french', moveItem(french, {}, coffee.id, 2500, 12000), french), false);
});

test('pieces in an annex keep its room label (主卧玄关 stays 主卧玄关)', () => {
  for (const styleId of Object.keys(TABLES)) {
    const ctx = ctxFor(styleId);
    for (const b of ctx.list.filter((x) => x.room === 'vestibule')) assert.equal(roomOf(ctx, b, itemState(b, {})), 'vestibule', `${styleId} ${b.a}`);
  }
});

// ------------------------------------------------------------------ direct-manipulation helpers
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;

test('transformItem sets position, rotation and scale in one step and carries riders', () => {
  const l = transformItem(french, {}, sideTable.id, { x: sideTable.x - 300, y: sideTable.y + 200, r: 90, sx: 1.2, sz: 1.2 }, { collide: false });
  assert.deepEqual(l[sideTable.id], { x: sideTable.x - 300, y: sideTable.y + 200, z: 0, r: 90, sx: 1.2, sy: 1, sz: 1.2 });
  assert.equal(l[sideLamp.id].x, sideLamp.x - 300, 'the centred lamp follows the table');
  assert.equal(l[sideLamp.id].r, 90);
  const none = {};
  assert.equal(transformItem(french, none, coffee.id, { x: coffee.x }), none, 'no change → same layout');
  assert.equal(transformItem(french, none, westArt.id, { r: 0 }), none, 'wall pieces keep their angle');
});

test('dragging a corner resizes from the opposite corner, which stays put', () => {
  const st = itemState(coffee, {});
  const before = itemOutline(french, coffee, st);
  // corner 2 is opposite corner 0; pull it 200 mm further out along the piece's local x
  const rad = (st.r * Math.PI) / 180, ux = [Math.cos(rad), -Math.sin(rad)];
  const l = resizeFromCorner(french, {}, coffee.id, 2, before[2][0] + ux[0] * 200, before[2][1] + ux[1] * 200, { collide: false, snap: false });
  const after = itemOutline(french, coffee, itemState(coffee, l));
  assert.ok(near(after[0][0], before[0][0]) && near(after[0][1], before[0][1]), `anchor moved: ${before[0]} → ${after[0]}`);
  const b = french.bounds.get(coffee.id);
  assert.ok(near(l[coffee.id].sx * (b.x2 - b.x1), b.x2 - b.x1 + 200, 2), 'width grew by 200 mm');
  assert.equal(l[coffee.id].sz, 1, 'depth unchanged');
});

test('corner resizing snaps sizes to 10 mm and never inverts the piece', () => {
  const st = itemState(coffee, {});
  const o = itemOutline(french, coffee, st);
  const rad = (st.r * Math.PI) / 180, ux = [Math.cos(rad), -Math.sin(rad)];
  const l = resizeFromCorner(french, {}, coffee.id, 2, o[2][0] + ux[0] * 37, o[2][1] + ux[1] * 37, { collide: false });
  const b = french.bounds.get(coffee.id);
  assert.equal(Math.round(itemState(coffee, l).sx * (b.x2 - b.x1)), b.x2 - b.x1 + 40, '1200 + 37 → 1240');
  const flipped = resizeFromCorner(french, {}, coffee.id, 2, o[0][0] - 500, o[0][1] - 500, { collide: false });
  const fp = footprint(french, coffee, itemState(coffee, flipped));
  assert.ok(fp[2] - fp[0] >= 99 && fp[3] - fp[1] >= 99, 'clamped to the 100 mm minimum instead of flipping');
});

test('uniform pieces resize proportionally from a corner; wall pieces resize about their wall point', () => {
  const o = itemOutline(french, westArt, itemState(westArt, {}));
  const l = resizeFromCorner(french, {}, westArt.id, 1, westArt.x + (o[1][0] - westArt.x) * 0.5, westArt.y + (o[1][1] - westArt.y) * 0.5, { collide: false, snap: false });
  const st = l[westArt.id];
  assert.ok(st && st.sx === st.sy && st.sy === st.sz && st.sx < 1, 'shrinks as a whole');
  assert.equal(st.x, westArt.x, 'stays on its wall');
});

test('rotation handle: pointing straight "behind" a piece keeps its angle; 15° steps unless free', () => {
  const st = itemState(coffee, {});
  const rad = (st.r * Math.PI) / 180;
  const back = [st.x - Math.sin(rad) * 800, st.y - Math.cos(rad) * 800];
  assert.equal(rotationFromHandle(st, back[0], back[1], 15), st.r);
  assert.equal(rotationFromHandle({ ...st, r: 0 }, st.x - 100, st.y - 100, 15), 45);
  assert.equal(rotationFromHandle({ ...st, r: 0 }, st.x - 100, st.y - 120, 0), Math.round(Math.atan2(100, 120) * 1800 / Math.PI) / 10);
});

test('wall clearances measure from the footprint to the nearest wall face on each side', () => {
  const l = moveItem(french, {}, coffee.id, 240 + WALL_FINISH + 325 + 500, 13700, { snap: false, collide: false });
  const fp = footprint(french, coffee, itemState(coffee, l));
  const left = wallClearances(french, l, coffee.id).find((c) => c.side === 'left');
  assert.ok(left, 'has a west clearance');
  assert.ok(near(left.d, fp[0] - (240 + WALL_FINISH)), `west gap ${left.d}`);
  assert.deepEqual(left.b, [fp[0] - left.d, left.a[1]]);
  for (const c of wallClearances(french, l, coffee.id)) assert.ok(c.d >= 0);
});
