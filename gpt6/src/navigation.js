import { FOOTPRINT, WALLS, HOUSE } from './layout.js';
// Solid wall segments exclude floor-level openings. A circular body may round
// a jamb, so test against the actual rectangular segment rather than inflating
// the opening into a long square corridor.
const walkingWalls=WALLS.map(wall=>{
  const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],length=Math.hypot(dx,dz),segments=[];
  let start=0;
  for(const opening of (wall.openings||[]).filter(o=>o.type!=='window').sort((a,b)=>a.offset-b.offset)){
    if(opening.offset>start)segments.push([start,opening.offset]);
    start=opening.offset+opening.width;
  }
  if(start<length)segments.push([start,length]);
  return {...wall,ux:dx/length,uz:dz/length,segments};
});
export function pointInPolygon(x,z,polygon){
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [xi,zi]=polygon[i],[xj,zj]=polygon[j];
    if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;
  }
  return inside;
}
export function canWalkTo(x,z,radius=.18,blockers=[]){
  if(!pointInPolygon(x,z,FOOTPRINT))return false;
  // Keep the viewer inside the balcony railing and away from solid wall surfaces.
  if(z>16.1||x<.24)return false;
  if(blockers.some(b=>{
    let px=x,pz=z,bounds=b;
    if(b.walkShape){
      const e=b.walkShape.inverse;
      px=e[0]*x+e[8]*z+e[12];pz=e[2]*x+e[10]*z+e[14];bounds=b.walkShape.bounds;
    }
    const dx=Math.max(bounds.min.x-px,0,px-bounds.max.x),dz=Math.max(bounds.min.z-pz,0,pz-bounds.max.z);
    return dx*dx+dz*dz<radius*radius;
  }))return false;
  for(const wall of walkingWalls){
    const along=(x-wall.a[0])*wall.ux+(z-wall.a[1])*wall.uz;
    const across=Math.abs((x-wall.a[0])*wall.uz-(z-wall.a[1])*wall.ux);
    const dy=Math.max(0,across-HOUSE.wallThickness/2);
    if(dy>=radius)continue;
    for(const [start,end] of wall.segments){
      const dx=Math.max(start-along,0,along-end);
      if(dx*dx+dy*dy<radius*radius)return false;
    }
  }
  return true;
}
