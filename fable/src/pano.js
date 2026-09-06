// "高清全景" — Cycles-rendered equirectangular panoramas of the same rooms,
// viewed in a lightweight sphere viewer (drag to look, wheel/pinch to zoom,
// room tabs, style toggle, save view).
import * as THREE from 'three';

const BASE = (import.meta.env && import.meta.env.BASE_URL) || '/';

export const PANO_ROOMS = [
  { id: 'living', name: '客餐厅', pitch: -6 },
  { id: 'lounge', name: '客厅', pitch: -6 },
  { id: 'master', name: '主卧', pitch: -8 },
  { id: 'bed1', name: '次卧 1', pitch: -8 },
  { id: 'bed2', name: '次卧 2', pitch: -8 },
  { id: 'study', name: '榻榻米房', pitch: -8 },
  { id: 'kitchen', name: '厨房', pitch: -8 },
];

// Which panorama each plan room opens. Every bedroom (四室) has its own
// render; bathrooms, the vestibule and the balcony fall back to the nearest one.
export const PANO_OF_ROOM = {
  living: 'living', balcony: 'living', bath1: 'living',
  bed3: 'master', vestibule: 'master', bath2: 'master',
  bed1: 'bed1', bed2: 'bed2', tatami: 'study', kitchen: 'kitchen',
};

export const panoName = (id) => PANO_ROOMS.find((r) => r.id === id)?.name || '';

export function openPanorama(app, { style, room = 'living' } = {}) {
  const overlay = document.createElement('div');
  overlay.id = 'pano';
  overlay.setAttribute('role', 'dialog');
  overlay.innerHTML = `
    <header>
      <div><small>SAME HOME · CYCLES PATH TRACING</small><h2>高清全景</h2></div>
      <button class="pano-close" data-pano="close">关闭 ×</button>
    </header>
    <nav class="pano-rooms"></nav>
    <div class="pano-canvas" tabindex="0"></div>
    <div class="pano-toolbar">
      <div class="pano-styles"><button data-pano-style="french">法式</button><button data-pano-style="italian">意式轻奢</button></div>
      <span class="pano-status">正在载入高清全景…</span>
      <div><button data-pano="out">−</button><button data-pano="in">＋</button><button data-pano="save">保存视角</button></div>
    </div>`;
  document.getElementById('ui').appendChild(overlay);
  const canvasHost = overlay.querySelector('.pano-canvas');
  const status = overlay.querySelector('.pano-status');
  const roomsNav = overlay.querySelector('.pano-rooms');

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvasHost.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
  const sphereGeom = new THREE.SphereGeometry(40, 96, 48);
  sphereGeom.scale(-1, 1, 1); // view from inside without mirroring (three.js panorama example)
  const sphere = new THREE.Mesh(sphereGeom, new THREE.MeshBasicMaterial({ color: 0x111111 }));
  scene.add(sphere);
  let yaw = 0, pitch = THREE.MathUtils.degToRad(-6), texture = null, closed = false, raf = 0;
  let current = { style: style || 'french', room };
  const loader = new THREE.TextureLoader();
  const cache = new Map();

  function size() {
    const w = canvasHost.clientWidth || innerWidth;
    const h = canvasHost.clientHeight > 20 ? canvasHost.clientHeight : Math.max(200, innerHeight - 220);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(() => { size(); render(); });
  ro.observe(canvasHost);
  function render() {
    camera.lookAt(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    renderer.render(scene, camera);
  }
  function zoom(v) { camera.fov = THREE.MathUtils.clamp(v, 30, 95); camera.updateProjectionMatrix(); render(); }

  async function load() {
    const key = `${current.style}-${current.room}`;
    status.textContent = '正在载入高清全景…';
    roomsNav.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.room === current.room));
    overlay.querySelectorAll('[data-pano-style]').forEach((b) => b.classList.toggle('on', b.dataset.panoStyle === current.style));
    const meta = PANO_ROOMS.find((r) => r.id === current.room);
    const prep = (t) => { t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8; return t; };
    const show = (t, note) => {
      if (closed || key !== `${current.style}-${current.room}`) return;
      texture = t;
      sphere.material = new THREE.MeshBasicMaterial({ map: texture });
      pitch = THREE.MathUtils.degToRad(meta?.pitch ?? -6);
      status.textContent = `${meta?.name || ''} · ${texture.image.width}×${texture.image.height} · Cycles 路径追踪${note}`;
      size();
      render();
    };
    let tex = cache.get(key);
    if (tex) { show(tex, ''); return; }
    // low-res preview first, then the full panorama
    try {
      const preview = prep(await loader.loadAsync(`${BASE}pano/${key}-preview.jpg`));
      show(preview, ' · 加载高清中…');
    } catch { /* no preview, wait for the full image */ }
    try {
      tex = prep(await loader.loadAsync(`${BASE}pano/${key}.jpg`));
      cache.set(key, tex);
      show(tex, '');
    } catch {
      if (!texture) status.textContent = '该房间的高清全景尚未渲染';
    }
  }

  roomsNav.innerHTML = PANO_ROOMS.map((r) => `<button data-room="${r.id}">${r.name}</button>`).join('');
  roomsNav.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-room]');
    if (b) { current.room = b.dataset.room; yaw = 0; load(); }
  });
  overlay.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.panoStyle) { current.style = b.dataset.panoStyle; load(); }
    if (b.dataset.pano === 'close') close();
    if (b.dataset.pano === 'in') zoom(camera.fov - 8);
    if (b.dataset.pano === 'out') zoom(camera.fov + 8);
    if (b.dataset.pano === 'save') {
      render();
      const a = document.createElement('a');
      a.href = renderer.domElement.toDataURL('image/png');
      a.download = `maison-${current.style}-${current.room}-pano.png`;
      a.click();
    }
  });

  // look controls
  const pointers = new Map();
  let last = null, pinch = 0;
  canvasHost.addEventListener('pointerdown', (e) => { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); last = { x: e.clientX, y: e.clientY }; canvasHost.setPointerCapture(e.pointerId); });
  canvasHost.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch && d) zoom(camera.fov * pinch / d);
      pinch = d;
      return;
    }
    if (last) {
      const k = 0.0032 * (camera.fov / 70);
      yaw -= (e.clientX - last.x) * k;
      pitch = THREE.MathUtils.clamp(pitch + (e.clientY - last.y) * k, -1.35, 1.35);
      last = { x: e.clientX, y: e.clientY };
      render();
    }
  });
  const up = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = 0; if (!pointers.size) last = null; };
  canvasHost.addEventListener('pointerup', up);
  canvasHost.addEventListener('pointercancel', up);
  canvasHost.addEventListener('wheel', (e) => { e.preventDefault(); zoom(camera.fov + e.deltaY * 0.03); }, { passive: false });
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') { yaw += 0.08; render(); }
    if (e.key === 'ArrowRight') { yaw -= 0.08; render(); }
  };
  window.addEventListener('keydown', onKey);
  const onResize = () => { size(); render(); };
  window.addEventListener('resize', onResize);

  function close() {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    for (const t of cache.values()) t.dispose();
    renderer.dispose();
    overlay.remove();
    app.onPanoramaClosed?.();
  }
  size();
  render();
  load();
  return { close, setStyle(id) { current.style = id; load(); }, _debug: { renderer, scene, camera, sphere, render, get texture() { return texture; } } };
}
