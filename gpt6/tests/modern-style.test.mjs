import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCanvas } from '@napi-rs/canvas';
import { STYLE_IDS, getDesignStyle } from '../src/design-styles.js';
import { createMaterials } from '../src/materials.js';
import { buildArchitecture } from '../src/architecture.js';
import { buildFurniture } from '../src/furniture.js';
import { collectWalkBlockers } from '../src/collision.js';
import { canWalkTo, pointInPolygon } from '../src/navigation.js';
import { ROOMS } from '../src/layout.js';
import { makeGuideMarkdown, roomDescription } from '../src/ui.js';
import { PBR_BINDINGS } from '../src/pbr-materials.js';

globalThis.document={createElement:()=>createCanvas(1,1)};
const modernMaterials=createMaterials('modern');
const modern=buildFurniture(THREE,modernMaterials.mats,'modern');
const italian=buildFurniture(THREE,createMaterials('italian').mats,'italian');
const architecture=buildArchitecture(THREE,modernMaterials.mats,'modern');
const marked=(root,key)=>{const found=[];root.traverse(o=>{if(o.userData[key])found.push(o);});return found;};
const vertices=root=>{let count=0;root.traverse(o=>{if(o.isMesh)count+=o.geometry.attributes.position.count;});return count;};

test('modern is a distinct scheme with honest panorama availability and guide content',()=>{
  assert.ok(STYLE_IDS.includes('modern'));
  assert.equal(getDesignStyle('modern').name,'现代简约');
  assert.equal(getDesignStyle('modern').panorama,true);
  const guide=makeGuideMarkdown(modern.items,'modern');
  assert.match(guide,/浅橡木/);
  assert.doesNotMatch(guide,/胡桃木|黄铜|烟熏木|古铜|炭灰皮革|来自可复现 Blender/);
  for(const room of ROOMS)assert.notEqual(roomDescription(room,'modern'),room.description);
});

test('modern upholstery changes independently and uses cloth PBR without dark wood replacement',()=>{
  const {mats,setPalette}=modernMaterials;
  assert.equal(mats.parquet.map.userData.pattern,'straight-plank');
  assert.equal(mats.parquet.map.rotation,0);
  assert.equal(PBR_BINDINGS.modern?.fabric.asset,'cloth');
  assert.equal(PBR_BINDINGS.modern?.walnut,undefined);
  const wall=mats.wall.color.getHexString();
  for(const [name,palette] of Object.entries(getDesignStyle('modern').palettes)){
    setPalette(name);
    assert.equal(`#${mats.fabric.color.getHexString()}`,palette.fabric);
    assert.equal(`#${mats.sage.color.getHexString()}`,palette.sage);
    assert.equal(mats.wall.color.getHexString(),wall);
  }
  setPalette('burgundy');
});

test('modern furniture has distinct key shapes, complete descriptions and stable placement',()=>{
  assert.equal(modern.items.length,63);
  for(const previous of italian.items){
    const current=modern.items.find(item=>item.id===previous.id);
    assert.deepEqual(current.object.position.toArray(),previous.object.position.toArray());
    assert.equal(current.object.rotation.y,previous.object.rotation.y);
    assert.ok(current.name&&current.dimensions&&current.material&&current.note);
    assert.doesNotMatch([current.name,current.material,current.note].join(' '),/法式|意式|胡桃木|黄铜|古铜|烟熏木|黑棕木|炭灰皮革|藤编/);
    current.object.traverse(o=>{if(o.isMesh)for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value));});
  }
  for(const id of ['living-sofa','living-coffee','dining-chair-1','dining-table','living-oil-painting']){
    assert.notEqual(vertices(modern.items.find(i=>i.id===id).object),vertices(italian.items.find(i=>i.id===id).object),id);
  }
});

test('modern architecture keeps nine floor outlines and flat doors with unchanged movement',()=>{
  const original=buildArchitecture(THREE,modernMaterials.mats,'italian');
  const floors=architecture.group.children.filter(o=>o.userData.roomId);
  assert.equal(floors.length,9);
  for(const floor of floors){
    assert.deepEqual(floor.geometry.attributes.position.array,original.group.children.find(o=>o.userData.roomId===floor.userData.roomId).geometry.attributes.position.array);
  }
  assert.equal(floors.find(o=>o.userData.roomId==='living').material,modernMaterials.mats.parquet);
  const doors=marked(architecture.group,'doorLeaf');
  assert.equal(doors.length,10);
  for(const door of doors){
    const old=marked(original.group,'doorLeaf').find(o=>o.name===door.name);
    assert.equal(door.userData.finish,'flush-panel');
    assert.deepEqual(door.userData.doorMotion,old.userData.doorMotion);
    assert.deepEqual(door.position.toArray(),old.position.toArray());
  }
  assert.equal(architecture.group.getObjectByName('意式客厅 · 大理石整板墙'),undefined);
});

test('all modern room viewpoints are usable and nine rooms remain reachable from the entrance',()=>{
  const blockers=collectWalkBlockers(modern.items,architecture);
  for(const room of ROOMS)assert.ok(canWalkTo(room.view.position[0],room.view.position[2],.18,blockers),room.id);
  const step=.05,nx=178,nz=328,valid=new Uint8Array(nx*nz),seen=new Uint8Array(nx*nz),queue=[];
  for(let z=0;z<nz;z++)for(let x=0;x<nx;x++)valid[z*nx+x]=Number(canWalkTo(x*step,z*step,.30,blockers));
  const start=140*nx+12;assert.ok(valid[start]);seen[start]=1;queue.push(start);
  for(let i=0;i<queue.length;i++){
    const k=queue[i],x=k%nx,z=Math.floor(k/nx);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const xx=x+dx,zz=z+dz,next=zz*nx+xx;
      if(xx>=0&&xx<nx&&zz>=0&&zz<nz&&valid[next]&&!seen[next]){seen[next]=1;queue.push(next);}
    }
  }
  const points=queue.map(k=>[(k%nx)*step,Math.floor(k/nx)*step]);
  for(const room of ROOMS){
    const xs=room.polygon.map(p=>p[0]),zs=room.polygon.map(p=>p[1]);
    assert.ok(points.some(([x,z])=>x>Math.min(...xs)+.4&&x<Math.max(...xs)-.4&&z>Math.min(...zs)+.4&&z<Math.max(...zs)-.4&&pointInPolygon(x,z,room.polygon)),room.id);
  }
});
