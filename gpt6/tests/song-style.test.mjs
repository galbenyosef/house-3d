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
import { createSongPendant } from '../src/song-pendant.js';
import { HOUSE } from '../src/layout.js';
import { PBR_BINDINGS } from '../src/pbr-materials.js';

globalThis.document={createElement:()=>createCanvas(1,1)};
const songMaterials=createMaterials('song');
const song=buildFurniture(THREE,songMaterials.mats,'song');
const italian=buildFurniture(THREE,createMaterials('italian').mats,'italian');
const architecture=buildArchitecture(THREE,songMaterials.mats,'song');
const marked=(root,key)=>{const found=[];root.traverse(o=>{if(o.userData[key])found.push(o);});return found;};
const vertices=root=>{let count=0;root.traverse(o=>{if(o.isMesh)count+=o.geometry.attributes.position.count;});return count;};

test('song is a distinct scheme with honest panorama availability and guide content',()=>{
  assert.ok(STYLE_IDS.includes('song'));
  assert.equal(getDesignStyle('song').name,'宋韵雅居');
  assert.equal(getDesignStyle('song').panorama,true);
  const guide=makeGuideMarkdown(song.items,'song');
  assert.match(guide,/茶褐木/);
  assert.doesNotMatch(guide,/胡桃木|黄铜|烟熏木|炭灰皮革|来自可复现 Blender/);
  for(const room of ROOMS)assert.notEqual(roomDescription(room,'song'),room.description);
});

test('song upholstery changes independently and uses cloth PBR without dark wood replacement',()=>{
  const {mats,setPalette}=songMaterials;
  assert.equal(mats.parquet.map.userData.pattern,'straight-plank');
  assert.equal(mats.parquet.map.rotation,0);
  assert.equal(PBR_BINDINGS.song?.fabric.asset,'cloth');
  assert.equal(PBR_BINDINGS.song?.walnut,undefined);
  const wall=mats.wall.color.getHexString();
  for(const [name,palette] of Object.entries(getDesignStyle('song').palettes)){
    setPalette(name);
    assert.equal(`#${mats.fabric.color.getHexString()}`,palette.fabric);
    assert.equal(`#${mats.sage.color.getHexString()}`,palette.sage);
    assert.equal(mats.wall.color.getHexString(),wall);
  }
  setPalette('burgundy');
});

test('song furniture has distinct key shapes, complete descriptions and stable placement',()=>{
  assert.equal(song.items.length,63);
  for(const previous of italian.items){
    const current=song.items.find(item=>item.id===previous.id);
    assert.deepEqual(current.object.position.toArray(),previous.object.position.toArray());
    assert.equal(current.object.rotation.y,previous.object.rotation.y);
    assert.ok(current.name&&current.dimensions&&current.material&&current.note);
    assert.doesNotMatch([current.name,current.material,current.note].join(' '),/法式|意式|胡桃木|黄铜|烟熏木|黑棕木|炭灰皮革|抽象浮雕/);
    current.object.traverse(o=>{if(o.isMesh)for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value));});
  }
  for(const id of ['living-sofa','living-coffee','dining-chair-1','dining-table','living-oil-painting']){
    assert.notEqual(vertices(song.items.find(i=>i.id===id).object),vertices(italian.items.find(i=>i.id===id).object),id);
  }
});

test('song architecture keeps nine floor outlines and flat doors with unchanged movement',()=>{
  const original=buildArchitecture(THREE,songMaterials.mats,'italian');
  const floors=architecture.group.children.filter(o=>o.userData.roomId);
  assert.equal(floors.length,9);
  for(const floor of floors){
    assert.deepEqual(floor.geometry.attributes.position.array,original.group.children.find(o=>o.userData.roomId===floor.userData.roomId).geometry.attributes.position.array);
  }
  assert.equal(floors.find(o=>o.userData.roomId==='living').material,songMaterials.mats.parquet);
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

test('all song room viewpoints are usable and nine rooms remain reachable from the entrance',()=>{
  const blockers=collectWalkBlockers(song.items,architecture);
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

 test('Song pendant fits above the dining table and has a safe ceiling-origin envelope',()=>{
  const pendant=createSongPendant(THREE,songMaterials.mats);
  const bounds=new THREE.Box3().setFromObject(pendant);
  assert.ok(bounds.max.y<=.00001);
  assert.ok(HOUSE.height+bounds.min.y>=2);
  assert.ok(bounds.max.x-bounds.min.x<=.63);
  assert.ok(bounds.max.z-bounds.min.z<=.63);
});

test('Song seats and writing desks retain usable measured heights',()=>{
  song.group.updateMatrixWorld(true);
  const object=id=>song.items.find(item=>item.id===id).object;
  const ray=(id,point,direction)=>{
    const root=object(id),origin=new THREE.Vector3(...point).applyMatrix4(root.matrixWorld);
    const vector=new THREE.Vector3(...direction).transformDirection(root.matrixWorld);
    return new THREE.Raycaster(origin,vector).intersectObject(root,true)[0];
  };
  for(const [id,height] of [['living-sofa',.48],['living-chair',.47],['balcony-chair-left',.47],['balcony-chair-right',.47],['guest-chair',.46],['study-chair',.46],...Array.from({length:6},(_,i)=>[`dining-chair-${i+1}`,.46])]){
    // Sample the sitting surface, away from the sofa's split-cushion gap.
    const hit=ray(id,[id==='living-sofa'?-.5:0,2,.1],[0,-1,0]);
    assert.ok(hit&&Math.abs(hit.point.y-height)<.002,`${id}: ${hit?.point.y}`);
  }
  for(const id of ['guest-desk','study-desk'])for(const x of [-.17,0,.17]){
    const hit=ray(id,[x,.50,.20],[0,1,0]);
    assert.ok(hit&&hit.point.y>=.70,`${id} central knee space at ${x}`);
  }
  const art=song.items.find(i=>i.id==='living-oil-painting').object;
  for(const id of ['sconce-living-north','sconce-living-south'])assert.equal(new THREE.Box3().setFromObject(object(id)).intersectsBox(new THREE.Box3().setFromObject(art)),false,id);
});
