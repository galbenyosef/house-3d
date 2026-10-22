// Drawing layer for 布置 mode: selection outline, rotate / resize handles,
// wall-distance dimensions, blocked feedback and the floating toolbar of the
// selected piece. Pure DOM (SVG + HTML) on top of the canvas; src/editor.js
// hands it screen-space geometry every frame through render(view).
const SVG = 'http://www.w3.org/2000/svg';
const ICON = {
  rotL: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 7.5A5.5 5.5 0 1 1 4.6 12"/><path d="M5.5 3.5v4h4"/></svg>',
  rotR: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M14.5 7.5A5.5 5.5 0 1 0 15.4 12"/><path d="M14.5 3.5v4h-4"/></svg>',
  size: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 13.5l10-10 3 3-10 10z"/><path d="M6.5 10.5l1.5 1.5M9 8l1.5 1.5M11.5 5.5L13 7"/></svg>',
  reset: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10a6 6 0 1 0 1.8-4.3"/><path d="M4 3.5V7h3.5"/><circle cx="10" cy="10" r="1.2"/></svg>',
};

function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  parent?.appendChild(n);
  return n;
}
const pts = (poly) => poly.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

// actions: { handleDown(kind, corner, event), rotateBy(deg), setSize(w, d), setScale(k), reset() }
export function createEditOverlay(host, actions, { touch = false } = {}) {
  const root = document.createElement('div');
  root.id = 'edit-overlay';
  root.hidden = true;
  host.prepend(root); // under the title bar, minimap and edit bar

  const svg = el('svg', { class: 'eo-svg' }, root);
  const gObstacles = el('g', {}, svg);
  const hover = el('polygon', { class: 'eo-hover' }, svg);
  const dimLayer = el('g', { class: 'eo-dims' }, svg);
  const selHalo = el('polygon', { class: 'eo-sel-halo' }, svg);
  const sel = el('polygon', { class: 'eo-sel' }, svg);
  const stem = el('line', { class: 'eo-stem' }, svg);
  // hit areas: the rotate dot sits clear of the piece; corner dots are kept small
  // so that pressing the piece itself always moves it
  const HIT = { rotate: touch ? 22 : 13, resize: touch ? 16 : 10 };
  const handle = (cls, kind, corner) => {
    const g = el('g', { class: `eo-handle-wrap ${cls}` }, svg);
    const hit = el('circle', { class: 'eo-hit', r: HIT[kind] }, g);
    const dot = el('circle', { class: `eo-handle ${cls}`, r: kind === 'rotate' ? (touch ? 8 : 6.5) : (touch ? 7 : 5.5) }, g);
    // on the group: the visible dot sits on top of the larger transparent hit circle
    g.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); actions.handleDown(kind, corner, e); });
    return { g, hit, dot };
  };
  const rot = handle('eo-rot', 'rotate', -1);
  const corners = [0, 1, 2, 3].map((i) => handle('eo-corner', 'resize', i));
  const labels = document.createElement('div');
  labels.className = 'eo-labels';
  root.appendChild(labels);
  const pill = document.createElement('div');
  pill.className = 'eo-pill';
  root.appendChild(pill);

  // ---------------------------------------------------------------- toolbar
  const bar = document.createElement('div');
  bar.className = 'edit-pop';
  bar.hidden = true;
  host.appendChild(bar);
  let barKey = null, sizeOpen = false, lastId = null;
  bar.addEventListener('pointerdown', (e) => e.stopPropagation());
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-ep]');
    if (!b) return;
    const a = b.dataset.ep;
    if (a === 'rot-l') actions.rotateBy(90); // ↺: +yaw is counter-clockwise seen from above
    if (a === 'rot-r') actions.rotateBy(-90);
    if (a === 'reset') actions.reset();
    if (a === 'size') { sizeOpen = !sizeOpen; barKey = null; }
  });
  bar.addEventListener('change', (e) => {
    const f = e.target.dataset?.field, v = Number(e.target.value);
    if (!f || e.target.value.trim() === '' || !Number.isFinite(v) || v <= 0) return;
    if (f === 'w') actions.setSize(v, 0);
    if (f === 'd') actions.setSize(0, v);
    if (f === 'k') actions.setScale(v / 100);
  });
  // keys typed into the size fields stay there; buttons (Chrome focuses them on click) let shortcuts through
  bar.addEventListener('keydown', (e) => {
    if (e.target.tagName !== 'INPUT') return;
    if (e.key === 'Enter') e.target.blur();
    e.stopPropagation();
  });

  function toolbarHTML(t) {
    const size = t.uniform
      ? `<label>比例<input data-field="k" type="number" inputmode="numeric" step="5" min="20" max="300" value="${Math.round(t.scale * 100)}"><em>%</em></label>`
      : `<label>宽<input data-field="w" type="number" inputmode="numeric" step="10" min="100" value="${t.w}"></label><span class="ep-x">×</span><label>深<input data-field="d" type="number" inputmode="numeric" step="10" min="100" value="${t.d}"></label><em>mm</em>`;
    return `
      <div class="ep-head"><strong>${t.name}</strong><small>${t.dims}</small></div>
      <div class="ep-actions">
        ${t.wall ? '' : `<button data-ep="rot-l" title="逆时针 90°（Shift+R）" aria-label="逆时针旋转 90°">${ICON.rotL}</button><button data-ep="rot-r" title="顺时针 90°（R）" aria-label="顺时针旋转 90°">${ICON.rotR}</button>`}
        <button data-ep="size" class="${sizeOpen ? 'on' : ''}" title="输入精确尺寸" aria-label="尺寸">${ICON.size}</button>
        <button data-ep="reset" title="复位到默认位置与尺寸" aria-label="复位"${t.edited ? '' : ' disabled'}>${ICON.reset}</button>
      </div>
      ${sizeOpen ? `<div class="ep-size">${size}</div>` : ''}`;
  }

  function placeToolbar(anchor) {
    const w = bar.offsetWidth, h = bar.offsetHeight, gap = 16, m = 8;
    let x = anchor.x - w / 2, y = anchor.top - h - gap, below = false;
    if (y < 90) { y = anchor.bottom + gap; below = true; } // no room above (title bar): hang it below
    x = Math.max(m, Math.min(innerWidth - w - m, x));
    y = Math.max(m, Math.min(innerHeight - h - m, y));
    bar.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    bar.classList.toggle('below', below);
    bar.style.setProperty('--caret', `${Math.round(Math.max(18, Math.min(w - 18, anchor.x - x)))}px`);
  }

  const showPoly = (node, poly) => {
    if (poly?.length) { node.setAttribute('points', pts(poly)); node.style.display = ''; } else node.style.display = 'none';
  };
  const place = (h, p) => {
    if (!p) { h.g.style.display = 'none'; return; }
    h.g.style.display = '';
    h.g.setAttribute('transform', `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
  };

  return {
    root,
    show(on) {
      root.hidden = !on;
      if (!on) { bar.hidden = true; barKey = null; sizeOpen = false; }
    },
    // view: { hover, sel: { poly, rot: { from, to } | null, corners, blocked } | null,
    //         obstacles: [poly], dims: [{ a, b, text }], pill: { at, text } | null,
    //         gesture: 'move' | 'rotate' | 'resize' | null,
    //         toolbar: { key, anchor, name, dims, wall, uniform, w, d, scale, edited } | null }
    render(view) {
      showPoly(hover, view.hover);
      // obstacles (blocked drags): reuse polygons
      while (gObstacles.children.length < view.obstacles.length) el('polygon', { class: 'eo-obstacle' }, gObstacles);
      [...gObstacles.children].forEach((n, i) => showPoly(n, view.obstacles[i]));
      const s = view.sel;
      showPoly(selHalo, s?.poly);
      showPoly(sel, s?.poly);
      sel.classList.toggle('blocked', !!s?.blocked);
      if (s?.rot) {
        stem.style.display = '';
        stem.setAttribute('x1', s.rot.from[0]); stem.setAttribute('y1', s.rot.from[1]);
        stem.setAttribute('x2', s.rot.to[0]); stem.setAttribute('y2', s.rot.to[1]);
      } else stem.style.display = 'none';
      place(rot, s?.rot?.to);
      corners.forEach((c, i) => place(c, s?.corners?.[i]));
      root.dataset.gesture = view.gesture || '';
      rot.dot.classList.toggle('active', view.gesture === 'rotate');
      // dimension lines to the walls
      while (dimLayer.children.length < view.dims.length) {
        const g = el('g', {}, dimLayer);
        el('line', { class: 'eo-dim-halo' }, g);
        el('line', { class: 'eo-dim' }, g);
      }
      while (labels.children.length < view.dims.length) labels.appendChild(document.createElement('span'));
      [...dimLayer.children].forEach((g, i) => {
        const d = view.dims[i];
        g.style.display = d ? '' : 'none';
        if (d) for (const line of g.children) { line.setAttribute('x1', d.a[0]); line.setAttribute('y1', d.a[1]); line.setAttribute('x2', d.b[0]); line.setAttribute('y2', d.b[1]); }
      });
      [...labels.children].forEach((span, i) => {
        const d = view.dims[i];
        span.style.display = d ? '' : 'none';
        if (!d) return;
        span.textContent = d.text;
        span.style.transform = `translate(${((d.a[0] + d.b[0]) / 2).toFixed(1)}px, ${((d.a[1] + d.b[1]) / 2).toFixed(1)}px) translate(-50%, -50%)`;
      });
      // live readout while turning / resizing
      if (view.pill) {
        pill.style.display = '';
        pill.textContent = view.pill.text;
        pill.style.transform = `translate(${view.pill.at[0].toFixed(1)}px, ${view.pill.at[1].toFixed(1)}px) translate(-50%, calc(-100% - 14px))`;
        pill.classList.toggle('blocked', !!s?.blocked);
      } else pill.style.display = 'none';
      // floating toolbar of the selection (hidden while a gesture runs)
      const t = view.toolbar;
      if (!t) { bar.hidden = true; if (!s) { barKey = null; sizeOpen = false; } return; }
      if (t.key !== lastId) { lastId = t.key; sizeOpen = false; } // a new selection starts with the size row closed
      const key = `${t.key}|${t.dims}|${t.edited}|${sizeOpen}`;
      const typing = document.activeElement?.tagName === 'INPUT' && bar.contains(document.activeElement);
      if (key !== barKey && !typing) { bar.innerHTML = toolbarHTML(t); barKey = key; }
      bar.hidden = false;
      placeToolbar(t.anchor);
    },
  };
}
