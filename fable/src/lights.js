import * as THREE from 'three';
import { FIXTURES } from './fixtures.js';
import { CEIL_H, planBounds } from './plan.js';

const S = 0.001;

export function buildLights(scene, style = { fixtureById: {} }) {
  const group = new THREE.Group();
  group.name = 'lights';
  const b = planBounds();
  const cx = ((b.x1 + b.x2) / 2) * S, cz = ((b.y1 + b.y2) / 2) * S;

  const sun = new THREE.DirectionalLight(0xfff1dc, 2.0);
  sun.position.set(cx - 9, 14, cz + 12);
  sun.target.position.set(cx, 0, cz);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 50;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  sun.shadow.blurSamples = 10;
  group.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(0xe3ecf5, 0x8c7c68, 0.35);
  group.add(hemi);

  const interior = [];
  for (const f of FIXTURES) {
    const ov = style.fixtureById?.[f.id] || {};
    // light source hangs `drop` mm below the ceiling: per kind, or overridden per fixture (e.g. a track instead of a pendant)
    const drop = ov.drop ?? (f.kind === 'chandelier-large' ? 650 : f.kind === 'chandelier-small' ? 480 : f.kind === 'lantern' ? 420 : 80);
    const cd = f.lumens / (4 * Math.PI); // candela
    const light = new THREE.PointLight(0xffdcb0, cd, 0, 2);
    light.position.set((ov.x ?? f.x) * S, (CEIL_H - drop - 60) * S, (ov.y ?? f.y) * S);
    light.name = `light-${f.id}`;
    light.userData.base = cd;
    if (f.id === 'lounge' || f.id === 'bed3') {
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      light.shadow.bias = -0.001;
      light.shadow.radius = 4;
      light.shadow.blurSamples = 8;
    }
    group.add(light);
    interior.push(light);
  }

  const state = { night: false };
  function setNight(night) {
    state.night = night;
    sun.intensity = night ? 0.2 : 2.0;
    sun.color.set(night ? 0x9fb4d8 : 0xfff1dc);
    hemi.intensity = night ? 0.08 : 0.35;
    hemi.color.set(night ? 0x2a3550 : 0xe3ecf5);
    const boost = style.interiorBoost || 1;
    for (const l of interior) l.intensity = (night ? l.userData.base * 0.16 : l.userData.base * 0.02) * boost;
  }
  setNight(false);
  scene.add(group);
  return { sun, hemi, interior, setNight, state, group };
}
