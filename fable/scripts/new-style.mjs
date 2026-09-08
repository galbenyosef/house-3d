#!/usr/bin/env node
// Scaffold (or remove) a whole-house interior style. Workflow: README.md#新增装修风格
//
//   npm run style:new -- <id> <中文名> [--from french|italian|<id>] [--subtitle "材质 · 材质 · 材质"]
//   npm run style:new -- --remove <id>          (only styles created by this script)
//
// The new style starts as a switchable clone of --from (default: italian):
//   src/styles.js            <ID> descriptor = { ...<BASE>, id, name, subtitle }  + STYLES registry entry
//   src/placements_<id>.js   editable copy of the base placement + rug tables       (+ TABLES entry in furnishings.js)
//   src/specs_<id>.js        editable copy of the base per-room notes (UI panel)    (+ SPECS_BY_STYLE entry)
//   scripts/spec-text_<id>.mjs  editable copy of the base design-spec prose         (+ spec-text.mjs entries)
// Registration edits are anchored on the single-line `export const X = { ... };`
// registries and on marker comments, so keep those lines intact.
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const P = (rel) => resolve(ROOT, rel);
const read = (rel) => readFileSync(P(rel), 'utf8');
const write = (rel, s) => { writeFileSync(P(rel), s); console.log('  wrote', rel); };

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const positional = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const usage = () => { console.error(read('scripts/new-style.mjs').split('\n').slice(1, 6).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(2); };

const { STYLES } = await import('../src/styles.js');
const { TABLES } = await import('../src/furnishings.js');
const { SPECS_BY_STYLE } = await import('../src/specs.js');
const { ROOM_TEXT_BY_STYLE, STYLE_TEXT_BY_STYLE } = await import('./spec-text.mjs');

// ---------------------------------------------------------------- serialiser
const isIdent = (k) => /^[A-Za-z_$][\w$]*$/.test(k);
const str = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const primitive = (v) => v === null || typeof v !== 'object';
function src(v, indent = '') {
  if (v === undefined || v === null) return String(v);
  if (typeof v === 'string') return str(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    const inner = v.map((x) => src(x, indent + '  '));
    const flat = `[${inner.join(', ')}]`;
    if (v.every(primitive) && flat.length + indent.length <= 110) return flat;
    return `[\n${inner.map((s) => `${indent}  ${s},`).join('\n')}\n${indent}]`;
  }
  const entries = Object.entries(v).map(([k, x]) => `${isIdent(k) ? k : str(k)}: ${src(x, indent + '  ')}`);
  if (Object.values(v).every(primitive)) return `{ ${entries.join(', ')} }`;
  return `{\n${entries.map((s) => `${indent}  ${s},`).join('\n')}\n${indent}}`;
}

// ---------------------------------------------------------------- text edits
function addToInlineMap(text, mapName, entry, file) {
  const re = new RegExp(`(export const ${mapName} = \\{)([^}]*)(\\};)`);
  if (!re.test(text)) throw new Error(`${file}: registry line "export const ${mapName} = { ... };" not found`);
  return text.replace(re, (_, open, body, close) => `${open}${body.replace(/\s*$/, '')}, ${entry} ${close}`);
}
function removeFromInlineMap(text, mapName, key) {
  const re = new RegExp(`(export const ${mapName} = \\{[^}]*?),\\s*${key}: [A-Za-z0-9_$]+(\\s*\\};)`);
  return text.replace(re, '$1$2');
}
function insertBefore(text, anchor, insertion, file) {
  const i = text.indexOf(anchor);
  if (i < 0) throw new Error(`${file}: anchor "${anchor}" not found`);
  return text.slice(0, i) + insertion + text.slice(i);
}

// ---------------------------------------------------------------- remove
const removeId = flag('--remove');
if (removeId) {
  const ID = removeId.toUpperCase();
  const start = `// >>> style ${removeId}`;
  let s = read('src/styles.js');
  if (!s.includes(start)) { console.error(`"${removeId}" was not created by this script (no "${start}" marker in src/styles.js); remove it by hand.`); process.exit(1); }
  s = s.replace(new RegExp(`${start}[\\s\\S]*?// <<< style ${removeId}\\n\\n?`), '');
  s = removeFromInlineMap(s, 'STYLES', removeId);
  write('src/styles.js', s);
  let f = read('src/furnishings.js');
  f = f.replace(`import { PLACEMENTS_${ID}, RUGS_${ID} } from './placements_${removeId}.js';\n`, '');
  f = f.replace(`  ${removeId}: { placements: PLACEMENTS_${ID}, rugs: RUGS_${ID} },\n`, '');
  write('src/furnishings.js', f);
  let sp = read('src/specs.js');
  sp = sp.replace(`import { SPECS_${ID} } from './specs_${removeId}.js';\n`, '');
  sp = removeFromInlineMap(sp, 'SPECS_BY_STYLE', removeId);
  write('src/specs.js', sp);
  let st = read('scripts/spec-text.mjs');
  st = st.replace(`import { ROOM_TEXT_${ID}, STYLE_TEXT_${ID} } from './spec-text_${removeId}.mjs';\n`, '');
  st = removeFromInlineMap(st, 'ROOM_TEXT_BY_STYLE', removeId);
  st = removeFromInlineMap(st, 'STYLE_TEXT_BY_STYLE', removeId);
  write('scripts/spec-text.mjs', st);
  for (const rel of [`src/placements_${removeId}.js`, `src/specs_${removeId}.js`, `scripts/spec-text_${removeId}.mjs`]) {
    if (existsSync(P(rel))) { unlinkSync(P(rel)); console.log('  removed', rel); }
  }
  const leftovers = [`blender/assets_${removeId}.py`, `.scratch/export/${removeId}.glb`].filter((rel) => existsSync(P(rel)));
  console.log(`Removed style "${removeId}".` + (leftovers.length ? ` Left in place (delete by hand if unwanted): ${leftovers.join(', ')}, public/pano/${removeId}-*.jpg, public/models/*` : ''));
  process.exit(0);
}

// ---------------------------------------------------------------- scaffold
const [id, name] = positional;
if (!id || !name) usage();
if (!/^[a-z][a-z0-9_]*$/.test(id)) { console.error(`id "${id}" must match ^[a-z][a-z0-9_]*$ (it becomes ?style=<id>, file suffixes and the <ID> export name)`); process.exit(1); }
const base = flag('--from') || 'italian';
const subtitle = flag('--subtitle') || `${name} · 材质一 · 材质二 · 材质三`;
if (STYLES[id]) { console.error(`style "${id}" already exists`); process.exit(1); }
for (const [what, ok] of [['src/styles.js STYLES', STYLES[base]], ['furnishings.js TABLES', TABLES[base]], ['specs.js SPECS_BY_STYLE', SPECS_BY_STYLE[base]], ['spec-text.mjs ROOM_TEXT_BY_STYLE', ROOM_TEXT_BY_STYLE[base]]]) {
  if (!ok) { console.error(`base style "${base}" is missing from ${what}`); process.exit(1); }
}
const ID = id.toUpperCase();
const BASE = base.toUpperCase();
const files = [`src/placements_${id}.js`, `src/specs_${id}.js`, `scripts/spec-text_${id}.mjs`];
for (const rel of files) if (existsSync(P(rel))) { console.error(`${rel} already exists`); process.exit(1); }

console.log(`Scaffolding style "${id}" (${name}) from "${base}"…`);

// styles.js — descriptor spreads the base; STYLES registry gets the new id
let s = read('src/styles.js');
const block = `// >>> style ${id} — scaffolded from ${BASE} by scripts/new-style.mjs. Override fields as the
// design diverges (see README.md#新增装修风格).
export const ${ID} = {
  ...${BASE},
  id: '${id}',
  name: ${str(name)},
  subtitle: ${str(subtitle)},
};
// <<< style ${id}

`;
s = insertBefore(s, 'export const STYLES = {', block, 'src/styles.js');
s = addToInlineMap(s, 'STYLES', `${id}: ${ID}`, 'src/styles.js');
write('src/styles.js', s);

// placements — full editable copy of the base tables
const { placements, rugs } = TABLES[base];
write(`src/placements_${id}.js`, `// ${name} (${id}) furniture, lighting, art and decor placements — scaffolded as a copy of
// the ${base} tables; edit freely. Positions are plan millimetres (x east, y south),
// r = yaw in degrees (0 = front faces south, 90 = east, -90 = west, 180 = north),
// z = height of the origin above the floor, s = uniform scale, skip = keep but do not place.
// Assets are public/models/<a>.glb (blender/assets*.py); wall-hung pieces must be
// listed in WALL_MOUNTED (src/furnishings.js). \`npm test\` checks every entry.
export const PLACEMENTS_${ID} = [
${placements.map((p) => `  ${src(p)},`).join('\n')}
];

// { x, y, w, d, v: variant, room, n: label } — centre, size in mm
export const RUGS_${ID} = [
${rugs.map((r) => `  ${src(r)},`).join('\n')}
];
`);
let f = read('src/furnishings.js');
const lastImport = [...f.matchAll(/^import \{[^}]*\} from '\.\/placements_[a-z0-9_]+\.js';\n/gm)].pop();
if (!lastImport) throw new Error('src/furnishings.js: placements import anchor not found');
f = f.slice(0, lastImport.index + lastImport[0].length) + `import { PLACEMENTS_${ID}, RUGS_${ID} } from './placements_${id}.js';\n` + f.slice(lastImport.index + lastImport[0].length);
const tables = f.match(/export const TABLES = \{\n(?:.*\n)*?\};/);
if (!tables) throw new Error('src/furnishings.js: TABLES registry not found');
f = f.replace(tables[0], tables[0].replace(/\};$/, `  ${id}: { placements: PLACEMENTS_${ID}, rugs: RUGS_${ID} },\n};`));
write('src/furnishings.js', f);

// specs — per-room notes shown in the UI panel
write(`src/specs_${id}.js`, `// ${name} (${id}) per-room design notes for the UI panel — scaffolded as a copy of the
// ${base} notes; rewrite them for the new scheme. palette = swatches shown in the panel.
export const SPECS_${ID} = ${src(SPECS_BY_STYLE[base])};
`);
let sp = read('src/specs.js');
sp = insertBefore(sp, 'export const SPECS_BY_STYLE = {', `import { SPECS_${ID} } from './specs_${id}.js';\n`, 'src/specs.js');
sp = addToInlineMap(sp, 'SPECS_BY_STYLE', `${id}: SPECS_${ID}`, 'src/specs.js');
write('src/specs.js', sp);

// spec text — prose for docs/design-spec.md
write(`scripts/spec-text_${id}.mjs`, `// ${name} (${id}) prose for docs/design-spec.md — scaffolded as a copy of the ${base}
// text; rewrite hard-finish notes, palettes, lighting summary and rug note.
export const ROOM_TEXT_${ID} = ${src(ROOM_TEXT_BY_STYLE[base])};

export const STYLE_TEXT_${ID} = ${src(STYLE_TEXT_BY_STYLE[base] || { lighting: '', rugNote: '' })};
`);
let st = read('scripts/spec-text.mjs');
st = insertBefore(st, 'export const ROOM_TEXT_BY_STYLE = {', `import { ROOM_TEXT_${ID}, STYLE_TEXT_${ID} } from './spec-text_${id}.mjs';\n`, 'scripts/spec-text.mjs');
st = addToInlineMap(st, 'ROOM_TEXT_BY_STYLE', `${id}: ROOM_TEXT_${ID}`, 'scripts/spec-text.mjs');
st = addToInlineMap(st, 'STYLE_TEXT_BY_STYLE', `${id}: STYLE_TEXT_${ID}`, 'scripts/spec-text.mjs');
write('scripts/spec-text.mjs', st);

console.log(`
Done. "${id}" is now a switchable clone of "${base}":
  npm run dev   →  http://localhost:5174/maison/?style=${id}
Next (details in README.md#新增装修风格):
  1. src/styles.js        override materials / colours / shell options in ${ID}
  2. blender/assets_${id}.py  new parametric assets (prefix "${id.slice(0, 2)}_"), then npm run assets -- <names>
  3. src/placements_${id}.js  re-place furniture; npm test until the [${id}] placement suite is green
  4. src/specs_${id}.js + scripts/spec-text_${id}.mjs  rewrite the notes; npm run spec
  5. export the scene from the page, npm run pano -- 3072 96 ${id}   (test/pano.test.js stays red until then)
  6. npm test && npm run build, then deploy
`);
