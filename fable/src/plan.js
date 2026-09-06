// Floor plan of the apartment, derived from the 2D plan image.
// Units: millimetres. Plan axes: x grows east (right), y grows south (down).
// three.js mapping: X = x/1000, Z = y/1000, Y = up.
//
// The main body is 8008 mm wide (outer faces); the bay window of bedroom 2
// adds 845 mm, giving the labelled 8853 mm overall. Overall depth 16375 mm.

export const WALL_H = 2800; // structural slab-to-slab
export const CEIL_H = 2720; // finished ceiling (allows crown moulding drop)
export const EXT_WALL = 240;
export const INT_WALL = 120;

// Outer faces of the building envelope, clockwise, starting at the tatami
// room's north-west corner.
export const ENVELOPE = [
  [1450, 0],
  [8008, 0],
  [8008, 5258],
  [8853, 5258],
  [8853, 8813],
  [8008, 8813],
  [8008, 14607],
  [7272, 14607],
  [7272, 16375],
  [0, 16375],
  [0, 2784],
  [1450, 2784],
];

// Interior floor rectangles [x1, y1, x2, y2]. A room may be a union of
// non-overlapping rectangles. `label` is the area printed on the plan (m²),
// used only to validate the reconstruction.
export const ROOMS = [
  {
    id: 'tatami',
    name: '榻榻米书房',
    bedroom: true,
    label: 8.34,
    rects: [
      [1690, 300, 4500, 2784],
      [2983, 2784, 4500, 3563],
    ],
    floor: 'wood',
  },
  { id: 'bed1', name: '次卧1', bedroom: true, label: 10.01, rects: [[4700, 300, 7768, 3563]], floor: 'wood' },
  { id: 'kitchen', name: '厨房', label: 7.24, rects: [[240, 2967, 2863, 5727]], floor: 'stone' },
  { id: 'bath1', name: '公卫', label: 3.36, rects: [[5521, 3763, 7768, 5258]], floor: 'wet' },
  {
    id: 'living',
    name: '客餐厅',
    label: 39.09,
    rects: [
      [240, 5847, 4200, 14367],
      [2983, 3763, 5401, 5258],
      [2983, 5258, 4200, 5847],
    ],
    floor: 'wood',
  },
  {
    id: 'bed2',
    name: '次卧2',
    bedroom: true,
    label: 13.34,
    rects: [[4320, 5458, 7768, 8613]],
    // raised window seat (飘窗), 450 mm high, glazed on the east face
    bay: { rect: [7768, 5458, 8613, 8613], h: 450 },
    floor: 'wood',
  },
  // The 14.88 m² printed for the master bedroom includes this entry lobby.
  { id: 'vestibule', name: '主卧玄关', partOf: 'bed3', rects: [[4320, 8813, 5277, 10521]], floor: 'wood' },
  { id: 'bath2', name: '主卫', label: 4.05, rects: [[5397, 8813, 7768, 10521]], floor: 'wet' },
  { id: 'bed3', name: '主卧', bedroom: true, label: 14.88, rects: [[4320, 10721, 7768, 14367]], floor: 'wood' },
  { id: 'balcony', name: '阳台', label: 10.4, rects: [[240, 14607, 7032, 16135]], floor: 'outdoor' },
];

// Openings cut through walls. `rect` spans the full wall thickness.
// Doors: h = clear height. Windows: sill + h.
// hinge: side of the opening (n/s/e/w) carrying the hinge; swing: room id the
// leaf opens into. Purely cosmetic.
export const OPENINGS = [
  { id: 'entry', type: 'door', style: 'entry', rect: [0, 6050, 240, 7050], h: 2100, hinge: 's', swing: 'exterior' }, // 防盗门外开
  { id: 'kitchen-door', type: 'door', style: 'sliding-glass', rect: [2863, 3900, 2983, 5100], h: 2200 },
  { id: 'tatami-door', type: 'door', style: 'french-glass', rect: [3200, 3563, 4400, 3763], h: 2200 },
  { id: 'bed1-door', type: 'door', style: 'panel', rect: [4800, 3563, 5650, 3763], h: 2100, hinge: 'w', swing: 'bed1' },
  { id: 'bath1-door', type: 'door', style: 'panel', rect: [5401, 3950, 5521, 4750], h: 2100, hinge: 'n', swing: 'bath1' },
  { id: 'bed2-door', type: 'door', style: 'panel', rect: [4200, 7650, 4320, 8450], h: 2100, hinge: 's', swing: 'bed2' },
  { id: 'suite-arch', type: 'arch', rect: [4200, 9100, 4320, 10200], h: 2350 },
  { id: 'bath2-door', type: 'door', style: 'panel', rect: [5277, 9250, 5397, 10050], h: 2100, hinge: 's', swing: 'vestibule' },
  { id: 'bed3-door', type: 'door', style: 'panel', rect: [4450, 10521, 5300, 10721], h: 2100, hinge: 'w', swing: 'bed3' },
  { id: 'balcony-door', type: 'door', style: 'sliding-glass', rect: [400, 14367, 4000, 14607], h: 2400 },

  { id: 'w-tatami', type: 'window', rect: [1900, 0, 4300, 300], sill: 900, h: 1500 },
  { id: 'w-bed1', type: 'window', rect: [4900, 0, 7500, 300], sill: 900, h: 1500 },
  { id: 'w-kitchen', type: 'window', rect: [0, 3300, 240, 5400], sill: 1000, h: 1300 },
  { id: 'w-bath1', type: 'window', rect: [7768, 4100, 8008, 4900], sill: 1500, h: 700 },
  { id: 'w-bed2-bay', type: 'window', rect: [8613, 5600, 8853, 8450], sill: 450, h: 2000 },
  { id: 'w-bath2', type: 'window', rect: [7768, 9200, 8008, 10000], sill: 1500, h: 700 },
  { id: 'w-bed3-e', type: 'window', rect: [7768, 11200, 8008, 13900], sill: 600, h: 1900 },
  { id: 'w-bed3-s', type: 'window', rect: [4700, 14367, 6900, 14607], sill: 900, h: 1500 },
  { id: 'w-balcony', type: 'window', style: 'glazing', rect: [240, 16135, 7032, 16375], sill: 250, h: 2400 },
];

// ---------------------------------------------------------------------------
// Geometry helpers (pure, unit-testable)

export const rectArea = ([x1, y1, x2, y2]) => Math.max(0, x2 - x1) * Math.max(0, y2 - y1);

export function roomArea(room) {
  const a = room.rects.reduce((s, r) => s + rectArea(r), 0);
  return a / 1e6;
}

export function rectsIntersect(a, b) {
  return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
}

export function rectIntersection(a, b) {
  const r = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
  return r[0] < r[2] && r[1] < r[3] ? r : null;
}

// a minus b -> up to 4 rectangles
export function rectDifference(a, b) {
  const i = rectIntersection(a, b);
  if (!i) return [a];
  const out = [];
  if (i[1] > a[1]) out.push([a[0], a[1], a[2], i[1]]);
  if (i[3] < a[3]) out.push([a[0], i[3], a[2], a[3]]);
  if (i[0] > a[0]) out.push([a[0], i[1], i[0], i[3]]);
  if (i[2] < a[2]) out.push([i[2], i[1], a[2], i[3]]);
  return out;
}

export function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function pointInRect(x, y, r) {
  return x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
}

export function roomAt(x, y, rooms = ROOMS) {
  for (const room of rooms) {
    if (room.rects.some((r) => pointInRect(x, y, r))) return room;
    if (room.bay && pointInRect(x, y, room.bay.rect)) return room;
  }
  return null;
}

function uniqSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

// Rasterise the plan on the grid formed by every x/y coordinate, then merge
// wall cells into rectangles. Returns [x1,y1,x2,y2] wall footprints.
export function computeWalls({ envelope = ENVELOPE, rooms = ROOMS } = {}) {
  const floors = rooms.flatMap((r) => [...r.rects, ...(r.bay ? [r.bay.rect] : [])]);
  const xs = uniqSorted([...envelope.map((p) => p[0]), ...floors.flatMap((r) => [r[0], r[2]])]);
  const ys = uniqSorted([...envelope.map((p) => p[1]), ...floors.flatMap((r) => [r[1], r[3]])]);

  const isWall = (i, j) => {
    const cx = (xs[i] + xs[i + 1]) / 2;
    const cy = (ys[j] + ys[j + 1]) / 2;
    if (!pointInPolygon(cx, cy, envelope)) return false;
    return !floors.some((r) => pointInRect(cx, cy, r));
  };

  // horizontal runs per row
  const rows = [];
  for (let j = 0; j < ys.length - 1; j++) {
    const runs = [];
    let start = -1;
    for (let i = 0; i <= xs.length - 1; i++) {
      const w = i < xs.length - 1 && isWall(i, j);
      if (w && start < 0) start = i;
      if (!w && start >= 0) {
        runs.push([xs[start], ys[j], xs[i], ys[j + 1]]);
        start = -1;
      }
    }
    rows.push(runs);
  }
  // vertical merge of runs with identical x-extent in consecutive rows
  const walls = [];
  const open = new Map(); // key "x1:x2" -> rect
  for (const runs of rows) {
    const next = new Map();
    for (const run of runs) {
      const key = `${run[0]}:${run[2]}`;
      const prev = open.get(key);
      if (prev && prev[3] === run[1]) {
        prev[3] = run[3];
        next.set(key, prev);
      } else {
        next.set(key, run);
      }
    }
    for (const [key, rect] of open) if (!next.has(key)) walls.push(rect);
    open.clear();
    for (const [k, v] of next) open.set(k, v);
  }
  for (const rect of open.values()) walls.push(rect);
  return walls;
}

// Cut openings through wall footprints. Returns 3D boxes:
// { rect, z0, z1, kind: 'wall' | 'lintel' | 'sill', opening? }
export function wallPieces(walls, openings = OPENINGS, wallH = WALL_H) {
  let pieces = walls.map((rect) => ({ rect, z0: 0, z1: wallH, kind: 'wall' }));
  for (const op of openings) {
    const nextPieces = [];
    for (const p of pieces) {
      if (p.kind !== 'wall' || !rectIntersection(p.rect, op.rect)) {
        nextPieces.push(p);
        continue;
      }
      for (const r of rectDifference(p.rect, op.rect)) nextPieces.push({ rect: r, z0: 0, z1: wallH, kind: 'wall' });
      const cut = rectIntersection(p.rect, op.rect);
      const sill = op.type === 'window' ? op.sill : 0;
      const top = sill + op.h;
      if (top < wallH) nextPieces.push({ rect: cut, z0: top, z1: wallH, kind: 'lintel', opening: op.id });
      if (sill > 0) nextPieces.push({ rect: cut, z0: 0, z1: sill, kind: 'sill', opening: op.id });
    }
    pieces = nextPieces;
  }
  return pieces;
}

// Boundary edges of a union of rectangles. Each edge: {x1,y1,x2,y2,nx,ny}
// with (nx,ny) the unit normal pointing INTO the room. Edges are merged when
// collinear and contiguous.
export function unionOutline(rects) {
  const xs = uniqSorted(rects.flatMap((r) => [r[0], r[2]]));
  const ys = uniqSorted(rects.flatMap((r) => [r[1], r[3]]));
  const inside = (i, j) => {
    if (i < 0 || j < 0 || i >= xs.length - 1 || j >= ys.length - 1) return false;
    const cx = (xs[i] + xs[i + 1]) / 2;
    const cy = (ys[j] + ys[j + 1]) / 2;
    return rects.some((r) => pointInRect(cx, cy, r));
  };
  const edges = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      if (!inside(i, j)) continue;
      if (!inside(i, j - 1)) edges.push({ x1: xs[i], y1: ys[j], x2: xs[i + 1], y2: ys[j], nx: 0, ny: 1 });
      if (!inside(i, j + 1)) edges.push({ x1: xs[i], y1: ys[j + 1], x2: xs[i + 1], y2: ys[j + 1], nx: 0, ny: -1 });
      if (!inside(i - 1, j)) edges.push({ x1: xs[i], y1: ys[j], x2: xs[i], y2: ys[j + 1], nx: 1, ny: 0 });
      if (!inside(i + 1, j)) edges.push({ x1: xs[i + 1], y1: ys[j], x2: xs[i + 1], y2: ys[j + 1], nx: -1, ny: 0 });
    }
  }
  // merge collinear contiguous edges with the same normal
  const merged = [];
  const key = (e) => `${e.nx},${e.ny},${e.nx === 0 ? e.y1 : e.x1}`;
  const groups = new Map();
  for (const e of edges) {
    const k = key(e);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  for (const group of groups.values()) {
    const horizontal = group[0].nx === 0;
    group.sort((a, b) => (horizontal ? a.x1 - b.x1 : a.y1 - b.y1));
    let cur = { ...group[0] };
    for (let k = 1; k < group.length; k++) {
      const e = group[k];
      const touches = horizontal ? e.x1 === cur.x2 : e.y1 === cur.y2;
      if (touches) {
        cur.x2 = e.x2;
        cur.y2 = e.y2;
      } else {
        merged.push(cur);
        cur = { ...e };
      }
    }
    merged.push(cur);
  }
  return merged;
}

export function edgeLength(e) {
  return Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
}

// Split an edge by the door/arch openings that touch it (for skirting etc.).
// Returns sub-edges not covered by an opening.
export function edgeMinusOpenings(edge, openings = OPENINGS, types = ['door', 'arch']) {
  const horizontal = edge.nx === 0;
  const a0 = horizontal ? edge.x1 : edge.y1;
  const a1 = horizontal ? edge.x2 : edge.y2;
  const fixed = horizontal ? edge.y1 : edge.x1;
  const cuts = [];
  for (const op of openings) {
    if (!types.includes(op.type)) continue;
    const [x1, y1, x2, y2] = op.rect;
    const touches = horizontal ? y1 <= fixed && fixed <= y2 : x1 <= fixed && fixed <= x2;
    if (!touches) continue;
    const c0 = horizontal ? x1 : y1;
    const c1 = horizontal ? x2 : y2;
    if (c1 <= a0 || c0 >= a1) continue;
    cuts.push([Math.max(a0, c0), Math.min(a1, c1)]);
  }
  cuts.sort((a, b) => a[0] - b[0]);
  const out = [];
  let pos = a0;
  for (const [c0, c1] of cuts) {
    if (c0 > pos) out.push(sub(pos, c0));
    pos = Math.max(pos, c1);
  }
  if (pos < a1) out.push(sub(pos, a1));
  return out;

  function sub(s, e) {
    return horizontal
      ? { ...edge, x1: s, x2: e }
      : { ...edge, y1: s, y2: e };
  }
}

// Walkable test for the first-person controller: inside a room floor, or
// inside a door/arch footprint (which spans the wall thickness).
export function isWalkable(x, y, { rooms = ROOMS, openings = OPENINGS } = {}) {
  if (roomAt(x, y, rooms)) return true;
  return openings.some((op) => (op.type === 'door' || op.type === 'arch') && op.id !== 'entry' && pointInRect(x, y, op.rect));
}

export function planBounds() {
  const xs = ENVELOPE.map((p) => p[0]);
  const ys = ENVELOPE.map((p) => p[1]);
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
}
