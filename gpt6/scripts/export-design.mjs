import * as THREE from 'three';
import { createCanvas } from '@napi-rs/canvas';
globalThis.document={createElement:()=>createCanvas(1,1)};
import { writeFile, mkdir } from 'node:fs/promises';
import { buildFurniture } from '../src/furniture.js';
import { makeGuideMarkdown } from '../src/ui.js';
import { HOUSE, ROOMS, WALLS, FOOTPRINT } from '../src/layout.js';
import { STYLE_IDS, getDesignStyle } from '../src/design-styles.js';
const names=['wall','trim','oak','walnut','fabric','cream','sage','brass','marble','stone','glass','dark','white','rug','leaf','ceramic','light','metal','parquet','tile','travertine','smokedWood','leather'];
const mats=Object.fromEntries(names.map(n=>[n,new THREE.MeshStandardMaterial()]));
const styles={};
await mkdir('docs',{recursive:true});
for(const style of STYLE_IDS){
const design=getDesignStyle(style),furniture=buildFurniture(THREE,mats,style);
const items=furniture.items.map(({object,...item})=>({...item,position:object.position.toArray(),rotationY:object.rotation.y}));
const {file,...pendant}=design.pendant;
items.push({...pendant,position:[2.25,HOUSE.height,8.65],rotationY:0});
const csvRows=[['家具/物件','空间','建议尺寸','材质','复刻建议'],...items.map(it=>[it.name,ROOMS.find(r=>r.id===it.room)?.name||it.room,it.dimensions,it.material,it.note])];
await writeFile(`docs/${design.name}-落地手册.md`,makeGuideMarkdown(items,style));
await writeFile(style==='french'?'docs/家具与尺寸.csv':`docs/${design.name}-家具与尺寸.csv`,'\ufeff'+csvRows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n'));
styles[style]={name:design.name,concept:design.concept,items};
}
await writeFile('public/design-specification.json',JSON.stringify({units:'metres',style:'复古法式',source:'用户提供平面图；模型尺寸为推导值，详见 docs/architecture-assumptions.md',house:HOUSE,rooms:ROOMS,walls:WALLS,footprint:FOOTPRINT,items:styles.french.items,styles},null,2));
console.log(`已导出 ${ROOMS.length} 个空间、${STYLE_IDS.length}套各64件物件的设计手册、CSV 与米制参数。`);
