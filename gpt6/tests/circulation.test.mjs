import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildArchitecture } from '../src/architecture.js';
import { buildFurniture } from '../src/furniture.js';
import { collectWalkBlockers } from '../src/collision.js';
import { canWalkTo, pointInPolygon } from '../src/navigation.js';
import { ROOMS } from '../src/layout.js';

const names = ['wall','trim','oak','walnut','fabric','cream','sage','brass','marble','stone','glass','dark','white','rug','leaf','ceramic','light','metal','parquet','tile'];
const mats = Object.fromEntries(names.map(name => [name, new THREE.MeshStandardMaterial({ name })]));
const architecture = buildArchitecture(THREE, mats);
const furniture = buildFurniture(THREE, mats);
const blockers = collectWalkBlockers(furniture.items, architecture);

test('斜门按真实朝向阻挡，缩放家具仍按世界米制计算人体半径', () => {
  const door=new THREE.Mesh(new THREE.BoxGeometry(1,2,.05),mats.walnut);
  door.position.set(2,1,10);door.rotation.y=Math.PI/4;door.userData.doorLeaf=true;
  const group=new THREE.Group();group.add(door);
  const doorBlockers=collectWalkBlockers([],{group});
  assert.equal(canWalkTo(2,10,.18,doorBlockers),false);
  assert.equal(canWalkTo(2.3,10.3,.18,doorBlockers),true,'斜门外接矩形的空角不能被当成实体门');
  const cabinet=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),mats.walnut);
  cabinet.position.set(2,.5,12);cabinet.scale.z=.5;
  const scaled=collectWalkBlockers([{id:'cabinet',object:cabinet}],{group:new THREE.Group()});
  assert.equal(canWalkTo(2,12.42,.18,scaled),false,'柜面外170mm仍小于人体半径180mm');
  assert.equal(canWalkTo(2,12.45,.18,scaled),true);
});

function reachable(radius) {
  const step=.05, nx=178, nz=328;
  const valid=new Uint8Array(nx*nz), seen=new Uint8Array(nx*nz), queue=[];
  for(let z=0;z<nz;z++)for(let x=0;x<nx;x++)
    valid[z*nx+x]=Number(canWalkTo(x*step,z*step,radius,blockers));
  const start=Math.round(7/step)*nx+Math.round(.6/step);
  assert.ok(valid[start], '入户内侧应可站立');
  seen[start]=1;queue.push(start);
  for(let i=0;i<queue.length;i++) {
    const k=queue[i],x=k%nx,z=Math.floor(k/nx);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const xx=x+dx,zz=z+dz,j=zz*nx+xx;
      if(xx>=0&&xx<nx&&zz>=0&&zz<nz&&valid[j]&&!seen[j]) {seen[j]=1;queue.push(j);}
    }
  }
  return { seen, nx, step, points:queue.map(k=>[(k%nx)*step,Math.floor(k/nx)*step]) };
}

test('漫游从入户连续到达全部房间视点，包含实际门叶与淋浴玻璃阻挡', () => {
  const {seen,nx,step}=reachable(.18);
  for(const room of ROOMS) {
    const [x,,z]=room.view.position;
    assert.equal(seen[Math.round(z/step)*nx+Math.round(x/step)],1,`${room.name}预设视点应连通入户，不能靠传送掩盖阻挡`);
  }
});

test('600mm平面人体包络可从入户进入九个空间', () => {
  // 方案阶段的保守二维检查；并非无障碍或法定净宽验收。
  const {points}=reachable(.30);
  for(const room of ROOMS) {
    const xs=room.polygon.map(p=>p[0]),zs=room.polygon.map(p=>p[1]);
    const left=Math.min(...xs)+.4,right=Math.max(...xs)-.4,north=Math.min(...zs)+.4,south=Math.max(...zs)-.4;
    assert.ok(points.some(([x,z])=>x>left&&x<right&&z>north&&z<south&&pointInPolygon(x,z,room.polygon)),`${room.name}需要从入户连续到达内部`);
  }
});

test('门叶是实际行走障碍，淋浴隔断保留入口及内部站位', () => {
  const doors=[];
  architecture.group.traverse(o=>{if(o.userData.doorLeaf)doors.push(o);});
  assert.ok(doors.length>=7,'主要开启门叶应参与通行检查');
  for(const door of doors) {
    const box=new THREE.Box3().setFromObject(door),center=box.getCenter(new THREE.Vector3());
    assert.equal(canWalkTo(center.x,center.z,.18,blockers),false,door.name);
  }
  const {points}=reachable(.30);
  for(const id of ['bathroom-shower','ensuite-shower']) {
    const shower=furniture.items.find(item=>item.id===id);
    assert.ok(shower.object.userData.walkBoxes?.length,'淋浴隔断应按实际玻璃和门片分部检查');
    const box=new THREE.Box3().setFromObject(shower.object);
    assert.ok(points.some(([x,z])=>x>box.min.x+.3&&x<box.max.x-.3&&z>box.min.z+.3&&z<box.max.z-.3),`${id}应可走入600mm站立范围`);
  }
});
