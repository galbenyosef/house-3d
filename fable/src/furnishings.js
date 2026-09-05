// Loads the Blender-generated GLB assets, re-materialises them with the
// procedural textures, and places every piece of furniture, lighting, art and
// decor. Positions are plan millimetres (x east, y south); `r` is the yaw in
// degrees (0 = front faces south, 90 = east, -90 = west, 180 = north).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FIXTURES } from './fixtures.js';
import { CEIL_H } from './plan.js';
import { PLACEMENTS_ITALIAN, RUGS_ITALIAN } from './placements_italian.js';

const S = 0.001;
const BASE = (import.meta.env && import.meta.env.BASE_URL) || '/';
const modelUrl = (name) => `${BASE}models/${name}.glb`;
const deg = THREE.MathUtils.degToRad;

// ------------------------------------------------------------ placements
// Each entry: { a: asset, x, y, r, z?, n: label, note?, seed? }
export const PLACEMENTS_FRENCH = [
  // ---- 玄关 / 客餐厅 -----------------------------------------------------
  { a: 'console', x: 2000, y: 6100, r: 0, n: '玄关鞋柜 / 边柜', note: '奶油白框线门板 + 黄铜圆拉手 + 白色大理石台面', room: 'living' },
  { a: 'mirror_ornate', x: 2000, y: 5861, r: 0, z: 1050, n: '拱形鎏金装饰镜', note: '挂在鞋柜上方，镜底离地 1050', room: 'living' },
  { a: 'vase_tall', x: 2550, y: 6100, r: 0, z: 850, n: '青花陶瓶 + 干枝', room: 'living' },
  { a: 'books_stack', x: 1450, y: 6100, r: 20, z: 850, n: '艺术书堆', room: 'living' },
  { a: 'coat_rack', x: 600, y: 6180, r: 0, n: '黄铜衣帽架', room: 'living' },
  { a: 'bench', x: 454, y: 7650, r: 90, n: '玄关换鞋凳', note: '墨绿丝绒坐垫 + 奶油白车木腿', room: 'living' },
  { a: 'dining_table', x: 1620, y: 8550, r: 0, n: '圆形餐桌 Ø1350', note: '白色大理石桌面 + 奶油白车木底座', room: 'living' },
  ...[0, 60, 120, 180, 240, 300].map((a) => {
    const rad = deg(a);
    const x = Math.round(1620 + Math.cos(rad) * 900), y = Math.round(8550 + Math.sin(rad) * 900);
    const r = Math.round(THREE.MathUtils.radToDeg(Math.atan2(-Math.cos(rad), -Math.sin(rad))));
    return { a: 'dining_chair', x, y, r, n: '路易十六椭圆藤背餐椅', note: '雾霾蓝丝绒座面', room: 'living' };
  }),
  { a: 'console_short', x: 454, y: 10100, r: 90, n: '餐边柜 1400', note: '西墙，餐区与客厅之间', room: 'living' },
  { a: 'art_landscape', x: 254, y: 10100, r: 90, z: 1100, n: '风景油画 1000×700', seed: 1, room: 'living' },
  { a: 'candlestick', x: 454, y: 9800, r: 0, z: 850, n: '黄铜烛台', room: 'living' },
  { a: 'bowl', x: 454, y: 10350, r: 0, z: 850, n: '陶瓷果盘', room: 'living' },
  { a: 'fireplace', x: 404, y: 12200, r: 90, n: '法式大理石壁炉（电壁炉芯）', note: '西墙居中，壁炉台高 1150', room: 'living' },
  { a: 'tv', x: 262, y: 12200, r: 90, z: 1250, n: '65" 壁挂电视', note: '挂于壁炉上方', room: 'living' },
  { a: 'sconce', x: 256, y: 11250, r: 90, z: 1500, n: '黄铜壁灯', room: 'living' },
  { a: 'sconce', x: 256, y: 13150, r: 90, z: 1500, n: '黄铜壁灯', room: 'living' },
  { a: 'candlestick', x: 404, y: 11750, r: 0, z: 1150, n: '黄铜烛台', room: 'living' },
  { a: 'candlestick', x: 404, y: 12650, r: 0, z: 1150, n: '黄铜烛台', room: 'living' },
  { a: 'sofa', x: 3761, y: 12200, r: -90, n: '三人沙发 2200', note: '米白圈圈绒 + 胡桃木露框', room: 'living' },
  { a: 'coffee_table', x: 2800, y: 12200, r: 90, n: '椭圆大理石茶几 1200×650', room: 'living' },
  { a: 'books_stack', x: 2800, y: 11950, r: -15, z: 450, n: '茶几书堆', room: 'living' },
  { a: 'bowl', x: 2800, y: 12450, r: 0, z: 450, n: '陶瓷果盘', room: 'living' },
  { a: 'bergere', x: 2800, y: 10850, r: 0, n: '贝尔杰扶手椅（雾霾蓝）', room: 'living' },
  { a: 'bergere_green', x: 2800, y: 13550, r: 180, n: '贝尔杰扶手椅（墨绿）', room: 'living' },
  { a: 'side_table', x: 3800, y: 10800, r: 0, n: '大理石边几 Ø500', room: 'living' },
  { a: 'table_lamp', x: 3800, y: 10800, r: 0, z: 602, n: '青花陶瓷台灯', room: 'living' },
  { a: 'floor_lamp', x: 3850, y: 13600, r: 0, n: '黄铜落地灯', room: 'living' },
  { a: 'plant_fig', x: 750, y: 11150, r: 30, n: '琴叶榕', room: 'living' },
  { a: 'plant_olive', x: 3780, y: 6350, r: 0, n: '油橄榄树', room: 'living' },
  { a: 'art_landscape', x: 4186, y: 12200, r: -90, z: 1400, n: '风景油画 1000×700', seed: 2, room: 'living' },
  { a: 'cushion_rose', x: 2800, y: 10900, r: 0, z: 470, n: '丝绒抱枕', room: 'living', skip: true },
  // ---- 过道 --------------------------------------------------------------
  { a: 'vanity_wide', x: 4800, y: 4977, r: 180, n: '干区洗手台 1000', note: '公卫干湿分离，台盆在过道', room: 'living' },
  { a: 'mirror_round', x: 4800, y: 5244, r: 180, z: 1050, n: '黄铜圆镜 Ø700', room: 'living' },
  { a: 'art_small', x: 2997, y: 5450, r: 90, z: 1350, n: '小幅版画', seed: 3, room: 'living' },
  // ---- 厨房 --------------------------------------------------------------
  { a: 'kitchen_set', x: 240, y: 2967, r: 0, n: 'L 形整体橱柜', note: '奶油白框线门板、白色大理石台面与挡水、黄铜拉手、石膏烟罩', room: 'kitchen', corner: true },
  // ---- 榻榻米书房 ----------------------------------------------------------
  { a: 'tatami_platform', x: 2704, y: 1214, r: 0, n: '地台床 2000×1800×400', note: '浅橡木台面 + 奶油白框线抽屉', room: 'tatami' },
  { a: 'bookshelf', x: 4296, y: 900, r: -90, n: '开放书架 1000×2200', note: '背板刷鼠尾草绿', room: 'tatami' },
  { a: 'plant_small', x: 4296, y: 900, r: 0, z: 2200, n: '小盆绿植', room: 'tatami' },
  { a: 'desk', x: 4161, y: 2550, r: -90, n: '胡桃木写字桌 1400×650', note: '皮革桌面镶嵌 + 弯腿黄铜包脚', room: 'tatami' },
  { a: 'desk_chair', x: 3560, y: 2550, r: 90, n: '书桌椅（墨绿座面）', room: 'tatami' },
  { a: 'table_lamp_white', x: 4250, y: 2050, r: 0, z: 765, n: '白陶台灯', room: 'tatami' },
  { a: 'art_landscape', x: 1704, y: 1200, r: 90, z: 1250, n: '风景油画', seed: 0, room: 'tatami' },
  // ---- 次卧1 ---------------------------------------------------------------
  { a: 'bed_double', x: 6699, y: 1700, r: -90, n: '1500 双人床', note: '墨绿丝绒弧形软包床头 + 胡桃木露框', room: 'bed1' },
  { a: 'nightstand', x: 7532, y: 600, r: -90, n: '床头柜', room: 'bed1' },
  { a: 'table_lamp', x: 7532, y: 600, r: 0, z: 632, n: '陶瓷台灯', room: 'bed1' },
  { a: 'wardrobe', x: 6900, y: 3212, r: 180, n: '三门衣柜 1600×600×2300', room: 'bed1' },
  { a: 'dresser', x: 4989, y: 2000, r: 90, n: '三斗柜 / 梳妆台', room: 'bed1' },
  { a: 'mirror_round', x: 4714, y: 2000, r: 90, z: 950, n: '黄铜圆镜', room: 'bed1' },
  { a: 'plant_small', x: 4989, y: 1600, r: 0, z: 850, n: '小盆绿植', room: 'bed1' },
  { a: 'art_portrait', x: 7754, y: 1700, r: -90, z: 1500, n: '油画 600×800', seed: 2, room: 'bed1' },
  // ---- 次卧2 ---------------------------------------------------------------
  { a: 'bed_double', x: 6044, y: 6477, r: 0, n: '1500 双人床', note: '灰粉丝绒软包床头', room: 'bed2', head: 'velvet_rose' },
  { a: 'nightstand', x: 4900, y: 5700, r: 0, n: '床头柜', room: 'bed2' },
  { a: 'nightstand', x: 7190, y: 5700, r: 0, n: '床头柜', room: 'bed2' },
  { a: 'table_lamp_white', x: 4900, y: 5700, r: 0, z: 632, n: '白陶台灯', room: 'bed2' },
  { a: 'table_lamp_white', x: 7190, y: 5700, r: 0, z: 632, n: '白陶台灯', room: 'bed2' },
  { a: 'wardrobe', x: 6000, y: 8262, r: 180, n: '三门衣柜', room: 'bed2' },
  { a: 'dresser', x: 4609, y: 6600, r: 90, n: '三斗柜', room: 'bed2' },
  { a: 'mirror_round', x: 4334, y: 6600, r: 90, z: 950, n: '黄铜圆镜', room: 'bed2' },
  { a: 'bay_cushion', x: 8190, y: 7035, r: 90, z: 480, n: '飘窗坐垫 + 抱枕', note: '飘窗台高 450，铺白色大理石', room: 'bed2' },
  { a: 'art_landscape', x: 6044, y: 5472, r: 0, z: 1500, n: '风景油画', seed: 3, room: 'bed2' },
  // ---- 主卧玄关 ------------------------------------------------------------
  { a: 'art_small', x: 4800, y: 8827, r: 0, z: 1450, n: '小幅版画', seed: 1, room: 'vestibule' },
  // ---- 主卫 ----------------------------------------------------------------
  { a: 'bathtub', x: 7374, y: 9667, r: 90, n: '独立铸铁浴缸 1500', note: '黄铜虎脚 + 落地式黄铜龙头', room: 'bath2' },
  { a: 'toilet', x: 6000, y: 9167, r: 0, n: '马桶', room: 'bath2' },
  { a: 'vanity', x: 6300, y: 10239, r: 180, n: '浴室柜 800', note: '大理石台面 + 台上盆 + 黄铜龙头', room: 'bath2' },
  { a: 'mirror_round', x: 6300, y: 10507, r: 180, z: 1050, n: '黄铜圆镜', room: 'bath2' },
  // ---- 公卫 ----------------------------------------------------------------
  { a: 'shower', x: 7301, y: 4232, r: 0, n: '淋浴区 900×900', note: '一字玻璃隔断 + 黄铜顶喷', room: 'bath1' },
  { a: 'toilet', x: 6500, y: 4904, r: 180, n: '马桶', room: 'bath1' },
  // ---- 主卧 ----------------------------------------------------------------
  { a: 'bed_queen', x: 6768, y: 11790, r: 0, n: '1800 大床', note: '雾霾蓝丝绒驼峰软包床头 + 胡桃木露框', room: 'bed3' },
  { a: 'side_table', x: 5545, y: 10960, r: 0, s: 0.8, n: '床头小圆几 Ø400', note: '房门开启范围内不放柜体，改用小圆几', room: 'bed3' },
  { a: 'table_lamp_white', x: 5545, y: 10960, r: 0, z: 482, n: '白陶台灯', room: 'bed3' },
  { a: 'wardrobe_wide', x: 4671, y: 12900, r: 90, n: '四门衣柜 2200×600×2400', room: 'bed3' },
  { a: 'dresser', x: 6100, y: 14078, r: 180, n: '梳妆台 / 三斗柜', note: '窗下，台高 850 低于窗台 900', room: 'bed3' },
  { a: 'vase_tall', x: 6400, y: 14078, r: 0, z: 850, n: '陶瓶插花', room: 'bed3' },
  { a: 'bergere_green', x: 7250, y: 13750, r: -135, n: '贝尔杰扶手椅（墨绿）', room: 'bed3' },
  { a: 'floor_lamp', x: 7450, y: 12900, r: 0, n: '黄铜落地灯', room: 'bed3' },
  { a: 'art_landscape', x: 6768, y: 10735, r: 0, z: 1550, n: '风景油画', seed: 1, room: 'bed3' },
  // ---- 阳台 ----------------------------------------------------------------
  { a: 'bistro_table', x: 1300, y: 15371, r: 0, n: '铁艺小圆桌 Ø600', room: 'balcony' },
  { a: 'bistro_chair', x: 750, y: 15371, r: 90, n: '藤面铁艺椅', room: 'balcony' },
  { a: 'bistro_chair', x: 1850, y: 15371, r: -90, n: '藤面铁艺椅', room: 'balcony' },
  { a: 'planter_box', x: 3300, y: 15945, r: 0, n: '石质花箱 900', room: 'balcony' },
  { a: 'planter_box', x: 4600, y: 15945, r: 0, n: '石质花箱 900', room: 'balcony' },
  { a: 'plant_olive', x: 700, y: 15400, r: 0, n: '油橄榄树', room: 'balcony' },
  { a: 'plant_olive', x: 5700, y: 15600, r: 40, n: '油橄榄树', room: 'balcony' },
  { a: 'washer', x: 6706, y: 15371, r: -90, n: '滚筒洗衣机', note: '阳台东端洗衣区', room: 'balcony' },
];

export const RUGS_FRENCH = [
  { x: 2750, y: 12200, w: 2600, d: 3400, v: 0, room: 'living', n: '奥布松风格羊毛地毯 2600×3400' },
  { x: 1620, y: 8550, w: 2600, d: 2600, v: 1, room: 'living', n: '餐区地毯 2600×2600' },
  { x: 3700, y: 4800, w: 800, d: 1800, v: 2, room: 'living', n: '过道长条地毯 800×1800' },
  { x: 6000, y: 1700, w: 1800, d: 2400, v: 3, room: 'bed1', n: '卧室地毯 1800×2400' },
  { x: 6044, y: 7700, w: 2200, d: 1500, v: 2, room: 'bed2', n: '卧室地毯 2200×1500' },
  { x: 6500, y: 13150, w: 2400, d: 1700, v: 0, room: 'bed3', n: '卧室地毯 2400×1700' },
  { x: 2704, y: 2400, w: 1600, d: 560, v: 1, room: 'tatami', n: '床前小地毯 1600×560' },
];

// Wall-hung pieces: their origin is placed on the wall finish; the model is
// pushed out by the depth it extends behind its origin so the back sits flush.
export const WALL_MOUNTED = new Set(['mirror_ornate', 'mirror_round', 'art_portrait', 'art_landscape', 'art_small', 'sconce', 'tv',
  'it_mirror_round', 'it_mirror_led', 'it_art_large', 'it_art_tall', 'it_art_small', 'it_wall_light', 'it_nightstand', 'it_nightstand_s', 'it_dresser', 'it_vanity', 'it_vanity_wide', 'it_toilet', 'it_hook_rail', 'it_media_wall']);
export function resolvePlacement(p, backDepthMm = 0) {
  if (!WALL_MOUNTED.has(p.a)) return { x: p.x, y: p.y };
  const rad = deg(p.r || 0);
  return { x: p.x + Math.sin(rad) * backDepthMm, y: p.y + Math.cos(rad) * backDepthMm };
}

export const TABLES = {
  french: { placements: PLACEMENTS_FRENCH, rugs: RUGS_FRENCH },
  italian: { placements: PLACEMENTS_ITALIAN, rugs: RUGS_ITALIAN },
};
// kept for older imports
export const PLACEMENTS = PLACEMENTS_FRENCH;
export const RUGS = RUGS_FRENCH;

// ------------------------------------------------------------ materials
const FABRIC = /^(linen|boucle|velvet|fabric|leather|paper|cane|rattan|canvas|books|soil)/;
const UV_TILE = { books: 0.42, marble_white: 1.2, marble_black: 1.0, marble_grey: 2.4, calacatta: 2.0, travertine: 1.2, walnut: 1.2, teak: 1.2, oak_smoked: 1.2, canvas: 1, default: 0.35 };

function boxUV(geom, tile) {
  const g = geom.index ? geom.toNonIndexed() : geom.clone();
  const pos = g.attributes.position;
  const n = pos.count;
  const uv = new Float32Array(n * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nrm = new THREE.Vector3();
  const tri = [a, b, c];
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    nrm.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
    const ax = Math.abs(nrm.x), ay = Math.abs(nrm.y), az = Math.abs(nrm.z);
    for (let k = 0; k < 3; k++) {
      const p = tri[k];
      let u, v;
      if (ax >= ay && ax >= az) { u = p.z; v = p.y; } else if (ay >= az) { u = p.x; v = p.z; } else { u = p.x; v = p.y; }
      uv[(i + k) * 2] = u / tile;
      uv[(i + k) * 2 + 1] = v / tile;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// front/back faces of a canvas box mapped 0..1 to its own extent
function canvasUV(geom) {
  const g = geom.index ? geom.toNonIndexed() : geom.clone();
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - bb.min.x) / w;
    uv[i * 2 + 1] = (pos.getY(i) - bb.min.y) / h;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

function buildMaterial(name, orig, M) {
  const color = orig.color?.clone?.() ?? new THREE.Color(0xcccccc);
  switch (name) {
    case 'glass': return M.glass;
    case 'crystal': return new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, metalness: 0.05, transparent: true, opacity: 0.55, envMapIntensity: 2.5, clearcoat: 1, depthWrite: false });
    case 'mirror': return M.mirror;
    case 'bulb': return new THREE.MeshStandardMaterial({ color: 0xfff2dc, emissive: 0xffc98a, emissiveIntensity: 2.0, roughness: 0.4 });
    case 'ember': return new THREE.MeshStandardMaterial({ color: 0xff5a1a, emissive: 0xff3c00, emissiveIntensity: 2.0, roughness: 0.6 });
    case 'books': return M.books;
    case 'marble_white': return M.marbleWhite;
    case 'marble_black': return M.marbleBlack;
    case 'marble_grey': return M.marbleGreySlab;
    case 'calacatta': return M.calacattaViola;
    case 'travertine': return M.travertine;
    case 'walnut': return M.walnutVeneer;
    case 'teak': { const m = M.walnutVeneer.clone(); m.color.set(0xd9a878); return m; }
    case 'oak_smoked': { const m = M.walnutVeneer.clone(); m.color.set(0xb9a58f); return m; }
    case 'smoked_glass': return M.smokedGlass;
    case 'champagne': return M.champagne;
    case 'led': return new THREE.MeshStandardMaterial({ color: 0xfff3e0, emissive: 0xffd9a8, emissiveIntensity: 2.2, roughness: 0.6 });
    case 'paper': return new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffe2b8, emissiveIntensity: 0.12, bumpMap: M.linenBump, bumpScale: 0.15 });
    case 'leaf_green': case 'leaf_olive': return new THREE.MeshStandardMaterial({ color, roughness: 0.65, side: THREE.DoubleSide });
    default: break;
  }
  if (/^leather/.test(name)) return new THREE.MeshStandardMaterial({ color, roughness: 0.55, bumpMap: M.linenBump, bumpScale: 0.08 });
  if (FABRIC.test(name)) return new THREE.MeshStandardMaterial({ color, roughness: 0.96, bumpMap: M.linenBump, bumpScale: 0.22 });
  const m = new THREE.MeshStandardMaterial({ color, roughness: orig.roughness ?? 0.6, metalness: orig.metalness ?? 0 });
  if (m.metalness > 0.5) m.envMapIntensity = 1.4;
  if (/paint|oak|walnut|ebony|ivory|plaster|stone/.test(name)) { m.bumpMap = M.plasterBump; m.bumpScale = 0.04; }
  return m;
}

// ------------------------------------------------------------ loading
export async function buildFurnishings(M, style, onProgress = () => {}) {
  const group = new THREE.Group();
  group.name = 'furnishings';
  const loader = new GLTFLoader();
  const { placements: PLACEMENTS, rugs: RUGS } = TABLES[style.id];
  const FIXTURE_MODEL = style.fixtureModels;
  const FIXTURE_NAME = style.fixtureNames;
  const fixtureModelFor = (f) => style.fixtureById[f.id]?.model || FIXTURE_MODEL[f.kind];
  const names = new Set([...PLACEMENTS.filter((p) => !p.skip).map((p) => p.a), ...FIXTURES.map(fixtureModelFor), ...Object.values(style.ceilingRose)]);
  const protos = new Map();
  const matCache = new Map();
  const geomCache = new Map();
  let done = 0;
  await Promise.all([...names].map(async (name) => {
    try {
      const gltf = await loader.loadAsync(modelUrl(name));
      const root = gltf.scene;
      root.traverse((o) => {
        if (!o.isMesh) return;
        const mname = o.material?.name || 'default';
        const tile = UV_TILE[mname] ?? (FABRIC.test(mname) ? UV_TILE.default : 0);
        if (mname === 'canvas') {
          o.geometry = canvasUV(o.geometry);
          o.userData.canvas = true;
        } else if (tile) {
          const key = o.geometry.uuid + ':' + tile;
          if (!geomCache.has(key)) geomCache.set(key, boxUV(o.geometry, tile));
          o.geometry = geomCache.get(key);
        }
        if (!matCache.has(mname)) matCache.set(mname, buildMaterial(mname, o.material, M));
        o.material = matCache.get(mname);
        o.castShadow = !(mname === 'glass' || mname === 'crystal');
        o.receiveShadow = true;
      });
      const box = new THREE.Box3().setFromObject(root);
      protos.set(name, { root, size: box.getSize(new THREE.Vector3()), min: box.min.clone() });
    } catch (err) {
      console.warn('asset failed', name, err);
    }
    onProgress(++done / names.size);
  }));

  // width × depth × height in the piece's own frame (what you would order)
  const dims = (size) => `${Math.round(size.x * 1000)} × ${Math.round(size.z * 1000)} × ${Math.round(size.y * 1000)} mm`;

  const place = (asset, x, y, r, z, item, extra = {}) => {
    const proto = protos.get(asset);
    if (!proto) return null;
    const inst = proto.root.clone();
    if (extra.seed !== undefined) {
      const art = M[style.art] || M.painting;
      inst.traverse((o) => { if (o.isMesh && o.userData.canvas) o.material = art(extra.seed); });
    }
    if (extra.head) {
      inst.traverse((o) => { if (o.isMesh && (o.name === 'headboard' || o.name.startsWith('euro'))) o.material = matCache.get(extra.head) || o.material; });
    }
    const back = WALL_MOUNTED.has(asset) ? Math.max(0, -proto.min.z) * 1000 : 0;
    const pos = resolvePlacement({ a: asset, x, y, r }, back);
    inst.position.set(pos.x * S, (z || 0) * S, pos.y * S);
    inst.rotation.y = deg(r || 0);
    if (extra.scale) inst.scale.setScalar(extra.scale);
    const sz = extra.scale ? proto.size.clone().multiplyScalar(extra.scale) : proto.size;
    inst.userData.item = { name: item.n, dims: dims(sz), note: item.note, room: item.room, asset };
    inst.name = `item-${asset}`;
    group.add(inst);
    return inst;
  };

  for (const p of PLACEMENTS) {
    if (p.skip) continue;
    place(p.a, p.x, p.y, p.r, p.z, p, { seed: p.seed, head: p.head, scale: p.s });
  }
  // ceiling fixtures at the positions the lighting rig uses
  for (const f of FIXTURES) {
    const override = style.fixtureById[f.id] || {};
    const model = fixtureModelFor(f);
    const proto = protos.get(model);
    if (!proto) continue;
    const fx = override.x ?? f.x, fy = override.y ?? f.y;
    const z = CEIL_H - proto.size.y * 1000 - (f.kind === 'flush' ? 0 : style.fixtureDrop);
    place(model, fx, fy, override.rot || 0, z, { n: override.name || FIXTURE_NAME[f.kind], room: f.room, note: `离地 ${Math.round(z)} mm` });
    const rose = style.ceilingRose[f.kind];
    if (rose) {
      const inst = place(rose, fx, fy, 0, CEIL_H, { n: '石膏灯盘', room: f.room, note: '吊灯处石膏浮雕灯盘' });
      if (inst) inst.rotation.x = Math.PI; // hang from the ceiling
    }
  }
  // rugs
  for (const rg of RUGS) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rg.w * S, rg.d * S), (M[style.rug] || M.rug)(rg.v));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(rg.x * S, 0.006, rg.y * S);
    mesh.receiveShadow = true;
    mesh.userData.item = { name: rg.n, dims: `${rg.w} × ${rg.d} mm`, room: rg.room, asset: 'rug' };
    mesh.name = 'rug';
    group.add(mesh);
  }
  // per-room inventory for the UI (aggregated by name)
  const roomItems = new Map();
  const addItem = (room, name, dimsStr, note, asset) => {
    if (!roomItems.has(room)) roomItems.set(room, []);
    const list = roomItems.get(room);
    const hit = list.find((i) => i.name === name && i.dims === dimsStr);
    if (hit) hit.count++;
    else list.push({ name, dims: dimsStr, note, asset, count: 1 });
  };
  for (const inst of group.children) {
    const it = inst.userData.item;
    if (it) addItem(it.room, it.name, it.dims, it.note, it.asset);
  }
  group.userData.roomItems = roomItems;
  group.userData.setNight = (night) => {
    for (const [name, m] of matCache) {
      if (name === 'bulb') m.emissiveIntensity = night ? 4.0 : 2.0;
      if (name === 'led') m.emissiveIntensity = night ? 3.5 : 2.2;
      if (name === 'paper') m.emissiveIntensity = night ? 0.9 : 0.12;
      if (name === 'ember') m.emissiveIntensity = night ? 3.5 : 2.0;
    }
  };
  return group;
}
