// Builds the architectural shell (structure + finishes) from plan.js for a
// given style descriptor (styles.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ROOMS, OPENINGS, WALL_H, CEIL_H, computeWalls, wallPieces, unionOutline, roomAt, planBounds } from './plan.js';

const S = 0.001; // mm -> m
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Y = V(0, 1, 0);

// ------------------------------------------------------------ geometry utils
function boxGeom(x1, y1, x2, y2, z0, z1) {
  const g = new THREE.BoxGeometry((x2 - x1) * S, (z1 - z0) * S, (y2 - y1) * S);
  g.translate(((x1 + x2) / 2) * S, ((z0 + z1) / 2) * S, ((y1 + y2) / 2) * S);
  return g;
}

// Quad in world space with UVs in metres / uvScale (p0..p3 counter-clockwise from the front).
function quad(p0, p1, p2, p3, uvScale = 1) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array([...p0, ...p1, ...p2, ...p0, ...p2, ...p3]);
  const e1 = new THREE.Vector3().fromArray(p1).sub(new THREE.Vector3().fromArray(p0));
  const e2 = new THREE.Vector3().fromArray(p3).sub(new THREE.Vector3().fromArray(p0));
  const lu = e1.length(), lv = e2.length();
  const uv = new Float32Array([0, 0, lu / uvScale, 0, lu / uvScale, lv / uvScale, 0, 0, lu / uvScale, lv / uvScale, 0, lv / uvScale]);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

function worldUV(q, tile) {
  const uv = q.getAttribute('uv'), pos = q.getAttribute('position');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / tile, -pos.getZ(i) / tile);
  return q;
}

// Extrude a closed 2D profile [(d, h)...] along `dir` for `length` metres.
function extrudeProfile(profile, origin, dir, normal, up, length, ext = 0) {
  const pts = profile.map(([d, h]) => new THREE.Vector3().copy(normal).multiplyScalar(d * S).addScaledVector(up, h * S));
  const a = new THREE.Vector3().copy(origin).addScaledVector(dir, -ext * S);
  const b = new THREE.Vector3().copy(origin).addScaledVector(dir, (length + ext) * S);
  const tri = [];
  const push = (v) => tri.push(v.x, v.y, v.z);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const a0 = a.clone().add(p), a1 = a.clone().add(q), b0 = b.clone().add(p), b1 = b.clone().add(q);
    push(a0); push(b0); push(b1);
    push(a0); push(b1); push(a1);
  }
  for (let i = 1; i < pts.length - 1; i++) {
    push(a.clone().add(pts[0])); push(a.clone().add(pts[i + 1])); push(a.clone().add(pts[i]));
    push(b.clone().add(pts[0])); push(b.clone().add(pts[i])); push(b.clone().add(pts[i + 1]));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tri), 3));
  g.computeVertexNormals();
  return g;
}

const PROFILES = {
  skirting: [[0, 0], [16, 0], [16, 92], [11, 100], [13, 108], [7, 118], [0, 118]],
  chairRail: [[0, -28], [12, -28], [18, -20], [18, -6], [24, 0], [24, 8], [16, 16], [10, 26], [0, 26]],
  crown: [[0, -120], [8, -120], [14, -108], [16, -80], [30, -60], [56, -44], [82, -20], [100, -10], [100, 0], [0, 0]],
  panel: [[0, 0], [8, 0], [12, 5], [13, 12], [10, 20], [5, 26], [0, 28]],
  flatSkirting: [[0, 0], [12, 0], [12, 60], [0, 60]],
};

// ---------------------------------------------------------------- segments
function edgeSegments(edge) {
  const horizontal = edge.nx === 0;
  const a0 = horizontal ? edge.x1 : edge.y1;
  const a1 = horizontal ? edge.x2 : edge.y2;
  const fixed = horizontal ? edge.y1 : edge.x1;
  const cuts = [];
  for (const op of OPENINGS) {
    const [x1, y1, x2, y2] = op.rect;
    const touches = horizontal ? y1 <= fixed && fixed <= y2 : x1 <= fixed && fixed <= x2;
    if (!touches) continue;
    const c0 = horizontal ? x1 : y1, c1 = horizontal ? x2 : y2;
    if (c1 <= a0 || c0 >= a1) continue;
    cuts.push({ s0: Math.max(a0, c0), s1: Math.min(a1, c1), kind: op.type, op });
  }
  cuts.sort((p, q) => p.s0 - q.s0);
  const segs = [];
  let pos = a0;
  for (const c of cuts) {
    if (c.s0 > pos) segs.push({ s0: pos, s1: c.s0, kind: 'clear' });
    segs.push(c);
    pos = c.s1;
  }
  if (pos < a1) segs.push({ s0: pos, s1: a1, kind: 'clear' });
  return segs.map((sg) => ({ ...sg, start: a0, end: a1 }));
}

function edgeFrame(edge) {
  const horizontal = edge.nx === 0;
  const dir = horizontal ? V(1, 0, 0) : V(0, 0, 1);
  const normal = V(edge.nx, 0, edge.ny);
  const origin = (s, h = 0) => (horizontal ? V(s * S, h * S, edge.y1 * S) : V(edge.x1 * S, h * S, s * S));
  return { horizontal, dir, normal, origin };
}

// ---------------------------------------------------------------- builders
export function buildHouse(M, style) {
  const house = new THREE.Group();
  house.name = 'house';
  const floors = buildFloors(M, style);
  const ceilings = buildCeilings(M, style);
  const structure = buildStructure(M, style);
  const finishes = buildFinishes(M, style);
  const openings = buildOpenings(M, style);
  house.add(floors, ceilings, structure, finishes, openings);
  return { house, floors, ceilings, structure, finishes, openings };
}

export function disposeGroup(group) {
  group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  group.parent?.remove(group);
}

function buildFloors(M, style) {
  const g = new THREE.Group();
  g.name = 'floors';
  for (const room of ROOMS) {
    const mat = M[style.floorOverrides?.[room.id] || style.floors[room.floor]] || M[style.floors.wood];
    const tile = mat.userData.metresPerTile || 1;
    const geoms = room.rects.map(([x1, y1, x2, y2]) => worldUV(quad([x1 * S, 0, y2 * S], [x2 * S, 0, y2 * S], [x2 * S, 0, y1 * S], [x1 * S, 0, y1 * S], tile), tile));
    const mesh = new THREE.Mesh(mergeGeometries(geoms), mat);
    mesh.receiveShadow = true;
    mesh.name = `floor-${room.id}`;
    mesh.userData = { roomId: room.id, pickable: 'room' };
    g.add(mesh);
    if (room.bay) {
      const [x1, y1, x2, y2] = room.bay.rect;
      const box = new THREE.Mesh(boxGeom(x1, y1, x2, y2, 0, room.bay.h), M[style.bay.cladMat]);
      box.castShadow = box.receiveShadow = true;
      box.name = `bay-${room.id}`;
      g.add(box);
      const slab = new THREE.Mesh(boxGeom(x1 - 40, y1, x2, y2, room.bay.h, room.bay.h + 30), M[style.bay.topMat]);
      slab.receiveShadow = true;
      g.add(slab);
    }
  }
  // thresholds: the floor continues through door and arch openings
  const thresholds = { wood: [], stone: [] };
  const woodMat = M[style.floors.wood];
  for (const op of OPENINGS) {
    if (op.type === 'window') continue;
    const [x1, y1, x2, y2] = op.rect;
    const horizontal = x2 - x1 > y2 - y1;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const a = horizontal ? roomAt(mx, y1 - 1) : roomAt(x1 - 1, my);
    const b2 = horizontal ? roomAt(mx, y2 + 1) : roomAt(x2 + 1, my);
    const fkey = (r) => style.floorOverrides?.[r.id] || style.floors[r.floor];
    const wood = a && b2 && fkey(a) === fkey(b2) && fkey(a) === style.floors.wood;
    const q = quad([x1 * S, 0, y2 * S], [x2 * S, 0, y2 * S], [x2 * S, 0, y1 * S], [x1 * S, 0, y1 * S], 1);
    if (wood) thresholds.wood.push(worldUV(q, woodMat.userData.metresPerTile || 1));
    else thresholds.stone.push(q);
  }
  if (thresholds.wood.length) { const m = new THREE.Mesh(mergeGeometries(thresholds.wood), woodMat); m.receiveShadow = true; m.name = 'thresholds-wood'; g.add(m); }
  if (thresholds.stone.length) { const m = new THREE.Mesh(mergeGeometries(thresholds.stone), M[style.thresholdMat]); m.receiveShadow = true; m.name = 'thresholds-stone'; g.add(m); }
  // shadow catcher + slab
  const b = planBounds();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(((b.x1 + b.x2) / 2) * S, -0.16, ((b.y1 + b.y2) / 2) * S);
  ground.receiveShadow = true;
  ground.name = 'ground';
  g.add(ground);
  const slabGeoms = ROOMS.flatMap((r) => [...r.rects, ...(r.bay ? [r.bay.rect] : [])].map(([x1, y1, x2, y2]) => boxGeom(x1, y1, x2, y2, -150, -20)));
  const slab = new THREE.Mesh(mergeGeometries(slabGeoms), M[style.exteriorMat]);
  slab.name = 'slab';
  g.add(slab);
  return g;
}

function buildCeilings(M, style) {
  const g = new THREE.Group();
  g.name = 'ceilings';
  for (const room of ROOMS) {
    const rects = [...room.rects, ...(room.bay ? [room.bay.rect] : [])];
    const geoms = rects.map(([x1, y1, x2, y2]) => quad([x1 * S, CEIL_H * S, y1 * S], [x2 * S, CEIL_H * S, y1 * S], [x2 * S, CEIL_H * S, y2 * S], [x1 * S, CEIL_H * S, y2 * S], 1));
    const mesh = new THREE.Mesh(mergeGeometries(geoms), M.ceiling);
    mesh.name = `ceiling-${room.id}`;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  const roofGeoms = ROOMS.flatMap((r) => [...r.rects, ...(r.bay ? [r.bay.rect] : [])].map(([x1, y1, x2, y2]) => boxGeom(x1, y1, x2, y2, WALL_H, WALL_H + 120)));
  const roof = new THREE.Mesh(mergeGeometries(roofGeoms), M[style.exteriorMat]);
  roof.name = 'roof';
  g.add(roof);
  return g;
}

function buildStructure(M, style) {
  const g = new THREE.Group();
  g.name = 'structure';
  const pieces = wallPieces(computeWalls());
  const geoms = pieces.map((p) => boxGeom(p.rect[0], p.rect[1], p.rect[2], p.rect[3], p.z0, p.z1));
  const mesh = new THREE.Mesh(mergeGeometries(geoms), style.mouldings ? M.plaster : M[style.exteriorMat]);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.name = 'walls';
  g.add(mesh);
  return g;
}

// Finish boards (paint / tiles) plus, per style, French mouldings or Italian
// shadow gaps and cove lighting.
function buildFinishes(M, style) {
  const g = new THREE.Group();
  g.name = 'finishes';
  const byMaterial = new Map();
  const add = (mat, geom) => {
    if (!byMaterial.has(mat)) byMaterial.set(mat, []);
    byMaterial.get(mat).push(geom);
  };
  const OFF = 12; // finish board stands 12 mm proud of the structural wall
  const panelMats = new Map();
  const panelMat = (hex) => {
    if (!panelMats.has(hex)) panelMats.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5 }));
    return panelMats.get(hex);
  };
  const wallMat = (scheme) => {
    if (scheme.stripes) return M.wallpaperStripe(...scheme.stripes);
    if (scheme.paint === undefined) return null;
    return style.wallMaterial === 'microCement' ? M.microCement(scheme.paint) : M.paint(scheme.paint);
  };

  for (const room of ROOMS) {
    const scheme = style.schemes[room.id] || style.schemes.living;
    const paintMat = wallMat(scheme);
    const tileMat = scheme.tile ? M[scheme.tile] : null;
    const trim = style.mouldings ? panelMat(scheme.panel) : M[style.trimMat];
    const rects = [...room.rects, ...(room.bay ? [room.bay.rect] : [])];
    const edges = unionOutline(rects);
    const bayEdge = (e) => room.bay && e.x1 >= room.bay.rect[0] && e.x2 >= room.bay.rect[0];
    for (const edge of edges) {
      const F = edgeFrame(edge);
      const segs = edgeSegments(edge);
      const floorZ = bayEdge(edge) ? room.bay.h : 0;
      const gap = style.shadowGap && !tileMat ? 15 : 0;
      for (const seg of segs) {
        const len = seg.s1 - seg.s0;
        const bands = [];
        if (seg.kind === 'clear') bands.push([floorZ + gap, CEIL_H]);
        else if (seg.kind === 'door' || seg.kind === 'arch') bands.push([seg.op.h, CEIL_H]);
        else if (seg.kind === 'window') {
          if (seg.op.sill > floorZ) bands.push([floorZ + gap, seg.op.sill]);
          bands.push([seg.op.sill + seg.op.h, CEIL_H]);
        }
        const cross = new THREE.Vector3().crossVectors(F.dir, Y);
        const flip = cross.dot(F.normal) < 0;
        const board = (a, b, mat, off = OFF) => {
          const tile = mat.userData.metresPerTile || 1;
          const o = F.origin(seg.s0, a).addScaledVector(F.normal, off * S);
          const p1 = o.clone().addScaledVector(F.dir, len * S);
          const p2 = p1.clone().add(V(0, (b - a) * S, 0));
          const p3 = o.clone().add(V(0, (b - a) * S, 0));
          return flip ? quad(o.toArray(), p1.toArray(), p2.toArray(), p3.toArray(), tile) : quad(p1.toArray(), o.toArray(), p3.toArray(), p2.toArray(), tile);
        };
        for (const [z0, z1] of bands) {
          if (z1 - z0 <= 0) continue;
          const zones = [];
          if (tileMat) {
            const t1 = Math.min(z1, scheme.tileTo);
            if (t1 > z0) zones.push([z0, t1, tileMat]);
            if (z1 > scheme.tileTo && paintMat) zones.push([Math.max(z0, scheme.tileTo), z1, paintMat]);
          } else if (paintMat) zones.push([z0, z1, paintMat]);
          for (const [a, b, mat] of zones) add(mat, board(a, b, mat));
        }
        // shadow gap: a dark recessed strip below the board
        if (gap && (seg.kind === 'clear' || (seg.kind === 'window' && seg.op.sill > floorZ + 200))) add(M.trimDark, board(floorZ, floorZ + gap, M.trimDark, 4));

        const isClearFloor = seg.kind === 'clear' || (seg.kind === 'window' && seg.op.sill > floorZ + 200);
        const extStart = seg.s0 === seg.start ? 20 : 0;
        const extEnd = seg.s1 === seg.end ? 20 : 0;
        const mould = (profile, h, s0, e0, e1) => {
          const o = F.origin(s0, h).addScaledVector(F.normal, OFF * S).addScaledVector(F.dir, -e0 * S);
          return extrudeProfile(profile, o, F.dir, F.normal, Y, len + e0 + e1, 0);
        };
        if (style.mouldings) {
          const wainscot = scheme.wainscot && seg.kind !== 'door' && seg.kind !== 'arch';
          if (isClearFloor && !tileMat) add(trim, mould(PROFILES.skirting, floorZ, seg.s0, extStart, extEnd));
          if (isClearFloor && tileMat) add(trim, mould([[0, 0], [10, 0], [10, 80], [0, 80]], floorZ, seg.s0, extStart, extEnd));
          const glazing = seg.kind === 'window' && seg.op.style === 'glazing';
          if (!glazing && (seg.kind !== 'window' || seg.op.sill + seg.op.h < CEIL_H - 130)) {
            add(trim, mould(PROFILES.crown, CEIL_H, seg.s0, seg.kind === 'clear' ? extStart : 0, seg.kind === 'clear' ? extEnd : 0));
          }
          const railOk = wainscot && isClearFloor && (seg.kind !== 'window' || seg.op.sill > scheme.chairRail + 60);
          if (railOk) add(trim, mould(PROFILES.chairRail, scheme.chairRail, seg.s0, extStart, extEnd));
          if (wainscot && isClearFloor) {
            const lowTop = (seg.kind === 'window' ? Math.min(scheme.chairRail, seg.op.sill) : scheme.chairRail) - 40;
            const lowBottom = floorZ + 118 + 70;
            if (lowTop - lowBottom > 200) panelRow(seg, F, trim, lowBottom, lowTop, len, add);
            if (scheme.upperPanels && seg.kind === 'clear') panelRow(seg, F, trim, scheme.chairRail + 110, CEIL_H - 130 - 120, len, add, 1);
          }
        } else if (isClearFloor && tileMat) {
          add(trim, mould(PROFILES.flatSkirting, floorZ, seg.s0, extStart, extEnd));
        }
        // cove light: warm strip just under the ceiling
        if (style.cove && scheme.cove && seg.kind === 'clear') add(M.cove, board(CEIL_H - 70, CEIL_H - 30, M.cove, OFF + 2));
      }
    }
  }
  for (const [mat, geoms] of byMaterial) {
    const mesh = new THREE.Mesh(mergeGeometries(geoms), mat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = mat === M.cove ? 'cove' : 'finish';
    g.add(mesh);
  }
  return g;
}

function panelRow(seg, F, trim, z0, z1, len, add, minPanels = 1) {
  const margin = 90;
  const usable = len - 2 * margin;
  if (usable < 300) return;
  const target = z1 - z0 > 1200 ? 800 : 700;
  const n = Math.max(minPanels, Math.round(usable / target));
  const gap = 90;
  const w = (usable - gap * (n - 1)) / n;
  if (w < 250) return;
  const OFF = 12;
  for (let i = 0; i < n; i++) frame(seg.s0 + margin + i * (w + gap), z0, w, z1 - z0);
  function frame(s, z, w, h) {
    const p = PROFILES.panel;
    const base = (ss, hh) => F.origin(ss, hh).addScaledVector(F.normal, OFF * S);
    add(trim, extrudeProfile(p, base(s, z), F.dir, F.normal, Y, w, 0));
    add(trim, extrudeProfile(p, base(s, z + h), F.dir, F.normal, Y.clone().negate(), w, 0));
    add(trim, extrudeProfile(p, base(s, z), Y, F.normal, F.dir, h, 0));
    add(trim, extrudeProfile(p, base(s + w, z), Y, F.normal, F.dir.clone().negate(), h, 0));
  }
}

// ---------------------------------------------------------------- openings
function buildOpenings(M, style) {
  const g = new THREE.Group();
  g.name = 'openings';
  for (const op of OPENINGS) {
    const [x1, y1, x2, y2] = op.rect;
    const horizontal = x2 - x1 > y2 - y1;
    const width = horizontal ? x2 - x1 : y2 - y1;
    const thick = horizontal ? y2 - y1 : x2 - x1;
    const grp = new THREE.Group();
    grp.name = `opening-${op.id}`;
    grp.position.set(((x1 + x2) / 2) * S, 0, ((y1 + y2) / 2) * S);
    if (!horizontal) grp.rotation.y = Math.PI / 2;
    if (op.type === 'window') buildWindow(op, width, thick, grp, M, horizontal, style);
    else if (op.type === 'arch') (style.arch === 'arch' ? buildArch : buildPortal)(op, width, thick, grp, M, style);
    else buildDoor(op, width, thick, grp, M, horizontal, style);
    g.add(grp);
  }
  return g;
}

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w * S, h * S, d * S), mat);
  m.position.set(x * S, y * S, z * S);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function inwardSide(op, horizontal) {
  const [rx1, ry1, rx2, ry2] = op.rect;
  const mid = horizontal ? (ry1 + ry2) / 2 : (rx1 + rx2) / 2;
  const probe = horizontal ? [(rx1 + rx2) / 2, ry1 - 1] : [rx1 - 1, mid];
  const inRoom = roomAt(probe[0], probe[1]);
  return { inRoom, inwardZ: inRoom && inRoom.id !== 'balcony' ? -1 : 1 };
}

function buildWindow(op, width, thick, grp, M, horizontal, style) {
  const W = style.windows;
  const glazing = op.style === 'glazing';
  const frameMat = glazing ? M[W.glazingFrameMat] : M[W.frameMat];
  const z0 = op.sill, z1 = op.sill + op.h;
  const fw = glazing ? 50 : W.grid ? 60 : 45, fd = glazing ? 80 : 60;
  grp.add(box(width, fw, fd, frameMat, 0, z0 + fw / 2, 0));
  grp.add(box(width, fw, fd, frameMat, 0, z1 - fw / 2, 0));
  grp.add(box(fw, op.h, fd, frameMat, -width / 2 + fw / 2, (z0 + z1) / 2, 0));
  grp.add(box(fw, op.h, fd, frameMat, width / 2 - fw / 2, (z0 + z1) / 2, 0));
  const cols = W.grid ? Math.max(1, Math.round(width / (glazing ? 850 : 600))) : Math.max(1, Math.round(width / 1500));
  const rows = W.grid ? (op.h > 1300 ? (glazing ? 2 : 3) : op.h > 900 ? 2 : 1) : glazing ? 1 : 1;
  for (let i = 1; i < cols; i++) grp.add(box(W.grid ? 28 : 36, op.h - 2 * fw, 40, frameMat, -width / 2 + (i * width) / cols, (z0 + z1) / 2, 0));
  for (let j = 1; j < rows; j++) grp.add(box(width - 2 * fw, 28, 40, frameMat, 0, z0 + fw + (j * (op.h - 2 * fw)) / rows, 0));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width * S, op.h * S), M.glass);
  glass.position.set(0, ((z0 + z1) / 2) * S, 0);
  glass.name = 'glass';
  grp.add(glass);
  if (glazing) return;
  const { inRoom, inwardZ } = inwardSide(op, horizontal);
  // sill slabs rise 8 mm above the structural sill so no horizontal faces coincide
  grp.add(box(width + 120, 38, thick + 60, M[W.sillMat], 0, z0 - 11, inwardZ * 30));
  grp.add(box(width + 40, 48, 60, M[style.exteriorMat], 0, z0 - 16, -inwardZ * (thick / 2 + 20)));
  if (W.casing) {
    const c = 80, depth = 22;
    const zc = inwardZ * (thick / 2 + depth / 2 + 12);
    const cas = M[style.trimMat];
    grp.add(box(width + 2 * c, c, depth, cas, 0, z1 + c / 2, zc));
    grp.add(box(c, op.h + c, depth, cas, -width / 2 - c / 2, (z0 + z1) / 2 + c / 2, zc));
    grp.add(box(c, op.h + c, depth, cas, width / 2 + c / 2, (z0 + z1) / 2 + c / 2, zc));
  }
  if (op.id === 'w-bath1' || op.id === 'w-bath2' || op.id === 'w-kitchen') return;
  // curtains
  const colour = W.curtainColours[inRoom?.id] ?? W.curtainDefault;
  if (W.rod) {
    const rodY = Math.min(CEIL_H - 160, z1 + 260);
    const rodZ = inwardZ * (thick / 2 + 130);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(14 * S, 14 * S, (width + 500) * S, 12), M.brass);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, rodY * S, rodZ * S);
    grp.add(rod);
    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.SphereGeometry(30 * S, 12, 8), M.brass);
      fin.position.set(side * (width / 2 + 250) * S, rodY * S, rodZ * S);
      grp.add(fin);
      const pw = Math.max(500, width * 0.32);
      const panel = curtainPanel(pw, rodY - 20, M, colour);
      panel.position.set(side * (width / 2 + 40 - pw / 2) * S, 0, rodZ * S);
      grp.add(panel);
    }
    const sheer = new THREE.Mesh(new THREE.PlaneGeometry(width * S, (rodY - 40) * S), sheerMaterial());
    sheer.position.set(0, ((rodY - 40) / 2) * S, (rodZ - inwardZ * 60) * S);
    grp.add(sheer);
  } else {
    // ceiling track: full-height panels drawn to the sides, sheer across
    const trackZ = inwardZ * (thick / 2 + 140);
    const track = box(width + 600, 24, 60, M.trimDark, 0, CEIL_H - 12, trackZ);
    grp.add(track);
    for (const side of [-1, 1]) {
      const pw = Math.max(550, width * 0.36);
      const panel = curtainPanel(pw, CEIL_H - 30, M, colour, 60);
      panel.position.set(side * (width / 2 + 120 - pw / 2) * S, 0, trackZ * S);
      grp.add(panel);
    }
    const sheer = new THREE.Mesh(new THREE.PlaneGeometry((width + 200) * S, (CEIL_H - 40) * S), sheerMaterial());
    sheer.position.set(0, ((CEIL_H - 40) / 2) * S, (trackZ - inwardZ * 50) * S);
    grp.add(sheer);
  }
}

let SHEER = null;
function sheerMaterial() {
  return SHEER || (SHEER = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, roughness: 1, depthWrite: false }));
}

// Wavy linen curtain panel, origin at the hem.
export function curtainPanel(width, height, M, color = 0xd9cfbf, amp = 45) {
  const seg = 48;
  const geom = new THREE.PlaneGeometry(width * S, height * S, seg, 1);
  const pos = geom.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, Math.sin((x / (width * S)) * Math.PI * 2 * (width / 260)) * amp * S);
  }
  geom.translate(0, (height / 2) * S, 0);
  geom.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide, bumpMap: M.linenBump, bumpScale: 0.3 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  mesh.name = 'curtain';
  return mesh;
}

function buildArch(op, width, thick, grp, M, style) {
  const r = width / 2;
  const spring = op.h - r;
  const shape = new THREE.Shape();
  shape.moveTo(-r * S, spring * S);
  shape.lineTo(-r * S, op.h * S);
  shape.lineTo(r * S, op.h * S);
  shape.lineTo(r * S, spring * S);
  shape.absarc(0, spring * S, r * S, 0, Math.PI, false);
  const geom = new THREE.ExtrudeGeometry(shape, { depth: thick * S, bevelEnabled: false });
  geom.translate(0, 0, (-thick / 2) * S);
  const infill = new THREE.Mesh(geom, M.plaster);
  infill.castShadow = infill.receiveShadow = true;
  grp.add(infill);
  const trim = M[style.trimMat];
  for (const side of [-1, 1]) {
    const ring = new THREE.Shape();
    ring.absarc(0, spring * S, (r + 90) * S, 0, Math.PI, false);
    ring.lineTo(-r * S, spring * S);
    ring.absarc(0, spring * S, r * S, Math.PI, 0, true);
    const rg = new THREE.ExtrudeGeometry(ring, { depth: 22 * S, bevelEnabled: false });
    rg.translate(0, 0, side * (thick / 2) * S + (side > 0 ? 0 : -22 * S));
    const band = new THREE.Mesh(rg, trim);
    band.castShadow = true;
    grp.add(band);
    grp.add(box(90, spring, 22, trim, -r - 45, spring / 2, side * (thick / 2 + 11)));
    grp.add(box(90, spring, 22, trim, r + 45, spring / 2, side * (thick / 2 + 11)));
    grp.add(box(120, 160, 30, trim, 0, op.h + 30, side * (thick / 2 + 15)));
  }
  grp.add(box(30, spring, thick, trim, -r + 15, spring / 2, 0));
  grp.add(box(30, spring, thick, trim, r - 15, spring / 2, 0));
}

// Italian reading of the same opening: a squared portal lined in black steel.
function buildPortal(op, width, thick, grp, M, style) {
  const trim = M[style.trimMat];
  const f = 60;
  grp.add(box(f, op.h, thick + 30, trim, -width / 2 + f / 2, op.h / 2, 0));
  grp.add(box(f, op.h, thick + 30, trim, width / 2 - f / 2, op.h / 2, 0));
  grp.add(box(width, f, thick + 30, trim, 0, op.h - f / 2, 0));
  grp.add(box(width, 60, thick, M[style.thresholdMat], 0, 4, 0)); // stone threshold strip
}

function buildDoor(op, width, thick, grp, M, horizontal, style) {
  const D = style.doors;
  const [rx1, ry1, rx2, ry2] = op.rect;
  const mid = horizontal ? (rx1 + rx2) / 2 : (ry1 + ry2) / 2;
  const near = roomAt(...(horizontal ? [mid, ry1 - 1] : [rx1 - 1, mid]));
  const far = roomAt(...(horizontal ? [mid, ry2 + 1] : [rx2 + 1, mid]));
  const h = op.h;
  const isSliding = op.style === 'sliding-glass';
  const isFrench = op.style === 'french-glass';
  const isEntry = op.style === 'entry';
  const frameMat = M[D.frameMat];
  const leafMat = isEntry ? M[D.entryMat] : M[D.leafMat];

  if (D.casing) {
    const c = 90, depth = 24;
    for (const side of [-1, 1]) {
      if (isEntry && side < 0) continue;
      const zc = side * (thick / 2 + depth / 2 + 12);
      grp.add(box(c, h + c, depth, frameMat, -width / 2 - c / 2, (h + c) / 2, zc));
      grp.add(box(c, h + c, depth, frameMat, width / 2 + c / 2, (h + c) / 2, zc));
      grp.add(box(width + 2 * c, c, depth, frameMat, 0, h + c / 2, zc));
      if (!isSliding) grp.add(box(width + 2 * c + 40, 70, depth + 16, frameMat, 0, h + c + 35, zc + side * 8));
    }
  }
  // jamb lining
  const jw = D.casing ? 30 : 24;
  grp.add(box(jw, h, thick + (D.casing ? 4 : 30), frameMat, -width / 2 + jw / 2, h / 2, 0));
  grp.add(box(jw, h, thick + (D.casing ? 4 : 30), frameMat, width / 2 - jw / 2, h / 2, 0));
  grp.add(box(width, jw, thick + (D.casing ? 4 : 30), frameMat, 0, h - jw / 2, 0));

  if (isSliding) {
    const n = width > 2500 ? 3 : 2;
    const pw = width / n + 30;
    grp.add(box(width, 20, 60, M[D.glassFrameMat], 0, h - 10, 0));
    for (let i = 0; i < n; i++) {
      const panel = new THREE.Group();
      const x = -width / 2 + pw / 2 + i * (width - pw) / (n - 1);
      const z = (i % 2 === 0 ? -1 : 1) * 24;
      const openShift = i === n - 1 ? -pw * 0.7 : 0;
      panel.position.set((x + openShift) * S, 0, z * S);
      const f = 40, gm = M[D.glassFrameMat];
      panel.add(box(pw, f, 36, gm, 0, f / 2, 0));
      panel.add(box(pw, f, 36, gm, 0, h - 30 - f / 2, 0));
      panel.add(box(f, h - 30, 36, gm, -pw / 2 + f / 2, (h - 30) / 2, 0));
      panel.add(box(f, h - 30, 36, gm, pw / 2 - f / 2, (h - 30) / 2, 0));
      if (D.grid) panel.add(box(pw - 2 * f, 24, 30, gm, 0, (h - 30) / 2, 0));
      const glass = new THREE.Mesh(new THREE.PlaneGeometry((pw - 2 * f) * S, (h - 30 - 2 * f) * S), M.glass);
      glass.position.set(0, ((h - 30) / 2) * S, 0);
      panel.add(glass);
      grp.add(panel);
    }
    return;
  }

  const leaves = isFrench ? 2 : 1;
  const leafW = (width - 8) / leaves - 4;
  const swingRoom = op.swing ? (near?.id === op.swing ? near : far) : near;
  const swingSign = swingRoom === near ? -1 : 1;
  const angle = op.id.startsWith('bath') || isEntry ? 0 : isFrench ? 0.55 : 0.45;
  for (let i = 0; i < leaves; i++) {
    const hingeLeft = leaves === 2 ? i === 0 : hingeOnLeft(op, horizontal);
    const pivot = new THREE.Group();
    pivot.position.set((hingeLeft ? -width / 2 + 4 : width / 2 - 4) * S, 0, 0);
    const leaf = isFrench ? makeGlassLeaf(leafW, h - 10, M[D.glassFrameMat], M, D.grid) : D.leaf === 'panel' ? makePanelLeaf(leafW, h - 10, leafMat) : makeFlushLeaf(leafW, h - 10, leafMat);
    leaf.position.x = (hingeLeft ? leafW / 2 : -leafW / 2) * S;
    pivot.add(leaf);
    pivot.rotation.y = -angle * (hingeLeft ? 1 : -1) * swingSign;
    grp.add(pivot);
    const hx = (hingeLeft ? leafW - 70 : -leafW + 70);
    for (const zs of [45, -45]) {
      if (D.handle === 'knob') {
        const knob = new THREE.Mesh(new THREE.SphereGeometry(24 * S, 16, 12), M.brass);
        knob.position.set(hx * S, 1000 * S, zs * S);
        pivot.add(knob);
      } else {
        const lever = new THREE.Group();
        lever.add(box(18, 18, 30, M.metalBlack, 0, 0, 0));
        lever.add(box(hingeLeft ? -140 : 140, 14, 14, M.metalBlack, hingeLeft ? -70 : 70, 0, zs > 0 ? 12 : -12));
        lever.position.set(hx * S, 1020 * S, (zs > 0 ? 36 : -36) * S);
        pivot.add(lever);
      }
    }
  }
}

function hingeOnLeft(op, horizontal) {
  if (!op.hinge) return true;
  return horizontal ? op.hinge === 'w' : op.hinge === 'n';
}

function makePanelLeaf(w, h, mat) {
  const g = new THREE.Group();
  const t = 42;
  g.add(box(w, h, t, mat, 0, h / 2, 0));
  for (const side of [-1, 1]) {
    const zc = side * (t / 2 + 6);
    const m = 95;
    const lower = [m, m, w - 2 * m, h * 0.42];
    const upper = [m, h * 0.42 + m * 1.3, w - 2 * m, h - h * 0.42 - m * 2.3];
    for (const [px, py, pw, ph] of [lower, upper]) {
      const frame = 34;
      g.add(box(pw, frame, 12, mat, px + pw / 2 - w / 2, py + frame / 2, zc));
      g.add(box(pw, frame, 12, mat, px + pw / 2 - w / 2, py + ph - frame / 2, zc));
      g.add(box(frame, ph, 12, mat, px + frame / 2 - w / 2, py + ph / 2, zc));
      g.add(box(frame, ph, 12, mat, px + pw - frame / 2 - w / 2, py + ph / 2, zc));
      g.add(box(pw - 2 * frame - 30, ph - 2 * frame - 30, 6, mat, px + pw / 2 - w / 2, py + ph / 2, zc + side * 2));
    }
  }
  return g;
}

function makeFlushLeaf(w, h, mat) {
  const g = new THREE.Group();
  const leaf = box(w, h, 42, mat, 0, h / 2, 0);
  // veneer grain runs vertically
  leaf.geometry = new THREE.BoxGeometry(w * S, h * S, 42 * S);
  const uv = leaf.geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 1000), uv.getY(i) * (h / 1000));
  g.add(leaf);
  return g;
}

function makeGlassLeaf(w, h, mat, M, grid) {
  const g = new THREE.Group();
  const t = 42;
  const f = grid ? 80 : 50;
  g.add(box(w, grid ? f * 1.6 : f, t, mat, 0, grid ? f * 0.8 : f / 2, 0));
  g.add(box(w, f, t, mat, 0, h - f / 2, 0));
  g.add(box(f, h, t, mat, -w / 2 + f / 2, h / 2, 0));
  g.add(box(f, h, t, mat, w / 2 - f / 2, h / 2, 0));
  const gw = w - 2 * f, gy = grid ? f * 1.6 : f, gh = h - gy - f;
  if (grid) {
    for (let i = 1; i < 2; i++) g.add(box(24, gh, 30, mat, -gw / 2 + (i * gw) / 2, gy + gh / 2, 0));
    for (let j = 1; j < 5; j++) g.add(box(gw, 24, 30, mat, 0, gy + (j * gh) / 5, 0));
  } else {
    g.add(box(gw, 30, 30, mat, 0, gy + gh * 0.3, 0));
  }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(gw * S, gh * S), M.glass);
  glass.position.set(0, (gy + gh / 2) * S, 0);
  g.add(glass);
  return g;
}
