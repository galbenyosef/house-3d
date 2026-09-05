import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildFurniture } from '../src/furniture.js';
import { buildArchitecture } from '../src/architecture.js';
import { collectWalkBlockers } from '../src/collision.js';
import { canWalkTo, pointInPolygon } from '../src/navigation.js';
import { ROOMS } from '../src/layout.js';

const names=['wall','trim','oak','walnut','fabric','cream','sage','brass','marble','stone','glass','dark','white','rug','leaf','ceramic','light','metal','parquet','tile'];
const mats=Object.fromEntries(names.map(name=>[name,new THREE.MeshStandardMaterial({name})]));
const italian=buildFurniture(THREE,mats,'italian');
const french=buildFurniture(THREE,mats);
italian.group.updateMatrixWorld(true);french.group.updateMatrixWorld(true);
const items=new Map(italian.items.map(item=>[item.id,item]));
const object=id=>items.get(id).object;
const bounds=id=>new THREE.Box3().setFromObject(object(id));
function localRay(id,point,direction,far=Infinity) {
  const target=object(id),origin=new THREE.Vector3(...point).applyMatrix4(target.matrixWorld);
  return new THREE.Raycaster(origin,new THREE.Vector3(...direction).transformDirection(target.matrixWorld),0,far).intersectObject(target,true);
}
const seatHeight=id=>localRay(id,[0,2,.10],[0,-1,0])[0]?.point.y;
const vertices=object=>{let count=0;object.traverse(mesh=>{if(mesh.isMesh)count+=mesh.geometry.attributes.position.count;});return count;};

test('意式全屋保留63个可选家具ID与原位姿，各房均有自己的意式家具说明',()=>{
  assert.equal(italian.items.length,63);
  assert.deepEqual(italian.items.map(i=>i.id),french.items.map(i=>i.id));
  for(const previous of french.items) {
    const current=items.get(previous.id);
    assert.deepEqual(current.object.position.toArray(),previous.object.position.toArray(),`${previous.id}不随风格漂移`);
    assert.equal(current.object.rotation.y,previous.object.rotation.y);
    assert.ok(current.name&&current.dimensions&&current.material&&current.note);
    assert.doesNotMatch(current.name,/法式|古典|复古|路易|Louis|藤编/);
  }
  for(const room of ROOMS)assert.ok(italian.items.some(i=>i.room===room.id));
  assert.equal(object('living-oil-painting').getObjectByName('artworkCanvas'),undefined,'意式不能加载法式油画');
});

test('两种风格有不同实际几何，模块沙发、体块茶几与薄框餐椅不是换色贴牌',()=>{
  for(const id of ['living-sofa','living-coffee','living-chair','living-fireplace','dining-table','dining-chair-1','master-bed','guest-bed','second-bed','study-daybed','study-desk','study-bookcase','entry-cabinet','kitchen-sink','kitchen-cooking','kitchen-fridge','bathroom-vanity','ensuite-vanity','balcony-chair-left','living-oil-painting','living-curtains']) {
    const old=french.items.find(item=>item.id===id).object;
    assert.notEqual(vertices(object(id)),vertices(old),`${id}需要实质不同造型`);
  }
  assert.equal(object('living-sofa').userData.design.family,'italian-modular');
  assert.equal(object('living-coffee').userData.design.family,'italian-stone-monolith');
  const roles=new Set();object('living-sofa').traverse(o=>{if(o.isMesh&&o.material.userData.paletteRole)roles.add(o.material.userData.paletteRole);});
  assert.deepEqual(roles,new Set(['fabric','sage']));
});

test('意式座面实际高460至480mm；桌下中央腿位不被侧抽屉封堵',()=>{
  for(const [id,height] of [['living-sofa',.480],['living-chair',.470],['balcony-chair-left',.470],['balcony-chair-right',.470],['dining-chair-1',.460],['guest-chair',.460],['study-chair',.460]])
    assert.ok(Math.abs(seatHeight(id)-height)<.002,`${id}实际座面=${seatHeight(id)}`);
  for(const id of ['guest-desk','study-desk'])for(const x of [-.17,0,.17]) {
    const hit=localRay(id,[x,.50,.18],[0,1,0])[0];
    assert.ok(hit&&hit.point.y>=.73,`${id}中央腿位高${hit?.point.y}`);
    assert.ok(hit.point.y-seatHeight('study-chair')>=.26);
  }
  for(const id of ['living-sofa','master-bed','guest-bed','second-bed'])
    assert.ok(bounds(id).min.y<.001,`${id}隐藏承托须真正落地`);
});

test('意式茶几与沙发有可用取物距离，餐椅与六席餐盘仍对齐',()=>{
  const coffee=bounds('living-coffee');
  const hit=new THREE.Raycaster(new THREE.Vector3(coffee.max.x,.46,12.03),new THREE.Vector3(1,0,0)).intersectObject(object('living-sofa'),true)[0];
  assert.ok(hit);
  const gap=hit.point.x-coffee.max.x;
  assert.ok(gap>=.30&&gap<=.45,`茶几至沙发坐垫${gap}m`);
  assert.ok(coffee.min.x-bounds('living-fireplace').max.x>1.40);
  const table=object('dining-table');
  for(let i=1;i<=6;i++) {
    const direction=object(`dining-chair-${i}`).position.clone().sub(table.position).setY(0).normalize();
    const origin=table.position.clone().addScaledVector(direction,.42);origin.y=.86;
    const plate=new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0)).intersectObject(table,true)[0];
    assert.ok(plate?.point.y>.793,`餐位${i}应正对餐盘`);
  }
  assert.ok(localRay('dining-table',[0,.50,.55],[0,1,0])[0].point.y-seatHeight('dining-chair-1')>=.26);
});

test('意式床侧通道与真实双轨衣柜全行程仍安全，柜门打开后确有柜内开口',()=>{
  assert.ok(bounds('second-wardrobe').min.z-bounds('second-bed').max.z>=.60);
  assert.ok(bounds('master-wardrobe').min.z-bounds('master-bed').max.z>=.70);
  assert.ok(bounds('guest-bed').min.x-bounds('guest-wardrobe').max.x>=.60);
  const cabinet=object('second-wardrobe'),leaves=cabinet.children.filter(o=>o.userData.slideRange);
  assert.equal(leaves.length,2);
  try{
    for(const leaf of leaves)for(let step=0;step<=20;step++) {
      const [a,b]=leaf.userData.slideRange;leaf.position.x=a+(b-a)*step/20;cabinet.updateMatrixWorld(true);
      assert.equal(new THREE.Box3().setFromObject(leaf).intersectsBox(bounds('second-bed')),false);
      assert.ok(bounds('second-wardrobe').min.z-bounds('second-bed').max.z>=.60);
    }
    for(const side of [0,1]) {
      for(const leaf of leaves)leaf.position.x=leaf.userData.slideRange[side];cabinet.updateMatrixWorld(true);
      assert.equal(new THREE.Box3().setFromObject(leaves[0]).intersectsBox(new THREE.Box3().setFromObject(leaves[1])),false);
      const clear=[];
      for(let x=-.90;x<=.90;x+=.005) {
        const hit=localRay('second-wardrobe',[x,1.10,.50],[0,0,-1])[0];
        if(hit&&cabinet.worldToLocal(hit.point.clone()).z<-.25)clear.push(x);
      }
      assert.ok(clear.length&&clear.at(-1)-clear[0]>=.85,'任一侧开门需保留850mm以上真实开口');
    }
  }finally{for(const leaf of leaves)leaf.position.x=leaf.userData.closedX;cabinet.updateMatrixWorld(true);}
});

test('意式日间床北段采用上翻，另外两格抽屉拉出500mm避开桌椅和书柜',()=>{
  const handles=[[],[]];
  object('study-daybed').traverse(mesh=>{
    if(!mesh.isMesh||mesh.material!==mats.brass)return;
    const positions=mesh.geometry.attributes.position;
    for(let i=0;i<positions.count;i++) {
      const point=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
      assert.ok(point.z>1.25,'北端不能重新出现撞桌腿的侧抽屉把手');
      handles[point.z<1.9?0:1].push(point);
    }
  });
  for(const points of handles) {
    assert.ok(points.length);
    const handle=new THREE.Box3().setFromPoints(points),center=handle.getCenter(new THREE.Vector3());
    const sweep=new THREE.Box3(new THREE.Vector3(handle.min.x-.03,.10,center.z-.29),new THREE.Vector3(handle.max.x+.50,.31,center.z+.29));
    for(const id of ['study-desk','study-chair','study-bookcase'])assert.equal(sweep.intersectsBox(bounds(id)),false,`抽屉行程不能碰${id}`);
  }
  assert.match(items.get('study-daybed').note,/上翻/);
});

test('意式平板厨卫保留实际水槽空腔与600mm淋浴开口',()=>{
  const sink=object('kitchen-sink');
  for(const dx of [-.14,0,.14])for(const dz of [-.10,0,.10]) {
    const hit=new THREE.Raycaster(new THREE.Vector3(1.0096+dx,1.10,3.25+dz),new THREE.Vector3(0,-1,0)).intersectObject(sink,true)[0];
    assert.ok(hit&&hit.point.y>.73&&hit.point.y<.765);
    assert.ok(['metal','dark'].includes(hit.object.material.name));
  }
  for(const [id,center] of [['bathroom-shower',4.1225],['ensuite-shower',10.1175]])for(const offset of [-.30,0,.30]) {
    const hits=new THREE.Raycaster(new THREE.Vector3(6.88,1.30,center+offset),new THREE.Vector3(1,0,0),0,.6).intersectObject(object(id),true);
    assert.equal(hits.length,0,`${id}不封堵原滑门入口`);
    assert.ok(object(id).userData.walkBoxes.length>2);
  }
  assert.ok(bounds('ensuite-toilet').min.z-bounds('ensuite-vanity').max.z>.70);
});

test('意式家具与实际门叶一起校核，600mm人体包络可从入户进入九空间',()=>{
  const architecture=buildArchitecture(THREE,mats,'italian'),blockers=collectWalkBlockers(italian.items,architecture);
  const step=.05,nx=178,nz=328,valid=new Uint8Array(nx*nz),seen=new Uint8Array(nx*nz),queue=[];
  for(let z=0;z<nz;z++)for(let x=0;x<nx;x++)valid[z*nx+x]=Number(canWalkTo(x*step,z*step,.30,blockers));
  const start=140*nx+12;assert.ok(valid[start]);seen[start]=1;queue.push(start);
  for(let i=0;i<queue.length;i++) {
    const k=queue[i],x=k%nx,z=Math.floor(k/nx);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const xx=x+dx,zz=z+dz,next=zz*nx+xx;
      if(xx>=0&&xx<nx&&zz>=0&&zz<nz&&valid[next]&&!seen[next]){seen[next]=1;queue.push(next);}
    }
  }
  const points=queue.map(k=>[(k%nx)*step,Math.floor(k/nx)*step]);
  for(const room of ROOMS) {
    const xs=room.polygon.map(p=>p[0]),zs=room.polygon.map(p=>p[1]);
    assert.ok(points.some(([x,z])=>x>Math.min(...xs)+.4&&x<Math.max(...xs)-.4&&z>Math.min(...zs)+.4&&z<Math.max(...zs)-.4&&pointInPolygon(x,z,room.polygon)),`${room.name}必须从入户连通内部`);
  }
});
