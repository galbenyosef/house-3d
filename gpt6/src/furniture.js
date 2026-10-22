import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createItalianFurniture, ITALIAN_SPECS } from './italian-furniture.js';
import { createModernFurniture, MODERN_SPECS } from './modern-furniture.js';
import { createSongFurniture, SONG_SPECS } from './song-furniture.js';
import { getDesignStyle } from './design-styles.js';
import { setSurfaceUV } from './surface-uv.js';
import { captureCollisionBoxes } from './furniture-collision.js';

// All dimensions are in metres. Geometry is deterministic and can be rebuilt without a DCC application.
export function buildFurniture(THREE, mats, style = 'french') {
  const modern = style === 'modern', song = style === 'song', contemporary = modern || song || style === 'italian';
  const group = new THREE.Group(); group.name = `${getDesignStyle(style).name} · 家具与陈设`;
  const items = [], lights = [];
  const tinted = (base, color, extra = {}) => { const m = base.clone(); m.color.set(color); Object.assign(m, extra); return m; };
  const wine = tinted(mats.fabric, contemporary ? mats.fabric.color : '#693e37');
  const ivory = tinted(contemporary ? mats.cream : mats.fabric, song ? '#e0d6c0' : modern ? '#e7e2d7' : contemporary ? '#a9a294' : '#e0d5bb');
  const moss = tinted(contemporary ? mats.sage : mats.fabric, contemporary ? mats.sage.color : '#66704d');
  wine.userData.paletteRole = 'fabric';
  moss.userData.paletteRole = 'sage';
  if(contemporary)delete ivory.userData.paletteRole;
  const linen = tinted(contemporary ? mats.cream : mats.fabric, song ? '#c5b99f' : modern ? '#cfc6b5' : contemporary ? '#827b6c' : '#c4b7a2');
  if(contemporary)delete linen.userData.paletteRole;
  const ink = tinted(mats.dark, contemporary ? mats.dark.color : '#252b2b');
  const red = tinted(mats.cream, song ? '#83795e' : modern ? '#a89a84' : contemporary ? '#655442' : '#843d36');
  const pages = tinted(mats.cream, song ? '#ddd3bd' : modern ? '#ded8ca' : contemporary ? '#afa490' : '#d8c5a5');
  const mirror = new THREE.MeshStandardMaterial({color: '#a9b7b2', metalness: 1, roughness: .07});
    const plantDark = tinted(mats.leaf, '#354e31', {side: THREE.DoubleSide});
  const plantLight = tinted(mats.leaf, '#526b3e', {side: THREE.DoubleSide});
  const soil = new THREE.MeshStandardMaterial({color:'#392c23', roughness:1});
  const darkRug = tinted(mats.rug, '#6a3a32');
  const rugBorder = tinted(mats.rug, '#b18b5d');
  const bronze = tinted(mats.brass, '#705335');
  const registered = new Set();
  const collection = contemporary ? (song ? createSongFurniture : modern ? createModernFurniture : createItalianFurniture)(THREE,mats,{box,cyl,sphere,bar,mesh,cushion,book,vase,ivory,linen,wine,moss,ink,mirror,pages}) : null;
  function mesh(g, geo, mat, p = [0,0,0], r = [0,0,0], s = [1,1,1]) {
    setSurfaceUV(geo, mat, s);
    const o = new THREE.Mesh(geo, mat); o.position.set(...p); o.rotation.set(...r); o.scale.set(...s);
    o.castShadow = mat !== mats.glass && !(mat.transparent && mat.opacity < .3); o.receiveShadow = true; g.add(o); return o;
  }
  function box(g,w,h,d,mat,x=0,y=0,z=0,r=.018,rot=0) {
    const geo = r > 0 ? new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2,h/2,d/2)) : new THREE.BoxGeometry(w,h,d);
    return mesh(g,geo,mat,[x,y,z],[0,rot,0]);
  }
  function cyl(g,rt,rb,h,mat,x=0,y=0,z=0,n=32) { return mesh(g,new THREE.CylinderGeometry(rt,rb,h,n),mat,[x,y,z]); }
  function sphere(g,mat,p,s) { return mesh(g,new THREE.SphereGeometry(1,16,10),mat,p,[0,0,0],s); }
  function tube(g,points,r,mat,closed=false) {
    return mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed),Math.max(12,points.length*5),r,7,closed),mat);
  }
  function bar(g,a,b,r,mat) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), mid=va.clone().add(vb).multiplyScalar(.5);
    const o = mesh(g,new THREE.CylinderGeometry(r,r,va.distanceTo(vb),8),mat,mid.toArray());
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize()); return o;
  }
  function lathe(g,profile,mat,x=0,y=0,z=0,scale=1) {
    return mesh(g,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),24),mat,[x,y,z],[0,0,0],[scale,scale,scale]);
  }
  function turnedLeg(g,x,z,height=.39,mat=mats.walnut) {
    if(contemporary){box(g,.023,height,.023,mats.brass,x,height/2,z,.003);return;}
    lathe(g,[[.018,0],[.027,.025],[.02,.07],[.026,height*.55],[.037,height*.7],[.027,height*.77],[.035,height]],mat,x,0,z);
    cyl(g,.02,.022,.025,mats.brass,x,.014,z,12);
  }
  function cabriole(g,x,z,h=.4,side=1) {
    tube(g,[[x+side*.035,.025,z+.03],[x,.08,z],[x-side*.012,h*.45,z-.012],[x+side*.045,h*.78,z],[x,h,z]],.025,mats.walnut);
    sphere(g,mats.walnut,[x+side*.035,.027,z+.03],[.036,.024,.041]);
  }
  function knob(g,x,y,z,mat=mats.brass) { sphere(g,mat,[x,y,z],[.017,.017,.017]); }
  function pull(g,x,y,z,w=.1) { bar(g,[x-w/2,y,z],[x+w/2,y,z],.007,mats.brass); for(const a of [-1,1])bar(g,[x+a*w/2,y,z-.015],[x+a*w/2,y,z],.006,mats.brass); }
  function frame(g,x,y,z,w,h,mat=mats.walnut,depth=.035) {
    box(g,w+.045,.035,depth,mat,x,y-h/2,z); box(g,w+.045,.035,depth,mat,x,y+h/2,z);
    box(g,.035,h,depth,mat,x-w/2,y,z); box(g,.035,h,depth,mat,x+w/2,y,z);
  }
  function stitch(g,x,y,z,w,d,mat=mats.cream) {
    const c=.04, yy=y+.003;
    tube(g,[[x-w/2+c,yy,z-d/2],[x+w/2-c,yy,z-d/2],[x+w/2,yy,z-d/2+c],[x+w/2,yy,z+d/2-c],[x+w/2-c,yy,z+d/2],[x-w/2+c,yy,z+d/2],[x-w/2,yy,z+d/2-c],[x-w/2,yy,z-d/2+c]],.003,mat,true);
  }
  function mergeItem(root) {
    root.updateMatrixWorld(true);
    root.userData.editorCollisionBoxes=captureCollisionBoxes(root);
    const buckets = new Map(), removed=[];
    root.traverse(o=>{ if(o.isMesh) { if(Array.isArray(o.material)||o.userData.movablePart) return; const geo=o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld); geo.applyMatrix4(new THREE.Matrix4().copy(root.matrixWorld).invert());
      const usable=geo.index ? geo.toNonIndexed() : geo; if(geo.index) geo.dispose();
      Object.keys(usable.attributes).forEach(k=>{if(!['position','normal','uv'].includes(k)) usable.deleteAttribute(k);});
      if(!usable.attributes.uv) usable.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(usable.attributes.position.count*2),2));
      const entry=buckets.get(o.material.uuid)||{mat:o.material,geos:[]}; entry.geos.push(usable); buckets.set(o.material.uuid,entry); removed.push(o);
    }});
    for(const o of removed) {o.removeFromParent(); o.geometry.dispose();}
    for(const {mat,geos} of buckets.values()) {
      const merged=mergeGeometries(geos,false); geos.forEach(g=>g.dispose());
      if(merged) {const o=mesh(root,merged,mat);o.name=root.name;o.userData.itemId=root.userData.itemId;}
    }
  }
  function item(id,name,room,dimensions,material,note,position,rotation,build) {
    if(registered.has(id)) throw new Error(`Duplicate furniture ID ${id}`); registered.add(id);
    const spec=song ? SONG_SPECS[id] : modern ? MODERN_SPECS[id] : contemporary ? ITALIAN_SPECS[id] : null;
    if(spec){name=spec[0]||name;dimensions=spec[1]||dimensions;material=spec[2]||material;note=spec[3]||note;}
    const o=new THREE.Group(); o.name=name; o.userData.itemId=id; o.userData.style=style;
    (collection?.itemBuilders[id] || build)(o); mergeItem(o);
    o.position.set(...position); o.rotation.y=rotation||0; group.add(o);
    items.push({id,name,room,dimensions,material,note,object:o}); return o;
  }
  function cushion(g,x,y,z,w,h,d,mat,rx=0,rz=0) {
    const c=new THREE.Group(); c.position.set(x,y,z); c.rotation.set(rx,0,rz); g.add(c);
    const geo=new RoundedBoxGeometry(w,h,d,5,Math.min(.075,h*.38));
    const pos=geo.attributes.position;
    // Shallow inward gathering along the seams; preserve the measured envelope.
    for(let i=0;i<pos.count;i++) {
      const px=pos.getX(i),py=pos.getY(i),pz=pos.getZ(i);
      const upright=d<h,u=px/(w/2),v=upright?py/(h/2):pz/(d/2);
      const edge=Math.max(Math.abs(u),Math.abs(v)),axis=upright?pz:py;
      const gather=upright
        ?.009*Math.pow(edge,3)+.003*Math.pow(edge,4)*(1+Math.sin(u*31+v*13))*.5
        :.001*Math.pow(edge,4)*(1+Math.sin(u*31+v*13))*.5;
      const inset=Math.sign(axis)*Math.min(Math.abs(axis)*.20,gather);
      if(upright)pos.setZ(i,pz-inset);else pos.setY(i,py-inset);
    }
    // Keep the rounded box's continuous normals; non-indexed recomputation
    // would turn each tiny upholstery triangle into a hard specular facet.
    mesh(c,geo,mat);
    if(h<d) stitch(c,0,h/2-.004,0,w-.025,d-.025,mat);
    else {
      const a=w/2-.012,b=h/2-.012,k=.04;
      tube(c,[[-a+k,-b,0],[a-k,-b,0],[a,-b+k,0],[a,b-k,0],[a-k,b,0],[-a+k,b,0],[-a,b-k,0],[-a,-b+k,0]],.0015,mat,true);
    }
    return c;
  }
  function vase(g,x,y,z,s=.2,flowers=false) {
    lathe(g,[[.18,0],[.22,.05],[.29,.28],[.26,.55],[.12,.76],[.12,.85],[.135,.87]],mats.ceramic,x,y,z,s);
    if(flowers) for(let i=0;i<7;i++) {
      const a=i*2.4,r=.07*(i%3),h=.22+(i%3)*.05;
      const p=[x+Math.cos(a)*r,y+s*.82+h,z+Math.sin(a)*r];
      bar(g,[x,y+s*.5,z],p,.0025,plantDark);
      sphere(g,i%3===0?red:ivory,p,[.024,.025,.027]);
      for(let j=0;j<4;j++){const q=j*1.57;sphere(g,i%3===0?red:ivory,[p[0]+Math.cos(q)*.022,p[1]+.008,p[2]+Math.sin(q)*.022],[.02,.016,.018]);}
    }
  }
  function book(g,x,y,z,w=.16,h=.025,d=.23,color=red,rot=0) {
    box(g,w,h,d,color,x,y,z,.002,rot); box(g,w-.008,h-.006,d-.01,pages,x,y,z+.001,.001,rot);
  }
  function lamp(g,x,y,z,h=.48) {
    if(contemporary) return collection.helpers.lamp(g,x,y,z,h);
    cyl(g,.075,.09,.025,mats.brass,x,y+.012,z); lathe(g,[[.014,0],[.028,.04],[.017,h*.24],[.028,h*.43],[.012,h*.62]],mats.brass,x,y+.02,z);
    mesh(g,new THREE.CylinderGeometry(.11,.17,h*.38,32,1,true),ivory,[x,y+h*.79,z]);
    cyl(g,.112,.112,.009,mats.brass,x,y+h*.98,z); cyl(g,.17,.17,.008,mats.brass,x,y+h*.6,z);
    sphere(g,mats.light,[x,y+h*.7,z],[.042,.055,.042]);
  }
  function rug(g,w,d) {
    if(contemporary) return collection.helpers.rug(g,w,d);
    box(g,w,.018,d,darkRug,0,.014,0,.035);
    box(g,w-.12,.005,d-.12,rugBorder,0,.026,0,.028);
    box(g,w-.2,.006,d-.2,darkRug,0,.03,0,.025);
    box(g,w-.30,.007,d-.30,mats.rug,0,.034,0,.022);
    for(let k=-1;k<=1;k++) {
      const o=mesh(g,new THREE.RingGeometry(.17,.19,24),rugBorder,[0,.039,k*d*.25],[-Math.PI/2,0,0],[1,1.55,1]);
      o.receiveShadow=true;
    }
    for(const s of [-1,1]) for(let i=0;i<26;i++) bar(g,[-w/2+.07+i*(w-.14)/25,.015,s*d/2],[-w/2+.07+i*(w-.14)/25,.015,s*(d/2+.045)],.003,linen);
  }
  function sofa(g,w=2.48) {
    if(contemporary) return collection.helpers.sofa(g,w);
    for(const x of [-w/2+.17,w/2-.17]) for(const z of [-.33,.31]) cabriole(g,x,z,.16,x<0?-1:1);
    const upholstered=new THREE.Group();upholstered.position.y=-.09;g.add(upholstered);g=upholstered;
    box(g,w-.12,.16,.82,mats.walnut,0,.28,0,.07); box(g,w-.25,.19,.77,wine,0,.37,-.005,.08);
    tube(g,[[-w/2+.10,.64,-.3],[-w*.34,.88,-.37],[0,.95,-.4],[w*.34,.88,-.37],[w/2-.10,.64,-.3]],.036,mats.walnut);
    box(g,w-.26,.52,.15,wine,0,.66,-.31,.11);
    for(let i=0;i<3;i++) {
      const x=(i-1)*(w-.36)/3;
      cushion(g,x,.49,.06,(w-.34)/3-.018,.16,.66,wine);
      cushion(g,x,.76,-.23,(w-.36)/3-.023,.42,.16,wine,-.12);
      for(const dx of [-.17,.17])sphere(g,bronze,[x+dx,.77,-.139],[.009,.009,.006]);
    }
    for(const side of [-1,1]) {
      const x=side*(w/2-.11);
      box(g,.2,.29,.75,wine,x,.58,.025,.09);
      tube(g,[[x,.6,.39],[x+side*.025,.74,.25],[x,.74,-.1],[x,.82,-.31]],.04,mats.walnut);
      tube(g,[[x,.63,.39],[x+side*.024,.77,.24],[x,.77,-.12],[x,.85,-.31]],.008,mats.brass);
    }
    cushion(g,-.83,.76,.0,.41,.41,.14,ivory,-.13,-.18); cushion(g,.82,.74,.0,.43,.40,.14,moss,-.10,.16);
    const profile=new THREE.CatmullRomCurve3([
      new THREE.Vector3(0,.593,-.125),new THREE.Vector3(0,.596,.18),
      new THREE.Vector3(0,.588,.377),new THREE.Vector3(0,.551,.439),
      new THREE.Vector3(0,.422,.450),new THREE.Vector3(0,.286,.449),
    ]);
    const vertices=[],indices=[],uvs=[],across=24,along=40;
    for(let j=0;j<=along;j++)for(let i=0;i<=across;i++) {
      const u=i/across,t=j/along,p=profile.getPoint(t);
      const fold=Math.sin(u*Math.PI*10+t*.8)*.004+Math.sin(u*Math.PI*18-t)*.0015;
      const vertical=THREE.MathUtils.smoothstep(t,.42,.75);
      vertices.push(.45+(u-.5)*.48,p.y+fold*(1-vertical),p.z+fold*vertical);
      uvs.push(u*.48,t*.85);
      if(j<along&&i<across){const a=j*(across+1)+i,b=a+across+1;indices.push(a,b,a+1,b,b+1,a+1);}
    }
    const drape=new THREE.BufferGeometry();drape.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));drape.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));drape.setIndex(indices);drape.computeVertexNormals();
    const cloth=linen.clone();cloth.side=THREE.DoubleSide;mesh(g,drape,cloth);
  }
  function caneChair(g,scale=1,upholstery=ivory) {
    if(contemporary) return collection.helpers.caneChair(g,scale,moss);
    let c=new THREE.Group();c.scale.setScalar(scale);g.add(c);
    const seatDrop=.5225-.470/scale;
    for(const x of [-.24,.24])for(const z of [-.22,.22])cabriole(c,x,z,.40-seatDrop,x<0?-1:1);
    const upper=new THREE.Group();upper.position.y=-seatDrop;c.add(upper);c=upper;
    box(c,.57,.065,.53,mats.walnut,0,.42,0,.08); cushion(c,0,.475,.014,.52,.095,.47,upholstery);
    tube(c,[[-.27,.45,-.23],[-.3,.79,-.24],[-.2,1.0,-.27],[0,1.075,-.28],[.2,1.0,-.27],[.3,.79,-.24],[.27,.45,-.23]],.032,mats.walnut);
    // Individual crossed cane strips provide a readable woven silhouette in close views.
    for(let i=-5;i<=5;i++) {
      const x=i*.043, top=1.012-.9*x*x, bottom=.59;
      bar(c,[x,bottom,-.255],[x,top,-.255],.0045,mats.oak);
    }
    for(let i=0;i<8;i++) {const y=.6+i*.052,w=.248- Math.max(0,y-.88)*.8;bar(c,[-w,y,-.255],[w,y,-.255],.0045,mats.oak);}
    for(const side of [-1,1]) {
      tube(c,[[side*.28,.46,.16],[side*.31,.65,.13],[side*.30,.68,-.20]],.022,mats.walnut);
      tube(c,[[side*.3,.65,.22],[side*.32,.69,.10],[side*.31,.7,-.21]],.035,mats.walnut);
    }
  }
  function diningChair(g) {
    if(contemporary) return collection.helpers.diningChair(g);
    for(const x of [-.21,.21])for(const z of [-.20,.20])turnedLeg(g,x,z,.3595);
    const upper=new THREE.Group();upper.position.y=-.0505;g.add(upper);g=upper;
    box(g,.49,.055,.46,mats.walnut,0,.43,0,.035);cushion(g,0,.478,0,.46,.065,.44,moss);
    const oval=[];for(let i=0;i<30;i++){const a=i/30*Math.PI*2;oval.push([Math.cos(a)*.224,.84+Math.sin(a)*.266,-.20]);}
    tube(g,oval,.025,mats.walnut,true);
    sphere(g,moss,[0,.835,-.196],[.207,.247,.037]);
    for(const x of [-.17,.17])bar(g,[x,.46,-.20],[x,.67,-.2],.02,mats.walnut);
    sphere(g,mats.brass,[0,.84,-.151],[.01,.01,.006]);
  }
  function roundTable(g) {
    if(contemporary) return collection.helpers.roundTable(g);
    lathe(g,[[.07,0],[.10,.06],[.09,.13],[.065,.20],[.15,.3],[.11,.42],[.055,.51],[.1,.64],[.22,.69]],mats.walnut);
    for(let i=0;i<4;i++){const a=i*Math.PI/2; tube(g,[[0,.15,0],[Math.cos(a)*.22,.10,Math.sin(a)*.22],[Math.cos(a)*.40,.05,Math.sin(a)*.40],[Math.cos(a)*.43,.055,Math.sin(a)*.43]],.043,mats.walnut);}
    cyl(g,.61,.61,.055,mats.walnut,0,.745,0,64);cyl(g,.57,.59,.055,mats.walnut,0,.691,0,64);
    const ring=mesh(g,new THREE.TorusGeometry(.591,.005,6,64),mats.brass,[0,.777,0],[Math.PI/2,0,0]);
    vase(g,.03,.775,.02,.20,true);
    for(let i=0;i<6;i++) {
      const a=i*Math.PI/3,setting=new THREE.Group();setting.position.set(Math.sin(a)*.42,0,Math.cos(a)*.42);setting.rotation.y=a;g.add(setting);
      cyl(setting,.095,.09,.012,mats.ceramic,0,.783,0,28);cyl(setting,.065,.068,.01,ivory,0,.794,0,28);
      box(setting,.048,.008,.1,linen,.10,.787,0,.003);bar(setting,[-.105,.79,-.045],[-.105,.79,.045],.0027,mats.brass);
      lathe(setting,[[.019,0],[.021,.006],[.006,.01],[.006,.055],[.029,.07],[.032,.11],[.026,.13]],mats.glass,.066,.78,-.12);
    }
  }
  function sideboard(g,w=1.50,h=.85,d=.42) {
    if(contemporary) return collection.helpers.sideboard(g,w,h,d);
    for(const x of [-w/2+.08,w/2-.08])for(const z of [-d/2+.05,d/2-.05])turnedLeg(g,x,z,.15);
    box(g,w,h-.18,d,mats.walnut,0,.15+(h-.18)/2,0,.02);
    box(g,w+.045,.037,d+.03,mats.marble,0,h,0,.018);
    for(let i=0;i<3;i++){const x=(i-1)*w/3;box(g,w/3-.026,h-.26,.017,mats.walnut,x,h/2+.04,d/2+.01,.007); frame(g,x,h/2+.04,d/2+.023,w/3-.10,h-.37,mats.oak,.012);knob(g,x,h-.20,d/2+.05);}
    for(const y of [.17,h-.1])box(g,w+.03,.028,d+.015,mats.walnut,0,y,0,.007);
    vase(g,-w*.27,h+.021,0,.27,true);book(g,w*.22,h+.052,.0,.23,.033,.18);book(g,w*.22,h+.083,.01,.2,.03,.16,ink,-.09);
  }
  function bedside(g) {
    if(contemporary) return collection.helpers.bedside(g);
    for(const x of [-.20,.20])for(const z of [-.16,.16])turnedLeg(g,x,z,.20);
    box(g,.47,.36,.39,mats.walnut,0,.37,0,.02);box(g,.5,.035,.42,mats.marble,0,.568,0,.015);
    for(const y of [.29,.45]){box(g,.425,.135,.017,mats.walnut,0,y,.204,.006);frame(g,0,y,.218,.35,.09,mats.oak,.008);pull(g,0,y,.235,.08);}
    lamp(g,0,.586,-.01,.43);book(g,.1,.596,.1,.12,.018,.15,ink);
  }
  function bed(g,w=1.8,d=2.05,color=ivory) {
    if(contemporary) return collection.helpers.bed(g,w,d,color);
    for(const x of [-w/2+.12,w/2-.12])for(const z of [-d/2+.1,d/2-.1])turnedLeg(g,x,z,.22);
    box(g,w+.04,.20,d+.08,mats.walnut,0,.28,0,.065);
    box(g,w,.21,d,ivory,0,.45,0,.075);box(g,w-.02,.055,d-.02,color,0,.565,.02,.04);
    // The curved timber crest is continuous, with a padded headboard inside its profile.
    box(g,w+.10,.93,.10,mats.walnut,0,.76,-d/2-.065,.08);
    box(g,w-.015,.83,.09,color,0,.78,-d/2-.001,.08);
    tube(g,[[-w/2+.03,.55,-d/2-.057],[-w/2+.03,1.1,-d/2-.057],[-w*.34,1.28,-d/2-.057],[0,1.39,-d/2-.057],[w*.34,1.28,-d/2-.057],[w/2-.03,1.1,-d/2-.057],[w/2-.03,.55,-d/2-.057]],.035,mats.walnut);
    sphere(g,color,[0,1.09,-d/2-.015],[w*.43,.245,.046]);
    tube(g,[[-w*.40,1.12,-d/2+.035],[0,1.30,-d/2+.035],[w*.40,1.12,-d/2+.035]],.007,mats.brass);
    for(const x of [-w*.25,w*.25]) {
      cushion(g,x,.68,-d*.33,w*.43,.19,.42,ivory,.12);
      cushion(g,x,.79,-d*.37,w*.40,.16,.39,color,.16);
      cushion(g,x,.91,-d*.37,w*.28,.30,.11,linen,-.08,x<0?-.07:.07);
    }
    for(const x of [-w*.34,0,w*.34])for(const y of [.90,1.07])sphere(g,mats.brass,[x,y,-d/2+.055],[.009,.009,.006]);
    box(g,w+.025,.07,d*.54,color,0,.616,d*.23,.055);
    box(g,w+.04,.026,.43,moss,0,.666,d*.28,.025);
    for(const side of [-1,1])box(g,.025,.19,.43,moss,side*(w/2+.01),.563,d*.28,.012);
    for(let i=0;i<7;i++) tube(g,[[-w*.48,.656,d*.02+i*.105],[-w*.22,.657,d*.012+i*.105],[w*.16,.656,d*.026+i*.105],[w*.48,.656,d*.02+i*.105]],.0022,color);
  }
  function wardrobe(g,w=1.8,h=2.36,d=.58,doorType='hinged') {
    if(doorType==='sliding') {
      // Side/back panels make the opening usable; a solid carcass would still seal it shut.
      for(const x of [-w/2+.009,w/2-.009])box(g,.018,h-.11,d,mats.walnut,x,h/2+.055,0,.003);
      box(g,w-.036,h-.11,.018,mats.walnut,0,h/2+.055,-d/2+.009,.003);
      for(const y of [.15,h-.025])box(g,w-.036,.018,d-.036,mats.walnut,0,y,0,.003);
      box(g,.018,h-.18,d-.065,mats.walnut,0,h/2+.04,-.025,.003);
      box(g,w-.036,.018,d-.07,mats.walnut,0,1.97,-.020,.003);
      for(const side of [-1,1])bar(g,[side*.055,1.80,0],[side*(w/2-.055),1.80,0],.012,mats.brass);
    } else box(g,w,h-.11,d,mats.walnut,0,h/2+.055,0,.012);
    box(g,w+.08,.09,d+.07,mats.walnut,0,h,0,.012);box(g,w+.11,.035,d+.10,contemporary?mats.walnut:mats.oak,0,h+.046,0,.006);
    box(g,w+.04,.14,d+.01,mats.walnut,0,.07,0,.006);
    if(doorType==='sliding') {
      const opening=w-.034,overlap=.040,leafWidth=(opening+overlap)/2,offset=(opening-leafWidth)/2;
      // Two independent guide channels and recessed handles stay inside the former 721 mm envelope.
      for(const y of [.153,h-.071]) {
        box(g,w+.05,.020,.078,mats.brass,0,y,d/2+.052,.003);
        for(const z of [d/2+.014,d/2+.055])box(g,opening,.006,.008,ink,0,y+.012,z,.002);
      }
      for(let i=0;i<2;i++) {
        const leaf=new THREE.Group();leaf.name=i===0?'衣柜推拉门 · 后轨':'衣柜推拉门 · 前轨';
        leaf.position.set(i===0?-offset:offset,0,d/2+(i===0?.014:.055));
        leaf.userData.itemId=g.userData.itemId;
        leaf.userData.slideRange=[-offset,offset];leaf.userData.closedX=leaf.position.x;g.add(leaf);
        box(leaf,leafWidth,2.10,.020,mats.walnut,0,1.225,0,.005);
        if(!contemporary){frame(leaf,0,1.58,.013,leafWidth-.10,1.15,mats.oak,.006);
        frame(leaf,0,.50,.013,leafWidth-.10,.45,mats.oak,.006);}
        const handleX=(i===0?1:-1)*(leafWidth/2-.060);
        box(leaf,.028,.17,.004,mats.brass,handleX,1.02,.012,.004);
        box(leaf,.012,.12,.003,ink,handleX,1.02,.015,.003);
        for(const x of [-leafWidth/2+.075,leafWidth/2-.075])sphere(leaf,bronze,[x,.173,0],[.012,.012,.007]);
        mergeItem(leaf);
        leaf.traverse(mesh=>{if(mesh.isMesh)mesh.userData.movablePart=true;});
      }
      g.userData.doorType='sliding';
    } else { const n=w>1.7?3:2;for(let i=0;i<n;i++) {
      const x=-w/2+w/n*(i+.5),dw=w/n-.018;
      box(g,dw,h-.22,.025,mats.walnut,x,h/2+.025,d/2+.018,.005);
      if(!contemporary){frame(g,x,h*.65,d/2+.043,dw-.10,h*.56,mats.oak,.018); frame(g,x,h*.205,d/2+.043,dw-.10,h*.19,mats.oak,.018);}
      const hx=x+dw*.32;bar(g,[hx,.91,d/2+.071],[hx,1.07,d/2+.071],.008,mats.brass);knob(g,hx,.99,d/2+.074);
    }}
    for(const x of [-w/2-.013,w/2+.013]){box(g,.06,h-.10,d+.05,mats.walnut,x,h/2+.02,0,.008);if(!contemporary)for(let k=-1;k<=1;k++)box(g,.006,h-.25,.008,mats.oak,x+k*.014,h/2+.02,d/2+.039,.002);}
  }
  function desk(g,w=1.12,d=.52) {
    if(contemporary) return collection.helpers.desk(g,w,d);
    for(const x of [-w/2+.07,w/2-.07])for(const z of [-d/2+.055,d/2-.055])turnedLeg(g,x,z,.70);
    box(g,w+.035,.045,d+.025,mats.walnut,0,.751,0,.02);
    // A single side drawer leaves a 684 mm high central knee opening.
    for(const z of [-d/2+.035,d/2-.035])box(g,w-.075,.045,.045,mats.walnut,0,.706,z,.007);
    const drawerX=w/2-.19;
    box(g,.26,.13,d-.03,mats.walnut,drawerX,.665,0,.01);
    frame(g,drawerX,.665,d/2+.006,.22,.087,mats.oak,.009);pull(g,drawerX,.665,d/2+.028,.06);
    book(g,-.19,.79,.07,.21,.023,.29,ink,.08);book(g,-.18,.813,.07,.18,.022,.25,red,-.06);
    lamp(g,w/2-.19,.776,-.08,.40);
    box(g,.22,.008,.15,pages,.02,.78,.07,.001,-.05);bar(g,[.06,.79,.02],[.13,.79,.13],.003,mats.brass);
  }
  function art(g,w=.75,h=.95) {
    if(contemporary) return collection.helpers.art(g,w,h);
    box(g,w,.0+ h,.023,mats.dark,0,0,0,.001);box(g,w-.07,h-.07,.009,linen,0,0,.018,.001);
    frame(g,0,0,.03,w-.025,h-.025,mats.brass,.03);frame(g,0,0,.039,w-.09,h-.09,mats.walnut,.012);
    // A small still life, built as relief so it remains sharp at every zoom level.
    sphere(g,moss,[0,-h*.24,.03],[w*.4,h*.1,.008]); sphere(g,bronze,[0,-h*.08,.04],[w*.13,h*.20,.008]);
    for(let i=0;i<6;i++){const x=Math.cos(i*2.4)*w*.17,y=h*.09+Math.sin(i*2.4)*h*.17;bar(g,[0,-h*.04,.044],[x,y,.044],.004,plantDark);sphere(g,i%2?ivory:red,[x,y,.048],[w*.06,h*.045,.009]);}
  }
  function plant(g,height=1.2) {
    const ps=height*.43;
    lathe(g,[[.21,0],[.25,.05],[.29,.47],[.285,.53],[.30,.55]],mats.ceramic,0,0,0,ps);
    cyl(g,.267*ps,.267*ps,.01,soil,0,.535*ps,0,24);
    for(let i=0;i<7;i++){
      const a=i*2.399,stemH=height*(.74+.07*(i%4));
      const end=[Math.cos(a)*height*.19,stemH,Math.sin(a)*height*.19];tube(g,[[0,ps*.4,0],[Math.cos(a)*.04,stemH*.72,Math.sin(a)*.04],end],height*.006,plantDark);
      for(let j=0;j<4;j++){
        const t=.50+j*.16,cx=end[0]*t,cy=stemH*t,cz=end[2]*t,aa=a+(j%2?-.8:.8),length=height*(.16-j*.012);
        const geo=new THREE.BufferGeometry(),v=[],uv=[];
        for(let k=0;k<=6;k++)for(const side of [-1,1]){const f=k/6,ww=Math.sin(f*Math.PI)*length*.23;v.push(cx+Math.cos(aa)*length*f+Math.sin(aa)*ww*side,cy+length*f*.45-Math.pow(f,2)*length*.33,cz+Math.sin(aa)*length*f-Math.cos(aa)*ww*side);uv.push(f,(side+1)/2);}
        const ix=[];for(let k=0;k<6;k++){const q=k*2;ix.push(q,q+1,q+2,q+1,q+3,q+2);}geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();
        mesh(g,geo,i%2?plantLight:plantDark);
      }
    }
  }
  function cabinet(g,x,w=.6,upper=false,front=true) {
    const h=upper?.68:.79, y=upper?1.77:.46,d=upper?.33:.57, t=.018;
    // Cabinet carcasses are panels, so sinks and appliances have an actual cavity.
    for(const side of [-1,1])box(g,t,h,d,mats.cream,x+side*(w-.008-t)/2,y,0,.003);
    box(g,w-.044,t,d,mats.cream,x,y-h/2+t/2,0,.003);
    box(g,w-.044,h-.036,.014,mats.cream,x,y,-d/2+.007,.002);
    if(upper)box(g,w-.044,t,d,mats.cream,x,y+h/2-t/2,0,.003);
    else for(const z of [-d/2+.035,d/2-.035])box(g,w-.044,.026,.07,mats.cream,x,y+h/2-.013,z,.003);
    if(front){
      box(g,w-.035,h-.05,.024,mats.cream,x,y,d/2+.016,.005);
      if(!contemporary)frame(g,x,y,d/2+.035,w-.12,h-.14,mats.trim,.020);
      if(upper)knob(g,x+w*.32,y-h*.30,d/2+.073);else pull(g,x,y+h*.32,d/2+.073,.11);
    }
    if(!upper)box(g,w-.02,.095,.48,mats.walnut,x,.047,0,.006);
  }
  function kitchenRun(g,w=2.35,sink=true) {
    if(sink){
      // The west end is a blind corner connected to the sink cabinet. It has no
      // opening door or partition through the bowl; three doors start past the return.
      cabinet(g,0,w,false,false);
      const blind=.60, faceW=(w-blind)/3;
      box(g,blind-.012,.74,.024,mats.cream,-w/2+blind/2,.46,.301,.005);
      for(let i=0;i<3;i++){
        const x=-w/2+blind+faceW*(i+.5);
        box(g,faceW-.025,.74,.024,mats.cream,x,.46,.301,.005);
        if(!contemporary)frame(g,x,.46,.32,faceW-.10,.65,mats.trim,.020);pull(g,x,.713,.358,.11);
        if(i>0)box(g,.018,.754,.54,mats.cream,x-faceW/2,.46,-.008,.002);
      }
      const sinkX=-w*.22,sw=.57;
      box(g,w/2+sinkX-sw/2,.044,.65,mats.marble,-w/4+sinkX/2-sw/4,.882,0,.008);
      box(g,w/2-sinkX-sw/2,.044,.65,mats.marble,w/4+sinkX/2+sw/4,.882,0,.008);
      for(const z of [-.255,.255])box(g,sw,.044,.14,mats.marble,sinkX,.882,z,.008);
      // A wall-side filler completes the blind corner without moving the sink or drain.
      box(g,.17,.044,.65,mats.marble,-w/2-.085,.882,0,.008);
      box(g,.53,.018,.34,mats.metal,sinkX,.739,0,.055);
      for(const x of [sinkX-.27,sinkX+.27])box(g,.018,.15,.38,mats.metal,x,.813,0,.006);
      for(const z of [-.19,.19])box(g,.55,.15,.018,mats.metal,sinkX,.813,z,.006);
      cyl(g,.033,.033,.009,mats.dark,sinkX,.75,0,20);
      tube(g,[[sinkX,.90,-.23],[sinkX,1.18,-.23],[sinkX,1.22,-.16],[sinkX,1.12,-.09]],.016,mats.brass);
      for(const x of [sinkX-.12,sinkX+.12]){cyl(g,.02,.025,.07,mats.brass,x,.932,-.23);bar(g,[x-.032,.97,-.23],[x+.032,.97,-.23],.007,mats.brass);}
      box(g,.26,.026,.31,mats.oak,w*.31,.911,0,.045);tube(g,[[w*.31,.928,.17],[w*.31,.928,.23]],.025,mats.oak);
      vase(g,w*.40,.907,-.10,.14,true);
    } else {
      // A dedicated 600 mm appliance bay replaces the two cabinet doors behind the oven.
      const applianceW=.60, sideW=(w-applianceW)/2;
      for(const side of [-1,1])cabinet(g,side*(applianceW+sideW)/2,sideW);
      cabinet(g,0,applianceW,false,false);
      box(g,.56,.56,.51,ink,0,.48,-.015,.012);
      const cutW=.58,cutD=.46;
      for(const side of [-1,1]){
        box(g,(w+.015-cutW)/2,.044,.65,mats.marble,side*(w+.015+cutW)/4,.882,0,.008);
        box(g,cutW,.044,(.65-cutD)/2,mats.marble,0,.882,side*(.65+cutD)/4,.008);
      }
      // Meet the north worktop at z=3.575 m instead of leaving a 57.5 mm slot.
      box(g,.0575,.044,.65,mats.marble,(w+.015)/2+.02875,.882,0,.002);
      box(g,.0575,.754,.018,mats.cream,(w+.015)/2+.02875,.46,.276,.002);
      box(g,.61,.035,.49,ink,0,.918,0,.018);
      for(const x of [-.16,.16])for(const z of [-.135,.135]){
        cyl(g,.084,.084,.018,mats.dark,x,.936,z,22);mesh(g,new THREE.TorusGeometry(.064,.008,6,20),mats.metal,[x,.95,z],[Math.PI/2,0,0]);
        for(const s of [-1,1]){bar(g,[x+s*.095,.965,z-.08],[x+s*.095,.965,z+.08],.007,mats.dark);}
      }
      box(g,.53,.44,.026,ink,0,.48,.319,.015);box(g,.42,.31,.015,mirror,0,.47,.337,.012);pull(g,0,.65,.358,.36);
      for(const x of [-.16,-.05,.06,.17])knob(g,x,.753,.338,mats.metal);
      if(contemporary){box(g,.68,.09,.43,mats.metal,0,1.68,-.065,.006);box(g,.28,.725,.26,mats.metal,0,2.088,-.14,.006);}
      else {box(g,.68,.12,.46,mats.cream,0,1.67,-.065,.02);box(g,.51,.35,.30,mats.cream,0,1.895,-.12,.03);box(g,.28,.42,.26,mats.cream,0,2.24,-.14,.025);}
      box(g,.68,.025,.46,mats.brass,0,1.61,-.065,.006);
      cyl(g,.12,.09,.16,mats.metal,.15,1.046,.10,28);cyl(g,.127,.13,.02,mats.brass,.15,1.135,.10,28);knob(g,.15,1.16,.10);
      bar(g,[.26,1.07,.10],[.39,1.07,.10],.018,mats.walnut);
      for(const x of [-w*.37,w*.37])cabinet(g,x,.40,true);
    }
    box(g,w,.45,.019,mats.stone,0,1.13,-.30,.0);
    // Front/back rails replace the former full-depth board that sealed the basin.
    for(const z of [-.30,.30])box(g,w+.03,.045,.07,mats.trim,0,.828,z,.01);
  }
  function fridge(g) {
    for(const x of [-.25,.25])for(const z of [-.24,.24])cyl(g,.025,.028,.06,mats.dark,x,.03,z,12);
    box(g,.68,1.91,.66,mats.cream,0,.99,0,.06);
    for(const v of [[.39,.58],[1.27,1.10]]){box(g,.65,v[1],.043,mats.cream,0,v[0],.351,.024);if(!contemporary)frame(g,0,v[0],.378,.55,v[1]-.10,mats.trim,.017);}
    for(const y of [.40,1.08])bar(g,[-.24,y-.11,.409],[-.24,y+.11,.409],.012,mats.brass);
    box(g,.63,.10,.02,mats.dark,0,.10,.334,.01);
  }
  function bathroomVanity(g,w=.84) {
    for(const x of [-w/2+.08,w/2-.08])for(const z of [-.19,.19])turnedLeg(g,x,z,.22);
    box(g,w,.57,.48,mats.walnut,0,.48,0,.02);
    for(const x of [-w*.24,w*.24]){if(!contemporary)frame(g,x,.49,.255,w*.42,.44,mats.oak,.02);else box(g,w*.48-.01,.52,.016,mats.walnut,x,.48,.249,.003);knob(g,x,.66,.283);}
    box(g,w+.055,.04,.53,mats.marble,0,.79,0,.016);
    // Washbasin is a lathed, open ceramic bowl with an actual visible interior.
    lathe(g,[[.14,0],[.20,.02],[.23,.09],[.235,.115],[.224,.117],[.21,.085],[.185,.025],[.04,.013],[.035,.006]],mats.ceramic,0,.81,.05);
    cyl(g,.025,.025,.003,mats.brass,0,.827,.05,16);
    tube(g,[[0,.82,-.205],[0,1.07,-.205],[0,1.10,-.13],[0,1.02,-.055]],.012,mats.brass);
    for(const x of [-.14,.14]){cyl(g,.019,.022,.044,mats.brass,x,.83,-.195);bar(g,[x-.025,.86,-.195],[x+.025,.86,-.195],.006,mats.brass);}
    const width=w*.80,height=.77;
    box(g,width,height,.02,mirror,0,1.62,-.248,.06);
    frame(g,0,1.60,-.224,width+.025,height+.028,mats.brass,.035);
    if(!contemporary)tube(g,[[-width/2,1.89,-.219],[-width*.37,2.035,-.219],[0,2.10,-.219],[width*.37,2.035,-.219],[width/2,1.89,-.219]],.02,mats.brass);
    for(const x of [-w*.56,w*.56]){if(contemporary){box(g,.025,.35,.025,mats.brass,x,1.76,-.21,.004);box(g,.022,.30,.018,mats.light,x,1.76,-.185,.004);}else{bar(g,[x,1.72,-.21],[x,1.72,-.08],.012,mats.brass);sphere(g,mats.light,[x,1.80,-.08],[.055,.09,.055]);cyl(g,.05,.035,.023,mats.brass,x,1.72,-.08);}}
    vase(g,-w*.35,.813,.14,.11,true);
    box(g,.12,.025,.19,ivory,w*.34,.83,.05,.015);box(g,.12,.022,.19,linen,w*.34,.853,.05,.013);
    // Separate the projecting basin/cabinet from the wider mirror lights.
    // One enclosing box would invent a solid corner in the bathroom approach.
    g.userData.walkBoxes=g.children.filter(o=>o.isMesh).map(o=>{
      o.updateMatrix();o.geometry.computeBoundingBox();
      const bounds=o.geometry.boundingBox.clone().applyMatrix4(o.matrix);
      return {min:bounds.min.toArray(),max:bounds.max.toArray()};
    });
  }
  function toilet(g) {
    lathe(g,[[.15,0],[.16,.04],[.13,.14],[.16,.30],[.21,.34]],mats.ceramic,0,0,.02);
    sphere(g,mats.ceramic,[0,.35,.065],[.205,.15,.285]);
    mesh(g,new THREE.TorusGeometry(.17,.037,10,32),mats.ceramic,[0,.447,.089],[Math.PI/2,0,0],[1,1.3,1]);
    sphere(g,mats.dark,[0,.449,.088],[.135,.006,.20]);sphere(g,mats.ceramic,[0,.45,.02],[.155,.018,.15]);
    box(g,.35,.41,.16,mats.ceramic,0,.48,-.23,.055);box(g,.375,.034,.18,mats.ceramic,0,.707,-.23,.021);cyl(g,.025,.025,.004,mats.brass,.08,.726,-.23,16);
  }
  function shower(g,w=.84,d=1.47,openingSide=1,wallOffset=.035) {
    box(g,w,.05,d,mats.stone,0,.035,0,.008);
    const barriers=[box(g,.012,1.98,d,mats.glass,-w/2,1.035,0,.0)];
    for(const z of [-d/2,d/2])bar(g,[-w/2,.065,z],[-w/2,2.04,z],.010,mats.brass);
    bar(g,[-w/2,2.04,-d/2],[-w/2,2.04,d/2],.010,mats.brass);
    box(g,w,.015,.018,mats.brass,0,.075,d/2,.003);
    // Two equal leaves on parallel tracks. The moving leaf is shown fully open,
    // stacked over the fixed leaf, leaving a real half-width entrance beside it.
    const panelW=w/2, parkedX=-openingSide*w/4;
    for(const z of [d/2,d/2+.025])barriers.push(box(g,panelW-.012,1.97,.010,mats.glass,parkedX,1.035,z,.0));
    g.userData.walkBoxes=barriers.map(panel=>{const bounds=new THREE.Box3().setFromObject(panel);return {min:bounds.min.toArray(),max:bounds.max.toArray()};});
    const handleX=parkedX+openingSide*(panelW/2-.055);
    bar(g,[handleX,.89,d/2+.050],[handleX,1.10,d/2+.050],.009,mats.brass);
    for(const z of [d/2+.004,d/2+.029])bar(g,[-w/2,2.04,z],[w/2,2.04,z],.009,mats.brass);
    for(const x of [parkedX-panelW/2+.05,parkedX+panelW/2-.05])sphere(g,mats.brass,[x,2.04,d/2+.037],[.019,.019,.012]);
    // Mount the shower on the solid south wall, leaving the east window clear.
    const fixture=new THREE.Group();fixture.position.set(w/2+wallOffset,0,0);fixture.rotation.y=-Math.PI/2;g.add(fixture);
    const back=0;
    tube(fixture,[[0,.88,back],[0,2.08,back],[0,2.12,back+.21]],.012,mats.brass);
    cyl(fixture,.105,.105,.022,mats.brass,0,2.097,back+.21,28);
    for(const yy of [.98,1.90]){bar(fixture,[0,yy,-.04],[0,yy,0],.014,mats.brass);box(fixture,.065,.065,.012,mats.brass,0,yy,-.034,.005);}
    for(const x of [-.12,.12])knob(fixture,x,.95,back+.045);bar(fixture,[-.15,.95,back+.026],[.15,.95,back+.026],.023,mats.brass);
    tube(fixture,[[.14,1.37,back+.05],[.21,1.0,back+.11],[.16,.68,back+.15],[.10,.99,back+.09]],.006,bronze);
    bar(fixture,[.14,1.29,back+.05],[.14,1.44,back+.12],.020,mats.brass);
    box(fixture,.35,.009,.055,mats.metal,0,.066,back+.18,.005);for(let i=-4;i<=4;i++)box(fixture,.018,.003,.041,mats.dark,i*.036,.072,back+.18,.001);
    box(fixture,.14,.10,.07,mats.stone,-.25,1.07,back+.04,.009);cyl(fixture,.022,.021,.13,mats.cream,-.25,1.18,back+.04,16);
    fixture.updateMatrix();
    for(const o of fixture.children){
      o.updateMatrix();o.geometry.computeBoundingBox();
      const bounds=o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(fixture.matrix,o.matrix));
      g.userData.walkBoxes.push({min:bounds.min.toArray(),max:bounds.max.toArray()});
    }

  }
  function towelRail(g) {
    for(const x of [-.24,.24])bar(g,[x,.0,0],[x,1.25,0],.01,mats.brass);
    for(let i=0;i<8;i++)bar(g,[-.24,.12+i*.14,0],[.24,.12+i*.14,0],.008,mats.brass);
    box(g,.32,.40,.018,ivory,-.045,.66,.025,.012);box(g,.32,.018,.065,ivory,-.045,.86,.012,.005);
  }
  function daybed(g) {
    if(contemporary) return collection.helpers.daybed(g);
    box(g,1.22,.31,2.12,mats.walnut,0,.17,0,.025);
    // The northern storage bay lifts from above; an east-opening drawer would hit the desk leg.
    box(g,1.13,.012,.57,mats.walnut,0,.329,-.69,.005);
    for(const z of [-.69,0,.69])box(g,1.19,.16,.67,linen,0,.40,z,.045);box(g,1.17,.03,1.40,ivory,0,.496,.28,.025);
    for(const z of [-1.06,1.06]) {box(g,1.24,.32,.07,mats.walnut,0,.52,z,.03);tube(g,[[-.59,.65,z],[0,.79,z],[.59,.65,z]],.025,mats.walnut);}
    cushion(g,0,.58,-.73,1.03,.18,.37,ivory,.08);cushion(g,0,.75,-.91,.70,.33,.1,moss,-.10);
    box(g,1.20,.045,.48,moss,0,.529,.53,.016);for(const x of [-.61,.61])box(g,.014,.24,.48,moss,x,.423,.53,.006);
    for(const z of [.1,.75]){
      box(g,.017,.18,.58,mats.walnut,.618,.20,z,.006);
      const face=new THREE.Group();face.position.set(.630,.20,z);face.rotation.y=Math.PI/2;g.add(face);
      frame(face,0,0,0,.54,.15,mats.oak,.008);pull(face,0,.03,.020,.10);
    }
  }
  function bookshelf(g,w=1.1,h=2.33) {
    if(contemporary) return collection.helpers.bookshelf(g,w,h);
    box(g,w,h,.31,mats.walnut,0,h/2,0,.009);
    box(g,w-.10,h-.12,.025,ink,0,h/2,.167,.002);
    for(const y of [.10,.47,.91,1.35,1.79,2.23])box(g,w,.04,.38,mats.walnut,0,y,.025,.005);
    for(const x of [-w/2,w/2])box(g,.065,h,.39,mats.walnut,x,h/2,.025,.008);
    box(g,w+.11,.07,.43,mats.walnut,0,h+.01,.025,.008);
    for(let row=0;row<5;row++)for(let i=0;i<9;i++) {
      const h=.19+((i*3+row*7)%6)*.023, x=-w*.39+i*w*.095;
      const mat=[red,moss,ink,linen,mats.walnut][(i+row*2)%5];
      box(g,.038+(i%3)*.009,h,.19,mat,x,.14+row*.434+h/2,.065,.003);
      for(const y of [.19+row*.434,.12+row*.434+h-.027])box(g,.041,.008,.005,mats.brass,x,y,.164,.001);
    }
  }
  function fireplace(g) {
    if(contemporary) return collection.helpers.fireplace(g);
    box(g,1.5,.075,.48,mats.stone,0,.04,0,.015);
    box(g,1.35,1.10,.23,mats.cream,0,.63,-.08,.015);
    box(g,.88,.74,.035,ink,0,.475,.051,.025);
    for(const x of [-.56,.56]){box(g,.18,.90,.31,mats.stone,x,.57,0,.014);box(g,.23,.07,.34,mats.trim,x,.99,0,.007);for(const dx of [-.045,0,.045])box(g,.011,.72,.012,mats.trim,x+dx,.56,.164,.004);}
    box(g,1.48,.09,.40,mats.marble,0,1.155,-.015,.015);
    box(g,1.35,.058,.34,mats.trim,0,1.08,-.006,.01);
    for(const x of [-.24,0,.24]){cyl(g,.035,.035,.18,ivory,x,.20,.115,16);sphere(g,mats.light,[x,.308,.115],[.012,.023,.012]);}
    for(const x of [-.38,-.19,0,.19,.38])bar(g,[x,.10,.19],[x,.38,.19],.008,bronze);
    for(const y of [.12,.37])bar(g,[-.40,y,.19],[.4,y,.19],.010,bronze);
    vase(g,-.52,1.2,-.02,.18,true);
    for(const x of [.41,.58]){lathe(g,[[.04,0],[.02,.04],[.012,.12],[.03,.15]],mats.brass,x,1.20,0);cyl(g,.018,.018,.15,ivory,x,1.42,0,14);}
    // A dark framed art display keeps the living room free of a dominating television rectangle.
    const a=new THREE.Group();a.position.set(0,1.79,-.065);g.add(a);art(a,.82,.90);
  }
  function wallSconce(g) {
    if(contemporary) return collection.helpers.wallSconce(g);
    box(g,.10,.26,.025,mats.brass,0,0,0,.028);tube(g,[[0,-.07,.03],[0,-.1,.13],[0,.06,.17]],.012,mats.brass);
    cyl(g,.066,.046,.038,mats.brass,0,.08,.17,24);mesh(g,new THREE.CylinderGeometry(.07,.11,.16,24,1,true),ivory,[0,.18,.17]);sphere(g,mats.light,[0,.16,.17],[.033,.04,.033]);
  }
  const add=(id,name,room,dim,material,note,p,r,fn)=>item(id,name,room,dim,material,note,p,r,fn);
  add('living-rug','勃艮第边饰羊毛地毯','living','2.40 × 3.70 m','羊毛短绒 · 暗红包边','地毯边沿退让阳台门；沙发前脚压在毯上。',[2.18,0,12.00],0,g=>rug(g,2.4,3.70));
  add('living-sofa','Louis XV 曲线三人沙发','living','2.46 × 0.89 × 0.91 m','实木胡桃木框 · 酒红织物 · 铜饰','定制实木承重框架，未压缩座面高480mm；茶几距座垫前沿约350mm，主要通行安排在茶几西侧。',[3.60,0,12.03],-Math.PI/2,g=>sofa(g));
  add('living-coffee','椭圆大理石茶几','living','1.16 × 0.62 × 0.42 m','暖白大理石 · 胡桃木 · 黄铜','约30mm石材台面加底部承托；距座垫前沿约350mm，取放茶杯不再隔着整条通道。',[2.55,0,12.01],Math.PI/2,g=>{
    const o=cyl(g,.5,.5,.032,mats.marble,0,.401,0,64);o.scale.set(1.16,1,.62);
    const b=cyl(g,.46,.46,.045,mats.walnut,0,.368,0,48);b.scale.set(1.16,1,.62);
    for(const x of [-.39,.39])for(const z of [-.18,.18])turnedLeg(g,x,z,.35);
    book(g,-.19,.443,.04,.23,.04,.18,ink,.06);book(g,-.19,.475,.04,.20,.022,.16,red,-.04);vase(g,.21,.42,-.02,.14,true);
    cyl(g,.072,.078,.014,mats.brass,.03,.429,.15,24);cyl(g,.035,.035,.045,mats.ceramic,.03,.458,.15,20);
  });
  add('living-chair','藤编木框 Bergère 扶手椅','living','0.78 × 0.66 × 1.11 m','胡桃木 · 手工藤编 · 米色棉麻','实际未压缩座面高470mm；含弧形扶手总宽约773mm，按成品外包尺寸留位。',[1.04,0,13.51],Math.PI*.83,g=>caneChair(g,1.09));
  add('living-fireplace','法式装饰壁炉与静物画','living','1.50 × 0.48 × 2.25 m','石材壁炉套 · 奶油木作 · 黄铜画框','设计为无明火装饰壁炉；如需电视，可在上方艺术框位置配置壁挂屏。',[.39,0,11.96],Math.PI/2,fireplace);
  add('living-side-table','车木圆边几与台灯','living','Ø 0.44 × 0.58 m；含台灯高1.05m','胡桃木 · 黄铜 · 亚麻灯罩','布置于沙发北端，台灯插座在离地 300 mm 处预留。',[3.60,0,10.46],0,g=>{
    lathe(g,[[.17,0],[.19,.025],[.08,.065],[.045,.20],[.065,.35],[.045,.47],[.15,.53]],mats.walnut);cyl(g,.22,.22,.035,mats.walnut,0,.56,0);lamp(g,0,.58,0,.48);
  });
  add('living-plant','琴叶榕与陶盆','living','约 Ø 0.58 × 1.55 m','陶盆 · 室内绿植','靠阳台散射光处，盆底设置接水盘。',[3.76,0,13.98],0,g=>plant(g,1.55));
  add('dining-table','胡桃木六人圆餐桌','living','Ø 1.22 × 0.77 m','胡桃木拼板 · 黄铜嵌线','可布置六席，日常四人更从容；六人使用时西侧椅后约440mm，拉椅后不能同时通行或开餐边柜，取餐具宜在落座前完成。主要通行走东侧约860mm步道。',[2.25,0,8.65],0,roundTable);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,dist=.86;
    add(`dining-chair-${i+1}`,`路易十六餐椅 ${i+1}`,'living','0.50 × 0.48 × 1.08 m','胡桃木 · 苔绿软包','未压缩座面高460mm；座面至桌裙下沿净距约204mm，餐盘与各座位一一对齐。',[2.25+Math.sin(a)*dist,0,8.65+Math.cos(a)*dist],a+Math.PI,diningChair);
  }
  add('dining-sideboard','三门古典餐边柜','living','1.55 × 0.51 × 0.87 m（含台面和五金）','胡桃木框门 · 大理石 · 黄铜','餐具与茶器收纳；固定防倾倒角码，台面下方预留小家电插座。',[.46,0,8.68],Math.PI/2,g=>sideboard(g));
  add('entry-cabinet','入户薄款鞋柜','living','1.38 × 0.39 × 0.94 m；圆镜直径0.67m','奶油框门 · 胡桃木台面','鞋柜紧靠厨房南墙；柜体深310mm，含台面及五金约390mm，保留入户门及厨房通道。',[.95,0,6.03],0,g=>{
    box(g,1.34,.84,.31,mats.cream,0,.47,0,.014);box(g,1.38,.035,.34,mats.walnut,0,.914,0,.013);
    for(const x of [-.335,.335]){frame(g,x,.49,.169,.56,.69,mats.trim,.022);knob(g,x,.74,.20);}
    vase(g,-.42,.94,0,.19,true);cyl(g,.1,.085,.025,mats.brass,.33,.945,0,28);
    mesh(g,new THREE.CircleGeometry(.32,48),mirror,[0,1.55,-.06]);mesh(g,new THREE.TorusGeometry(.335,.019,8,48),mats.brass,[0,1.55,-.045]);
  });
  add('dining-art','餐区花卉静物画','living','0.75 × 0.95 m','黄铜复古画框 · 浮雕静物','画心中心离地 1650 mm，可替换为同尺寸油画。',[.235,1.70,8.70],Math.PI/2,g=>art(g));
  // Sleeping rooms retain the plan's three bedrooms and the separate study/daybed.
  add('master-rug','主卧羊毛地毯','master','2.45 × 2.55 m','燕麦色羊毛 · 暗红包边','床侧露出约 300 mm 以上，避免床边踩空落差。',[6.44,0,12.20],0,g=>rug(g,2.45,2.55));
  add('master-bed','主卧弧冠软包双人床','master','1.90 × 2.21 × 1.42 m；床垫 1.80 × 2.05 m','胡桃木 · 米色棉麻 · 苔绿床尾巾','床头靠主卫南侧实墙，建议墙内补充隔音棉；床尾至阳台门约 1.4 m。',[6.43,0,11.95],0,g=>bed(g,1.8,2.05,ivory));
  for(const [side,x] of [['left',5.22],['right',7.64]]) add(`master-nightstand-${side}`,'主卧抽屉床头柜与台灯','master','0.50 × 0.46 × 1.02 m（含灯和五金）','胡桃木 · 大理石 · 亚麻灯罩','床头双控与 USB 插座宜预留于离地 650–750 mm。',[x,0,11.15],0,bedside);
  add('master-wardrobe','主卧 0.90m 双门成品衣柜','master','0.90 × 0.72 × 2.42 m（含顶线和五金）','胡桃木饰面 · 实木线脚 · 黄铜长把手','仅保留一组0.90m成品衣柜，设于南侧滑门右侧实墙段；柜前至床尾约704mm，集中挂衣收纳放在次卧1。柜体基准深580mm。',[7.37,0,14.10],Math.PI,g=>{g.scale.x=.90/1.01;wardrobe(g,.90);});
  add('master-art','主卧床头静物画','master','0.64 × 0.73 m','古铜画框 · 织物底色','画框中心离地约 1.93 m，床头柜灯具分区控制。',[6.43,1.96,10.80],0,g=>art(g,.64,.73));
  add('guest-rug','次卧 2 复古地毯','bedroom2','2.05 × 2.15 m','羊毛混纺 · 勃艮第边饰','低绒面方便吸尘和床下清洁。',[6.24,0,6.84],0,g=>rug(g,2.05,2.15));
  add('guest-bed','次卧 2 胡桃木双人床','bedroom2','1.60 × 2.16 × 1.42 m；床垫 1.50 × 2.00 m','胡桃木 · 亚麻 · 灰绿床品','床头靠北墙；东侧保留通往窗边书桌的步行带。',[6.24,0,6.67],0,g=>bed(g,1.50,2.00,linen));
  add('guest-nightstand','次卧 2 床头柜','bedroom2','0.50 × 0.46 × 1.02 m（含灯和五金）','胡桃木 · 石材','柜顶高度 585 mm，与床垫面接近。',[7.33,0,5.85],0,bedside);
  add('guest-wardrobe','次卧 2 折叠衣物浅柜','bedroom2','1.49 × 0.40 × 2.42 m（含顶线；柜体宽1.38m）','胡桃木 · 黄铜','成品总深400mm，内部有效深约300mm，仅作折叠衣物和小件储物，不作挂衣柜。西侧顶线贴合墙内面，床侧净距约670mm；集中挂衣放次卧1。',[4.37+.34*(.40/.721),0,6.24],Math.PI/2,g=>{g.scale.z=.40/.721;wardrobe(g,1.38);});
  add('guest-desk','次卧 2 窗边书桌','bedroom2','1.29 × 0.54 × 0.77 m（含台面和五金）','胡桃木 · 黄铜 · 书写灯','朝窗使用；中央腿位净高约684mm，右侧单抽屉，座面与桌裙净距约224mm。桌后与窗框仅约51mm，窗扇开启须现场复核。',[8.38,0,7.03],-Math.PI/2,g=>desk(g,1.25,.49));
  add('guest-chair','次卧 2 窗边书椅','bedroom2','0.50 × 0.48 × 1.08 m','胡桃木 · 苔绿软包','坐姿朝东，座面高460mm；椅背至床侧约543mm，拉椅后步道会收窄，按单人书写使用。',[7.82,0,7.02],Math.PI/2,diningChair);
  add('guest-plant','次卧 2 窗边绿植','bedroom2','约 Ø 0.35 × 0.75 m','陶盆 · 绿植','避开窗扇和帘布。',[8.37,0,8.25],0,g=>plant(g,.75));
  add('second-rug','次卧 1 羊毛地毯','bedroom1','1.80 × 2.20 m','羊毛短绒','床侧地毯。',[6.73,0,1.53],Math.PI/2,g=>rug(g,1.80,2.2));
  add('second-bed','次卧 1 法式小双人床','bedroom1','1.45 × 2.16 × 1.42 m；床垫 1.35 × 2.00 m','胡桃木 · 灰绿棉麻','床头靠东侧实墙；南侧衣柜前净距约600mm，床头柜移至北侧避免挡住柜门。',[6.70,0,1.42],-Math.PI/2,g=>bed(g,1.35,2.0,moss));
  add('second-nightstand','次卧 1 窄款床头柜','bedroom1','0.42 × 0.46 × 1.02 m（含灯和五金）','胡桃木 · 石材','采用420mm窄款置于床北侧，避免南侧柜门开启受阻；灯具不遮挡北窗主要采光面。',[7.51,0,.47],-Math.PI/2,g=>{g.scale.x=.84;bedside(g);});
  add('second-wardrobe','次卧 1 双轨推拉衣柜','bedroom1','1.94 × 0.73 × 2.42 m（柜体宽1.83m、深0.58m）','胡桃木 · 双轨框门 · 内嵌拉手','两片约918mm宽门片分轨平移，每片行程878mm、单侧有效开口约850mm；启闭均不侵入约614mm床前步道。内部双挂衣区加顶层板；集中收纳容量仍须按衣物量核算。',[6.86,0,3.14],Math.PI,g=>wardrobe(g,1.83,2.36,.58,'sliding'));
  add('study-daybed','法式日间床 / 收纳榻榻米','study','1.28 × 2.19 × 0.82 m（含五金，不含活动靠垫）','胡桃木抽屉地台 · 亚麻床垫','睡眠净面约1.19×2.05m，分体床垫；北段移开枕垫后上翻取物，另两格向东抽屉行程不超过500mm，避免碰桌腿。',[2.43,0,1.47],0,daybed);
  add('study-desk','书房窗下复古书桌','study','1.16 × 0.57 × 0.77 m（含台面和五金）','胡桃木 · 黄铜','北窗下布置，桌面高774mm，右侧单抽屉；中央腿位净高684mm，配460mm座面形成约224mm膝上净空。',[3.85,0,.51],0,g=>desk(g,1.12,.52));
  add('study-chair','书房软包阅读椅','study','0.50 × 0.48 × 1.08 m','胡桃木 · 苔绿织物','使用位置朝窗，座面高460mm；椅位略向桌下收进，给日间床抽屉留出操作位置。',[3.85,0,1.06],Math.PI,diningChair);
  add('study-bookcase','书房古典书柜','study','1.19 × 0.43 × 2.38 m（柜体宽1.08m）','胡桃木 · 实木层板','东墙设置，层板净深约 300 mm；高柜必须用防倾倒连接件固定。',[4.37,0,2.20],-Math.PI/2,g=>bookshelf(g,1.08));
  add('study-art','书房静物画','study','0.61 × 0.73 m','古铜画框','墙面装饰安装于日间床西侧。',[1.82,1.70,1.34],Math.PI/2,g=>art(g,.61,.73));
  // Kitchen: north sink run beneath the existing window, west cooking run, east refrigerator.
  add('kitchen-sink','厨房洗切区与黄铜龙头','kitchen','主柜 2.32 m；含封板与摆件约 2.51 × 0.70 × 1.37 m','奶油框门 · 大理石台面 · 不锈钢水槽','北窗下水槽与排水示意点保持原位；台高904mm，西端采用与水槽连通的盲角柜，柜门从回转台面以东开启，槽下无贯穿隔板。结构承托及水电位置须复尺。',[1.52,0,3.25],0,g=>kitchenRun(g,2.32,true));
  add('kitchen-cooking','厨房烹饪区 / 嵌入式烤箱','kitchen','含转角与五金约 1.86 × 0.70 × 2.45 m','奶油框门 · 石材 · 黄铜 · 搪瓷','设置600mm独立烤箱柜位；转角台面连续衔接。西侧排烟、燃气及嵌入设备散热尺寸仅为方案假设，须按产品与现场核验。',[.50,0,4.53],Math.PI/2,g=>kitchenRun(g,1.78,false));
  add('kitchen-fridge','复古双门冰箱','kitchen','0.68 × 0.75 × 1.95 m（含把手）','奶油色烤漆 · 黄铜拉手','东墙中段布置，门内保留约840mm转身深度；示意为南侧铰接、向西开启，开启90度后仍有约610mm至西排把手，散热及取屉所需角度按所购型号复核。',[2.48,0,4.50],-Math.PI/2,fridge);
  add('kitchen-shelf','厨房实木开放搁板','kitchen','1.05 × 0.20 × 0.55 m','胡桃木 · 黄铜托架','安装于北墙右侧实墙处，杯具采用防滑垫。',[2.25,1.59,3.04],0,g=>{
    for(const y of [0,.37]){box(g,1.02,.028,.20,mats.walnut,0,y,0,.008);for(const x of [-.39,.39]){bar(g,[x,y-.17,-.09],[x,y,-.09],.008,mats.brass);bar(g,[x,y-.17,-.09],[x,y,.09],.008,mats.brass);}for(let i=0;i<4;i++)cyl(g,.048,.039,.11,mats.ceramic,-.32+i*.18,y+.067,.015,20);}
  });
  for(const [room,x,z,width,depth] of [['bathroom',7.46,4.48,1.43,.84],['ensuite',7.46,9.72,1.59,.84]]) {
    add(`${room}-shower`,'黄铜花洒与玻璃淋浴隔断',room,`${depth.toFixed(2)} × ${width.toFixed(2)} × 2.13 m`,'钢化玻璃 · 拉丝黄铜 · 防滑石材',`东侧湿区，花洒固定于南侧实墙、避开东窗；两等宽门片双轨滑动，图示完全叠放后净入口约${Math.round((width/2-.024)*1000)}mm，${room==='bathroom'?'北':'南'}侧进入。玻璃选型、轨道和地面找坡按产品及现场确定。`,[x,0,z],-Math.PI/2,g=>shower(g,width,depth,room==='bathroom'?-1:1,room==='bathroom'?.065:.035));
  }
  add('bathroom-vanity','公卫外置古典浴室柜与拱冠镜','bathroom','0.79 × 0.53 × 2.10 m','胡桃木防潮板 · 石材 · 陶瓷 · 黄铜','延续原图外置干区：台盆位于公卫西侧走廊，背靠次卧2北墙，避免与坐便器对置形成狭窄过道。',[5.08,0,5.01],Math.PI,g=>bathroomVanity(g,.74));
  add('bathroom-toilet','公卫陶瓷坐便器','bathroom','0.42 × 0.68 × 0.73 m','釉面陶瓷 · 黄铜按钮','平面位置东移80mm以留出西侧移门与入口；右侧至淋浴玻璃约320mm。排污位置与305/400mm坑距为示意，先核对原位及产品再实施。',[6.48,0,4.93],Math.PI,toilet);
  add('ensuite-vanity','主卫浅款浴室柜与拱冠镜','ensuite','0.96 × 0.38 × 2.10 m','胡桃木 · 石材台面 · 浅椭圆陶瓷盆','采用约380mm浅台面，配短款坐便器后两者前缘净距约740mm；定制前确认盆内深及存水弯检修空间。',[6.17,0,9.01],0,g=>{g.scale.z=.72;bathroomVanity(g,.91);});
  add('ensuite-toilet','主卫短款陶瓷坐便器','ensuite','0.42 × 0.61 × 0.73 m','釉面陶瓷','选购约610mm总深短款；平面西调40mm，使东侧至淋浴入口约620mm，前方与浅浴室柜净距约740mm；排污口与坑距必须按现场复核。',[6.18,0,10.292],Math.PI,g=>{g.scale.z=.90;toilet(g);});
  add('ensuite-towel','主卫黄铜毛巾架','ensuite','0.50 × 0.07 × 1.27 m','黄铜 · 棉质毛巾','移至西墙门洞南侧，避开台盆镜灯、坐便器及移门开启面；墙内做好可靠锚固，避免打穿防水层。',[5.605,.58,10.31],Math.PI/2,towelRail);
  add('balcony-rug','阳台编织地毯','balcony','2.50 × 0.94 m','户外耐候编织纤维','低绒防滑材质；不跨越阳台滑门轨道。',[2.70,0,15.40],0,g=>rug(g,2.5,.94));
  for(const [id,x,rot] of [['left',1.81,Math.PI/2],['right',3.55,-Math.PI/2]]) add(`balcony-chair-${id}`,'阳台藤编休闲椅','balcony','0.71 × 0.61 × 1.06 m','耐候木作 · 藤编 · 米色软垫','座面高470mm；南侧至栏杆石材基座约650mm净带，北侧仅约120mm不作通行。清洗需移开椅子并将软垫收进室内，选耐候成品。',[x,0,15.10],rot,g=>caneChair(g,1.0));
  add('balcony-table','阳台圆石面边桌','balcony','Ø 0.48 × 0.53 m','石材 · 黄铜','与藤椅成组向北退让，南侧留约650mm连续通行带；保持阳台排水点可检修。',[2.68,0,15.10],0,g=>{
    cyl(g,.20,.22,.025,mats.brass,0,.023,0);cyl(g,.025,.034,.47,mats.brass,0,.264,0);cyl(g,.24,.24,.032,mats.marble,0,.52,0,48);vase(g,0,.537,0,.17,true);
  });
  add('balcony-cabinet','阳台低矮收纳柜','balcony','1.23 × 0.51 × 0.78 m（含台面和五金）','耐候胡桃木色木作 · 石面','设于西侧短墙，收纳园艺用品；不得封堵原排水点。',[.46,0,15.39],Math.PI/2,g=>sideboard(g,1.18,.76,.42));
  for(const [id,x,z,h] of [['a',6.65,15.08,1.43],['b',5.95,15.81,.99],['c',6.69,15.82,.63]]) add(`balcony-plant-${id}`,'阳台盆栽','balcony',`约 Ø ${(h*.48).toFixed(2)} × ${h.toFixed(2)} m`,'陶盆 · 绿植','种植箱下设置排水托盘，保留检修和清洁空间。',[x,0,z],0,g=>plant(g,h));
  // Wall lamps are selectable fixtures; their warm emitters also read correctly in daytime.
  for(const [id,room,p,rot] of [
    ['living-north','living',[4.16,1.82,11.25],-Math.PI/2],
    ['living-south','living',[4.16,1.82,13.46],-Math.PI/2],
    ['master','master',[4.40,1.82,10.75],Math.PI/2]
  ]) add(`sconce-${id}`,'古铜弯臂壁灯',room,'0.22 × 0.22 × 0.35 m','黄铜 · 亚麻灯罩 · 2700 K 光源','壁灯安装中心距地 1800 mm；灯具需独立回路或双控。',p,rot,wallSconce);
  // The oil-painting surface has its own material and stable mesh name for image-texture assignment.
  const paintingMaterial = new THREE.MeshStandardMaterial({color:'#b9ab8b',roughness:.87,metalness:0});
  const painting = add('living-oil-painting','客厅古典金框油画','living','1.49 × 0.07 × 0.96 m；画心 1.35 × 0.82 m','做旧黄铜色木框 · 亚麻画布','画心中心距地 1.83 m；挂件锚固于实墙，画框下沿高于沙发靠背。',[4.155,1.83,12.12],-Math.PI/2,g=>{
    box(g,1.49,.96,.035,mats.walnut,0,0,0,.008);
    frame(g,0,0,.027,1.415,.887,mats.brass,.047);
    frame(g,0,0,.046,1.355,.827,bronze,.027);
    frame(g,0,0,.053,1.445,.917,mats.brass,.014);
    mesh(g,new THREE.PlaneGeometry(1.35,.82),paintingMaterial,[0,0,.055]);
    for(const side of [-1,1]){
      for(let i=0;i<36;i++)sphere(g,mats.brass,[-.705+i*1.41/35,side*.442,.055],[.0065,.0065,.004]);
      for(let i=0;i<22;i++)sphere(g,mats.brass,[side*.706,-.432+i*.864/21,.055],[.0065,.0065,.004]);
    }
    for(const x of [-.716,.716])for(const y of [-.451,.451]){
      sphere(g,mats.brass,[x,y,.053],[.028,.020,.008]);
      for(let i=0;i<4;i++){const a=i*Math.PI/2; sphere(g,mats.brass,[x+Math.cos(a)*.017,y+Math.sin(a)*.012,.062],[.011,.007,.005]);}
    }
  });
  painting.traverse(o=>{if(o.isMesh&&o.material===paintingMaterial)o.name='artworkCanvas';});
  const curtainMaterial=tinted(contemporary?mats.cream:mats.fabric,song?'#d7cdb7':modern?'#e2dfd5':contemporary?'#9c9688':'#d9cdb8',{side:THREE.DoubleSide});
  if(contemporary)delete curtainMaterial.userData.paletteRole;
  const sheerMaterial=new THREE.MeshStandardMaterial({color:song?'#e9e2d2':modern?'#f2efe8':contemporary?'#c5c0b3':'#eee8d8',roughness:.93,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide});
  function foldedCloth(g,w,h,mat,x,y,z,folds,depth,gather=.15) {
    const nx=80,ny=22,pos=[],uv=[],indices=[];
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++) {
      const u=i/nx,v=j/ny,spread=1-gather*v;
      pos.push(x+(u-.5)*w*spread,y+v*h+.005*Math.cos(u*Math.PI*folds*2)*(1-v),z+Math.cos(u*Math.PI*folds*2)*depth*(.8+.2*v)+.006*Math.sin(v*Math.PI*2+u*3));
      uv.push(u,v);
    }
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,b,a+1,b,b+1,a+1);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();mesh(g,geo,mat);
    if(mat===curtainMaterial){const hem=[];for(let i=0;i<=40;i++){const u=i/40;hem.push([x+(u-.5)*w,y+.02,z+Math.cos(u*Math.PI*folds*2)*depth*.8+.006*Math.sin(u*3)]);}tube(g,hem,.004,mat);}
  }
  add('living-curtains','客厅奶油色法式落地帘','living','帘杆 3.66 m；单侧帘宽约 0.36 m，高 2.53 m','亚麻混纺布 · 薄纱 · 古铜帘杆','双侧窄收帘保留阳台采光与视野；杆顶距地 2.62 m，帘底离地约 60 mm。',[2.34,0,14.30],0,g=>{
    const drape=new THREE.Group();g.add(drape);drape.position.set(-2.34,0,-14.30);g=drape;
    const rodY=2.599,rodZ=14.24;
    if(contemporary)box(g,3.66,.022,.037,mats.trim,2.34,rodY,rodZ,.004);
    else bar(g,[.51,rodY,rodZ],[4.17,rodY,rodZ],.014,mats.brass);
    if(!contemporary)for(const x of [.49,4.19])sphere(g,mats.brass,[x,rodY,rodZ],[.03,.021,.021]);
    if(!contemporary)for(const x of [.64,4.05]){bar(g,[x,rodY,14.41],[x,rodY,rodZ],.014,mats.brass);sphere(g,mats.brass,[x,rodY,14.405],[.033,.033,.007]);}
    for(const x of [.705,4.035]){
      foldedCloth(g,.365,2.495,curtainMaterial,x,.06,14.265,5,.035,.12);
      if(!contemporary)for(let i=0;i<7;i++)mesh(g,new THREE.TorusGeometry(.021,.004,6,14),mats.brass,[x-.145+i*.0483,2.579,rodZ],[0,Math.PI/2,0]);
    }
    foldedCloth(g,3.00,2.46,sheerMaterial,2.36,.065,14.375,21,.008,.02);
  });
  group.userData.specification = '程序化米制家具；按原图轮廓设计，定制前须现场复尺。';
  group.userData.itemCount=items.length;
  return {group,items,lights};
}
