// Furniture layout editing: per-style overrides of the placement tables.
// A layout maps item ids to the transform that differs from the table
// ({ x, y, z, r, sx, sy, sz } — plan mm, yaw in degrees, scale factors on top
// of the table's own `s`). Everything here is pure so it can be unit-tested;
// src/editor.js applies the result to the three.js scene.
//
// Interaction model after wy51ai/floorplan-3d (MIT): 10 mm grid, footprints
// snap flush to nearby walls, snapshot undo/redo, auto-save to localStorage.
import { WALL_MOUNTED } from './furnishings.js';
import { ROOMS, ENVELOPE, roomAt, pointInRect, pointInPolygon, computeWalls } from './plan.js';

export const LAYOUT_VERSION = 1;
export const GRID = 10; // mm
export const SNAP_TOL = 80; // mm: how close a footprint edge must be to a wall to snap
export const WALL_FINISH = 12; // finish boards stand 12 mm proud of the room rectangle (house.js OFF)
export const MIN_SIZE = 100; // mm: smallest footprint edge a resize may produce
export const SCALE_RANGE = [0.2, 3];
const RIDE_TOL = 60; // mm between a carrier's top and the base of a piece standing on it
// Collisions: pieces may touch but not interpenetrate. Furniture outlines are
// shrunk by 30 mm and the soft-pair rule matches test/placement.test.js
// (chairs tuck under tables, plants and lamps lean over things).
const OVERLAP_SHRINK = 30; // mm per side, between two pieces
const WALL_SHRINK = 1; // mm per side: flush against the finish is fine
const SOFT_WALL_SHRINK = 40; // plant canopies and lamp shades may brush a wall
const HEIGHT_TOL = 20; // mm of vertical overlap ignored (a lamp standing on a table)
const DEPTH_EPS = 0.5; // mm: numerical slack when comparing penetration depths
const SOFT = /chair|plant|lamp|bergere|bistro/;

const deg = (d) => (d * Math.PI) / 180;
const round = (v, k = 1) => Math.round(v / k) * k;
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
export const normAngle = (r) => {
  const n = ((((r % 360) + 540) % 360) - 180);
  return n === -180 ? 180 : Math.round(n * 10) / 10 || 0;
};

// ------------------------------------------------------------------ items
// Stable ids come from the position in the style's table, so they survive
// reloads as long as the table is not reordered (entries also record their
// asset, and parseLayout drops any whose asset no longer matches).
export function baseItems({ placements, rugs }) {
  const items = [];
  placements.forEach((p, i) => {
    if (p.skip) return;
    items.push({ id: `p${i}`, kind: 'item', a: p.a, x: p.x, y: p.y, z: p.z || 0, r: p.r || 0, s: p.s || 1, room: p.room, wall: WALL_MOUNTED.has(p.a), corner: !!p.corner });
  });
  rugs.forEach((rg, i) => {
    items.push({ id: `rug${i}`, kind: 'rug', a: 'rug', x: rg.x, y: rg.y, z: 0, r: 0, s: 1, room: rg.room, wall: false, w: rg.w, d: rg.d });
  });
  return items;
}

// Local bounds in mm, in the three.js frame of the unscaled model
// (x = width, z = depth towards the front, y1..y2 = height above the origin,
// h = y2 - y1; wall-hung models are often modelled at their hanging height).
export function boundsFromManifest(entry) {
  if (!entry) return null;
  return { x1: entry.min[0] * 1000, x2: entry.max[0] * 1000, z1: -entry.max[1] * 1000, z2: -entry.min[1] * 1000, y1: entry.min[2] * 1000, y2: entry.max[2] * 1000, h: entry.size[2] * 1000 };
}
// vertical extent [bottom, top] in plan mm
function heightRange(base, st, b) {
  const k = base.s * st.sy;
  return [st.z + (b.y1 ?? 0) * k, st.z + (b.y2 ?? b.h) * k];
}

// boundsOf(base) → local bounds of the model (null when it failed to load)
export function createContext(table, boundsOf) {
  const list = baseItems(table);
  const items = new Map(list.map((b) => [b.id, b]));
  const bounds = new Map();
  for (const b of list) {
    const bb = b.kind === 'rug' ? { x1: -b.w / 2, x2: b.w / 2, z1: -b.d / 2, z2: b.d / 2, y1: 0, y2: 10, h: 10 } : boundsOf(b);
    if (bb) bounds.set(b.id, bb);
  }
  const rects = ROOMS.flatMap((room) => [...room.rects, ...(room.bay ? [room.bay.rect] : [])]);
  // wall footprints grown by the finish boards; door openings count as wall (keep them clear)
  const walls = computeWalls().map(([x1, y1, x2, y2]) => [x1 - WALL_FINISH, y1 - WALL_FINISH, x2 + WALL_FINISH, y2 + WALL_FINISH]);
  return { list, items, bounds, rects, walls };
}

export const uniformScale = (base) => base.kind !== 'rug' && base.z > 0;

export function itemState(base, layout) {
  return { x: base.x, y: base.y, z: base.z, r: base.r, sx: 1, sy: 1, sz: 1, ...(layout[base.id] || {}) };
}

// Where the model origin goes: wall-hung pieces have their origin on the wall
// and are pushed out by the depth behind it (same rule as resolvePlacement).
export function placedOrigin(ctx, base, st) {
  if (!base.wall) return { x: st.x, y: st.y };
  const b = ctx.bounds.get(base.id);
  const back = b ? Math.max(0, -b.z1) * base.s * st.sz : 0;
  const rad = deg(st.r);
  return { x: st.x + Math.sin(rad) * back, y: st.y + Math.cos(rad) * back };
}

// axis-aligned plan rectangle [x1, y1, x2, y2] covered by the item
export function footprint(ctx, base, st) {
  const b = ctx.bounds.get(base.id);
  const o = placedOrigin(ctx, base, st);
  if (!b) return [o.x, o.y, o.x, o.y];
  const ex = base.s * st.sx, ez = base.s * st.sz;
  const rad = deg(st.r), c = Math.cos(rad), s = Math.sin(rad);
  const xs = [], ys = [];
  for (const lx of [b.x1 * ex, b.x2 * ex]) {
    for (const lz of [b.z1 * ez, b.z2 * ez]) {
      xs.push(o.x + lx * c + lz * s);
      ys.push(o.y - lx * s + lz * c);
    }
  }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

const centre = (fp) => [(fp[0] + fp[2]) / 2, (fp[1] + fp[3]) / 2];

// the item's true (rotated) plan outline, each side pulled in by `shrink` mm
function outline(ctx, base, st, shrink) {
  const b = ctx.bounds.get(base.id);
  const o = placedOrigin(ctx, base, st);
  const ex = base.s * st.sx, ez = base.s * st.sz;
  const inset = (lo, hi) => (hi - lo > 2 * shrink ? [lo + shrink, hi - shrink] : [(lo + hi) / 2, (lo + hi) / 2]);
  const [x1, x2] = inset(b.x1 * ex, b.x2 * ex), [z1, z2] = inset(b.z1 * ez, b.z2 * ez);
  const rad = deg(st.r), c = Math.cos(rad), s = Math.sin(rad);
  return [[x1, z1], [x2, z1], [x2, z2], [x1, z2]].map(([lx, lz]) => [o.x + lx * c + lz * s, o.y - lx * s + lz * c]);
}
const rectOutline = ([x1, y1, x2, y2]) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];

// Separating-axis test for two convex quads: 0 when they are apart (touching
// counts as apart), otherwise the penetration depth in mm.
function overlapDepth(a, b) {
  let depth = Infinity;
  for (const poly of [a, b]) {
    for (let i = 0; i < 4; i++) {
      const [px, py] = poly[i], [qx, qy] = poly[(i + 1) % 4];
      const len = Math.hypot(qx - px, qy - py);
      if (len < 1e-9) continue;
      const nx = (py - qy) / len, ny = (qx - px) / len;
      const pa = a.map(([x, y]) => x * nx + y * ny), pb = b.map(([x, y]) => x * nx + y * ny);
      const d = Math.min(Math.max(...pa) - Math.min(...pb), Math.max(...pb) - Math.min(...pa));
      if (d <= 1e-6) return 0;
      depth = Math.min(depth, d);
    }
  }
  return depth === Infinity ? 0 : depth;
}

// What `id` runs into and how deep (mm): 'wall:<i>' for walls (door openings
// count as wall, so doorways stay clear), 'outside' for anything past the
// building outline, or the ids of other pieces.
export function contacts(ctx, layout, id) {
  const base = ctx.items.get(id);
  const b = ctx.bounds.get(id);
  const out = new Map();
  if (!base || !b) return out;
  const st = itemState(base, layout);
  const soft = SOFT.test(base.a);
  const shell = outline(ctx, base, st, soft ? SOFT_WALL_SHRINK : WALL_SHRINK);
  ctx.walls.forEach((w, i) => { const d = overlapDepth(shell, rectOutline(w)); if (d) out.set(`wall:${i}`, d); });
  const off = shell.filter(([x, y]) => !pointInPolygon(x, y, ENVELOPE)).length;
  if (off) out.set('outside', off);
  if (base.kind === 'rug' || base.corner) return out;
  const [z0, z1] = heightRange(base, st, b);
  const mine = outline(ctx, base, st, OVERLAP_SHRINK);
  for (const c of ctx.list) {
    if (c.id === id || c.kind === 'rug' || c.corner || !ctx.bounds.has(c.id)) continue;
    if (soft || SOFT.test(c.a) || restsOn(ctx, layout, c, base) || restsOn(ctx, layout, base, c)) continue;
    const cs = itemState(c, layout), [c0, c1] = heightRange(c, cs, ctx.bounds.get(c.id));
    if (Math.min(z1, c1) - Math.max(z0, c0) <= HEIGHT_TOL) continue;
    const d = overlapDepth(mine, outline(ctx, c, cs, OVERLAP_SHRINK));
    if (d) out.set(c.id, d);
  }
  return out;
}
export const collisions = (ctx, layout, id) => [...contacts(ctx, layout, id).keys()];

// An edit is refused when it creates a contact or pushes deeper into one the
// piece already had: table pieces that start out against the structural wall
// can slide along it or move away, but never further in.
function blocked(ctx, before, after, id) {
  const had = contacts(ctx, before, id);
  for (const [k, d] of contacts(ctx, after, id)) if (d > (had.get(k) || 0) + DEPTH_EPS) return true;
  return false;
}

export function roomOf(ctx, base, st) {
  const room = roomAt(...centre(footprint(ctx, base, st)));
  if (!room) return base.room;
  return room.id === base.room ? base.room : room.partOf || room.id; // annexes (主卧玄关) keep their own label
}

// ------------------------------------------------------------------ edits
function equalsBase(base, st) {
  return st.x === base.x && st.y === base.y && st.z === base.z && st.r === base.r && st.sx === 1 && st.sy === 1 && st.sz === 1;
}
function put(layout, base, st) {
  const clean = { x: round(st.x), y: round(st.y), z: round(st.z), r: normAngle(st.r), sx: st.sx, sy: st.sy, sz: st.sz };
  if (equalsBase(base, clean)) delete layout[base.id];
  else layout[base.id] = clean;
}

// A wall edge counts only if the plan is not a room just beyond it — the
// seams between the rectangles of one room are not walls.
function isWallEdge(rect, side, along) {
  const [x1, y1, x2, y2] = rect;
  const t = Math.min(Math.max(along, side < 2 ? y1 : x1), side < 2 ? y2 : x2);
  const probe = side === 0 ? [x1 - 1, t] : side === 1 ? [x2 + 1, t] : side === 2 ? [t, y1 - 1] : [t, y2 + 1];
  return !roomAt(...probe);
}

function snapPosition(ctx, base, st, x, y) {
  const nx = round(x, GRID), ny = round(y, GRID);
  const fp = footprint(ctx, base, { ...st, x: nx, y: ny });
  const [cx, cy] = centre(fp);
  let bx = SNAP_TOL, by = SNAP_TOL, dx = 0, dy = 0;
  for (const R of ctx.rects) {
    if (fp[3] > R[1] - SNAP_TOL && fp[1] < R[3] + SNAP_TOL) {
      [[R[0] + WALL_FINISH, 0], [R[2] - WALL_FINISH, 1]].forEach(([ex, side]) => {
        if (!isWallEdge(R, side, cy)) return;
        for (const e of [fp[0], fp[2]]) if (Math.abs(ex - e) < bx) { bx = Math.abs(ex - e); dx = ex - e; }
      });
    }
    if (fp[2] > R[0] - SNAP_TOL && fp[0] < R[2] + SNAP_TOL) {
      [[R[1] + WALL_FINISH, 2], [R[3] - WALL_FINISH, 3]].forEach(([ey, side]) => {
        if (!isWallEdge(R, side, cx)) return;
        for (const e of [fp[1], fp[3]]) if (Math.abs(ey - e) < by) { by = Math.abs(ey - e); dy = ey - e; }
      });
    }
  }
  return { x: nx + dx, y: ny + dy };
}

// wall-hung pieces keep their wall: project onto the wall tangent
function alongWall(st, p) {
  const rad = deg(st.r), tx = Math.cos(rad), ty = -Math.sin(rad);
  const t = (p.x - st.x) * tx + (p.y - st.y) * ty;
  return { x: st.x + t * tx, y: st.y + t * ty };
}

// Does `child` stand on / in `carrier` (a lamp on a side table, a vase on a
// console, books on a shelf)? Its base lies inside the carrier's footprint and
// within its height — bounding boxes overstate tops (upstands, headboards).
function restsOn(ctx, layout, child, carrier) {
  if (child.id === carrier.id || child.wall || child.kind === 'rug' || carrier.kind === 'rug') return false;
  const b = ctx.bounds.get(carrier.id);
  if (!b || !ctx.bounds.has(child.id)) return false;
  const cs = itemState(child, layout);
  if (cs.z <= 0) return false;
  const st = itemState(carrier, layout);
  const [z0, z1] = heightRange(carrier, st, b);
  return cs.z >= z0 && cs.z <= z1 + RIDE_TOL && pointInRect(cs.x, cs.y, footprint(ctx, carrier, st));
}

// pieces standing on `id`; they move, turn and scale with it
export function ridersOf(ctx, layout, id) {
  const base = ctx.items.get(id);
  if (!base) return [];
  return ctx.list.filter((c) => restsOn(ctx, layout, c, base)).map((c) => c.id);
}

// The one edit primitive: set any of x, y, r, sx, sy, sz at once. Pieces
// standing on it keep their place relative to it (offsets scale with it).
// Refused (same layout returned) when nothing changes, when the footprint
// centre leaves the floor, or — with `collide` — when it runs into something.
export function transformItem(ctx, layout, id, pose, { collide = true } = {}) {
  const base = ctx.items.get(id);
  if (!base) return layout;
  const st = itemState(base, layout);
  const ns = { ...st };
  for (const k of ['x', 'y', 'r', 'sx', 'sy', 'sz']) if (finite(pose[k])) ns[k] = pose[k];
  if (base.wall) {
    ns.r = st.r; // wall-hung pieces keep facing out of their wall …
    Object.assign(ns, alongWall(st, ns)); // … and stay on it
  }
  ns.x = round(ns.x); ns.y = round(ns.y); ns.r = normAngle(ns.r);
  if (['x', 'y', 'r', 'sx', 'sy', 'sz'].every((k) => ns[k] === st[k])) return layout;
  if (!roomAt(...centre(footprint(ctx, base, ns)))) return layout;
  const riders = ridersOf(ctx, layout, id);
  const next = { ...layout };
  put(next, base, ns);
  const a = deg(st.r), ca = Math.cos(a), sa = Math.sin(a);
  const b = deg(ns.r), cb = Math.cos(b), sb = Math.sin(b);
  const kx = ns.sx / st.sx, ky = ns.sy / st.sy, kz = ns.sz / st.sz;
  for (const rid of riders) {
    const rb = ctx.items.get(rid), rs = itemState(rb, layout);
    // into the carrier's old frame, scale, back out of its new frame
    const dx = rs.x - st.x, dy = rs.y - st.y;
    const lx = (dx * ca - dy * sa) * kx, lz = (dx * sa + dy * ca) * kz;
    put(next, rb, { ...rs, x: ns.x + lx * cb + lz * sb, y: ns.y - lx * sb + lz * cb, z: st.z + (rs.z - st.z) * ky, r: rs.r + (ns.r - st.r) });
  }
  return collide && blocked(ctx, layout, next, id) ? layout : next;
}

export function moveItem(ctx, layout, id, x, y, { snap = true, collide = true } = {}) {
  const base = ctx.items.get(id);
  if (!base) return layout;
  const st = itemState(base, layout);
  let p = base.wall ? alongWall(st, { x, y }) : { x, y };
  if (snap) p = snapPosition(ctx, base, st, p.x, p.y);
  return transformItem(ctx, layout, id, p, { collide });
}

export function rotateItem(ctx, layout, id, r, { collide = true } = {}) {
  return transformItem(ctx, layout, id, { r }, { collide });
}

export function clampScale(ctx, base, axis, v) {
  const b = ctx.bounds.get(base.id);
  const dim = !b ? 0 : axis === 'sx' ? b.x2 - b.x1 : axis === 'sz' ? b.z2 - b.z1 : b.h;
  // the footprint minimum never forbids the table's own size, and height is free
  const lo = Math.min(1, Math.max(SCALE_RANGE[0], axis !== 'sy' && dim > 0 ? MIN_SIZE / (dim * base.s) : 0));
  const k = finite(v) ? v : 1;
  return Math.round(Math.min(SCALE_RANGE[1], Math.max(lo, k)) * 1000) / 1000;
}

// uniform: one shared factor so proportions survive the clamp; the size
// floor applies to the larger footprint edge (a painting is only 43 mm deep)
function clampUniform(ctx, base, k) {
  const b = ctx.bounds.get(base.id);
  const span = b ? Math.max(b.x2 - b.x1, b.z2 - b.z1) * base.s : 0;
  const lo = Math.min(1, Math.max(SCALE_RANGE[0], span > 0 ? MIN_SIZE / span : 0));
  return Math.round((finite(k) ? Math.min(SCALE_RANGE[1], Math.max(lo, k)) : 1) * 1000) / 1000;
}

export function resizeItem(ctx, layout, id, scale, { collide = true } = {}) {
  const base = ctx.items.get(id);
  if (!base) return layout;
  const pose = {};
  if (scale.sx !== undefined && scale.sx === scale.sy && scale.sy === scale.sz) {
    pose.sx = pose.sy = pose.sz = clampUniform(ctx, base, scale.sx);
  } else {
    for (const axis of ['sx', 'sy', 'sz']) if (scale[axis] !== undefined) pose[axis] = clampScale(ctx, base, axis, scale[axis]);
  }
  return transformItem(ctx, layout, id, pose, { collide });
}

// the true (rotated) plan outline: corners [x1,z1] [x2,z1] [x2,z2] [x1,z2] of the local bounds
export function itemOutline(ctx, base, st) {
  return ctx.bounds.has(base.id) ? outline(ctx, base, st, 0) : [];
}

// Drag corner `corner` (index into itemOutline) to plan point (px, py). The
// opposite corner stays where it is; uniform pieces scale as a whole, wall
// pieces about their point on the wall. Sizes snap to 10 mm unless snap: false.
export function resizeFromCorner(ctx, layout, id, corner, px, py, { snap = true, collide = true } = {}) {
  const base = ctx.items.get(id), b = ctx.bounds.get(id);
  if (!base || !b) return layout;
  const st = itemState(base, layout);
  const xs = [b.x1, b.x2, b.x2, b.x1], zs = [b.z1, b.z1, b.z2, b.z2];
  const i = corner, j = (corner + 2) % 4;
  const rad = deg(st.r), ux = [Math.cos(rad), -Math.sin(rad)], uz = [Math.sin(rad), Math.cos(rad)];
  const pts = itemOutline(ctx, base, st);
  const o = placedOrigin(ctx, base, st);
  if (base.wall || uniformScale(base)) {
    const pivot = base.wall ? o : { x: pts[j][0], y: pts[j][1] };
    const d0 = Math.hypot(pts[i][0] - pivot.x, pts[i][1] - pivot.y);
    if (d0 < 1e-6) return layout;
    let k = clampUniform(ctx, base, (st.sx * Math.hypot(px - pivot.x, py - pivot.y)) / d0);
    if (snap) k = Math.round(k * 20) / 20 || k; // 5 % steps
    if (base.wall) return transformItem(ctx, layout, id, { sx: k, sy: k, sz: k }, { collide });
    // keep the anchor corner fixed while the whole piece scales about the origin
    const ax = xs[j] * base.s * k, az = zs[j] * base.s * k;
    return transformItem(ctx, layout, id, { x: pivot.x - ax * ux[0] - az * uz[0], y: pivot.y - ax * ux[1] - az * uz[1], sx: k, sy: k, sz: k }, { collide });
  }
  const A = pts[j], v = [px - A[0], py - A[1]];
  const sgx = Math.sign(xs[i] - xs[j]) || 1, sgz = Math.sign(zs[i] - zs[j]) || 1;
  let w = sgx * (v[0] * ux[0] + v[1] * ux[1]), d = sgz * (v[0] * uz[0] + v[1] * uz[1]);
  if (snap) { w = round(w, GRID); d = round(d, GRID); }
  const sx = clampScale(ctx, base, 'sx', w / ((b.x2 - b.x1) * base.s));
  const sz = clampScale(ctx, base, 'sz', d / ((b.z2 - b.z1) * base.s));
  const ax = xs[j] * base.s * sx, az = zs[j] * base.s * sz;
  return transformItem(ctx, layout, id, { x: A[0] - ax * ux[0] - az * uz[0], y: A[1] - ax * ux[1] - az * uz[1], sx, sz }, { collide });
}

// Yaw that turns the piece's back (local -z, where the rotate handle sits)
// towards plan point (px, py); snapped to `step` degrees (0 = free).
export function rotationFromHandle(st, px, py, step = 15) {
  const r = (Math.atan2(-(px - st.x), -(py - st.y)) * 180) / Math.PI;
  return normAngle(step ? Math.round(r / step) * step : r);
}

// Gaps (mm) from the footprint to the nearest wall face in each plan
// direction, as segments a → b for dimension lines. Only gaps up to `max`.
export function wallClearances(ctx, layout, id, max = 4000) {
  const base = ctx.items.get(id);
  if (!base || !ctx.bounds.has(id)) return [];
  const fp = footprint(ctx, base, itemState(base, layout));
  const [cx, cy] = centre(fp);
  const out = [];
  const best = { left: Infinity, right: Infinity, up: Infinity, down: Infinity };
  for (const w of ctx.walls) {
    if (cy > w[1] && cy < w[3]) {
      if (w[2] <= fp[0] + 0.5) best.left = Math.min(best.left, fp[0] - w[2]);
      if (w[0] >= fp[2] - 0.5) best.right = Math.min(best.right, w[0] - fp[2]);
    }
    if (cx > w[0] && cx < w[2]) {
      if (w[3] <= fp[1] + 0.5) best.up = Math.min(best.up, fp[1] - w[3]);
      if (w[1] >= fp[3] - 0.5) best.down = Math.min(best.down, w[1] - fp[3]);
    }
  }
  const seg = { left: [[fp[0], cy], -1, 0], right: [[fp[2], cy], 1, 0], up: [[cx, fp[1]], 0, -1], down: [[cx, fp[3]], 0, 1] };
  for (const side of ['left', 'right', 'up', 'down']) {
    const d = Math.max(0, best[side]);
    if (!(d <= max)) continue;
    const [a, dx, dy] = seg[side];
    out.push({ side, d: Math.round(d), a, b: [a[0] + dx * d, a[1] + dy * d] });
  }
  return out;
}

// back to the table transform, taking the pieces standing on it along
export function resetItem(ctx, layout, id) {
  const base = ctx.items.get(id);
  if (!base || !(id in layout)) return layout;
  const free = { collide: false }; // the table position is valid by construction
  let next = resizeItem(ctx, layout, id, { sx: 1, sy: 1, sz: 1 }, free);
  next = rotateItem(ctx, next, id, base.r, free);
  next = moveItem(ctx, next, id, base.x, base.y, { snap: false, ...free });
  if (id in next) { next = { ...next }; delete next[id]; }
  return next;
}

// ------------------------------------------------------------------ history
export function createHistory(limit = 150) {
  const undoStack = [], redoStack = [];
  const snap = (layout) => JSON.stringify(layout);
  return {
    push(before) {
      undoStack.push(snap(before));
      if (undoStack.length > limit) undoStack.shift();
      redoStack.length = 0;
    },
    undo(current) {
      if (!undoStack.length) return null;
      redoStack.push(snap(current));
      return JSON.parse(undoStack.pop());
    },
    redo(current) {
      if (!redoStack.length) return null;
      undoStack.push(snap(current));
      return JSON.parse(redoStack.pop());
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    clear() { undoStack.length = 0; redoStack.length = 0; },
  };
}

// ------------------------------------------------------------------ persistence
export const storageKey = (styleId) => `maison-layout-v${LAYOUT_VERSION}:${styleId}`;

export function serializeLayout(styleId, layout, ctx) {
  const items = {};
  for (const [id, st] of Object.entries(layout)) {
    const base = ctx.items.get(id);
    if (base) items[id] = { a: base.a, ...st };
  }
  return { v: LAYOUT_VERSION, style: styleId, items };
}

export function parseLayout(input, styleId, ctx) {
  let doc = input;
  if (typeof input === 'string') {
    try { doc = JSON.parse(input); } catch { throw new Error('不是有效的 JSON 方案文件'); }
  }
  if (!doc || typeof doc !== 'object') throw new Error('不是有效的 JSON 方案文件');
  if (doc.v !== LAYOUT_VERSION) throw new Error(`不支持的方案版本：${doc.v}`);
  if (doc.style !== styleId) throw new Error(`方案风格为「${doc.style}」，与当前风格「${styleId}」不符`);
  if (!doc.items || typeof doc.items !== 'object') throw new Error('方案文件缺少家具数据');
  const layout = {};
  for (const [id, e] of Object.entries(doc.items)) {
    const base = ctx.items.get(id);
    if (!base || !e || e.a !== base.a || !finite(e.x) || !finite(e.y)) continue;
    put(layout, base, {
      x: e.x, y: e.y, z: finite(e.z) ? e.z : base.z, r: finite(e.r) ? e.r : base.r,
      sx: clampScale(ctx, base, 'sx', e.sx), sy: clampScale(ctx, base, 'sy', e.sy), sz: clampScale(ctx, base, 'sz', e.sz),
    });
  }
  return layout;
}

// storage: anything with getItem/setItem/removeItem (localStorage). Private
// windows and blocked storage throw — the editor then works without saving.
export function loadLayout(storage, styleId, ctx) {
  try {
    const raw = storage?.getItem(storageKey(styleId));
    return raw ? parseLayout(raw, styleId, ctx) : {};
  } catch {
    return {};
  }
}

export function saveLayout(storage, styleId, layout, ctx) {
  if (!storage) return false;
  try {
    if (!Object.keys(layout).length) storage?.removeItem(storageKey(styleId));
    else storage?.setItem(storageKey(styleId), JSON.stringify(serializeLayout(styleId, layout, ctx)));
    return true;
  } catch {
    return false;
  }
}
