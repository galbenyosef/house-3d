// Procedural PBR materials. All textures are drawn on canvases so the project
// has no binary texture dependencies; each one is designed to tile seamlessly.
import * as THREE from 'three';

// ---------------------------------------------------------------- noise utils
function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const smooth = (t) => t * t * (3 - 2 * t);
export function valueNoise(x, y, seed = 0, period = 1e9) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = smooth(x - xi), fy = smooth(y - yi);
  const p = (v) => ((v % period) + period) % period;
  const a = hash2(p(xi), p(yi), seed), b = hash2(p(xi + 1), p(yi), seed);
  const c = hash2(p(xi), p(yi + 1), seed), d = hash2(p(xi + 1), p(yi + 1), seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
export function fbm(x, y, seed = 0, octaves = 5, period = 1e9) {
  let v = 0, amp = 0.5, f = 1, sum = 0;
  for (let i = 0; i < octaves; i++) {
    v += amp * valueNoise(x * f, y * f, seed + i * 17, period * f);
    sum += amp;
    amp *= 0.5;
    f *= 2;
  }
  return v / sum;
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}
function toTexture(c, { repeat = [1, 1], color = true, anisotropy = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = anisotropy;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}
function pixelTexture(size, fn, opts) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = fn(x / size, y / size, x, y);
      const i = (y * size + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, opts);
}
const lerp = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const hexRgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

// ------------------------------------------------------------ herringbone oak
// Plank W x nW laid at 45 degrees (人字拼). Tileable: lattice vectors of the
// tiling are u=(1,1) and w=(n+1, 1-n) in plank-width units; the canvas covers
// 4 x-periods and 20 y-periods of the rotated pattern.
export function herringboneTexture({ size = 2048, n = 5, tone = [0xd9b98c, 0xb8925f] } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const yPeriod = size / 20; // = sqrt(2) * W
  const W = yPeriod / Math.SQRT2;
  const L = n * W;
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(Math.PI / 4);
  const u = [W, W];
  const w = [(n + 1) * W, (1 - n) * W];
  const t0 = hexRgb(tone[0]), t1 = hexRgb(tone[1]);
  const gap = Math.max(1.5, W * 0.03);
  const drawPlank = (x, y, len, wid, a, b) => {
    const k = hash2(((b % 4) + 4) % 4, (((a + b) % 20) + 20) % 20, 7);
    const col = mix3(t0, t1, k);
    ctx.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
    ctx.fillRect(x + gap / 2, y + gap / 2, len - gap, wid - gap);
    // grain streaks along the plank length
    const horizontal = len > wid;
    const streaks = 6 + ((k * 7) | 0);
    for (let s = 0; s < streaks; s++) {
      const q = hash2(a * 3 + s, b * 5 + s, 11);
      const dark = 0.82 + 0.15 * hash2(s, a + b, 3);
      ctx.fillStyle = `rgba(${(col[0] * dark) | 0},${(col[1] * dark) | 0},${(col[2] * dark) | 0},0.55)`;
      const thickness = 0.6 + q * 1.4;
      if (horizontal) ctx.fillRect(x + gap, y + gap + q * (wid - 2 * gap), len - 2 * gap, thickness);
      else ctx.fillRect(x + gap + q * (wid - 2 * gap), y + gap, thickness, len - 2 * gap);
    }
  };
  const R = Math.ceil(size / W) + n + 2;
  for (let a = -R; a <= R; a++) {
    for (let b = -R; b <= R; b++) {
      const ox = a * u[0] + b * w[0];
      const oy = a * u[1] + b * w[1];
      if (Math.abs(ox) > size * 0.8 || Math.abs(oy) > size * 0.8) continue;
      drawPlank(ox, oy, L, W, a, b); // plank A: [0,n)x[0,1)
      drawPlank(ox + L, oy + (1 - n) * W, W, L, a + 1000, b); // plank B: [n,n+1)x[1-n,1)
    }
  }
  ctx.restore();
  return c;
}

// ---------------------------------------------------------- walnut planks
// Straight-laid planks running along V (north-south in world space).
// Texture covers `planks` planks across and two plank lengths along; tileable.
export function plankTexture({ size = 2048, planks = 20, tone = [0x6b4a33, 0x4d3423], joints = true, seed = 5 } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const W = size / planks;
  const t0 = hexRgb(tone[0]), t1 = hexRgb(tone[1]);
  ctx.fillStyle = '#2a1c12';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < planks; i++) {
    const offset = joints ? (hash2(i, 0, seed) * size) / 2 : 0;
    for (let j = -1; j <= 2; j++) {
      const y0 = j * (size / 2) + offset;
      const k = hash2(i, j + 10, seed);
      const col = mix3(t0, t1, k);
      ctx.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
      const gap = joints ? 2 : 0;
      ctx.fillRect(i * W + gap / 2, y0 + gap / 2, W - gap, size / 2 - gap);
      // long grain streaks with gentle waviness
      for (let g = 0; g < 14; g++) {
        const q = hash2(i * 13 + g, j * 7 + 3, seed + 2);
        const dark = 0.78 + 0.2 * hash2(g, i + j, seed + 4);
        ctx.strokeStyle = `rgba(${(col[0] * dark) | 0},${(col[1] * dark) | 0},${(col[2] * dark) | 0},0.6)`;
        ctx.lineWidth = 0.6 + q * 1.6;
        ctx.beginPath();
        const x = i * W + gap + q * (W - 2 * gap);
        ctx.moveTo(x, y0);
        for (let yy = y0; yy <= y0 + size / 2; yy += 32) ctx.lineTo(x + Math.sin(yy / 90 + q * 9) * 2.2, yy);
        ctx.stroke();
      }
    }
  }
  return c;
}

// ----------------------------------------------------------- travertine
export function travertineCanvas({ size = 1024, base = 0xd8ccb6, seed = 6 } = {}) {
  const b = hexRgb(base);
  return pixelCanvas(size, (u, w) => {
    const bands = fbm(u * 2, w * 14, seed, 4, 2) - 0.5;      // horizontal strata
    const pores = valueNoise(u * 140, w * 30, seed + 3) > 0.86 ? -34 : 0;
    const v = bands * 40 + pores + (fbm(u * 6, w * 6, seed + 9, 3, 6) - 0.5) * 12;
    return [b[0] + v, b[1] + v, b[2] + v * 1.1];
  });
}

// ----------------------------------------------------------- large stone tiles
export function stoneTileCanvas({ size = 1024, tiles = 2, base = 0x5a5a5c, vein = 0xd6d6d6, vein2 = 0x9a9a9c, seed = 14, joint = '#3a3a3c' } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = joint;
  ctx.fillRect(0, 0, size, size);
  const cell = size / tiles;
  const slab = marbleCanvas({ size: 1024, base, vein, vein2, seed, scale: 2.5 });
  for (let i = 0; i < tiles; i++) for (let j = 0; j < tiles; j++) {
    ctx.save();
    ctx.translate(i * cell + cell / 2, j * cell + cell / 2);
    ctx.rotate(((i + j) % 4) * Math.PI / 2);
    ctx.drawImage(slab, -cell / 2 + 1.5, -cell / 2 + 1.5, cell - 3, cell - 3);
    ctx.restore();
  }
  return c;
}

// ----------------------------------------------------------- modern rug
export function rugModernCanvas({ size = 1024, field = '#cfc6b8', a = '#8f8678', b = '#3c3a36', c = '#b8895a', seed = 3 } = {}) {
  const cv = canvas(size);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, size, size);
  // soft colour blocks with an organic edge
  const blocks = [[0.08, 0.1, 0.5, 0.45, a], [0.55, 0.15, 0.37, 0.3, b], [0.15, 0.6, 0.35, 0.3, c], [0.5, 0.55, 0.42, 0.35, a]];
  blocks.forEach(([x, y, w, h, col], i) => {
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    const n = 40;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const px = (x + w * (t < 0.5 ? t * 2 : 1)) * size;
      const py = (y + (t < 0.5 ? 0 : (t - 0.5) * 2) * h) * size;
      const wob = (valueNoise(k * 0.7, i * 3, seed) - 0.5) * size * 0.03;
      k ? ctx.lineTo(px + wob, py + wob) : ctx.moveTo(px, py);
    }
    ctx.lineTo(x * size, (y + h) * size);
    ctx.closePath();
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  // wool texture
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (hash2(i & 1023, i >> 10, 8) - 0.5) * 14;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// ----------------------------------------------------------- abstract art
export function abstractCanvas(seed = 1, size = 512) {
  const pal = [['#e8e2d6', '#2b2926', '#b8895a'], ['#d9d2c7', '#8f8678', '#3c3a36'], ['#efe9df', '#5b6b63', '#c9a24a'], ['#e3ddd3', '#3c3a36', '#9c7b5f']][seed % 4];
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = pal[0];
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = pal[1];
  ctx.beginPath();
  ctx.arc(size * (0.35 + 0.2 * hash2(seed, 1, 2)), size * 0.5, size * 0.28, Math.PI * 0.2 * seed, Math.PI * (1.2 + 0.3 * seed));
  ctx.lineTo(size * 0.5, size * 0.5);
  ctx.fill();
  ctx.fillStyle = pal[2];
  ctx.fillRect(size * 0.58, size * 0.2, size * 0.22, size * 0.55);
  ctx.strokeStyle = pal[1];
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.moveTo(size * 0.12, size * 0.82);
  ctx.lineTo(size * 0.88, size * 0.78);
  ctx.stroke();
  return c;
}

// ------------------------------------------------- dark textured abstract
export function abstractDarkCanvas(seed = 1, size = 512) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = ['#1b1a18', '#22201d', '#191a1c', '#241f1a'][seed % 4];
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, w = y / size;
    const n = fbm(u * 5 + seed, w * 5, seed * 7, 5);
    const band = Math.max(0, 1 - Math.abs(w - 0.55 - Math.sin(u * 4 + seed) * 0.08) * 5);
    const gold = Math.pow(Math.max(0, n - 0.45) * 2.4, 2) * band;
    const i = (y * size + x) * 4;
    d[i] += gold * 190 + (n - 0.5) * 20;
    d[i + 1] += gold * 150 + (n - 0.5) * 20;
    d[i + 2] += gold * 70 + (n - 0.5) * 16;
    if (hash2(x, y, seed) > 0.995) { d[i] += 120; d[i + 1] += 100; d[i + 2] += 50; }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// --------------------------------------------------------------------- marble
export function marbleCanvas({ size = 1024, base = 0xf2efe8, vein = 0x9a9590, vein2 = 0xc9b79a, seed = 1, scale = 4 } = {}) {
  const b = hexRgb(base), v = hexRgb(vein), v2 = hexRgb(vein2);
  return pixelCanvas(size, (u, w) => {
    const n = fbm(u * scale, w * scale, seed, 5, scale);
    const n2 = fbm(u * scale * 2 + 3, w * scale * 2 + 1, seed + 5, 4, scale * 2);
    const t = Math.pow(Math.abs(Math.sin((u + w) * 6 + n * 12)), 12);
    const t2 = Math.pow(Math.abs(Math.sin((u * 2 - w) * 5 + n2 * 9 + 2)), 30);
    let col = mix3(b, v, Math.min(1, t * 1.2));
    col = mix3(col, v2, Math.min(1, t2 * 0.9));
    const cloud = (n - 0.5) * 18;
    return [col[0] + cloud, col[1] + cloud, col[2] + cloud];
  });
}
function pixelCanvas(size, fn) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const [r, g, bb] = fn(x / size, y / size);
    const i = (y * size + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = bb; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ------------------------------------------------------------------- plaster
export function plasterCanvas({ size = 512, base = 0xf4efe6, contrast = 10, seed = 3 } = {}) {
  const b = hexRgb(base);
  return pixelCanvas(size, (u, w) => {
    const n = fbm(u * 8, w * 8, seed, 4, 8) - 0.5;
    return [b[0] + n * contrast, b[1] + n * contrast, b[2] + n * contrast];
  });
}

// --------------------------------------------------- checkerboard marble tiles
export function marbleCheckCanvas({ size = 1024, light = 0xf0ece4, dark = 0x4a4a4c } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const white = marbleCanvas({ size: 512, base: light, vein: 0xa8a29a, vein2: 0xd8ccb8, seed: 4, scale: 3 });
  const black = marbleCanvas({ size: 512, base: dark, vein: 0x8a8a8c, vein2: 0x6a6a6c, seed: 9, scale: 3 });
  ctx.fillStyle = '#b9b3a8';
  ctx.fillRect(0, 0, size, size);
  const cell = size / 2; // 2x2 tiles per texture
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const src = (i + j) % 2 === 0 ? white : black;
    ctx.drawImage(src, (i * 137) % 256, (j * 91) % 256, 256, 256, i * cell + 2, j * cell + 2, cell - 4, cell - 4);
  }
  return c;
}

// ------------------------------------------------ cabochon (french bathroom)
export function cabochonCanvas({ size = 1024, tiles = 4 } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const white = marbleCanvas({ size: 512, base: 0xf3f0ea, vein: 0xa9a49c, vein2: 0xd6cdbe, seed: 12, scale: 3 });
  ctx.fillStyle = '#cfc9bf';
  ctx.fillRect(0, 0, size, size);
  const cell = size / tiles;
  for (let i = 0; i < tiles; i++) for (let j = 0; j < tiles; j++) {
    ctx.drawImage(white, (i * 101) % 200, (j * 67) % 200, 300, 300, i * cell + 2, j * cell + 2, cell - 4, cell - 4);
  }
  ctx.fillStyle = '#2a2a2c';
  const cab = cell * 0.16;
  for (let i = 0; i <= tiles; i++) for (let j = 0; j <= tiles; j++) {
    ctx.save();
    ctx.translate(i * cell, j * cell);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-cab / 2, -cab / 2, cab, cab);
    ctx.restore();
  }
  return c;
}

// ------------------------------------------------------------- terracotta
export function terracottaCanvas({ size = 1024, tiles = 4 } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#9d8878';
  ctx.fillRect(0, 0, size, size);
  const cell = size / tiles;
  for (let i = 0; i < tiles; i++) for (let j = 0; j < tiles; j++) {
    const k = hash2(i, j, 21);
    const col = mix3([196, 122, 84], [166, 96, 66], k);
    ctx.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
    ctx.fillRect(i * cell + 4, j * cell + 4, cell - 8, cell - 8);
    for (let s = 0; s < 40; s++) {
      const q = hash2(s, i * 7 + j, 5), r = hash2(s + 3, i + j * 9, 6);
      ctx.fillStyle = `rgba(90,50,30,${0.06 + q * 0.08})`;
      ctx.beginPath();
      ctx.arc(i * cell + 6 + q * (cell - 12), j * cell + 6 + r * (cell - 12), 2 + q * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return c;
}

// ---------------------------------------------------------- subway/marble wall
export function subwayCanvas({ size = 1024, cols = 4, rows = 8, base = 0xf6f3ee } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d5d0c8';
  ctx.fillRect(0, 0, size, size);
  const cw = size / cols, ch = size / rows;
  const b = hexRgb(base);
  for (let j = 0; j < rows; j++) {
    const off = (j % 2) * cw / 2;
    for (let i = -1; i <= cols; i++) {
      const k = hash2(i, j, 33);
      const col = mix3(b, [b[0] - 12, b[1] - 12, b[2] - 10], k);
      const g = ctx.createLinearGradient(0, j * ch, 0, (j + 1) * ch);
      g.addColorStop(0, `rgb(${col[0] + 6},${col[1] + 6},${col[2] + 6})`);
      g.addColorStop(1, `rgb(${col[0] - 8},${col[1] - 8},${col[2] - 8})`);
      ctx.fillStyle = g;
      ctx.fillRect(i * cw + off + 2, j * ch + 2, cw - 4, ch - 4);
    }
  }
  return c;
}

// ------------------------------------------------------------- fabric/linen
export function linenCanvas({ size = 512, base = 0xe9e2d3, contrast = 26, seed = 8 } = {}) {
  const b = hexRgb(base);
  return pixelCanvas(size, (u, w) => {
    const weave = (Math.sin(u * size * 0.9) * Math.sin(w * size * 0.9)) * 0.5;
    const n = fbm(u * 16, w * 16, seed, 3, 16) - 0.5;
    const v = weave * contrast * 0.5 + n * contrast;
    return [b[0] + v, b[1] + v, b[2] + v];
  });
}

// ------------------------------------------------------------------- stripes
export function stripeCanvas({ size = 512, a = 0xf4efe6, b = 0xe1d6c6, stripes = 8 } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const w = size / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = '#' + (i % 2 ? b : a).toString(16).padStart(6, '0');
    ctx.fillRect(i * w, 0, w, size);
  }
  return c;
}

// ------------------------------------------------------------- aubusson rug
export function rugCanvas({ size = 1024, field = '#e8dfd0', border = '#b9c7c9', accent = '#c8a2a0', accent2 = '#8fa3a8' } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, size, size);
  const m = size * 0.05;
  ctx.lineWidth = size * 0.012;
  ctx.strokeStyle = border;
  ctx.strokeRect(m, m, size - 2 * m, size - 2 * m);
  ctx.lineWidth = size * 0.004;
  ctx.strokeStyle = accent2;
  ctx.strokeRect(m * 1.7, m * 1.7, size - 3.4 * m, size - 3.4 * m);
  // border garland
  const petal = (x, y, r, col, rot = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = col;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.6, r * 0.32, r * 0.6, (k * Math.PI * 2) / 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate((Math.PI * 2) / 5);
    }
    ctx.fillStyle = accent2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const p = m * 1.15;
    petal(p + t * (size - 2 * p), p, size * 0.018, accent);
    petal(p + t * (size - 2 * p), size - p, size * 0.018, accent);
    petal(p, p + t * (size - 2 * p), size * 0.018, accent);
    petal(size - p, p + t * (size - 2 * p), size * 0.018, accent);
  }
  // central medallion
  const cx = size / 2, cy = size / 2;
  ctx.strokeStyle = accent2;
  ctx.lineWidth = size * 0.005;
  for (let r = 0.09; r < 0.3; r += 0.07) {
    ctx.beginPath();
    for (let k = 0; k <= 16; k++) {
      const ang = (k / 16) * Math.PI * 2;
      const rr = size * (r + (k % 2 ? 0.02 : 0));
      const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2;
    petal(cx + Math.cos(ang) * size * 0.2, cy + Math.sin(ang) * size * 0.2, size * 0.028, accent, ang);
  }
  petal(cx, cy, size * 0.05, accent);
  // corner sprays
  for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const x = m * 2.4 + sx * (size - 4.8 * m), y = m * 2.4 + sy * (size - 4.8 * m);
    petal(x, y, size * 0.03, accent2);
  }
  return c;
}

// ------------------------------------------------------------- paintings
export function paintingCanvas(seed = 1, size = 512) {
  const palettes = [
    [[214, 196, 168], [120, 140, 150], [90, 100, 90], [230, 220, 200]],
    [[233, 214, 190], [170, 150, 120], [110, 120, 110], [245, 240, 225]],
    [[190, 200, 205], [120, 130, 140], [200, 170, 150], [240, 235, 225]],
    [[220, 205, 180], [140, 160, 150], [190, 140, 120], [250, 245, 235]],
  ];
  const pal = palettes[seed % palettes.length];
  return pixelCanvas(size, (u, w) => {
    const n = fbm(u * 3 + seed, w * 3, seed * 31, 5);
    const sky = Math.max(0, 1 - w * 1.6);
    let col = mix3(pal[0], pal[3], sky * 0.8);
    const ground = w > 0.55 + (n - 0.5) * 0.25 ? 1 : 0;
    col = mix3(col, pal[2], ground * 0.7);
    const hills = w > 0.42 + Math.sin(u * 6 + seed) * 0.04 + (n - 0.5) * 0.1 && !ground ? 1 : 0;
    col = mix3(col, pal[1], hills * 0.6);
    const brush = (valueNoise(u * 80, w * 30, seed) - 0.5) * 22;
    return [col[0] + brush, col[1] + brush, col[2] + brush];
  });
}

// ---------------------------------------------------------------- book spines
export function booksCanvas(size = 512) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a2f26';
  ctx.fillRect(0, 0, size, size);
  const cols = ['#6e4a3a', '#2f4858', '#8c6f4e', '#b09a7b', '#4f5d4c', '#9e5a4a', '#e5dccb', '#3d3b52', '#a67c52', '#5c6e7e'];
  let x = 0, i = 0;
  while (x < size) {
    const w = 10 + hash2(i, 1, 4) * 22;
    const h = size * (0.72 + hash2(i, 2, 4) * 0.26);
    ctx.fillStyle = cols[(i * 7) % cols.length];
    ctx.fillRect(x, size - h, w - 1.5, h);
    ctx.fillStyle = 'rgba(255,230,180,0.5)';
    ctx.fillRect(x + w * 0.3, size - h * 0.85, w * 0.4, 2);
    ctx.fillRect(x + w * 0.3, size - h * 0.2, w * 0.4, 2);
    x += w;
    i++;
  }
  return c;
}

// ------------------------------------------------------------- sky equirect
export function skyCanvas({ w = 2048, h = 1024, sunAz = 0.62, sunEl = 0.55 } = {}) {
  const c = canvas(w);
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const sx = Math.cos(sunEl) * Math.sin(sunAz), sy = Math.sin(sunEl), sz = Math.cos(sunEl) * Math.cos(sunAz);
  for (let y = 0; y < h; y++) {
    const v = y / h;              // 0 top (zenith) -> 1 bottom (nadir)
    const el = (0.5 - v) * Math.PI;
    for (let x = 0; x < w; x++) {
      const az = (x / w) * Math.PI * 2;
      const dx = Math.cos(el) * Math.sin(az), dy = Math.sin(el), dz = Math.cos(el) * Math.cos(az);
      const cosSun = dx * sx + dy * sy + dz * sz;
      let r, g, b;
      if (el > 0) {
        const t = Math.pow(Math.max(0, el / (Math.PI / 2)), 0.55);
        r = lerp(236, 118, t); g = lerp(232, 158, t); b = lerp(226, 210, t);
        const glow = Math.pow(Math.max(0, cosSun), 8) * 0.55 + Math.pow(Math.max(0, cosSun), 300) * 4;
        r += glow * 255; g += glow * 235; b += glow * 200;
      } else {
        const t = Math.min(1, -el / (Math.PI / 2));
        r = lerp(214, 132, t); g = lerp(206, 124, t); b = lerp(194, 112, t);
      }
      const i = (y * w + x) * 4;
      d[i] = Math.min(255, r); d[i + 1] = Math.min(255, g); d[i + 2] = Math.min(255, b); d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ------------------------------------------------------------ brick (青砖)
// Running-bond bricks, `cols` bricks across (2:1 bricks, so 2*cols courses).
export function brickCanvas({ size = 1024, cols = 4, base = 0x8e9494, joint = '#c2c6c2', seed = 12 } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = joint;
  ctx.fillRect(0, 0, size, size);
  const bw = size / cols, bh = bw / 2;
  const b = hexRgb(base);
  const rows = cols * 2;
  for (let j = 0; j < rows; j++) {
    const off = j % 2 ? bw / 2 : 0;
    for (let i = -1; i < cols + 1; i++) {
      const k = hash2(((i + cols) % cols), j, seed);
      const t = (k - 0.5) * 26;
      ctx.fillStyle = `rgb(${(b[0] + t) | 0},${(b[1] + t) | 0},${(b[2] + t * 0.8) | 0})`;
      ctx.fillRect(i * bw + off + 3, j * bh + 3, bw - 6, bh - 6);
      // faint speckle
      for (let q = 0; q < 6; q++) {
        const d = 0.85 + 0.2 * hash2(i * 11 + q, j * 7 + q, seed + 5);
        ctx.fillStyle = `rgba(${(b[0] * d) | 0},${(b[1] * d) | 0},${(b[2] * d) | 0},0.35)`;
        const x = i * bw + off + 6 + hash2(i + q, j, seed + 9) * (bw - 16), y = j * bh + 6 + hash2(i, j + q, seed + 13) * (bh - 16);
        ctx.fillRect(x, y, 6 + q * 2, 3);
      }
    }
  }
  return c;
}

// --------------------------------------------------- plain wool rug (现代)
export function rugWoolCanvas({ size = 1024, field = '#d8d0c2', border = '#bfb5a4', seed = 4 } = {}) {
  const f = hexRgb(parseInt(field.slice(1), 16));
  const c = pixelCanvas(size, (u, w) => {
    const n = fbm(u * 24, w * 24, seed, 4, 24) - 0.5;
    const pile = (Math.sin(u * size * 0.7) * Math.sin(w * size * 0.7)) * 5;
    return [f[0] + n * 22 + pile, f[1] + n * 22 + pile, f[2] + n * 22 + pile];
  });
  const ctx = c.getContext('2d');
  ctx.strokeStyle = border;
  ctx.lineWidth = size * 0.014;
  ctx.strokeRect(size * 0.02, size * 0.02, size * 0.96, size * 0.96);
  return c;
}

// --------------------------------------------------- woven rush mat (宋式 草席)
export function rugWovenCanvas({ size = 1024, light = 0xd9c9a6, dark = 0xbfaa80, binding = '#4a5468', cells = 96 } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const l = hexRgb(light), d = hexRgb(dark);
  const cell = size / cells;
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const over = (i + j) % 2 === 0;
    const k = hash2(i, j, 3) * 18 - 9;
    const col = over ? [l[0] + k, l[1] + k, l[2] + k] : [d[0] + k, d[1] + k, d[2] + k];
    ctx.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
    ctx.fillRect(i * cell, j * cell, cell, cell);
    // strand shading: darker seam along one edge
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    if (over) ctx.fillRect(i * cell, j * cell, cell, 1.5); else ctx.fillRect(i * cell, j * cell, 1.5, cell);
  }
  ctx.strokeStyle = binding;
  ctx.lineWidth = size * 0.022;
  ctx.strokeRect(size * 0.011, size * 0.011, size * 0.978, size * 0.978);
  return c;
}

// -------------------------------------------------- ink-wash landscape (水墨)
// Layered mountain ridges on rice paper, mist between the layers, a red seal.
export function inkCanvas(seed = 1, size = 512) {
  const paper = [238, 232, 218];
  const layers = 3 + (seed % 2);
  const ridges = [];
  for (let k = 0; k < layers; k++) {
    const far = 1 - k / layers; // 1 = farthest
    ridges.push({ base: 0.30 + k * (0.42 / layers) + 0.04 * hash2(seed, k, 1), amp: 0.10 + 0.06 * hash2(seed, k, 2), freq: 1.2 + k * 0.8, k, far });
  }
  const c = pixelCanvas(size, (u, w) => {
    const grain = (fbm(u * 40, w * 40, seed + 40, 3, 40) - 0.5) * 10;
    let col = [paper[0] + grain, paper[1] + grain, paper[2] + grain];
    for (const r of ridges) {
      const ridge = r.base + (fbm(u * r.freq + seed * 3.1 + r.k * 7, 0.3, seed + r.k, 4) - 0.5) * r.amp * 2 + Math.sin(u * 3.7 + r.k + seed) * r.amp * 0.5;
      if (w > ridge) {
        const depth = w - ridge; // distance below the ridge line
        const mist = Math.min(1, depth * (4 + r.k * 2)); // 0 at the base of each layer (mist), 1 up near the ridge... inverted below
        const texture = fbm(u * 18 + r.k, w * 18, seed + 9 + r.k, 4) * 0.5 + 0.5;
        const ink = (0.22 + 0.70 * (1 - r.far)) * (0.55 + 0.45 * texture) * (1 - mist * 0.85);
        const edge = Math.min(1, depth * 60);
        const a = ink * edge;
        col = [col[0] * (1 - a) + 40 * a, col[1] * (1 - a) + 42 * a, col[2] * (1 - a) + 48 * a];
      }
    }
    // water: a few pale horizontal strokes near the bottom
    if (w > 0.86) {
      const stroke = Math.max(0, Math.sin(w * 140 + seed) - 0.7) * 3 * (fbm(u * 6, w * 40, seed + 21, 2) > 0.45 ? 1 : 0);
      col = [col[0] - stroke * 30, col[1] - stroke * 30, col[2] - stroke * 26];
    }
    return col;
  });
  const ctx = c.getContext('2d');
  const s = size * 0.045;
  ctx.fillStyle = '#a8322a';
  ctx.fillRect(size * 0.86, size * 0.90, s, s);
  ctx.fillStyle = '#e6d9c8';
  ctx.fillRect(size * 0.86 + s * 0.28, size * 0.90 + s * 0.28, s * 0.44, s * 0.44);
  return c;
}

// --------------------------------------------------------- material factory
export function makeMaterials() {
  const herring = herringboneTexture();
  const herringTex = toTexture(herring, { repeat: [1, 1] });
  const herringBump = toTexture(herring, { color: false });
  const plaster = plasterCanvas();
  const plasterBump = toTexture(plaster, { color: false });
  const marbleWhite = marbleCanvas({ seed: 2 });
  const marbleCheck = marbleCheckCanvas();
  const cabochon = cabochonCanvas();
  const terracotta = terracottaCanvas();
  const subway = subwayCanvas();
  const linen = linenCanvas();
  const linenBump = toTexture(linen, { color: false });

  const M = {};
  // floors: repeat set per m via mesh uv (world metres); texture spans X metres
  M.herringbone = new THREE.MeshStandardMaterial({
    map: herringTex, bumpMap: herringBump, bumpScale: 0.6, roughness: 0.55, metalness: 0,
  });
  M.herringbone.userData.metresPerTile = 3.4;
  M.marbleCheck = new THREE.MeshPhysicalMaterial({ map: toTexture(marbleCheck), roughness: 0.3, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  M.marbleCheck.userData.metresPerTile = 1.2;
  M.tileBW = new THREE.MeshStandardMaterial({ map: toTexture(cabochon), roughness: 0.3, metalness: 0 });
  M.tileBW.userData.metresPerTile = 1.2;
  M.terracotta = new THREE.MeshStandardMaterial({ map: toTexture(terracotta), roughness: 0.85, metalness: 0 });
  M.terracotta.userData.metresPerTile = 1.2;
  M.marbleWhite = new THREE.MeshStandardMaterial({ map: toTexture(marbleWhite), roughness: 0.2, metalness: 0 });
  M.marbleWhite.userData.metresPerTile = 1.5;
  M.marbleBlack = new THREE.MeshStandardMaterial({ map: toTexture(marbleCanvas({ base: 0x2a2a2c, vein: 0x8a8a8c, vein2: 0x5a5a5c, seed: 9, scale: 3 })), roughness: 0.2 });
  M.marbleBlack.userData.metresPerTile = 1.2;
  M.subway = new THREE.MeshStandardMaterial({ map: toTexture(subway), roughness: 0.25, metalness: 0 });
  M.subway.userData.metresPerTile = 1.2;

  M.plaster = new THREE.MeshStandardMaterial({ color: 0xe6e0d6, bumpMap: plasterBump, bumpScale: 0.15, roughness: 0.95 });
  M.ceiling = new THREE.MeshStandardMaterial({ color: 0xf7f3ec, roughness: 0.95 });
  M.trim = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.5, metalness: 0 }); // painted mouldings, satin
  M.trimDark = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.45 });
  M.brass = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.32, metalness: 1 });
  M.glass = new THREE.MeshPhysicalMaterial({
    color: 0xdfe9ec, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false,
  });
  M.mirror = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.06, metalness: 1 });
  M.linen = new THREE.MeshStandardMaterial({ color: 0xe9e2d3, bumpMap: linenBump, bumpScale: 0.3, roughness: 0.9 });
  M.ground = new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: 1 });
  M.exterior = new THREE.MeshStandardMaterial({ color: 0xd8d2c8, roughness: 0.9 });
  M.exteriorDark = new THREE.MeshStandardMaterial({ color: 0xb9b3a9, roughness: 0.9 });

  // per-room paint (upper wall) and panel colours
  M.paint = (hex) => new THREE.MeshStandardMaterial({ color: hex, bumpMap: plasterBump, bumpScale: 0.12, roughness: 0.92 });
  M.wallpaperStripe = (a, b) => {
    const t = toTexture(stripeCanvas({ a, b }), { repeat: [1, 1] });
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
    m.userData.metresPerTile = 1.2;
    return m;
  };
  // ---- Italian palette
  const walnut = plankTexture();
  M.walnutPlank = new THREE.MeshStandardMaterial({ map: toTexture(walnut), bumpMap: toTexture(walnut, { color: false }), bumpScale: 0.35, roughness: 0.5 });
  M.walnutPlank.userData.metresPerTile = 3.8;
  const veneer = plankTexture({ planks: 1, joints: false, tone: [0x6a4832, 0x4a3122], seed: 9 });
  M.walnutVeneer = new THREE.MeshStandardMaterial({ map: toTexture(veneer), roughness: 0.45 });
  M.walnutVeneer.userData.metresPerTile = 1.2;
  M.marbleGrey = new THREE.MeshPhysicalMaterial({ map: toTexture(stoneTileCanvas()), roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.15 });
  M.marbleGrey.userData.metresPerTile = 1.6;
  M.marbleGreySlab = new THREE.MeshStandardMaterial({ map: toTexture(marbleCanvas({ base: 0x56565a, vein: 0xd8d8d8, vein2: 0x9a9a9c, seed: 21, scale: 2.5 })), roughness: 0.2 });
  M.marbleGreySlab.userData.metresPerTile = 2.4;
  M.calacattaViola = new THREE.MeshStandardMaterial({ map: toTexture(marbleCanvas({ base: 0xf0ece6, vein: 0x6e5866, vein2: 0xb39aa2, seed: 31, scale: 2.5 })), roughness: 0.2 });
  M.calacattaViola.userData.metresPerTile = 2.0;
  M.travertine = new THREE.MeshStandardMaterial({ map: toTexture(travertineCanvas()), roughness: 0.55 });
  M.travertine.userData.metresPerTile = 1.2;
  M.basalt = new THREE.MeshStandardMaterial({ map: toTexture(stoneTileCanvas({ base: 0x3d3d3f, vein: 0x5a5a5c, vein2: 0x4a4a4c, seed: 41, joint: '#2a2a2c' })), roughness: 0.8 });
  M.basalt.userData.metresPerTile = 1.2;
  const cement = plasterCanvas({ base: 0xd6cec2, contrast: 30, seed: 17 });
  M.microCement = (hex) => { const m = new THREE.MeshStandardMaterial({ color: hex, map: toTexture(cement), bumpMap: toTexture(cement, { color: false }), bumpScale: 0.25, roughness: 0.9 }); m.userData.metresPerTile = 1.8; return m; };
  M.metalBlack = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.45, metalness: 0.7 });
  M.champagne = new THREE.MeshStandardMaterial({ color: 0xc9b58c, roughness: 0.3, metalness: 1 });
  M.smokedGlass = new THREE.MeshPhysicalMaterial({ color: 0x6b6560, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  M.rugModern = (variant = 0) => {
    const pals = [{}, { field: '#c9c2b6', a: '#7d7469', b: '#2f2d2a', c: '#a67c52' }, { field: '#d5cfc5', a: '#9a9186', b: '#4b4844', c: '#b8895a' }, { field: '#c4bdb2', a: '#8a8177', b: '#33312e', c: '#c9a24a' }];
    const t = toTexture(rugModernCanvas(pals[variant % pals.length]));
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 1, bumpMap: linenBump, bumpScale: 0.4 });
  };
  M.abstract = (seed) => new THREE.MeshStandardMaterial({ map: toTexture(abstractCanvas(seed)), roughness: 0.85 });
  M.cove = new THREE.MeshStandardMaterial({ color: 0xfff1d8, emissive: 0xffd9a8, emissiveIntensity: 2.2, roughness: 1 });
  // polished large-format marble for the Italian living areas
  M.marbleBeige = new THREE.MeshPhysicalMaterial({ map: toTexture(stoneTileCanvas({ base: 0xcdc3b3, vein: 0x8a7a68, vein2: 0xb3a290, seed: 51, joint: '#b3a898' })), roughness: 0.18, envMapIntensity: 1.2, clearcoat: 0.9, clearcoatRoughness: 0.12 });
  M.marbleBeige.userData.metresPerTile = 1.6;
  const smoked = plankTexture({ tone: [0x4f3d2f, 0x33261c], seed: 13 });
  M.oakSmoked = new THREE.MeshStandardMaterial({ map: toTexture(smoked), bumpMap: toTexture(smoked, { color: false }), bumpScale: 0.3, roughness: 0.5 });
  M.oakSmoked.userData.metresPerTile = 3.8;
  M.walnutDark = M.walnutVeneer.clone();
  M.walnutDark.color.set(0x8c6a50);
  M.rugRibbed = (variant = 0) => {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const ctx = c.getContext('2d');
    const tones = [['#7d7873', '#6b6661'], ['#8a847c', '#77716a'], ['#6e6a66', '#5d5955'], ['#9a938a', '#867f76']][variant % 4];
    ctx.fillStyle = tones[0];
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.fillStyle = tones[1];
    for (let y = 0; y < 1024; y += 8) ctx.fillRect(0, y, 1024, 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, 996, 996);
    const t = toTexture(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 1, bumpMap: linenBump, bumpScale: 0.3 });
  };
  M.abstractDark = (seed) => new THREE.MeshStandardMaterial({ map: toTexture(abstractDarkCanvas(seed)), roughness: 0.7 });
  // ---- Modern (mo_) palette: pale oak, warm porcelain, wool rugs
  const oakPale = plankTexture({ tone: [0xd8bf98, 0xc4a77c], seed: 21 });
  M.oakPale = new THREE.MeshStandardMaterial({ map: toTexture(oakPale), bumpMap: toTexture(oakPale, { color: false }), bumpScale: 0.25, roughness: 0.55 });
  M.oakPale.userData.metresPerTile = 3.8;
  const oakVeneer = plankTexture({ planks: 1, joints: false, tone: [0xd9c09a, 0xc7aa80], seed: 23 });
  M.oakVeneer = new THREE.MeshStandardMaterial({ map: toTexture(oakVeneer), roughness: 0.5 });
  M.oakVeneer.userData.metresPerTile = 1.2;
  M.porcelainWarm = new THREE.MeshPhysicalMaterial({ map: toTexture(stoneTileCanvas({ base: 0xd9d3c9, vein: 0xc3bbaf, vein2: 0xcfc7bb, seed: 61, joint: '#c9c2b7' })), roughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  M.porcelainWarm.userData.metresPerTile = 1.6;
  M.porcelainGrey = new THREE.MeshStandardMaterial({ map: toTexture(stoneTileCanvas({ base: 0xa8a5a0, vein: 0x8d8a84, vein2: 0x9c9993, seed: 62, joint: '#8f8c86' })), roughness: 0.6 });
  M.porcelainGrey.userData.metresPerTile = 1.2;
  M.rugWool = (variant = 0) => {
    const pals = [{ field: '#d8d0c2', border: '#bfb5a4' }, { field: '#cfc6b8', border: '#b1a695' }, { field: '#d9d4cb', border: '#b9b3a8' }, { field: '#c9cbc2', border: '#a7ab9f' }][variant % 4];
    const t = toTexture(rugWoolCanvas({ ...pals, seed: variant + 4 }));
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 1, bumpMap: linenBump, bumpScale: 0.35 });
  };
  // ---- Song (sg_) palette: ash wood, grey brick and stone, limewash walls, rush mats, ink art
  const ashPlank = plankTexture({ tone: [0xdccfb6, 0xc9b99a], seed: 31 });
  M.ashPlank = new THREE.MeshStandardMaterial({ map: toTexture(ashPlank), bumpMap: toTexture(ashPlank, { color: false }), bumpScale: 0.25, roughness: 0.6 });
  M.ashPlank.userData.metresPerTile = 3.8;
  const ashVeneer = plankTexture({ planks: 1, joints: false, tone: [0xdad0b8, 0xcbbc9c], seed: 33 });
  M.ashVeneer = new THREE.MeshStandardMaterial({ map: toTexture(ashVeneer), roughness: 0.55 });
  M.ashVeneer.userData.metresPerTile = 1.2;
  M.ashDark = M.ashVeneer.clone();
  M.ashDark.color.set(0xb09a76);
  M.qingBrick = new THREE.MeshStandardMaterial({ map: toTexture(brickCanvas()), roughness: 0.85 });
  M.qingBrick.userData.metresPerTile = 1.2;
  M.qingStone = new THREE.MeshStandardMaterial({ map: toTexture(stoneTileCanvas({ base: 0x737876, vein: 0x8f9492, vein2: 0x626866, seed: 71, joint: '#585d5b' })), roughness: 0.65 });
  M.qingStone.userData.metresPerTile = 2.4;
  const lime = plasterCanvas({ base: 0xf2f0ec, contrast: 46, seed: 29 });
  M.limewash = (hex) => { const m = new THREE.MeshStandardMaterial({ color: hex, map: toTexture(lime), bumpMap: toTexture(lime, { color: false }), bumpScale: 0.3, roughness: 0.95 }); m.userData.metresPerTile = 2.2; return m; };
  M.rugWoven = (variant = 0) => {
    const pals = [{ light: 0xd9c9a6, dark: 0xbfaa80, binding: '#4a5468' }, { light: 0xd3c6a8, dark: 0xb8a884, binding: '#5b6b63' }, { light: 0xdccfb0, dark: 0xc4b28c, binding: '#6b4b3a' }, { light: 0xd6c7a5, dark: 0xbaa77f, binding: '#3c4658' }][variant % 4];
    const t = toTexture(rugWovenCanvas(pals));
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 1, bumpMap: linenBump, bumpScale: 0.25 });
  };
  M.inkPainting = (seed) => new THREE.MeshStandardMaterial({ map: toTexture(inkCanvas(seed)), roughness: 0.9 });
  for (const [k, v] of Object.entries(M)) if (v && v.isMaterial && !v.name) v.name = k;
  M.linenBump = linenBump;
  M.plasterBump = plasterBump;
  M.rug = (variant = 0) => {
    const palettes = [
      { field: '#e8dfd0', border: '#b9c7c9', accent: '#c8a2a0', accent2: '#8fa3a8' },
      { field: '#e6e0d4', border: '#c9b9a6', accent: '#9fb0a3', accent2: '#b08e6e' },
      { field: '#dfe3e6', border: '#a9b7c0', accent: '#d2b7a8', accent2: '#7f96a3' },
      { field: '#efe6da', border: '#d6b8b3', accent: '#b9c7b6', accent2: '#c39a8c' },
    ];
    const t = toTexture(rugCanvas(palettes[variant % palettes.length]));
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 1, bumpMap: linenBump, bumpScale: 0.35 });
  };
  M.books = new THREE.MeshStandardMaterial({ map: toTexture(booksCanvas()), roughness: 0.8 });
  M.painting = (seed) => new THREE.MeshStandardMaterial({ map: toTexture(paintingCanvas(seed)), roughness: 0.85 });
  M.textures = { herringTex };
  return M;
}
