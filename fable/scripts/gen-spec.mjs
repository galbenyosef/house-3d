// Generates docs/design-spec.md from the same data that drives the scene, so
// the written spec can never drift from what is rendered.
import { readFileSync, writeFileSync } from 'node:fs';
import { TABLES } from '../src/furnishings.js';
import { STYLES } from '../src/styles.js';
import { FIXTURES } from '../src/fixtures.js';
import { ROOMS, OPENINGS, CEIL_H, WALL_H, roomArea, rectArea } from '../src/plan.js';
import { ROOM_TEXT_BY_STYLE, STYLE_TEXT_BY_STYLE } from './spec-text.mjs';

const manifest = JSON.parse(readFileSync(new URL('../public/models/manifest.json', import.meta.url)));
const mm = (v) => Math.round(v * 1000);
const dims = (a, r = 0, k = 1) => {
  const [x, y, z] = manifest[a].size.map((v) => v * k);
  return `${mm(x)} × ${mm(y)} × ${mm(z)}`;
};
const FIXTURE_NAME = { 'chandelier-large': '八臂水晶吊灯', 'chandelier-small': '五臂水晶吊灯', lantern: '黄铜玻璃灯笼吊灯', flush: '黄铜吸顶灯' };
const FIXTURE_MODEL = { 'chandelier-large': 'chandelier_large', 'chandelier-small': 'chandelier_small', lantern: 'lantern', flush: 'flush_light' };



const roomsInOrder = ['living', 'kitchen', 'tatami', 'bed1', 'bed2', 'bed3', 'bath1', 'bath2', 'balcony'];
const STYLE_LIST = Object.values(STYLES);
const CN_NUM = (n) => ['零', '一', '两', '三', '四', '五', '六', '七', '八', '九'][n] || String(n);
let out = `# 四居室 · 全屋设计说明（复刻手册：${STYLE_LIST.map((s) => s.name).join(' / ')}）

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

out += `
## 3. ${CN_NUM(STYLE_LIST.length)}套方案

同一户型提供${CN_NUM(STYLE_LIST.length)}套完整方案，可在页面右上角切换（${STYLE_LIST.map((s) => `\`?style=${s.id}\``).join(' / ')}）。
`;
for (const style of STYLE_LIST) {
  const styleText = STYLE_TEXT_BY_STYLE[style.id] || {};
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
out += `\n${styleText.lighting || ''}\n\n### ${style.name} · 分房间做法与清单\n`;
for (const id of roomsInOrder) {
  const room = ROOMS.find((r) => r.id === id);
  const t = ROOM_TEXT_BY_STYLE[style.id]?.[id] || { title: room.name, hard: ['（待补充：见 README.md#新增装修风格）'], palette: [] };
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
  for (const rg of RUGS.filter((r) => r.room === id)) rows.push(`| ${rg.n} | ${rg.w} × ${rg.d} | (${rg.x}, ${rg.y}) | ${styleText.rugNote || ''} |`);
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
