import * as THREE from 'three';
import { assetUrl } from './assets.js';

// Paths are relative to public/, and are also consumed by the Cycles exporter.
export const PBR_ASSETS = {
  stone: {
    id: 'Marble012', source: 'https://ambientcg.com/a/Marble012', sizeMeters: 1.8,
    roughnessRange: [.26, .64],
    color: 'textures/pbr/Marble012_1K-JPG_Color.jpg',
    normal: 'textures/pbr/Marble012_1K-JPG_NormalGL.jpg',
    roughness: 'textures/pbr/Marble012_1K-JPG_Roughness.jpg',
  },
  wood: {
    id: 'smoked_walnut_veneer', source: 'https://polyhaven.com/a/smoked_walnut_veneer', sizeMeters: 1,
    color: 'textures/pbr/smoked_walnut_veneer_diff_1k.jpg',
    normal: 'textures/pbr/smoked_walnut_veneer_nor_gl_1k.jpg',
    roughness: 'textures/pbr/smoked_walnut_veneer_rough_1k.jpg',
  },
  leather: {
    id: 'leather_white', source: 'https://polyhaven.com/a/leather_white', sizeMeters: .3,
    normal: 'textures/pbr/leather_white_nor_gl_1k.jpg',
    roughness: 'textures/pbr/leather_white_rough_1k.jpg',
  },
  cloth: {
    id: 'fabric_pattern_05', source: 'https://polyhaven.com/a/fabric_pattern_05', sizeMeters: .5,
    normal: 'textures/pbr/fabric_pattern_05_nor_gl_1k.jpg',
    roughness: 'textures/pbr/fabric_pattern_05_rough_1k.jpg',
  },
};

const cloth = {asset: 'cloth', normalScale: .22, roughness: 1, colorMix: 0};
const common = {
  walnut: {asset: 'wood', normalScale: .18, roughness: .76, colorMix: .24},
  marble: {asset: 'stone', normalScale: .12, roughness: .82, colorMix: .20},
  cream: cloth,
  sage: cloth,
};

// colorMix blends only the material tint towards white; it never recolors source files.
// Upholstery uses measured relief/roughness with the selected house palette unchanged.
export const PBR_BINDINGS = {
  french: {...common, fabric: cloth},
  italian: {
    ...common,
    walnut: {...common.walnut, colorMix: .06},
    marble: {...common.marble, colorMix: .12},
    travertine: {...common.marble, colorMix: .12},
    stone: {asset: 'stone', normalScale: .08, roughness: .90, colorMix: .10},
    tile: {asset: 'stone', normalScale: .12, roughness: 1, colorMix: .08},
    fabric: {asset: 'leather', normalScale: .25, roughness: .94, colorMix: 0},
    leather: {asset: 'leather', normalScale: .25, roughness: .94, colorMix: 0},
    rug: {...cloth, normalScale: .34},
  },
};

const enhanced = new WeakMap();

/** Apply before buildFurniture, so its material clones inherit the complete PBR set. */
export async function enhanceMaterials(mats, style = 'french') {
  if (enhanced.has(mats)) return enhanced.get(mats);
  const operation = applyMaterials(mats, style);
  enhanced.set(mats, operation);
  try { return await operation; }
  catch (error) { enhanced.delete(mats); throw error; }
}

async function applyMaterials(mats, style) {
  const bindings = PBR_BINDINGS[style] || PBR_BINDINGS.french;
  const loader = new THREE.TextureLoader();
  const loaded = {};
  const requests = [];
  for (const key of new Set(Object.values(bindings).map(binding => binding.asset))) {
    loaded[key] = {};
    for (const role of ['color', 'normal', 'roughness']) {
      const path = PBR_ASSETS[key][role];
      if (!path) continue;
      requests.push(loader.loadAsync(assetUrl(path)).then(source => {
        let texture = source;
        // The source is polished stone; remap its linear roughness to a honed finish.
        // Keep the original downloaded channel unchanged for audit/export.
        const range = role === 'roughness' && PBR_ASSETS[key].roughnessRange;
        if (range) {
          const canvas = document.createElement('canvas');
          canvas.width = source.image.width; canvas.height = source.image.height;
          const context = canvas.getContext('2d');
          context.drawImage(source.image, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
          for (let i = 0; i < pixels.data.length; i += 4) {
            const value = Math.round(range[0] * 255 + pixels.data[i] * (range[1] - range[0]));
            pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
          }
          context.putImageData(pixels, 0, 0);
          texture = new THREE.CanvasTexture(canvas);
          texture.userData.valueRemap = range;
          source.dispose();
        }
        texture.name = `${PBR_ASSETS[key].id} · ${role}`;
        texture.colorSpace = role === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        texture.anisotropy = 4;
        texture.userData.sourcePath = path;
        loaded[key][role] = texture;
      }));
    }
  }
  const results = await Promise.allSettled(requests);
  const failed = results.find(result => result.status === 'rejected');
  if (failed) {
    for (const maps of Object.values(loaded)) Object.values(maps).forEach(texture => texture.dispose());
    throw failed.reason;
  }

  const replaced = new Set();
  for (const [name, binding] of Object.entries(bindings)) {
    const material = mats[name];
    if (!material) continue;
    const maps = loaded[binding.asset];
    for (const slot of ['map', 'bumpMap', 'normalMap', 'roughnessMap']) {
      if (material[slot]) replaced.add(material[slot]);
    }
    const originalColor = `#${material.color.getHexString()}`;
    material.map = maps.color || null;
    material.bumpMap = null;
    material.bumpScale = 0;
    material.normalMap = maps.normal;
    material.normalScale.setScalar(binding.normalScale);
    material.roughnessMap = maps.roughness;
    material.roughness = binding.roughness;
    material.color.lerp(new THREE.Color('#ffffff'), binding.colorMix);
    material.userData.textureSizeMeters = PBR_ASSETS[binding.asset].sizeMeters;
    material.userData.pbr = {...binding, id: PBR_ASSETS[binding.asset].id, originalColor};
    material.needsUpdate = true;
  }

  // A shared old map may still be used by an untouched floor, rug or cabinet finish.
  const retained = new Set();
  for (const material of Object.values(mats)) {
    for (const value of Object.values(material)) if (value?.isTexture) retained.add(value);
  }
  for (const texture of replaced) if (!retained.has(texture)) texture.dispose();
  return mats;
}
