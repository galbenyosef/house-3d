import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { FIXTURES } from './fixtures.js';
import { makeMaterials, skyCanvas } from './materials.js';
import { buildHouse, disposeGroup } from './house.js';
import { buildLights } from './lights.js';
import { buildFurnishings } from './furnishings.js';
import { ROOMS, planBounds, isWalkable, roomArea, rectArea } from './plan.js';
import { initUI, isTouch } from './ui.js';
import { STYLES, DEFAULT_STYLE } from './styles.js';
import { openPanorama, PANO_OF_ROOM } from './pano.js';

const S = 0.001;
const container = document.getElementById('app');
const isMobile = isTouch && Math.min(window.innerWidth, window.innerHeight) < 820;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.domElement.style.touchAction = 'none';
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
function gradientBackground(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let BG_DAY = gradientBackground('#d9dfe6', '#f1ede6');
let BG_NIGHT = gradientBackground('#0b1020', '#1d2238');
scene.background = BG_DAY;
const pmrem = new THREE.PMREMGenerator(renderer);
const skyTex = new THREE.CanvasTexture(skyCanvas());
skyTex.colorSpace = THREE.SRGBColorSpace;
skyTex.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = pmrem.fromEquirectangular(skyTex).texture;
scene.environmentIntensity = 0.45;
void RoomEnvironment;

const b = planBounds();
const center = new THREE.Vector3(((b.x1 + b.x2) / 2) * S, 1.2, ((b.y1 + b.y2) / 2) * S);
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.05, 200);
const ISO = () => new THREE.Vector3(center.x - 9, 13, center.z + 15);
camera.position.copy(ISO());

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.copy(center);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.maxPolarAngle = Math.PI / 2 - 0.03;
orbit.minDistance = 0.8;
orbit.maxDistance = 45;
orbit.autoRotateSpeed = 0.6;
orbit.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

const M = makeMaterials();
const params = new URLSearchParams(location.search);
let style = STYLES[params.get('style')] || STYLES[DEFAULT_STYLE];
let house = null, ceilings = new THREE.Group(), lights = null;

// ------------------------------------------------------------------ post
const composerTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { samples: isMobile ? 0 : 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, composerTarget);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight);
gtao.output = GTAOPass.OUTPUT.Default;
gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1, thickness: 1, scale: 1.2, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 3, samples: 12 });
composer.addPass(gtao);
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.22, 0.45, 1.7);
bloom.enabled = false;
composer.addPass(bloom);
// subtle photographic finish: vignette + a touch of saturation
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.28 }, saturation: { value: 1.06 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vignette; uniform float saturation; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
    c.rgb = mix(vec3(l), c.rgb, saturation); vec2 q = vUv - 0.5; float v = 1.0 - vignette * dot(q, q) * 2.2; gl_FragColor = vec4(c.rgb * v, c.a); }`,
});
composer.addPass(grade);
composer.addPass(new OutputPass());
let aoEnabled = !isMobile;
gtao.enabled = aoEnabled;

// ------------------------------------------------------------------ labels
const labels = new THREE.Group();
labels.name = 'labels';
for (const room of ROOMS) {
  if (room.partOf) continue;
  const r = room.rects[0];
  const div = document.createElement('div');
  div.className = 'room-label';
  const area = roomArea(room) + (room.bay ? rectArea(room.bay.rect) / 1e6 : 0);
  div.innerHTML = `${room.name}<small>${(room.label || area).toFixed(1)} m²</small>`;
  div.addEventListener('click', () => app.focusRoom(room.id));
  div.style.pointerEvents = 'auto';
  const label = new CSS2DObject(div);
  label.position.set(((r[0] + r[2]) / 2) * S, 1.0, ((r[1] + r[3]) / 2) * S);
  labels.add(label);
}
scene.add(labels);

// ------------------------------------------------------------------ walk mode
const walk = new PointerLockControls(camera, renderer.domElement);
const keys = new Set();
const walkState = { active: false, eye: 1.55, yaw: 0, pitch: 0, joy: { x: 0, y: 0 }, look: null };
window.addEventListener('keydown', (e) => keys.add(e.code));
window.addEventListener('keyup', (e) => keys.delete(e.code));
walk.addEventListener('unlock', () => { if (walkState.active && !isTouch) app.exitWalk(); });

function canStand(x, z) {
  const r = 0.28;
  return [[r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, -r * 0.7]].every(([dx, dz]) => isWalkable((x + dx) / S, (z + dz) / S));
}
function tryMove(move) {
  const nx = camera.position.x + move.x, nz = camera.position.z + move.z;
  if (canStand(nx, nz)) camera.position.set(nx, walkState.eye, nz);
  else if (canStand(nx, camera.position.z)) camera.position.x = nx;
  else if (canStand(camera.position.x, nz)) camera.position.z = nz;
}
// touch look: drag anywhere on the canvas (the joystick captures its own pointer)
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!walkState.active || !isTouch) return;
  walkState.look = { id: e.pointerId, x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!walkState.active || !isTouch || !walkState.look || e.pointerId !== walkState.look.id) return;
  walkState.yaw -= (e.clientX - walkState.look.x) * 0.006;
  walkState.pitch = THREE.MathUtils.clamp(walkState.pitch - (e.clientY - walkState.look.y) * 0.006, -1.2, 1.2);
  walkState.look.x = e.clientX; walkState.look.y = e.clientY;
  camera.quaternion.setFromEuler(new THREE.Euler(walkState.pitch, walkState.yaw, 0, 'YXZ'));
});
const endLook = (e) => { if (walkState.look && e.pointerId === walkState.look.id) walkState.look = null; };
renderer.domElement.addEventListener('pointerup', endLook);
renderer.domElement.addEventListener('pointercancel', endLook);

// ------------------------------------------------------------------ state
let ceilingVisible = false;
let nightOn = false;
let highlight = null;
let furnishings = new THREE.Group();
let roomItems = new Map();
let switching = false;
let paused = false;
function roomAtTarget() {
  const x = orbit.target.x * 1000, z = orbit.target.z * 1000;
  return ROOMS.find((r) => r.rects.some((rc) => x >= rc[0] && x <= rc[2] && z >= rc[1] && z <= rc[3]))?.id;
}

async function applyStyle(id) {
  const next = STYLES[id];
  if (!next || switching) return;
  switching = true;
  style = next;
  ui.setStyle(style, true);
  const loadingEl = document.getElementById('loading');
  loadingEl.hidden = false;
  loadingEl.textContent = `正在切换到${style.name}…`;
  if (house) { disposeGroup(house); house = null; }
  if (furnishings.parent) { disposeGroup(furnishings); furnishings = new THREE.Group(); }
  if (lights) { lights.group.traverse((o) => o.shadow?.map?.dispose?.()); scene.remove(lights.group); }
  BG_DAY = gradientBackground(...style.background.day);
  BG_NIGHT = gradientBackground(...style.background.night);
  scene.background = nightOn ? BG_NIGHT : BG_DAY;
  const built = buildHouse(M, style);
  house = built.house;
  ceilings = built.ceilings;
  ceilings.visible = ceilingVisible || walkState.active;
  scene.add(house);
  lights = buildLights(scene, style);
  lights.setNight(nightOn);
  bloom.enabled = !!style.bloom && !isMobile;
  renderer.toneMappingExposure = nightOn ? style.exposure + 0.3 : style.exposure;
  const g = await buildFurnishings(M, style, (k) => { loadingEl.textContent = `正在加载${style.name}家具… ${Math.round(k * 100)}%`; });
  furnishings = g;
  roomItems = g.userData.roomItems || new Map();
  g.userData.setNight?.(nightOn);
  scene.add(g);
  loadingEl.hidden = true;
  const url = new URL(location.href);
  url.searchParams.set('style', style.id);
  history.replaceState(null, '', url);
  ui.setStyle(style, false);
  switching = false;
}

const app = {
  scene, camera, renderer, orbit, lights, M, house,
  setView(kind) {
    if (walkState.active) this.exitWalk();
    const to = kind === 'top' ? new THREE.Vector3(center.x, 30, center.z + 0.01) : ISO();
    tweenCamera(to, center.clone());
  },
  focusRoom(id) {
    const room = ROOMS.find((r) => r.id === id);
    if (!room) return;
    if (walkState.active) this.exitWalk();
    const r = room.rects[0];
    const cx = ((r[0] + r[2]) / 2) * S, cz = ((r[1] + r[3]) / 2) * S;
    const w = (r[2] - r[0]) * S, d = (r[3] - r[1]) * S;
    const dist = Math.max(w, d) * 1.2 + 2;
    const target = new THREE.Vector3(cx, 0.8, cz);
    tweenCamera(new THREE.Vector3(cx - dist * 0.55, dist * 0.9, cz + dist * 0.75), target);
    this.clearHighlight();
    ui.showRoom(room);
  },
  roomItems: (id) => roomItems.get(id) || [],
  toggleCeiling(force) {
    ceilingVisible = force ?? !ceilingVisible;
    ceilings.visible = ceilingVisible || walkState.active;
    return ceilingVisible;
  },
  toggleAutoRotate(force) { orbit.autoRotate = force ?? !orbit.autoRotate; return orbit.autoRotate; },
  setNight(on) {
    nightOn = on;
    lights?.setNight(on);
    scene.background = on ? BG_NIGHT : BG_DAY;
    furnishings.userData.setNight?.(on);
    renderer.toneMappingExposure = on ? style.exposure + 0.3 : style.exposure;
    return on;
  },
  setStyle(id) { return applyStyle(id); },
  openPanorama(opts = {}) {
    if (walkState.active) this.exitWalk();
    if (this._pano) return;
    // default to the panorama of the room under the orbit target
    const here = roomAtTarget();
    const room = opts.room || PANO_OF_ROOM[here] || 'living';
    document.body.classList.add('pano-open');
    this._pano = openPanorama(this, { style: style.id, room });
    paused = true;
  },
  onPanoramaClosed() { this._pano = null; paused = false; document.body.classList.remove('pano-open'); },
  // Export the current style's geometry for the offline Cycles panorama render.
  async exportScene() {
    const exporter = new GLTFExporter();
    const root = new THREE.Group();
    // ceilings must be present in the export (they are hidden in the dollhouse view)
    const wasVisible = ceilings.visible;
    ceilings.visible = true;
    root.add(house, furnishings);
    const glb = await exporter.parseAsync(root, { binary: true, onlyVisible: true, includeCustomExtensions: false });
    scene.add(house, furnishings);
    ceilings.visible = wasVisible;
    const meta = {
      style: style.id,
      fixtures: FIXTURES.map((f) => { const ov = style.fixtureById[f.id] || {}; return { id: f.id, room: f.room, x: ov.x ?? f.x, y: ov.y ?? f.y, lumens: f.lumens, kind: f.kind, ...(ov.drop !== undefined ? { drop: ov.drop } : {}) }; }),
      ceil: 2720, interiorBoost: style.interiorBoost || 1,
    };
    const ep = `${import.meta.env.BASE_URL}__export`;
    const r1 = await fetch(`${ep}?name=${style.id}.glb`, { method: 'POST', body: glb });
    const r2 = await fetch(`${ep}?name=${style.id}.json`, { method: 'POST', body: JSON.stringify(meta) });
    return { glb: await r1.json(), meta: await r2.json(), bytes: glb.byteLength };
  },
  currentStyle: () => style,
  toggleLabels(force) { labels.visible = force ?? !labels.visible; return labels.visible; },
  toggleAO(force) { aoEnabled = force ?? !aoEnabled; gtao.enabled = aoEnabled; return aoEnabled; },
  screenshot() {
    render();
    const url = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `maison-${Date.now()}.png`;
    a.click();
  },
  startWalk() {
    walkState.active = true;
    camera.near = 0.05; camera.updateProjectionMatrix();
    orbit.enabled = false;
    orbit.autoRotate = false;
    ceilings.visible = true;
    labels.visible = false;
    document.getElementById('panel').hidden = true;
    this.clearHighlight();
    // start in the living room, looking towards the balcony
    camera.position.set(2.2, walkState.eye, 7.6);
    walkState.yaw = Math.PI; walkState.pitch = 0;
    camera.quaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0, 'YXZ'));
    if (!isTouch) walk.lock();
    ui.setWalk(true);
  },
  exitWalk() {
    walkState.active = false;
    if (walk.isLocked) walk.unlock();
    orbit.enabled = true;
    ceilings.visible = ceilingVisible;
    labels.visible = ui.labelsOn();
    orbit.target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(4));
    ui.setWalk(false);
  },
  setJoystick(x, y) { walkState.joy.x = x; walkState.joy.y = y; },
  isWalking: () => walkState.active,
  clearHighlight() {
    if (highlight) { scene.remove(highlight); highlight.geometry.dispose(); highlight = null; }
  },
  highlightObject(obj) {
    this.clearHighlight();
    highlight = new THREE.BoxHelper(obj, 0xb8923f);
    highlight.material.depthTest = false;
    highlight.material.transparent = true;
    highlight.material.opacity = 0.9;
    scene.add(highlight);
  },
};

// camera tween
let tween = null;
function tweenCamera(pos, target) {
  orbit.autoRotate = false;
  document.querySelector('[data-action="orbit"]')?.classList.remove('on');
  tween = { p0: camera.position.clone(), t0: orbit.target.clone(), p1: pos, t1: target, start: performance.now(), dur: 900 };
}

// ------------------------------------------------------------------ picking
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = null;
function pick(clientX, clientY, roots) {
  pointer.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(roots, true);
  for (const hit of hits) {
    if (hit.object.material?.transparent && hit.object.name === 'glass') continue;
    let o = hit.object;
    while (o && !o.userData.roomId && !o.userData.item) o = o.parent;
    if (o) return o;
  }
  return null;
}
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY, performance.now()]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || walkState.active) return;
  if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6 || performance.now() - downAt[2] > 400) return;
  if (!house) return;
  const o = pick(e.clientX, e.clientY, [furnishings, house]);
  if (o?.userData.item) { app.highlightObject(o); ui.showItem(o.userData.item); return; }
  if (o?.userData.roomId) {
    const room = ROOMS.find((r) => r.id === o.userData.roomId);
    app.clearHighlight();
    ui.showRoom(ROOMS.find((r) => r.id === (room.partOf || room.id)));
  }
});
renderer.domElement.addEventListener('dblclick', (e) => {
  if (walkState.active || !house) return;
  const o = pick(e.clientX, e.clientY, [furnishings, house]);
  const roomId = o?.userData.roomId || o?.userData.item?.room;
  if (roomId) {
    const room = ROOMS.find((r) => r.id === roomId);
    app.focusRoom(room.partOf || room.id);
  }
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (walkState.active || isTouch) return;
  const o = pick(e.clientX, e.clientY, [furnishings]);
  ui.hoverItem(o?.userData.item || null, e.clientX, e.clientY);
});

// ------------------------------------------------------------------ loop
const timer = new THREE.Timer();
const tmpDir = new THREE.Vector3(), tmpSide = new THREE.Vector3(), tmpMove = new THREE.Vector3();
function render() {
  if (!isMobile || aoEnabled || bloom.enabled) composer.render();
  else renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
function animate() {
  requestAnimationFrame(animate);
  timer.update();
  if (paused) return;
  const dt = Math.min(timer.getDelta(), 0.05);
  if (tween) {
    const k = Math.min(1, (performance.now() - tween.start) / tween.dur);
    const e = k < 0.5 ? 2 * k * k : -1 + (4 - 2 * k) * k;
    camera.position.lerpVectors(tween.p0, tween.p1, e);
    orbit.target.lerpVectors(tween.t0, tween.t1, e);
    if (k >= 1) tween = null;
  }
  if (walkState.active && (walk.isLocked || isTouch)) {
    const speed = keys.has('ShiftLeft') ? 3.2 : 1.7;
    camera.getWorldDirection(tmpDir);
    tmpDir.y = 0;
    tmpDir.normalize();
    tmpSide.crossVectors(tmpDir, new THREE.Vector3(0, 1, 0));
    tmpMove.set(0, 0, 0);
    if (keys.has('KeyW') || keys.has('ArrowUp')) tmpMove.add(tmpDir);
    if (keys.has('KeyS') || keys.has('ArrowDown')) tmpMove.sub(tmpDir);
    if (keys.has('KeyD') || keys.has('ArrowRight')) tmpMove.add(tmpSide);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) tmpMove.sub(tmpSide);
    if (walkState.joy.x || walkState.joy.y) tmpMove.addScaledVector(tmpDir, -walkState.joy.y).addScaledVector(tmpSide, walkState.joy.x);
    if (tmpMove.lengthSq() > 0) {
      const mag = Math.min(1, tmpMove.length());
      tmpMove.normalize().multiplyScalar(speed * mag * dt);
      tryMove(tmpMove);
    }
    camera.position.y = walkState.eye;
  } else {
    // keep the orbit camera above the ground
    if (orbit.target.y < 0.2) orbit.target.y = 0.2;
    if (camera.position.y < 0.35) camera.position.y = 0.35;
    orbit.update();
    // depth precision: push the near plane out as the camera moves away, so
    // 12 mm panel offsets and 20 mm slab steps never z-fight in the dollhouse views
    const near = THREE.MathUtils.clamp(camera.position.distanceTo(orbit.target) * 0.02, 0.05, 1.2);
    if (Math.abs(near - camera.near) > camera.near * 0.15) { camera.near = near; camera.updateProjectionMatrix(); }
  }
  ui.updateMinimap(camera, walkState.active, orbit.target);
  render();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  gtao.setSize(window.innerWidth, window.innerHeight);
  bloom.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

const ui = initUI(app);
if (isMobile) document.querySelector('[data-action="ao"]')?.classList.remove('on');
applyStyle(style.id).then(() => animate());
window.__app = app;
