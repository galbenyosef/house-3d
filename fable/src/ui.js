import { ROOMS, roomArea, rectArea, planBounds, OPENINGS, roomAt } from './plan.js';
import { SPECS_BY_STYLE } from './specs.js';
import { PANO_OF_ROOM, panoName } from './pano.js';
import { STYLES, DEFAULT_STYLE } from './styles.js';

const BASE_URL = (import.meta.env && import.meta.env.BASE_URL) || '/';
const ROOM_SHORT = { tatami: '榻榻米', bed1: '次卧1', kitchen: '厨房', bath1: '公卫', living: '客餐厅', bed2: '次卧2', vestibule: '', bath2: '主卫', bed3: '主卧', balcony: '阳台' };

export const isTouch = new URLSearchParams(location.search).has('touch') || matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

export function initUI(app) {
  const $ = (s) => document.querySelector(s);
  const roomsEl = $('#rooms');
  const panel = $('#panel');
  const tooltip = $('#tooltip');
  let labelsOn = true;
  let walkUI = null;
  let selectedRoom = null;
  let SPECS = SPECS_BY_STYLE[DEFAULT_STYLE];
  let styleId = DEFAULT_STYLE;
  let entryRoom = 'living';
  const entry = $('#pano-entry');
  entry.addEventListener('click', () => app.openPanorama({ room: entryRoom }));
  const updateEntry = () => {
    entry.querySelector('img').src = `${BASE_URL}pano/${styleId}-${entryRoom}-preview.jpg`;
    entry.querySelector('small').textContent = `Cycles 实景渲染 · ${panoName(entryRoom) || ''} · ${STYLES[styleId]?.name || ''}`;
  };
  updateEntry();
  const switchEl = $('#style-switch');
  // one tab per registered style (src/styles.js) — nothing to edit here for a new style
  switchEl.innerHTML = Object.values(STYLES).map((s) => `<button data-style="${s.id}"${s.id === DEFAULT_STYLE ? ' class="on"' : ''}>${s.name}</button>`).join('');
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
    if (a === 'pano') app.openPanorama();
    if (a === 'orbit') btn.classList.toggle('on', app.toggleAutoRotate());
    if (a === 'edit') app.toggleEdit();
    if (a === 'ceiling') btn.classList.toggle('on', app.toggleCeiling());
    if (a === 'night') btn.classList.toggle('on', app.setNight(!btn.classList.contains('on')));
    if (a === 'labels') { labelsOn = app.toggleLabels(); btn.classList.toggle('on', labelsOn); }
    if (a === 'ao') btn.classList.toggle('on', app.toggleAO());
    if (a === 'shot') app.screenshot();
  });
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return; // ⌘Z / ⌘R etc. are not toolbar shortcuts
    if (e.code === 'KeyE' && !app.isWalking() && !document.body.classList.contains('pano-open')) $('[data-action="edit"]').click();
    if (e.code === 'KeyF' && !app.isWalking()) app.startWalk();
    if (e.code === 'KeyC') $('[data-action="ceiling"]').click();
    if (e.code === 'KeyN') $('[data-action="night"]').click();
    if (e.code === 'KeyL') $('[data-action="labels"]').click();
    if (e.code === 'KeyR' && !app.isEditing()) $('[data-action="orbit"]').click(); // in 布置 mode R turns the selection
    if (e.code === 'Escape') { panel.hidden = true; shownItem = null; app.deselect(); }
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
    const pano = PANO_OF_ROOM[room.id];
    const banner = pano ? `<button class="panel-pano" data-pano-room="${pano}"><img src="${BASE_URL}pano/${styleId}-${pano}-preview.jpg" alt=""><span>查看${panoName(pano)}高清全景 ↗<small>Cycles 路径追踪 · 可转头缩放</small></span></button>` : '';
    return `
      <button class="close" data-close>×</button>
      <h2>${spec.title}</h2>
      ${banner}
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
  let shownItem = null;
  const wirePanel = () => {
    panel.hidden = false;
    panel.querySelector('[data-close]').addEventListener('click', () => { panel.hidden = true; shownItem = null; app.deselect(); });
    panel.querySelectorAll('[data-room-link]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); app.focusRoom(a.dataset.roomLink); }));
    panel.querySelectorAll('[data-pano-room]').forEach((b) => b.addEventListener('click', () => app.openPanorama({ room: b.dataset.panoRoom })));
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

  // ---------------------------------------------------------------- 布置 bar
  const editbar = $('#editbar');
  const toastEl = $('#toast');
  const fileInput = editbar.querySelector('input[type=file]');
  let toastTimer = 0;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3200);
  };
  const menu = editbar.querySelector('.eb-pop');
  const closeMenu = () => { menu.hidden = true; };
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.eb-menu')) closeMenu(); });
  editbar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-edit]');
    if (!b) return;
    const a = b.dataset.edit;
    if (a === 'menu') { menu.hidden = !menu.hidden; return; }
    closeMenu();
    if (a === 'undo') app.editor.undo();
    if (a === 'redo') app.editor.redo();
    if (a === 'done') app.toggleEdit(false);
    if (a === 'collide') {
      const on = app.editor.setCollide(!app.editor.collides());
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
      toast(on ? '防碰撞已开启：家具不会穿墙或重叠' : '防碰撞已关闭：家具可自由摆放');
    }
    if (a === 'import') fileInput.click();
    if (a === 'reset' && app.editor.resetAll()) toast('已恢复默认布置，可点「撤销」找回');
    if (a === 'export') {
      const url = URL.createObjectURL(new Blob([app.editor.exportJSON()], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `maison-layout-${app.editor.styleId()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      toast(app.editor.importJSON(await file.text()) ? '方案已导入，可点「撤销」还原' : '方案与当前布置相同');
    } catch (err) {
      toast(`导入失败：${err.message}`);
    }
  });
  const HINT_ORBIT = '拖动旋转 · 右键/双指平移 · 滚轮缩放 · 点击房间或家具查看说明';
  const HINT_EDIT = isTouch ? '拖动家具移动 · 金色圆点旋转 · 角点调整尺寸 · 单指拖空白处平移 · 双指缩放'
    : '拖动家具移动 · 金色圆点旋转 · 角点调整尺寸 · 拖动空白处平移 · 滚轮缩放 · Alt 关闭吸附';

  const this_ = {
    labelsOn: () => labelsOn,
    isTouch,
    setStyle(style, busy = false) {
      // the previous style's pieces are about to be disposed
      if (busy && shownItem) { shownItem = null; panel.hidden = true; }
      SPECS = SPECS_BY_STYLE[style.id] || SPECS_BY_STYLE[DEFAULT_STYLE];
      styleId = style.id;
      updateEntry();
      switchEl.querySelectorAll('button').forEach((b) => { b.classList.toggle('on', b.dataset.style === style.id); b.disabled = busy; });
      $('#title').innerHTML = `<span class="brand">Maison · </span>${style.name}四居室`;
      $('#subtitle').textContent = `${style.subtitle} · 8853 × 16375 mm · 约 121 m²`;
      document.title = `Maison · ${style.name}四居室`;
      if (selectedRoom && !panel.hidden) this.showRoom(ROOMS.find((r) => r.id === selectedRoom));
    },
    showRoom(room) {
      shownItem = null;
      selectedRoom = room.id;
      panel.innerHTML = roomPanel(room);
      wirePanel();
      roomsEl.querySelectorAll('button').forEach((bt) => bt.classList.toggle('active', bt.dataset.room === room.id));
      roomRects.forEach((r) => r.classList.toggle('selected', r.dataset.room === room.id));
    },
    showItem(item) {
      shownItem = item;
      panel.innerHTML = itemPanel(item);
      wirePanel();
    },
    setEditing(on) {
      editbar.hidden = !on;
      closeMenu();
      document.body.classList.toggle('editing', on);
      $('[data-action="edit"]').classList.toggle('on', on);
      $('#hint').textContent = on ? HINT_EDIT : HINT_ORBIT;
      if (on) { panel.hidden = true; shownItem = null; tooltip.hidden = true; } // the floating toolbar takes over
    },
    setEditState({ canUndo, canRedo, saved, edited }) {
      editbar.querySelector('[data-edit="undo"]').disabled = !canUndo;
      editbar.querySelector('[data-edit="redo"]').disabled = !canRedo;
      const status = editbar.querySelector('.edit-status');
      status.dataset.state = !saved ? 'error' : edited ? 'saved' : 'default';
      status.querySelector('span').textContent = !saved ? '未能保存' : edited ? `已保存 · ${edited} 件调整` : '默认布置';
      status.title = !saved ? '浏览器禁用了本地存储，刷新后调整会丢失；可用「导出布置」保存' : '布置自动保存在本浏览器';
    },
    toast,
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
      $('#hint').textContent = on ? 'WASD / 方向键移动 · 鼠标转向 · Shift 加速 · Esc 退出' : app.isEditing() ? HINT_EDIT : HINT_ORBIT;
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
        const pr = PANO_OF_ROOM[hereId] || 'living';
        if (pr !== entryRoom) { entryRoom = pr; updateEntry(); }
      }
    },
  };
  return this_;
}
