import { Box3, Matrix4, Vector3 } from 'three';
import { FOOTPRINT, HOUSE, WALLS } from './layout.js';
import { pointInPolygon } from './navigation.js';
import { readTransform } from './furniture-transform.js';

// Millimetre tolerance for model joins; it must not accumulate with each move.
const EPS = .001, ROUND_OFF = 1e-8;
const clone = t => ({position:[...t.position],rotation:t.rotation,scale:[...t.scale]});
const boundsOf = boxes => boxes.reduce((box, part) => box.union(part), new Box3());

/** Capture BEFORE material batching. Preserve holes under tables and between
 * curtain panels, including components already batched inside a wardrobe leaf. */
export function captureCollisionBoxes(root) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(), boxes = [];
  function visit(object) {
    const matrix = new Matrix4().multiplyMatrices(inverse, object.matrixWorld);
    if (object !== root && object.userData.editorCollisionBoxes) {
      for (const part of object.userData.editorCollisionBoxes) {
        boxes.push(new Box3(new Vector3(...part.min), new Vector3(...part.max)).applyMatrix4(matrix));
      }
      return;
    }
    if (object.isMesh) {
      object.geometry.computeBoundingBox();
      boxes.push(object.geometry.boundingBox.clone().applyMatrix4(matrix));
    }
    object.children.forEach(visit);
  }
  visit(root);
  return boxes.filter(box=>!box.isEmpty()).map(box=>({min:box.min.toArray(),max:box.max.toArray()}));
}

function localBoxes(object) {
  return (object.userData.editorCollisionBoxes || captureCollisionBoxes(object))
    .map(part=>new Box3(new Vector3(...part.min),new Vector3(...part.max)));
}

function shape(box, transform, inflate=0) {
  const c=box.getCenter(new Vector3()).multiply(new Vector3(...transform.scale));
  const h=box.getSize(new Vector3()).multiply(new Vector3(...transform.scale)).multiplyScalar(.5);
  const cos=Math.cos(transform.rotation),sin=Math.sin(transform.rotation);
  const x=transform.position[0]+cos*c.x+sin*c.z,z=transform.position[2]-sin*c.x+cos*c.z;
  const y=transform.position[1]+c.y, hx=h.x+inflate,hz=h.z+inflate;
  const dx=Math.abs(cos)*hx+Math.abs(sin)*hz,dz=Math.abs(sin)*hx+Math.abs(cos)*hz;
  return {x,z,axes:[[cos,-sin],[sin,cos]],hx,hz,minY:y-h.y-inflate,maxY:y+h.y+inflate,
    minX:x-dx,maxX:x+dx,minZ:z-dz,maxZ:z+dz};
}
const radius=(s,[x,z])=>s.hx*Math.abs(x*s.axes[0][0]+z*s.axes[0][1])
  +s.hz*Math.abs(x*s.axes[1][0]+z*s.axes[1][1]);
function overlap(a,b) {
  const vertical=Math.min(a.maxY-b.minY,b.maxY-a.minY);
  if(vertical<=EPS||a.maxX<b.minX||a.minX>b.maxX||a.maxZ<b.minZ||a.minZ>b.maxZ)return null;
  let horizontal=Infinity;
  for(const axis of [...a.axes,...b.axes]){
    const depth=radius(a,axis)+radius(b,axis)-Math.abs((a.x-b.x)*axis[0]+(a.z-b.z)*axis[1]);
    if(depth<=EPS)return null;
    horizontal=Math.min(horizontal,depth);
  }
  return {horizontal,vertical};
}

// Continuous SAT: find the first forbidden interval, even when both endpoints
// are clear. No distance-based sampling, so a fast pointer cannot skip a wall.
function sweep(a,b,delta,allowed=EPS) {
  if(Math.min(a.maxY-b.minY,b.maxY-a.minY)<=EPS)return null;
  let enter=0,leave=1;
  for(const axis of [...a.axes,...b.axes]){
    const extent=radius(a,axis)+radius(b,axis)-allowed;
    if(extent<=0)return null;
    const offset=(a.x-b.x)*axis[0]+(a.z-b.z)*axis[1];
    const velocity=delta[0]*axis[0]+delta[2]*axis[1];
    if(Math.abs(velocity)<1e-12){if(Math.abs(offset)>=extent-ROUND_OFF)return null;continue;}
    let start=(-extent-offset)/velocity,end=(extent-offset)/velocity;
    if(start>end)[start,end]=[end,start];
    enter=Math.max(enter,start);leave=Math.min(leave,end);
    if(enter>=leave-ROUND_OFF)return null;
  }
  return enter<1&&leave>0?Math.max(0,enter):null;
}
function boxShape(min,max,position=[0,0,0],rotation=0) {
  return shape(new Box3(new Vector3(...min),new Vector3(...max)),{position,rotation,scale:[1,1,1]});
}
function aggregate(parts) {
  return {
    minX:Math.min(...parts.map(p=>p.minX)),maxX:Math.max(...parts.map(p=>p.maxX)),
    minZ:Math.min(...parts.map(p=>p.minZ)),maxZ:Math.max(...parts.map(p=>p.maxZ)),
    minY:Math.min(...parts.map(p=>p.minY)),maxY:Math.max(...parts.map(p=>p.maxY)),
  };
}
function intersects(a,b) {
  return a.minX<=b.maxX&&a.maxX>=b.minX&&a.minZ<=b.maxZ&&a.maxZ>=b.minZ&&a.minY<=b.maxY&&a.maxY>=b.minY;
}
function union(a,b) {
  return Object.fromEntries(['X','Y','Z'].flatMap(axis=>[
    ['min'+axis,Math.min(a['min'+axis],b['min'+axis])],
    ['max'+axis,Math.max(a['max'+axis],b['max'+axis])],
  ]));
}
function corners(s) {
  return [-1,1].flatMap(a=>[-1,1].map(b=>[
    s.x+a*s.hx*s.axes[0][0]+b*s.hz*s.axes[1][0],
    s.z+a*s.hx*s.axes[0][1]+b*s.hz*s.axes[1][1],
  ]));
}
function distanceToEdge(x,z,a,b) {
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
}

export function createFurnitureCollision({items,architecture,walls=WALLS,footprint=FOOTPRINT,height=HOUSE.height,wallThickness=HOUSE.wallThickness}) {
  const catalog=new Map(items.map(item=>[item.id,{item,boxes:localBoxes(item.object),defaults:clone(item.defaultTransform||readTransform(item.object))}]));
  const fixed=[], cache=new Map();
  const add=(id,name,parts,kind='wall')=>fixed.push({id,name,parts,bounds:aggregate(parts),kind});
  for(const wall of walls){
    const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],length=Math.hypot(dx,dz);
    const parts=[],position=[wall.a[0],0,wall.a[1]],angle=-Math.atan2(dz,dx);
    const section=(start,end,minY,maxY)=>{if(end>start&&maxY>minY)parts.push(boxShape([start,minY,-wallThickness/2],[end,maxY,wallThickness/2],position,angle));};
    let start=0;
    // Glazing remains solid; only actual floor-level doors provide passage.
    for(const opening of [...(wall.openings||[])].filter(o=>o.type!=='window').sort((a,b)=>a.offset-b.offset)){
      section(start,opening.offset,0,height);
      section(opening.offset,opening.offset+opening.width,0,opening.sill||0);
      section(opening.offset,opening.offset+opening.width,(opening.sill||0)+opening.height,height);
      start=opening.offset+opening.width;
    }
    section(start,length,0,height);if(parts.length)add(`wall:${wall.id}`,'墙体或窗户',parts);
  }
  // Also close the open balcony edge and concave footprint, independent of the
  // cutaway visibility. Static containment below catches imported outside poses.
  footprint.forEach((a,i)=>{
    const b=footprint[(i+1)%footprint.length],dx=b[0]-a[0],dz=b[1]-a[1];
    add(`edge:${i}`,'户型边界',[boxShape([0,-10,-.001],[Math.hypot(dx,dz),20,.001],[a[0],0,a[1]],-Math.atan2(dz,dx))],'boundary');
  });
  architecture?.group.updateWorldMatrix(true,true);
  architecture?.group.traverse(object=>{
    if(!object.userData.doorLeaf&&!object.userData.walkObstacle&&!object.userData.editorObstacle)return;
    // Keep opened door leaves oriented, including their parent's rotation.
    const e=object.matrixWorld.elements;
    const transform={position:[e[12],e[13],e[14]],rotation:Math.atan2(e[8],e[10]),
      scale:[Math.hypot(e[0],e[1],e[2]),Math.hypot(e[4],e[5],e[6]),Math.hypot(e[8],e[9],e[10])]};
    const parts=localBoxes(object).map(box=>shape(box,transform));
    if(parts.length)add(`fixed:${object.uuid}`,object.userData.editorObstacle?'阳台栏杆':'门扇',parts);
  });
  function record(id,transform) {
    const entry=catalog.get(id),parts=entry.boxes.map(box=>shape(box,transform));
    const bounds=aggregate(parts),rug=entry.item.id.includes('rug');
    return {id,name:entry.item.name,kind:'furniture',rug,groundRug:rug&&bounds.minY>=-EPS&&bounds.maxY<=.04,parts,bounds};
  }
  function sync(){for(const [id,entry] of catalog)cache.set(id,record(id,readTransform(entry.item.object)));}
  sync();
  function obstacles(id,records=cache,moving=records.get(id)) {
    return [...fixed,...[...records.values()].filter(o=>o.id!==id&&!(
      moving.rug!==o.rug&&(moving.rug?moving.groundRug:o.groundRug)
    ))];
  }
  function limits(entry,transform) {
    const parts=entry.boxes.map(box=>shape(box,transform)),b=aggregate(parts);
    let outside=0;
    for(const part of parts)for(const [x,z] of corners(part)){
      if(!pointInPolygon(x,z,footprint))outside=Math.max(outside,Math.min(...footprint.map((a,i)=>distanceToEdge(x,z,a,footprint[(i+1)%footprint.length]))));
    }
    return {outside,below:Math.max(0,-b.minY),above:Math.max(0,b.maxY-height)};
  }
  function limitConflict(entry,from,to) {
    const before=limits(entry,from),after=limits(entry,to);
    for(const key of ['outside','below','above'])if(after[key]>Math.max(EPS,before[key])+ROUND_OFF){
      return {kind:'boundary',id:key,name:key==='outside'?'户型边界':key==='below'?'地面':'天花板'};
    }
    return null;
  }
  function conflict(id,from,to,records=cache,beforeRecords=records,inflate=0) {
    const entry=catalog.get(id),current=entry.boxes.map(box=>shape(box,from));
    const next=entry.boxes.map(box=>shape(box,to,inflate)),nextBounds=aggregate(next);
    for(const obstacle of obstacles(id,records,record(id,to))){
      if(!intersects(nextBounds,obstacle.bounds))continue;
      const beforeObstacle=beforeRecords.get(obstacle.id)||obstacle;
      for(let i=0;i<next.length;i++){
        if(!intersects(next[i],obstacle.bounds))continue;
        for(let j=0;j<obstacle.parts.length;j++){
          const hit=overlap(next[i],obstacle.parts[j]);if(!hit)continue;
          const previous=overlap(current[i],beforeObstacle.parts[j]);
          // Existing model joins and older saved intersections may move out,
          // but never become deeper. Once clear they cannot be re-entered.
          if(previous&&hit.horizontal<=previous.horizontal+inflate*3+ROUND_OFF
            &&hit.vertical<=previous.vertical+inflate*2+ROUND_OFF)continue;
          return {kind:obstacle.kind,id:obstacle.id,name:obstacle.name};
        }
      }
    }
    return limitConflict(entry,from,to);
  }
  function constrainDrag(id,from,to) {
    const entry=catalog.get(id),parts=entry.boxes.map(box=>shape(box,from));
    const endParts=entry.boxes.map(box=>shape(box,to)),bounds=union(aggregate(parts),aggregate(endParts));
    const delta=to.position.map((v,i)=>v-from.position[i]);
    let fraction=1,hit=null;
    for(const obstacle of obstacles(id)){
      if(!intersects(bounds,obstacle.bounds))continue;
      for(let i=0;i<parts.length;i++){
        if(!intersects(union(parts[i],endParts[i]),obstacle.bounds))continue;
        for(const other of obstacle.parts){
          const previous=overlap(parts[i],other);
          const time=sweep(parts[i],other,delta,previous?previous.horizontal+ROUND_OFF:EPS);
          if(time!==null&&time<fraction){fraction=time;hit={kind:obstacle.kind,id:obstacle.id,name:obstacle.name};}
        }
      }
    }
    const next=clone(to);
    if(hit){
      fraction=Math.max(0,fraction-1e-6/Math.max(.001,Math.hypot(...delta)));
      next.position=from.position.map((v,i)=>v+delta[i]*fraction);
    }
    const boundary=limitConflict(entry,from,next);
    if(boundary)return {transform:clone(from),collision:boundary};
    return {transform:next,collision:hit};
  }
  function validateChange(id,from,to) {
    const final=conflict(id,from,to);if(final)return final;
    const entry=catalog.get(id),box=boundsOf(entry.boxes),pivot=box.getCenter(new Vector3());pivot.y=box.min.y;
    const angle=Math.atan2(Math.sin(to.rotation-from.rotation),Math.cos(to.rotation-from.rotation));
    const offset=t=>pivot.clone().multiply(new Vector3(...t.scale)).applyAxisAngle(new Vector3(0,1,0),t.rotation);
    const startAnchor=new Vector3(...from.position).add(offset(from)),endAnchor=new Vector3(...to.position).add(offset(to));
    const radius=box.getSize(new Vector3()).length();
    const motion=startAnchor.distanceTo(endAnchor)+radius*(Math.abs(angle)*Math.max(...from.scale,...to.scale)
      +Math.max(...to.scale.map((v,i)=>Math.abs(v-from.scale[i]))));
    // Conservative midpoint envelopes cover intermediate rotation / resizing.
    // At most 1 mm expansion; regular drag uses exact continuous SAT instead.
    const steps=Math.max(1,Math.ceil(motion/.002)),padding=motion/steps/2;
    for(let i=0;i<steps;i++){
      const t=(i+.5)/steps,next={rotation:from.rotation+angle*t,scale:from.scale.map((v,j)=>v+(to.scale[j]-v)*t)};
      next.position=startAnchor.clone().lerp(endAnchor,t).sub(offset(next)).toArray();
      const hit=conflict(id,from,next,cache,cache,padding);
      if(hit)return hit;
    }
    return null;
  }
  function validateLayout(transforms) {
    const baseline=new Map([...catalog].map(([id,entry])=>[id,record(id,entry.defaults)]));
    const proposed=new Map([...catalog].map(([id])=>[id,record(id,transforms[id])]));
    for(const [id,entry] of catalog){
      const hit=conflict(id,entry.defaults,transforms[id],proposed,baseline);
      if(hit)return {...hit,itemName:entry.item.name};
    }
    return null;
  }
  return {sync,constrainDrag,validateChange,validateLayout};
}

export function collisionMessage(hit) {
  if(hit.kind==='furniture')return `已阻止重叠：与「${hit.name}」冲突，请移到空处或缩小尺寸。`;
  return `已阻止穿越${hit.name}，请移到空处或缩小尺寸。`;
}
