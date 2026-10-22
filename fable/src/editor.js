// "布置" mode: a top-down plan view of the real 3D scene in which furniture is
// edited directly — press any piece and drag it, turn it with the gold dot
// behind it, resize it from its corners, fine-tune it in the floating
// toolbar. Every gesture is one undo step; layouts auto-save per style.
// With collision checks on, edits that would cut into a wall or another piece
// are refused: drags slide along the obstacle, which is outlined, and turning
// or resizing holds the last valid pose.
// The layout model (snapping, riders, collisions, history, persistence) is
// src/layout.js; the drawing layer is src/editor-overlay.js.
import * as THREE from 'three';
import { TABLES } from './furnishings.js';
import { WALL_H } from './plan.js';
import {
  createContext, itemState, placedOrigin, roomOf, uniformScale, moveItem, rotateItem, resizeItem, resetItem,
  resizeFromCorner, rotationFromHandle, wallClearances, itemOutline, footprint, contacts,
  createHistory, loadLayout, saveLayout, serializeLayout, parseLayout,
} from './layout.js';
import { createEditOverlay } from './editor-overlay.js';
import { pickEditable, pointInOutline } from './pick.js';

const S = 0.001;
const ROT_SNAP = 15; // degrees; hold Shift for a free angle
const RUG_LIFT = 0.006; // rugs float 6 mm above the floor (furnishings.js)
const STEM = 30; // px from the back edge of the outline to the rotate dot
const CORNER_OUT = 7; // px the corner dots sit outside the outline, so presses on the piece itself move it
const FALLBACK_PX = 30; // px: pieces smaller than this on screen are also picked by their outline
const MIN_CORNERS = 40; // px: below this on-screen size a piece shows no corner dots (use the toolbar's size row)
const EMPTY_VIEW = { hover: null, sel: null, obstacles: [], dims: [], pill: null, gesture: null, toolbar: null };

function storage() {
  try { return window.localStorage; } catch { return null; }
}

export function createEditor({ camera, renderer, orbit, isTouch, host, hooks }) {
  const dom = renderer.domElement;
  const histories = new Map(); // style id → history, so switching styles keeps each one's undo
  let styleId = null, group = null, ctx = null, layout = {}, history = createHistory();
  let objects = new Map(); // layout id → Object3D
  let editing = false, selected = null, hovered = null, enabled = true, saveOk = true, collide = true;
  let gesture = null; // { kind, id, pid, sx, sy, before, last, moved, corner?, plane?, ox?, oy?, h, blocked, obstacles, pill }
  let pressEmpty = null; // pointer down on empty floor: a tap there deselects

  const base = (id) => ctx?.items.get(id);
  const opts = () => ({ collide });
  const notify = () => hooks.onChange?.({ canUndo: history.canUndo(), canRedo: history.canRedo(), saved: saveOk, edited: Object.keys(layout).length });

  // toolbar / keyboard edits: commit, or explain a refusal (fn takes the collision options)
  function attempt(fn) {
    const next = fn(opts());
    if (next === layout && collide && fn({ collide: false }) !== layout) { hooks.onRefused?.(); return false; }
    return commit(next);
  }

  function dimsOf(id, st) {
    const b = ctx.bounds.get(id), it = base(id);
    const w = Math.round((b.x2 - b.x1) * it.s * st.sx), d = Math.round((b.z2 - b.z1) * it.s * st.sz);
    return it.kind === 'rug' ? `${w} × ${d} mm` : `${w} × ${d} × ${Math.round(b.h * it.s * st.sy)} mm`;
  }

  // push a layout onto the scene objects (cheap: ~150 transforms)
  function apply(next, { inventory = true } = {}) {
    for (const [id, obj] of objects) {
      const it = base(id), st = itemState(it, next), o = placedOrigin(ctx, it, st);
      obj.position.set(o.x * S, it.kind === 'rug' ? RUG_LIFT : st.z * S, o.y * S);
      obj.rotation.set(0, THREE.MathUtils.degToRad(st.r), 0);
      obj.scale.set(it.s * st.sx, it.s * st.sy, it.s * st.sz);
      obj.userData.item.room = roomOf(ctx, it, st);
      obj.userData.item.dims = dimsOf(id, st);
    }
    if (inventory) group.userData.rebuildInventory?.();
  }

  // one undo step; a gesture that ends where it began only restores the preview
  function commit(next, before = layout) {
    if (JSON.stringify(next) === JSON.stringify(before)) { apply(layout); return false; }
    history.push(before);
    layout = next;
    apply(layout);
    saveOk = saveLayout(storage(), styleId, layout, ctx);
    notify();
    return true;
  }

  function restore(next) {
    if (!next) return false;
    layout = next;
    apply(layout);
    saveOk = saveLayout(storage(), styleId, layout, ctx);
    notify();
    return true;
  }

  // ---------------------------------------------------------------- geometry
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();
  const v3 = new THREE.Vector3();
  const TAP = isTouch ? 9 : 4;
  function ray(e) {
    const r = dom.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  }
  // plan point (mm) under the pointer on the horizontal plane at height h (m)
  function planAt(e, h) {
    ray(e);
    plane.constant = -h;
    return raycaster.ray.intersectPlane(plane, hitPoint) ? [hitPoint.x / S, hitPoint.z / S] : null;
  }
  // The editable piece under the pointer: the nearest visible one the ray hits
  // (the hidden roof, ceiling roses and chandeliers do not get in the way), else
  // the smallest on-screen outline containing the pointer (thin rugs, tiny decor).
  function pickPiece(e) {
    ray(e);
    const hit = pickEditable(raycaster, [...objects.values()]);
    if (hit) return { id: hit.obj.userData.layoutId, point: hit.point };
    let best = null;
    for (const [id, obj] of objects) {
      if (!obj.visible) continue;
      const poly = polyOf(id, layout);
      // only for small pieces: a bounding outline (the L-shaped kitchen) would swallow its whole room
      const span = Math.max(...poly.map((p) => p[0])) - Math.min(...poly.map((p) => p[0])), tall = Math.max(...poly.map((p) => p[1])) - Math.min(...poly.map((p) => p[1]));
      if (Math.max(span, tall) > FALLBACK_PX || !pointInOutline(poly, e.clientX, e.clientY)) continue;
      const area = Math.abs(poly.reduce((a, [x, y], i) => { const [nx, ny] = poly[(i + 1) % poly.length]; return a + x * ny - nx * y; }, 0)) / 2;
      const rank = (base(id).kind === 'rug' ? 1e12 : 0) + area; // pieces before rugs, then the smallest
      if (!best || rank < best.rank) best = { id, rank };
    }
    if (!best) return null;
    const h = drawHeight(best.id, itemState(base(best.id), layout)), p = planAt(e, h);
    return p ? { id: best.id, point: { x: p[0] * S, y: h, z: p[1] * S } } : null;
  }
  // height (m) at which a piece's outline is drawn: its top, i.e. what one sees from above
  function drawHeight(id, st) {
    const it = base(id), b = ctx.bounds.get(id);
    if (it.kind === 'rug') return RUG_LIFT;
    return (st.z + (b.y2 ?? b.h) * it.s * st.sy) * S;
  }
  function toScreen(x, y, h) {
    v3.set(x * S, h, y * S).project(camera);
    const r = dom.getBoundingClientRect();
    return [r.left + ((v3.x + 1) / 2) * r.width, r.top + ((1 - v3.y) / 2) * r.height];
  }
  const polyOf = (id, l) => {
    const it = base(id), st = itemState(it, l), h = drawHeight(id, st);
    return itemOutline(ctx, it, st).map(([x, y]) => toScreen(x, y, h));
  };

  // contacts that a refused edit would have made worse
  function obstaclesFor(id, from, candidate) {
    if (candidate === from) return [];
    const had = contacts(ctx, from, id);
    return [...contacts(ctx, candidate, id)].filter(([k, d]) => d > (had.get(k) || 0) + 0.5).map(([k]) => k);
  }

  // ---------------------------------------------------------------- gestures
  function startGesture(kind, e, extra = {}) {
    const it = base(selected);
    if (!it) return;
    const st = itemState(it, layout);
    gesture = { kind, id: selected, pid: e.pointerId, sx: e.clientX, sy: e.clientY, before: layout, last: layout, moved: false, h: drawHeight(selected, st), blocked: false, obstacles: [], pill: null, ...extra };
    if (kind === 'rotate') {
      // turn by the pointer's change of angle around the pivot, so off-centre models do not jump
      const p0 = planAt(e, gesture.h);
      gesture.r0 = st.r;
      gesture.a0 = p0 ? rotationFromHandle(st, p0[0], p0[1], 0) : st.r;
    }
    // pause panning rather than disabling OrbitControls: it keeps tracking the
    // finger, so a second finger turns the gesture into a normal pinch
    orbit.enablePan = false;
    window.addEventListener('pointermove', onGestureMove);
    window.addEventListener('pointerup', onGestureEnd);
    window.addEventListener('pointercancel', onGestureEnd);
  }
  function onGestureMove(e) {
    const g = gesture;
    if (!g || e.pointerId !== g.pid) return;
    if (!g.moved && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < TAP) return;
    const it = base(g.id), from = g.last;
    let next = from, free = from;
    if (g.kind === 'move') {
      const p = planAt(e, g.plane);
      if (!p) return;
      dom.style.cursor = 'grabbing';
      // from the last valid position; when blocked, slide along the obstacle on one axis
      const tx = p[0] - g.ox, ty = p[1] - g.oy, cur = itemState(it, from), o = { snap: !e.altKey, ...opts() };
      next = moveItem(ctx, from, g.id, tx, ty, o);
      if (next === from) next = moveItem(ctx, from, g.id, tx, cur.y, o);
      if (next === from) next = moveItem(ctx, from, g.id, cur.x, ty, o);
      if (next === from) free = moveItem(ctx, from, g.id, tx, ty, { snap: !e.altKey, collide: false });
    } else if (g.kind === 'rotate') {
      const p = planAt(e, g.h);
      if (!p) return;
      let r = g.r0 + rotationFromHandle(itemState(it, from), p[0], p[1], 0) - g.a0;
      if (!e.shiftKey) r = Math.round(r / ROT_SNAP) * ROT_SNAP;
      next = rotateItem(ctx, from, g.id, r, opts());
      if (next === from) free = rotateItem(ctx, from, g.id, r, { collide: false });
      g.pill = { text: `${Math.round(itemState(it, next === from ? free : next).r)}°` };
    } else {
      const p = planAt(e, g.h);
      if (!p) return;
      const o = { snap: !e.altKey };
      next = resizeFromCorner(ctx, from, g.id, g.corner, p[0], p[1], { ...o, ...opts() });
      if (next === from) free = resizeFromCorner(ctx, from, g.id, g.corner, p[0], p[1], { ...o, collide: false });
      const st = itemState(it, next === from ? free : next), b = ctx.bounds.get(g.id);
      g.pill = { text: uniformScale(it) || it.wall ? `${Math.round(st.sx * 100)}%` : `${Math.round((b.x2 - b.x1) * it.s * st.sx)} × ${Math.round((b.z2 - b.z1) * it.s * st.sz)}` };
    }
    g.moved = true;
    g.obstacles = next === from ? obstaclesFor(g.id, from, free) : [];
    g.blocked = g.obstacles.length > 0;
    g.last = next;
    apply(next, { inventory: false });
  }
  function onGestureEnd(e) {
    if (gesture && e.pointerId === gesture.pid) endGesture(true);
  }
  function endGesture(keep) {
    const g = gesture;
    gesture = null;
    window.removeEventListener('pointermove', onGestureMove);
    window.removeEventListener('pointerup', onGestureEnd);
    window.removeEventListener('pointercancel', onGestureEnd);
    dom.style.cursor = '';
    orbit.enablePan = true;
    if (!g) return;
    if (keep && g.moved) { commit(g.last, g.before); hooks.suppressTap?.(); }
    else apply(layout);
  }

  // press on a piece: select it and start moving it straight away; elsewhere the camera pans.
  // Capture phase on the canvas' parent: runs before OrbitControls sees the press.
  dom.parentElement.addEventListener('pointerdown', (e) => {
    if (e.target !== dom || !editing || !enabled || !ctx) return;
    if (!e.isPrimary) { if (gesture) endGesture(false); pressEmpty = null; return; } // a second finger: pinch / pan
    if (e.button !== 0) return;
    const hit = pickPiece(e);
    if (!hit) { pressEmpty = { x: e.clientX, y: e.clientY }; return; }
    pressEmpty = null;
    api.selectId(hit.id);
    const st = itemState(base(hit.id), layout);
    startGesture('move', e, { plane: hit.point.y, ox: hit.point.x / S - st.x, oy: hit.point.z / S - st.y });
  }, true);
  dom.addEventListener('pointerup', (e) => {
    if (pressEmpty && editing && Math.hypot(e.clientX - pressEmpty.x, e.clientY - pressEmpty.y) < TAP) api.selectId(null);
    pressEmpty = null;
  });
  dom.addEventListener('pointercancel', () => { pressEmpty = null; });
  dom.addEventListener('pointermove', (e) => {
    if (!editing || !enabled || gesture || isTouch || e.buttons) return;
    hovered = pickPiece(e)?.id || null;
    dom.style.cursor = hovered ? 'grab' : '';
  });
  dom.addEventListener('pointerleave', () => { hovered = null; });

  // ---------------------------------------------------------------- overlay
  const overlay = createEditOverlay(host, {
    handleDown(kind, corner, e) {
      if (editing && enabled && selected && !gesture) startGesture(kind, e, { corner });
    },
    rotateBy: (d) => api.rotateBy(d),
    setSize: (w, d) => api.setSize(w, d),
    setScale: (k) => api.setScale(k),
    reset: () => api.resetSelected(),
  }, { touch: isTouch });

  // called every frame while editing: project the selection for the overlay
  function frame() {
    if (!editing || !enabled || !ctx) return;
    camera.updateMatrixWorld();
    const moving = !!gesture?.moved;
    const view = { ...EMPTY_VIEW, gesture: moving ? gesture.kind : null };
    if (hovered && hovered !== selected && !gesture) view.hover = polyOf(hovered, layout);
    const id = selected, it = id && base(id);
    if (it) {
      const shown = gesture ? gesture.last : layout;
      const st = itemState(it, shown), h = drawHeight(id, st);
      const plan = itemOutline(ctx, it, st), poly = plan.map(([x, y]) => toScreen(x, y, h));
      let rot = null;
      if (!it.wall) {
        // the dot sits behind the piece (local −z), off the middle of its back edge
        const mid = toScreen((plan[0][0] + plan[1][0]) / 2, (plan[0][1] + plan[1][1]) / 2, h);
        const c = toScreen(st.x, st.y, h);
        const dx = mid[0] - c[0], dy = mid[1] - c[1], len = Math.hypot(dx, dy) || 1;
        rot = { from: mid, to: [mid[0] + (dx / len) * STEM, mid[1] + (dy / len) * STEM] };
      }
      // corner dots just outside the corners; none on pieces too small on screen to grab both
      const cx = poly.reduce((a, p) => a + p[0], 0) / 4, cy = poly.reduce((a, p) => a + p[1], 0) / 4;
      const side = Math.min(Math.hypot(poly[1][0] - poly[0][0], poly[1][1] - poly[0][1]), Math.hypot(poly[3][0] - poly[0][0], poly[3][1] - poly[0][1]));
      const corners = side < MIN_CORNERS && gesture?.kind !== 'resize' ? null : poly.map(([x, y]) => {
        const dx = x - cx, dy = y - cy, len = Math.hypot(dx, dy) || 1;
        return [x + (dx / len) * CORNER_OUT, y + (dy / len) * CORNER_OUT];
      });
      view.sel = { poly, rot: moving && gesture.kind !== 'rotate' ? null : rot, corners: moving && gesture.kind !== 'resize' ? null : corners, blocked: !!gesture?.blocked };
      view.obstacles = (gesture?.obstacles || []).map((k) => {
        if (k.startsWith('wall:')) {
          const w = ctx.walls[Number(k.slice(5))];
          return [[w[0], w[1]], [w[2], w[1]], [w[2], w[3]], [w[0], w[3]]].map(([x, y]) => toScreen(x, y, WALL_H * S));
        }
        return base(k) ? polyOf(k, shown) : null;
      }).filter(Boolean);
      if (!moving || gesture.kind === 'move') {
        view.dims = wallClearances(ctx, shown, id, 3000).filter((c) => c.d >= 5).map((c) => ({ a: toScreen(...c.a, h), b: toScreen(...c.b, h), text: `${c.d}` }));
      }
      if (moving && gesture.pill) {
        const at = gesture.kind === 'rotate' ? rot?.to : corners?.[gesture.corner] || poly[gesture.corner];
        if (at) view.pill = { at, text: gesture.pill.text };
      }
      if (!moving) {
        const xs = poly.map((p) => p[0]), ys = [...poly.map((p) => p[1]), ...(rot ? [rot.to[1]] : [])];
        const obj = objects.get(id);
        view.toolbar = {
          key: id, anchor: { x: (Math.min(...xs) + Math.max(...xs)) / 2, top: Math.min(...ys), bottom: Math.max(...ys) },
          name: obj.userData.item.name, ...api.describe(id), dims: obj.userData.item.dims,
        };
      }
    }
    overlay.render(view);
  }

  // ceiling fixtures are not editable and hang over tables and beds in the plan view
  function showFixtures(on) {
    for (const obj of group?.children || []) if (!obj.userData.layoutId) obj.visible = on;
  }

  // ---------------------------------------------------------------- keyboard
  window.addEventListener('keydown', (e) => {
    if (!editing || !enabled || !ctx || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? api.redo() : api.undo(); return; }
    if (mod && e.code === 'KeyY') { e.preventDefault(); api.redo(); return; }
    if (mod || !selected || gesture) return;
    const step = e.shiftKey ? 100 : 10;
    const nudge = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (nudge) {
      e.preventDefault();
      const st = itemState(base(selected), layout);
      attempt((o) => moveItem(ctx, layout, selected, st.x + nudge[0], st.y + nudge[1], { snap: false, ...o }));
    } else if (e.code === 'KeyR') {
      api.rotateBy(e.shiftKey ? 90 : -90); // seen from above, +yaw is counter-clockwise: R turns clockwise
    }
  });

  // ---------------------------------------------------------------- api
  const api = {
    // after buildFurnishings(): bind the new style's objects and saved layout
    attach(furnishings, id) {
      group = furnishings;
      styleId = id;
      ctx = createContext(TABLES[id], (b) => furnishings.userData.boundsOf(b));
      objects = new Map();
      for (const obj of furnishings.children) {
        const lid = obj.userData.layoutId;
        if (lid && ctx.bounds.has(lid)) { objects.set(lid, obj); obj.userData.item.layoutId = lid; }
      }
      if (!histories.has(id)) histories.set(id, createHistory());
      history = histories.get(id);
      layout = loadLayout(storage(), id, ctx);
      selected = hovered = null;
      apply(layout);
      showFixtures(!editing);
      notify();
    },
    // before the furnishings are disposed (style switch)
    detach() {
      endGesture(false);
      selected = hovered = null;
      objects = new Map();
      ctx = null;
      overlay.render(EMPTY_VIEW);
    },
    frame,
    showFixtures,
    isEditing: () => editing,
    setEditing(on) {
      if (!on) { endGesture(false); selected = hovered = null; overlay.render(EMPTY_VIEW); }
      editing = on;
      showFixtures(!on);
      overlay.show(on && enabled);
      notify();
      return editing;
    },
    // walk mode / panorama: no overlay, no gestures, no shortcuts
    setEnabled(on) {
      if (!on) endGesture(false);
      enabled = on;
      if (on) orbit.enabled = true; // callers re-enable only outside walk mode
      overlay.show(editing && on);
    },
    isEditable: (obj) => !!(obj?.userData.layoutId && objects.get(obj.userData.layoutId) === obj),
    select(obj) { return api.selectId(obj && api.isEditable(obj) ? obj.userData.layoutId : null); },
    selectId(id) {
      if (id !== selected && gesture) endGesture(false);
      selected = id && objects.has(id) ? id : null;
      return selected;
    },
    selected: () => selected,
    isBusy: () => !!gesture?.moved,
    // toolbar data for a piece
    describe(id = selected) {
      const it = id && base(id);
      if (!it) return null;
      const st = itemState(it, layout), b = ctx.bounds.get(id);
      return {
        id, wall: it.wall, uniform: uniformScale(it) || it.wall, rug: it.kind === 'rug', edited: id in layout,
        r: st.r, scale: st.sx,
        w: Math.round((b.x2 - b.x1) * it.s * st.sx), d: Math.round((b.z2 - b.z1) * it.s * st.sz), h: Math.round(b.h * it.s * st.sy),
      };
    },
    // plan bounding box (mm) of the selection, for framing the camera
    selectionBox: () => (selected ? footprint(ctx, base(selected), itemState(base(selected), layout)) : null),
    rotateBy(deg) {
      if (!selected || base(selected).wall) return;
      const r = itemState(base(selected), layout).r + deg;
      attempt((o) => rotateItem(ctx, layout, selected, r, o));
    },
    setSize(w, d) {
      const it = selected && base(selected);
      if (!it) return;
      const b = ctx.bounds.get(selected), st = itemState(it, layout);
      const sx = w ? w / ((b.x2 - b.x1) * it.s) : st.sx, sz = d ? d / ((b.z2 - b.z1) * it.s) : st.sz;
      attempt((o) => resizeItem(ctx, layout, selected, { sx, sz }, o));
    },
    setScale(k) { if (selected) attempt((o) => resizeItem(ctx, layout, selected, { sx: k, sy: k, sz: k }, o)); },
    collides: () => collide,
    setCollide(on) { collide = on; return collide; },
    resetSelected() { if (selected) commit(resetItem(ctx, layout, selected)); },
    resetAll() { return commit({}); },
    undo() { if (!gesture) restore(history.undo(layout)); },
    redo() { if (!gesture) restore(history.redo(layout)); },
    canUndo: () => history.canUndo(),
    canRedo: () => history.canRedo(),
    exportJSON() {
      return JSON.stringify({ ...serializeLayout(styleId, layout, ctx), saved: new Date().toISOString() }, null, 2);
    },
    // throws with a readable message for foreign / broken files
    importJSON(text) { return commit(parseLayout(text, styleId, ctx)); },
    styleId: () => styleId,
  };
  return api;
}
