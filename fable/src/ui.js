import { ROOMS, roomArea, rectArea, planBounds, OPENINGS, roomAt } from './plan.js';
import { SPECS_BY_STYLE } from './specs.js';

const ROOM_SHORT = { tatami: '书房', bed1: '次卧1', kitchen: '厨房', bath1: '公卫', living: '客餐厅', bed2: '次卧2', vestibule: '', bath2: '主卫', bed3: '主卧', balcony: '阳台' };

export const isTouch = new URLSearchParams(location.search).has('touch') || matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

export function initUI(app) {
  const $ = (s) => document.querySelector(s);
  const roomsEl = $('#rooms');
  const panel = $('#panel');
  const tooltip = $('#tooltip');
  let labelsOn = true;
  let walkUI = null;
  let selectedRoom = null;
  let SPECS = SPECS_BY_STYLE.french;
  const switchEl = $('#style-switch');
  switchEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-style]');
    if (btn && !btn.classList.contains('on')) app.setStyle(btn.dataset.style);
  });

  roomsEl.innerHTML = '<h2>房间</h2>' + ROOMS.filter((r) => !r.partOf).map((r) => {
    const area = r.label || roomArea(r);
    return `<button data-room="${r.id}"><span>${r.name}</span><small>${area.toFixed(1)} m²</small></button>`;
  }).join('');
  roomsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) app.focusRoom(btn.dataset.room);
  });

  $('#toolbar').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const a = btn.dataset.action;
    if (a === 'view-iso') app.setView('iso');
    if (a === 'view-top') app.setView('top');
    if (a === 'walk') app.startWalk();
    if (a === 'orbit') btn.classList.toggle('on', app.toggleAutoRotate());
    if (a === 'ceiling') btn.classList.toggle('on', app.toggleCeiling());
    if (a === 'night') btn.classList.toggle('on', app.setNight(!btn.classList.contains('on')));
    if (a === 'labels') { labelsOn = app.toggleLabels(); btn.classList.toggle('on', labelsOn); }
    if (a === 'ao') btn.classList.toggle('on', app.toggleAO());
    if (a === 'shot') app.screenshot();
  });
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'KeyF' && !app.isWalking()) app.startWalk();
    if (e.code === 'KeyC') $('[data-action="ceiling"]').click();
    if (e.code === 'KeyN') $('[data-action="night"]').click();
    if (e.code === 'KeyL') $('[data-action="labels"]').click();
    if (e.code === 'KeyR') $('[data-action="orbit"]').click();
    if (e.code === 'Escape') { panel.hidden = true; app.clearHighlight(); }
  });

  // ---------------------------------------------------------------- minimap
  const b = planBounds();
  const mm = $('#minimap');
  const sc = 100 / (b.x2 - b.x1);
  const W = (b.x2 - b.x1) * sc, H = (b.y2 - b.y1) * sc;
  const mx = (x) => (x - b.x1) * sc, my = (y) => (y - b.y1) * sc;
  const doorMarks = OPENINGS.filter((o) => o.type !== 'window').map((o) => {
    const [x1, y1, x2, y2] = o.rect;
    return `<rect x="${mx(x1)}" y="${my(y1)}" width="${(x2 - x1) * sc}" height="${(y2 - y1) * sc}" class="mm-door"/>`;
  }).join('');
  mm.innerHTML = `<div class="mm-title">平面导航 <span id="mm-here"></span></div><svg viewBox="-1 -1 ${(W + 2).toFixed(1)} ${(H + 2).toFixed(1)}">` +
    ROOMS.map((r) => [...r.rects, ...(r.bay ? [r.bay.rect] : [])].map(([x1, y1, x2, y2], i) =>
      `<rect x="${mx(x1)}" y="${my(y1)}" width="${(x2 - x1) * sc}" height="${(y2 - y1) * sc}" class="mm-room" data-room="${r.partOf || r.id}" data-rect="${i}"/>`).join('')).join('') +
    doorMarks +
    ROOMS.filter((r) => !r.partOf).map((r) => {
      const [x1, y1, x2, y2] = r.rects[0];
      return `<text x="${mx((x1 + x2) / 2)}" y="${my((y1 + y2) / 2) + 1.2}" class="mm-label">${ROOM_SHORT[r.id] ?? r.name}</text>`;
    }).join('') +
    `<polygon id="mm-cone" points="0,0 0,0 0,0"/><circle id="mm-cam" r="1.5"/><g id="mm-target"><circle r="1.6"/><circle r="0.5"/></g></svg>`;
  mm.addEventListener('click', (e) => {
    const id = e.target.dataset?.room;
    if (id) app.focusRoom(id);
  });
  const camDot = mm.querySelector('#mm-cam');
  const cone = mm.querySelector('#mm-cone');
  const targetMark = mm.querySelector('#mm-target');
  const hereEl = mm.querySelector('#mm-here');
  const roomRects = [...mm.querySelectorAll('.mm-room')];
  let lastHere = null;

  // ---------------------------------------------------------------- panels
  const roomPanel = (room) => {
    const spec = SPECS[room.id] || { title: room.name, notes: [], palette: [] };
    const area = room.label || roomArea(room);
    const annex = ROOMS.filter((r) => r.partOf === room.id);
    const dims = room.rects[0];
    const items = app.roomItems(room.id);
    return `
      <button class="close" data-close>×</button>
      <h2>${spec.title}</h2>
      <div class="area">${area.toFixed(2)} m² · ${dims[2] - dims[0]} × ${dims[3] - dims[1]} mm${annex.length ? ' · 含' + annex.map((a) => a.name).join('、') : ''}</div>
      <h3>配色</h3>
      <div class="swatches">${(spec.palette || []).map((c) => `<div><span style="background:${c}"></span><small>${c}</small></div>`).join('')}</div>
      <h3>设计要点</h3>
      <ul>${(spec.notes || []).map((n) => `<li>${n}</li>`).join('')}</ul>
      ${spec.materials ? `<h3>硬装材料</h3><ul>${spec.materials.map((m) => `<li>${m}</li>`).join('')}</ul>` : ''}
      ${items.length ? `<h3>家具 · 灯具 · 软装（${items.length} 项）</h3><table>${items.map((i) => `<tr><td>${i.name}${i.count > 1 ? ` <em>×${i.count}</em>` : ''}${i.note ? `<div class="note">${i.note}</div>` : ''}</td><td>${i.dims}</td></tr>`).join('')}</table>` : ''}
    `;
  };
  const itemPanel = (item) => {
    const room = ROOMS.find((r) => r.id === item.room);
    return `
      <button class="close" data-close>×</button>
      <h2>${item.name}</h2>
      <div class="area">${item.dims}${room ? ` · <a href="#" data-room-link="${room.partOf || room.id}">${room.name}</a>` : ''}</div>
      ${item.note ? `<h3>说明</h3><ul><li>${item.note}</li></ul>` : ''}
      <h3>模型</h3><ul><li>Blender 参数化生成：<code>${item.asset}</code></li></ul>
    `;
  };
  const wirePanel = () => {
    panel.hidden = false;
    panel.querySelector('[data-close]').addEventListener('click', () => { panel.hidden = true; app.clearHighlight(); });
    panel.querySelectorAll('[data-room-link]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); app.focusRoom(a.dataset.roomLink); }));
  };

  // ---------------------------------------------------------------- walk UI
  function buildWalkUI() {
    const wrap = document.createElement('div');
    wrap.id = 'walk-ui';
    wrap.innerHTML = `<div class="crosshair"></div><button class="exit" data-exit>退出漫游</button>` +
      (isTouch ? `<div id="joystick"><div class="knob"></div></div><div id="look-hint">右侧拖动转向 · 左侧摇杆移动</div>` : '');
    document.getElementById('ui').appendChild(wrap);
    wrap.querySelector('[data-exit]').addEventListener('click', () => app.exitWalk());
    if (isTouch) {
      const joy = wrap.querySelector('#joystick');
      const knob = joy.querySelector('.knob');
      let id = null, cx = 0, cy = 0;
      const R = 44;
      joy.addEventListener('pointerdown', (e) => {
        id = e.pointerId; joy.setPointerCapture(id);
        const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      });
      joy.addEventListener('pointermove', (e) => {
        if (e.pointerId !== id) return;
        let dx = e.clientX - cx, dy = e.clientY - cy;
        const len = Math.hypot(dx, dy);
        if (len > R) { dx *= R / len; dy *= R / len; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        app.setJoystick(dx / R, dy / R);
      });
      const release = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; app.setJoystick(0, 0); };
      joy.addEventListener('pointerup', release);
      joy.addEventListener('pointercancel', release);
    }
    return wrap;
  }

  return {
    labelsOn: () => labelsOn,
    isTouch,
    setStyle(style, busy = false) {
      SPECS = SPECS_BY_STYLE[style.id] || SPECS_BY_STYLE.french;
      switchEl.querySelectorAll('button').forEach((b) => { b.classList.toggle('on', b.dataset.style === style.id); b.disabled = busy; });
      $('#title').textContent = `Maison · ${style.name}三居室`;
      $('#subtitle').textContent = `${style.subtitle} · 8853 × 16375 mm · 约 121 m²`;
      document.title = `Maison · ${style.name}三居室`;
      if (selectedRoom && !panel.hidden) this.showRoom(ROOMS.find((r) => r.id === selectedRoom));
    },
    showRoom(room) {
      selectedRoom = room.id;
      panel.innerHTML = roomPanel(room);
      wirePanel();
      roomsEl.querySelectorAll('button').forEach((bt) => bt.classList.toggle('active', bt.dataset.room === room.id));
      roomRects.forEach((r) => r.classList.toggle('selected', r.dataset.room === room.id));
    },
    showItem(item) {
      panel.innerHTML = itemPanel(item);
      wirePanel();
    },
    hoverItem(item, x, y) {
      if (!item || isTouch) { tooltip.hidden = true; document.body.style.cursor = ''; return; }
      tooltip.hidden = false;
      const flip = x > window.innerWidth - 260;
      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
      tooltip.style.transform = flip ? 'translate(calc(-100% - 12px), 12px)' : 'translate(12px, 12px)';
      tooltip.innerHTML = `${item.name}<br><small>${item.dims || ''}${item.note ? ' · ' + item.note : ''}</small>`;
      document.body.style.cursor = 'pointer';
    },
    setWalk(on) {
      $('#hint').textContent = on ? 'WASD / 方向键移动 · 鼠标转向 · Shift 加速 · Esc 退出' : '拖动旋转 · 右键/双指平移 · 滚轮缩放 · 点击房间或家具查看说明';
      document.body.classList.toggle('walking', on);
      if (on && !walkUI) walkUI = buildWalkUI();
      else if (!on && walkUI) { walkUI.remove(); walkUI = null; }
    },
    updateMinimap(camera, walking, target) {
      const px = camera.position.x * 1000, py = camera.position.z * 1000;
      const inside = px > b.x1 - 1500 && px < b.x2 + 1500 && py > b.y1 - 1500 && py < b.y2 + 1500;
      const x = mx(px), y = my(py);
      const d = camera.getWorldDirection(new (camera.position.constructor)());
      const yaw = Math.atan2(d.x, d.z);
      const half = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
      const L = walking ? 16 : 10;
      const pts = [[x, y], [x + Math.sin(yaw - half) * L, y + Math.cos(yaw - half) * L], [x + Math.sin(yaw + half) * L, y + Math.cos(yaw + half) * L]];
      cone.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
      cone.style.display = inside ? '' : 'none';
      camDot.style.display = inside ? '' : 'none';
      camDot.setAttribute('cx', x); camDot.setAttribute('cy', y);
      if (target && !walking) {
        targetMark.style.display = '';
        targetMark.setAttribute('transform', `translate(${mx(target.x * 1000)}, ${my(target.z * 1000)})`);
      } else targetMark.style.display = 'none';
      const here = walking ? roomAt(px, py) : roomAt(target.x * 1000, target.z * 1000);
      const hereId = here ? (here.partOf || here.id) : null;
      if (hereId !== lastHere) {
        lastHere = hereId;
        roomRects.forEach((r) => r.classList.toggle('here', r.dataset.room === hereId));
        hereEl.textContent = here ? `· ${here.name}` : '';
      }
    },
  };
}
