// Generates docs/design-spec.md from the same data that drives the scene, so
// the written spec can never drift from what is rendered.
import { readFileSync, writeFileSync } from 'node:fs';
import { TABLES } from '../src/furnishings.js';
import { STYLES } from '../src/styles.js';
import { FIXTURES } from '../src/fixtures.js';
import { ROOMS, OPENINGS, CEIL_H, WALL_H, roomArea, rectArea } from '../src/plan.js';

const manifest = JSON.parse(readFileSync(new URL('../public/models/manifest.json', import.meta.url)));
const mm = (v) => Math.round(v * 1000);
const dims = (a, r = 0, k = 1) => {
  const [x, y, z] = manifest[a].size.map((v) => v * k);
  return `${mm(x)} × ${mm(y)} × ${mm(z)}`;
};
const FIXTURE_NAME = { 'chandelier-large': '八臂水晶吊灯', 'chandelier-small': '五臂水晶吊灯', lantern: '黄铜玻璃灯笼吊灯', flush: '黄铜吸顶灯' };
const FIXTURE_MODEL = { 'chandelier-large': 'chandelier_large', 'chandelier-small': 'chandelier_small', lantern: 'lantern', flush: 'flush_light' };

const ROOM_TEXT = {
  living: {
    title: '客餐厅（含玄关、过道）',
    hard: [
      '地面：橡木人字拼实木复合地板，板条 600×120 mm，45° 人字铺贴，本色哑光漆；从玄关一直铺到过道与卧室，不设过门石',
      '墙面：整墙护墙板做法——踢脚线 118 mm（成品实木/PU），腰线 950 mm 高，腰线以下每 600–800 mm 一个矩形框线（PU 线条 28×12 mm），腰线以上做高框线到顶角线下 120 mm；平板墙面用乳胶漆，框线与线条统一刷奶油白丝光',
      '顶面：石膏顶角线 100×120 mm 弧形（顶棚净高 2720 mm），餐厅与客厅吊灯位各一个 Ø800 石膏灯盘',
      '门洞：主卧套间入口做拱形门洞（宽 1100，拱顶 2350，两侧 90 mm 门套线 + 拱心石）',
      '窗：阳台推拉门 3600 × 2400 三扇，深炭灰细框（与阳台幕墙同色），室内挂 260 mm 高黄铜窗帘杆',
    ],
    palette: [['墙面', '#EFE7DA 奶油白'], ['护墙板/线条', '#F6F1E8 象牙白丝光'], ['点缀', '#B6C4CA 雾霾蓝 / #C9A24A 黄铜'], ['地板', '#D9B98C 本色橡木']],
  },
  kitchen: {
    title: '厨房',
    hard: [
      '地面：黑白棋盘格大理石（600×600 卡拉拉白 / 黑金花），45° 斜铺',
      '墙面：台面以上 550 mm 做整块白色大理石挡水，其余墙面刷奶油白乳胶漆；不做护墙板',
      '橱柜：L 形，西墙（窗下）水槽区 + 北墙灶区；柜门为奶油白框线 Shaker 门板，黄铜 T 形拉手；台面 40 mm 白色大理石；北墙吊柜玻璃门；灶台上方石膏抹灰烟罩 + 黄铜饰带；冰箱嵌入北墙东端',
      '门：厨房与过道之间用 1200 mm 玻璃推拉门（细框，与阳台门同款）',
    ],
    palette: [['柜门', '#F1EBE1 奶油白'], ['台面', '#F2EFE8 卡拉拉白'], ['地砖', '#4A4A4C 黑 / #F0ECE4 白'], ['五金', '#C9A24A 黄铜']],
  },
  tatami: {
    title: '榻榻米书房',
    hard: [
      '地面：与客厅同款人字拼橡木',
      '墙面：整墙护墙板刷鼠尾草绿（平板 + 线条同色，法式"单色护墙板"做法），腰线 950，上框线到顶',
      '地台：2000 × 1800 × 400 mm 定制地台，浅橡木台面，南侧 3 组框线抽屉面 + 黄铜拉手，上铺 1450 × 1700 日式软垫',
      '门：南墙 1200 mm 法式对开玻璃门（2×600，象牙白，格条 2×5）',
    ],
    palette: [['墙面/护墙板', '#8A9C8B 鼠尾草绿'], ['地台', '#C7A880 浅橡木'], ['软装', '#436154 墨绿丝绒 / #C79E4D 芥末黄']],
  },
  bed1: {
    title: '次卧 1',
    hard: [
      '地面：人字拼橡木',
      '墙面：腰线以下奶油白护墙板；腰线以上贴法式竖条纹壁纸（奶油白 / 浅玫瑰灰，条宽 150 mm）',
      '床头墙：东墙；南墙放三门衣柜，西墙三斗柜 + 黄铜圆镜',
    ],
    palette: [['壁纸', '#F6F0E7 / #E7D9D0 条纹'], ['护墙板', '#F6F1E8'], ['床头软包', '#436154 墨绿丝绒'], ['点缀', '#C9A24A 黄铜']],
  },
  bed2: {
    title: '次卧 2',
    hard: [
      '地面：人字拼橡木；飘窗台面铺 30 mm 白色大理石（台高 450）',
      '墙面：腰线以下奶油白护墙板，腰线以上灰粉乳胶漆',
      '飘窗：东侧 845 mm 深飘窗，台面加定制亚麻坐垫 + 抱枕',
    ],
    palette: [['墙面', '#DCCBC2 灰粉'], ['护墙板', '#F6F1E8'], ['床头软包', '#CC9E99 玫瑰粉丝绒'], ['窗帘', '#D8C3BD']],
  },
  bed3: {
    title: '主卧（含玄关、主卫）',
    hard: [
      '地面：人字拼橡木',
      '墙面：整墙护墙板，平板刷雾霾蓝，线条象牙白（上下框线做满）',
      '主卧玄关：从客厅拱形门洞进入，右手主卫门（800 外开），正前主卧门（850 内开）',
      '窗：东墙大窗 2700 × 1900（窗台 600），南墙朝阳台窗 2200 × 1500（窗台 900）；两窗均做落地亚麻窗帘 + 纱帘',
      '顶面：Ø800 石膏灯盘 + 八臂水晶吊灯',
    ],
    palette: [['墙面', '#B6C4CA 雾霾蓝'], ['护墙板线条', '#F6F1E8'], ['床头软包', '#5C7589 雾霾蓝丝绒'], ['床尾毯', '#C79E4D 芥末黄']],
  },
  bath1: {
    title: '公卫（干湿分离）',
    hard: [
      '地面：卡布梭（cabochon）拼花——300×300 白色大理石 + 黑色小方角砖',
      '墙面：白色大理石通铺到顶（或大理石纹瓷砖），80 mm 同材踢脚',
      '布局：干区洗手台设在过道（1000 mm 浴室柜 + Ø700 黄铜圆镜），湿区内为 900×900 淋浴 + 马桶；东墙高窗 800×700（窗台 1500）',
    ],
    palette: [['墙/地', '#F3F0EA 白大理石'], ['拼花', '#2A2A2C 黑'], ['五金', '#C9A24A 黄铜']],
  },
  bath2: {
    title: '主卫',
    hard: [
      '地面：与公卫同款卡布梭拼花',
      '墙面：白色大理石通铺到顶',
      '布局：东墙 1500 mm 独立虎脚浴缸 + 落地黄铜龙头，北墙马桶，南墙 800 浴室柜 + 圆镜；东墙高窗',
    ],
    palette: [['墙/地', '#F3F0EA'], ['拼花', '#2A2A2C'], ['浴缸外壁', '#F7F7F5 白'], ['五金', '#C9A24A 黄铜']],
  },
  balcony: {
    title: '阳台',
    hard: [
      '地面：红陶方砖 300×300，灰色勾缝',
      '围护：南侧整面落地玻璃幕（深炭灰细框，横梃 1 道，竖梃 8 格），下部 250 mm 矮墙',
      '墙面：外墙同色抹灰（暖灰米），顶面刷白，不做线脚',
      '功能：西端休闲区（铁艺小圆桌 + 两椅 + 油橄榄），中部两个石质花箱靠幕墙，东端洗衣区（滚筒洗衣机）',
    ],
    palette: [['地砖', '#C47A54 红陶'], ['幕墙框', '#2B2B2E 炭灰'], ['墙面', '#E9E2D6']],
  },
};

const ROOM_TEXT_ITALIAN = {
  living: {
    title: '客餐厅（含玄关、过道）',
    hard: [
      '地面：800×800 抛光米灰大理石（客餐厅、过道、玄关），2 mm 密缝；卧室与书房改 190 mm 宽烟熏橡木直铺',
      '墙面：炭灰微水泥 #3D3A37 通刷，不做任何线脚；踢脚位置留 15 mm 阴影缝（收缩踢脚），顶部离顶 30–70 mm 处做 LED 灯槽洗墙（3000 K）',
      '顶面：平顶白色，四周灯槽',
      '西墙：卡拉卡塔岩板通顶 3200×2600，中部黄铜网面透视电壁炉 1400×300，下方悬浮炭灰烤漆柜 2400×420×360（柜底 LED），电视壁挂',
      '玄关：黑钛框玻璃酒柜 1600×400×2400，烟灰玻璃层板逐层 LED，滑动玻璃门',
      '门洞：主卧套间入口改方形黑钛门套（60 mm 边框），门扇为深胡桃木平板门 + 黑钛长条把手',
      '窗：黑钛细框大玻璃（无格条），深灰亚麻落地帘走顶部暗轨，配白纱',
    ],
    palette: [['墙面', '#3D3A37 炭灰微水泥'], ['岩板', '#E9E4DC 卡拉卡塔'], ['五金', '#1C1C1E 黑钛 / #C9B58C 香槟金'], ['软装', '#2F5443 墨绿丝绒 / #94502F 焦糖丝绒']],
  },
  kitchen: {
    title: '厨房',
    hard: ['地面：抛光米灰大理石通铺', '橱柜：炭灰烤漆无拉手平板门（3 mm 香槟金缝线），黑色收缩踢脚', '台面：卡拉卡塔岩板 20 mm，挡板同材通到吊柜底', '电器：黑玻嵌入式灶具与烤箱、黑玻高柜冰箱、黑色龙头；吊柜底 LED 线性灯', '门：过道侧黑钛框玻璃推拉门'],
    palette: [['门板', '#2A2A2B 炭灰烤漆'], ['台面', '#E9E4DC 卡拉卡塔'], ['五金', '#1C1C1E 黑钛']],
  },
  tatami: {
    title: '书房',
    hard: ['地面：烟熏橡木直铺', '墙面：炭灰微水泥 #34322F + 顶部灯槽', '地台：胡桃木 2000×1800×400，黑色收缩踢脚内藏 LED，灰亚麻床垫 + 炭灰丝绒被', '书桌：胡桃木 1600×700 + 黑钛雪橇架；黑钛胡桃木开放架', '门：黑钛框对开玻璃门'],
    palette: [['墙面', '#34322F'], ['胡桃木', '#5A3E2B'], ['五金', '#1C1C1E']],
  },
  bed1: {
    title: '次卧 1',
    hard: ['地面：烟熏橡木直铺', '墙面：暖灰微水泥 #5A534C + 顶部灯槽', '床：1500 低床，炭灰布艺床体，黑色皮革宽床头（1800 宽）+ 香槟金饰线', '收纳：南墙炭灰烤漆通顶衣柜 1600×2650；西墙悬浮梳妆台 1200（离地 650）+ LED 背光圆镜；东墙悬浮床头柜 450（离地 450）'],
    palette: [['墙面', '#5A534C'], ['皮革', '#1A1717'], ['饰线', '#C9B58C']],
  },
  bed2: {
    title: '次卧 2',
    hard: ['地面：烟熏橡木直铺', '墙面：暖灰微水泥 #57514B + 灯槽', '飘窗：灰色大理石台面 + 大地色皮革坐垫', '床：1500 低床靠北墙，悬浮床头柜 ×2；南墙通顶衣柜；西墙悬浮梳妆台 + LED 圆镜'],
    palette: [['墙面', '#57514B'], ['飘窗', '#56565A 灰色大理石'], ['床尾毯', '#94502F 焦糖丝绒']],
  },
  bed3: {
    title: '主卧（含玄关、主卫）',
    hard: ['地面：烟熏橡木直铺', '墙面：深灰微水泥 #46413D + 灯槽', '床：1800 低床靠西墙（床头 2100 宽黑色皮革），北墙留出房门开启范围后放 2200 通顶衣柜', '东侧阅读角：橄榄绿丝绒桶形椅 + 黑钛落地灯', '南窗侧悬浮梳妆台 + LED 圆镜；玄关斜靠黑框落地镜 600×1800', '顶：玻璃球泡组合吊灯'],
    palette: [['墙面', '#46413D'], ['皮革', '#1A1717'], ['丝绒', '#2F5443 橄榄绿']],
  },
  bath1: {
    title: '公卫',
    hard: ['墙地：灰色大理石大板通铺（800×2400 竖贴）', '淋浴：900×900 灰色石材淋浴盘 + 无框玻璃 + 黑色顶框，黑色顶喷 Ø250 + 花洒柱，长条地漏', '壁挂马桶 + 黑色冲水面板', '干区：过道悬浮洗手台 1100 + 黑陶台上盆 + LED 背光圆镜'],
    palette: [['墙地', '#56565A'], ['五金', '#1C1C1E']],
  },
  bath2: {
    title: '主卫',
    hard: ['墙地：灰色大理石大板通铺', '浴缸：亚光白人造石椭圆独立缸 1600×750 + 黑色落地龙头（靠东墙）', '浴室柜：悬浮胡桃木 900（离地 550）+ 卡拉卡塔台面 + 黑陶台上盆 + 入墙黑色龙头', '壁挂马桶；LED 背光圆镜'],
    palette: [['墙地', '#56565A'], ['浴缸', '#F1F0EE'], ['五金', '#1C1C1E']],
  },
  balcony: {
    title: '阳台',
    hard: ['地面：600×600 深灰玄武岩', '围护：黑钛细框落地玻璃幕（单横梃）', '墙面：深灰微水泥', '功能：柚木躺椅 ×2 + 黑钛边几；黑色花箱观赏草 ×2；黑色高筒花器油橄榄；东端黑色滚筒洗衣机'],
    palette: [['地砖', '#3D3D3F 玄武岩'], ['柚木', '#C39B6A'], ['五金', '#1C1C1E']],
  },
};

const roomsInOrder = ['living', 'kitchen', 'tatami', 'bed1', 'bed2', 'bed3', 'bath1', 'bath2', 'balcony'];
let out = `# 四居室 · 全屋设计说明（复刻手册：法式 / 意式轻奢）

> 本文档由 \`scripts/gen-spec.mjs\` 从场景数据自动生成（\`npm run spec\`），与 three.js 场景中的布置一一对应。
> 单位均为毫米；家具尺寸为 宽 × 深 × 高（家具自身正面朝向，即采购尺寸）。

## 1. 户型与总则

- 套内轮廓 8853 × 16375 mm（含次卧 2 东侧 845 mm 飘窗），四室两厅两卫，套内约 121 m²；结构层高 ${WALL_H} mm，法式吊顶后净高 ${CEIL_H} mm。
- 方案 A 法式（Parisian / Haussmannien）——整墙护墙板框线、石膏顶角线与灯盘、人字拼橡木地板、拱形门洞、法式玻璃门、大理石 + 黄铜、水晶吊灯，家具以路易十六与贝尔杰式为主，色调奶油白 + 雾霾蓝 + 鼠尾草绿 + 灰粉，黄铜点缀。
- 方案 B 意式轻奢（Contemporary Italian）——炭灰微水泥 + 卡拉卡塔岩板 + 抛光大理石地面 + 黑钛/香槟金 + 墨绿与焦糖丝绒，顶部灯槽洗墙、收缩踢脚、无拉手平板柜体、悬浮床头柜与浴室柜、Arco 弧形落地灯、黑框玻璃酒柜。
- 墙体：外墙 240（北墙 300），内墙 120–200；所有饰面板（护墙板）比结构墙面凸出 12 mm。
- 法式线脚尺寸：踢脚线 118 高 / 16 出；腰线 950 高（截面 24 × 54）；顶角线 100 出 × 120 高弧形；框线 28 高 × 12 出。意式：无线脚，踢脚阴影缝 15 mm，灯槽离顶 30–70 mm。

### 房间面积

| 房间 | 净尺寸 | 面积 |
|---|---|---|
`;
for (const room of ROOMS) {
  if (room.partOf) continue;
  const r = room.rects[0];
  const area = roomArea(room) + (room.bay ? rectArea(room.bay.rect) / 1e6 : 0) + ROOMS.filter((x) => x.partOf === room.id).reduce((s, x) => s + roomArea(x), 0);
  out += `| ${room.name} | ${r[2] - r[0]} × ${r[3] - r[1]}${room.rects.length > 1 ? '（L 形）' : ''}${room.bay ? ' + 飘窗' : ''} | ${area.toFixed(2)} m²（图纸 ${room.label ?? '—'}） |\n`;
}

out += `
## 2. 门窗表

| 编号 | 类型 | 位置 | 洞口尺寸 | 做法 |
|---|---|---|---|---|
`;
const STYLE = { entry: '入户防盗门，炭灰色，外开', 'sliding-glass': '细框玻璃推拉门', 'french-glass': '法式对开玻璃门（格条 2×5）', panel: '两段式凹凸门板实木门，象牙白，黄铜球形把手', glazing: '落地玻璃幕墙', arch: '拱形门洞（不装门）' };
for (const op of OPENINGS) {
  const [x1, y1, x2, y2] = op.rect;
  const w = Math.max(x2 - x1, y2 - y1);
  const size = op.type === 'window' ? `${w} 宽 × ${op.h} 高，窗台 ${op.sill}` : `${w} × ${op.h}`;
  const style = op.type === 'arch' ? STYLE.arch : op.type === 'window' ? (op.style === 'glazing' ? STYLE.glazing : '象牙白木窗，格条分格，室内大理石窗台板 + 80 mm 窗套线') : STYLE[op.style] || '';
  out += `| ${op.id} | ${op.type === 'window' ? '窗' : op.type === 'arch' ? '门洞' : '门'} | x ${x1}–${x2} / y ${y1}–${y2} | ${size} | ${style} |\n`;
}

const ROOM_TEXT_BY_STYLE = { french: ROOM_TEXT, italian: ROOM_TEXT_ITALIAN };
out += `
## 3. 两套方案

同一户型提供两套完整方案，可在页面右上角切换（\`?style=french\` / \`?style=italian\`）。
`;
for (const style of [STYLES.french, STYLES.italian]) {
  const { placements: PLACEMENTS, rugs: RUGS } = TABLES[style.id];
out += `
### ${style.name} · 灯具布置

| 位置 | 灯具 | 型号 | 尺寸 | 离地 | 光通量 |
|---|---|---|---|---|---|
`;
for (const f of FIXTURES) {
  const ov = style.fixtureById[f.id] || {};
  const model = ov.model || style.fixtureModels[f.kind];
  const h = manifest[model].size[2];
  const z = f.kind === 'flush' ? CEIL_H - mm(h) : CEIL_H - mm(h) - style.fixtureDrop;
  const room = ROOMS.find((r) => r.id === f.room);
  out += `| ${room.name}（${ov.x ?? f.x}, ${ov.y ?? f.y}） | ${ov.name || style.fixtureNames[f.kind]} | ${model} | ${dims(model)} | ${z} | ${f.lumens} lm |\n`;
}
out += style.id === 'french'
  ? `\n所有吊灯 2700 K 暖白光源；客餐厅两盏八臂吊灯下各配 Ø800 石膏灯盘，卧室五臂吊灯配 Ø550 灯盘；壁灯离地 1500，台灯均为陶瓷底座 + 亚麻灯罩。\n\n### ${style.name} · 分房间做法与清单\n`
  : `\n所有光源 3000 K；顶部灯槽与柜内 LED 灯带 3000 K，餐区环形雕塑吊灯，客厅玻璃球泡组合吊灯，卧室烟灰玻璃球吊灯，过道/厨房黑色轨道射灯。\n\n### ${style.name} · 分房间做法与清单\n`;
for (const id of roomsInOrder) {
  const t = ROOM_TEXT_BY_STYLE[style.id][id];
  const room = ROOMS.find((r) => r.id === id);
  const spec = t;
  out += `\n### ${t.title}\n\n**硬装**\n\n${spec.hard.map((h) => `- ${h}`).join('\n')}\n\n**配色**\n\n| 部位 | 色值 |\n|---|---|\n${spec.palette.map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n\n**家具 · 灯具 · 软装**\n\n| 名称 | 尺寸（宽×深×高） | 位置（x, y, 朝向） | 说明 |\n|---|---|---|---|\n`;
  const rows = [];
  const items = PLACEMENTS.filter((p) => !p.skip && (p.room === id || (id === 'bed3' && p.room === 'vestibule') || (id === 'living' && p.room === 'living')));
  const grouped = new Map();
  for (const p of items) {
    const key = p.n + '|' + p.a;
    if (!grouped.has(key)) grouped.set(key, { p, count: 0, pos: [] });
    const g = grouped.get(key);
    g.count++;
    g.pos.push(`(${p.x}, ${p.y}, ${p.r ?? 0}°${p.z ? `, 离地 ${p.z}` : ''})`);
  }
  for (const { p, count, pos } of grouped.values()) {
    rows.push(`| ${p.n}${count > 1 ? ` ×${count}` : ''} | ${dims(p.a, p.r, p.s || 1)} | ${pos.length > 2 ? pos.slice(0, 2).join(' ') + ' …' : pos.join(' ')} | ${p.note || ''} |`);
  }
  for (const rg of RUGS.filter((r) => r.room === id)) rows.push(`| ${rg.n} | ${rg.w} × ${rg.d} | (${rg.x}, ${rg.y}) | ${style.id === 'french' ? '奥布松风格平织羊毛毯' : '低绒手工羊毛毯'} |`);
  for (const f of FIXTURES.filter((f) => f.room === id || (id === 'bed3' && f.room === 'vestibule'))) { const ov = style.fixtureById[f.id] || {}; const model = ov.model || style.fixtureModels[f.kind]; rows.push(`| ${ov.name || style.fixtureNames[f.kind]} | ${dims(model)} | (${ov.x ?? f.x}, ${ov.y ?? f.y}) | 见灯具表 |`); }
  out += rows.join('\n') + '\n';
}

}
out += `
## 5. 采购与施工提示

1. 护墙板全部用 PU/实木线条现场拼贴在平墙上（"假护墙板"做法），成本远低于整板护墙板，效果一致；先弹线定框线位置，再贴线条、批腻子、喷漆。
2. 人字拼地板建议 600×120 三层实木复合，铺贴前按客厅中轴线放样，卧室与走廊连续铺贴不设门槛石。
3. 大理石可用同纹理岩板或瓷砖替代：厨房棋盘格、卫生间卡布梭拼花均有成品砖。
4. 黄铜五金统一为拉丝黄铜（拉手、龙头、灯具、窗帘杆）；门把手用黄铜球形把手。
5. 软装色板：奶油白 #EFE7DA、象牙白 #F6F1E8、雾霾蓝 #B6C4CA、鼠尾草绿 #8A9C8B、灰粉 #DCCBC2、墨绿丝绒 #436154、芥末黄 #C79E4D、黄铜 #C9A24A。
6. 家具尺寸均按本手册，可按同尺寸选购成品（路易十六椭圆藤背餐椅、贝尔杰扶手椅、驼峰软包床、虎脚浴缸等均为通用款）。

## 6. 坐标系说明

平面坐标以户型外轮廓西北角（榻榻米书房外墙角）为原点，x 向东、y 向南，单位 mm；家具"朝向"0° 表示正面朝南，90° 朝东，-90° 朝西，180° 朝北。
`;
writeFileSync(new URL('../docs/design-spec.md', import.meta.url), out);
console.log('wrote docs/design-spec.md', out.length, 'chars');
