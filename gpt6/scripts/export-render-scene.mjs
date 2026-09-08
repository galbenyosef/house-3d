import * as THREE from 'three';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createMaterials } from '../src/materials.js';
import { buildArchitecture } from '../src/architecture.js';
import { buildFurniture } from '../src/furniture.js';
import { HOUSE, ROOMS } from '../src/layout.js';
import { getDesignStyle, STYLE_IDS } from '../src/design-styles.js';

import { createModernPendant } from '../src/modern-pendant.js';
import { createSongPendant } from '../src/song-pendant.js';

// The browser and offline renderer share the same metre-based meshes. Canvas
// textures are painted by the application itself, not approximated in Python.
globalThis.document = { createElement: name => {
  if (name !== 'canvas') throw new Error(`Unsupported offline element: ${name}`);
  return createCanvas(1, 1);
}};
globalThis.ProgressEvent = class ProgressEvent { constructor(type, values={}) { Object.assign(this, values, {type}); } };
const style = process.argv[2] || 'italian';
if (!STYLE_IDS.includes(style)) throw new Error(`Use ${STYLE_IDS.join(', ')}`);
const output = resolve('artifacts/cycles', style);
await mkdir(`${output}/textures`, {recursive:true});
const {mats} = createMaterials(style);
for (const [name, material] of Object.entries(mats)) material.name ||= name;
let pbrAssets = {}, pbrBindings = {};
try {
  const pbr = await import('../src/pbr-materials.js');
  pbrAssets = pbr.PBR_ASSETS || {};
  pbrBindings = pbr.PBR_BINDINGS || {};
  const originalLoad=THREE.TextureLoader.prototype.loadAsync;
  THREE.TextureLoader.prototype.loadAsync=async url => {
    const path=String(url).slice(String(url).indexOf('textures/'));
    const image=await loadImage(resolve('public',path));
    const canvas=createCanvas(image.width,image.height);canvas.getContext('2d').drawImage(image,0,0);
    return new THREE.CanvasTexture(canvas);
  };
  try { await pbr.enhanceMaterials(mats,style); }
  finally { THREE.TextureLoader.prototype.loadAsync=originalLoad; }
} catch (error) { if(error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
const arch = buildArchitecture(THREE, mats, style), furniture = buildFurniture(THREE, mats, style);
arch.setCeiling(true); arch.setCutaway(false);
const root = new THREE.Group(); root.add(arch.group, furniture.group);
if (style === 'french') {
  const art = furniture.group.getObjectByName('artworkCanvas');
  if (art) {
    const image = await loadImage(resolve('public/textures/corot-seine.jpg'));
    const canvas = createCanvas(image.width,image.height); canvas.getContext('2d').drawImage(image,0,0);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const aspect = image.width/image.height, target = 1.35/.82;
    if(aspect < target) { map.repeat.y=aspect/target; map.offset.y=(1-map.repeat.y)/2; }
    art.material = new THREE.MeshStandardMaterial({name:'Corot public-domain artwork',map,roughness:.94});
  }
}
let pendant;
if(style==='song')pendant=createSongPendant(THREE,mats);
else if(style==='modern')pendant=createModernPendant(THREE,mats);
else {
  const model=await readFile(resolve('public',getDesignStyle(style).pendant.file));
  pendant=(await new GLTFLoader().parseAsync(model.buffer.slice(model.byteOffset,model.byteOffset+model.byteLength), '')).scene;
}
pendant.position.set(2.25,HOUSE.height,8.65); root.add(pendant); root.updateMatrixWorld(true);
const materials=[],textures=[],meshes=[],materialIds=new Map(),textureIds=new Map();
async function exportTexture(texture) {
  if(!texture) return null;
  if(textureIds.has(texture.uuid)) return textureIds.get(texture.uuid);
  const id=textures.length, image=texture.image;
  if(!image) return null;
  let canvas=image;
  if(!image.toBuffer) { canvas=createCanvas(image.width,image.height);canvas.getContext('2d').drawImage(image,0,0); }
  const file=`textures/${String(id).padStart(3,'0')}.png`;
  await writeFile(`${output}/${file}`,canvas.toBuffer('image/png'));
  texture.updateMatrix();
  textures.push({id,file,name:texture.name,colorSpace:texture.colorSpace,matrix:texture.matrix.toArray(),flipY:texture.flipY});
  textureIds.set(texture.uuid,id);return id;
}
async function exportMaterial(mat) {
  if(materialIds.has(mat.uuid)) return materialIds.get(mat.uuid);
  const id=materials.length, entry={id,name:mat.name,color:mat.color?.toArray()||[1,1,1],roughness:mat.roughness??.6,metalness:mat.metalness??0,
    opacity:mat.opacity,transparent:mat.transparent,transmission:mat.transmission||0,emissive:mat.emissive?.toArray()||[0,0,0],emissiveIntensity:mat.emissiveIntensity||0,
    bumpScale:mat.bumpScale||0,normalScale:mat.normalScale?.toArray()||[1,1],paletteRole:mat.userData.paletteRole,pbr:mat.userData.pbr,textureSizeMeters:mat.userData.textureSizeMeters};
  materialIds.set(mat.uuid,id);materials.push(entry);
  for(const key of ['map','normalMap','roughnessMap','bumpMap']) entry[key]=await exportTexture(mat[key]);
  return id;
}
const visible=[];root.traverseVisible(o=>{if(o.isMesh)visible.push(o);});
for(const mesh of visible) {
  const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  const materialList=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const ids=[];for(const m of materialList) ids.push(await exportMaterial(m));
  const positions=[],normals=[],point=new THREE.Vector3(),normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  for(let i=0;i<p.count;i++) {
    point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);positions.push(point.x,-point.z,point.y);
    if(n) {point.fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize();normals.push(point.x,-point.z,point.y);}
  }
  meshes.push({name:mesh.name||mesh.parent?.name||'mesh',positions,normals,uv:uv?Array.from(uv.array):null,
    indices:g.index?Array.from(g.index.array):null,materials:ids,groups:g.groups,itemId:mesh.userData.itemId||mesh.parent?.userData.itemId||null});
}
const room=ROOMS.find(r=>r.id==='living');
const sourceHashes={};
for(const file of ['src/architecture.js','src/furniture.js','src/italian-furniture.js','src/modern-furniture.js','src/modern-pendant.js','src/song-furniture.js','src/song-art.js','src/song-pendant.js','src/design-styles.js','src/materials.js','src/pbr-materials.js','src/surface-uv.js','src/layout.js',...(getDesignStyle(style).pendant.file?[`public/${getDesignStyle(style).pendant.file}`]:[])]) {
  sourceHashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
}
const record={format:'housegpt-offline-1',style,palette:'burgundy',units:'metres',createdAt:new Date().toISOString(),
  source:`src/architecture.js + src/furniture.js + src/materials.js + ${['modern','song'].includes(style)?`src/${style}-pendant.js`:'Blender pendant GLB'}`,
  sourceHashes,
  rooms:ROOMS.map(({id,name,view})=>({id,name,camera:{threePosition:view.position,threeTarget:view.target,sourceVerticalFov:64,photographLensMillimeters:22,photographSensorWidthMillimeters:36}})),
  coordinates:{three:'x right, y up, z south',blender:'x right, y north, z up',conversion:'(x, y, z) -> (x, -z, y)'},
  camera:{threePosition:room.view.position,threeTarget:room.view.target,sourceVerticalFov:64,photographLensMillimeters:22,photographSensorWidthMillimeters:36},house:HOUSE,materials,textures,meshes,pbrAssets,pbrBindings};
await writeFile(`${output}/scene.json`,JSON.stringify(record));
console.log(JSON.stringify({style,file:`${output}/scene.json`,meshes:meshes.length,materials:materials.length,textures:textures.length,triangles:meshes.reduce((s,m)=>s+(m.indices?.length||m.positions.length/3)/3,0)}));
