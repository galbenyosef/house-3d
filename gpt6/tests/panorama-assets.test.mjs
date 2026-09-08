import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadImage } from '@napi-rs/canvas';
import { STYLE_IDS, getDesignStyle } from '../src/design-styles.js';
import { ROOMS } from '../src/layout.js';

const manifest=JSON.parse(await readFile(new URL('../public/panoramas/manifest.json',import.meta.url)));

test('every advertised panorama style covers all nine rooms',()=>{
  assert.deepEqual(manifest.viewpoints.map(view=>view.id),ROOMS.map(room=>room.id));
  for(const style of STYLE_IDS){
    assert.equal(getDesignStyle(style).panorama,true,style);
    for(const view of manifest.viewpoints)assert.ok(view.styles[style],`${style}/${view.id}`);
  }
});

for(const style of ['modern','song'])test(`${style} panoramas decode at 8K and 4K with matching publication hashes`,async()=>{
  for(const view of manifest.viewpoints){
    const entry=view.styles[style];
    assert.ok(entry,view.id);
    assert.deepEqual([entry.width,entry.height,entry.mobileWidth,entry.mobileHeight],[8192,4096,4096,2048]);
    assert.equal(entry.samples,64);
    assert.equal(entry.mobileSource,'Blender downsample of the finished 8K JPEG');
    for(const [path,hash,width,height,bytes] of [
      [entry.url,entry.sha256,8192,4096,entry.bytes],
      [entry.mobileUrl,entry.mobileSha256,4096,2048,entry.mobileBytes],
      [entry.preview,entry.previewSha256,1280,720],
    ]){
      const contents=await readFile(new URL(`../public/${path}`,import.meta.url));
      assert.equal(createHash('sha256').update(contents).digest('hex'),hash,path);
      if(bytes!==undefined)assert.equal(contents.length,bytes,path);
      const image=await loadImage(contents);
      assert.deepEqual([image.width,image.height],[width,height],path);
    }
  }
});
