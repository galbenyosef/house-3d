import * as THREE from 'three';
import { getDesignStyle } from './design-styles.js';

function random(seed = 42) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
function texture(size, paint, repeat = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  paint(canvas.getContext('2d'), size, random());
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeat, repeat);
  map.anisotropy = 8;
  return map;
}
function woodBoard(ctx, x, y, w, h, rand, vertical = false, light = false) {
  ctx.save(); ctx.translate(x, y);
  if (vertical) { ctx.rotate(Math.PI / 2); ctx.translate(0, -w); [w, h] = [h, w]; }
  const tone = Math.floor(rand() * 26);
  ctx.fillStyle = light ? `rgb(${159 + tone},${121 + tone},${80 + tone})` : `rgb(${92 + tone},${61 + tone},${39 + tone})`;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < h * 2; i++) {
    const yy = rand() * h;
    ctx.strokeStyle = rand() > .45 ? `rgba(36,17,5,${rand() * .19})` : `rgba(228,188,130,${rand() * .12})`;
    ctx.lineWidth = .25 + rand() * .65;
    ctx.beginPath(); ctx.moveTo(0, yy);
    ctx.bezierCurveTo(w * .28, yy + rand() * 6 - 3, w * .62, yy + rand() * 8 - 4, w, yy + rand() * 3 - 1.5); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(24,13,7,.55)'; ctx.lineWidth = 1.5; ctx.strokeRect(.7, .7, w - 1.4, h - 1.4);
  ctx.strokeStyle = 'rgba(220,176,119,.18)'; ctx.lineWidth = 1; ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  ctx.restore();
}
function parquetMap(light = false) {
  return texture(1024, (ctx, n, rand) => {
    ctx.fillStyle = '#573b29'; ctx.fillRect(0, 0, n, n);
    // A 4:1 herringbone, tiled on an integer lattice. One texture spans 2.4 m.
    const unit = n / 16, length = 4;
    for (let row = -20; row < 36; row++) for (let k = -8; k < 10; k++) {
      woodBoard(ctx, (k * 2 * length - row) * unit, row * unit, length * unit, unit, rand, false, light);
    }
    for (let col = -20; col < 36; col++) for (let k = -8; k < 10; k++) {
      woodBoard(ctx, col * unit, (k * 2 * length - col + length) * unit, unit, length * unit, rand, true, light);
    }
  });
}
function woodMap(light = false) {
  return texture(512, (ctx, n, rand) => woodBoard(ctx, 0, 0, n, n, rand, false, light));
}
function weaveMap() {
  return texture(256, (ctx, n, rand) => {
    ctx.fillStyle = '#dad4c7'; ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < n; i += 2) {
      ctx.strokeStyle = `rgba(68,57,43,${.08 + rand() * .12})`;
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, n); ctx.stroke();
      ctx.strokeStyle = `rgba(255,253,238,${.2 + rand() * .2})`;
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(n, i); ctx.stroke();
    }
  }, 6);
}
function marbleMap() {
  return texture(1024, (ctx, n, rand) => {
    ctx.fillStyle = '#e6dfd0'; ctx.fillRect(0, 0, n, n);
    for (let j = 0; j < 55; j++) {
      let x = rand() * n, y = -20;
      ctx.beginPath(); ctx.moveTo(x, y);
      while (y < n + 40) {
        const nx = x + 15 + rand() * 130, ny = y + 35 + rand() * 130;
        ctx.quadraticCurveTo(x - rand() * 110, y + 45, nx, ny); x = nx; y = ny;
      }
      ctx.strokeStyle = `rgba(88,82,63,${.025 + rand() * .10})`;
      ctx.lineWidth = .5 + rand() * 5; ctx.stroke();
    }
  });
}
function rugMap() {
  return texture(1024, (ctx, n, rand) => {
    ctx.fillStyle = '#9a7660'; ctx.fillRect(0, 0, n, n);
    for (const [inset, color, width] of [[20,'#423f35',14],[40,'#c0a98b',20],[74,'#625445',42],[109,'#c7b694',8],[123,'#514638',8]]) {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.strokeRect(inset, inset, n-inset*2, n-inset*2);
    }
    function flower(x,y,s) {
      ctx.save(); ctx.translate(x,y); ctx.strokeStyle='#beab89'; ctx.lineWidth=2;
      for(let k=0;k<8;k++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.ellipse(s*.48,0,s*.36,s*.16,0,0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle='#555344';ctx.beginPath();ctx.arc(0,0,s*.18,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    for(let x=175;x<900;x+=96)for(let y=175;y<900;y+=96) flower(x,y,20);
    for(let p=75;p<960;p+=50){flower(p,74,17);flower(p,950,17);flower(74,p,17);flower(950,p,17);}
    ctx.save(); ctx.translate(512,512); ctx.rotate(Math.PI/4);
    ctx.fillStyle='#4b5043';ctx.fillRect(-134,-134,268,268);ctx.strokeStyle='#cab898';ctx.lineWidth=12;ctx.strokeRect(-127,-127,254,254);ctx.restore();
    flower(512,512,130);
    const pixels=ctx.getImageData(0,0,n,n);
    for(let i=0;i<pixels.data.length;i+=4){const d=(rand()-.5)*21;for(let c=0;c<3;c++)pixels.data[i+c]+=d;}
    ctx.putImageData(pixels,0,0);
  });
}
function straightWoodMap() {
  const map=texture(1024,(ctx,n,rand)=>{
    // 地板 UV 的一格为 2.4 m；板宽 200 mm，板长 1.2 m，错缝直拼。
    const board=n/12;
    for(let row=0;row<12;row++)for(let col=-1;col<2;col++) {
      const x=col*n/2+(row%3)*n/6,y=row*board;
      woodBoard(ctx,x,y,n/2,board,rand);
      ctx.fillStyle='rgba(64,65,62,.24)';ctx.fillRect(x+1,y+1,n/2-2,board-2);
    }
  });
  map.name='烟熏木 1200×200 mm 错缝直拼';map.userData.pattern='straight-plank';
  return map;
}
function italianMarbleMap(joints=false) {
  const map=texture(1024,(ctx,n,rand)=>{
    // 周期性矿物云斑打底，再绘制分叉、变宽的褐灰石脉；避免洞石的均匀横条。
    const grids=[4,16,64].map(size=>({size,values:Float32Array.from({length:size*size},rand)}));
    function noise(x,y,{size,values}) {
      x*=size;y*=size;
      const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
      const at=(a,b)=>values[(b%size)*size+a%size];
      const a=at(ix,iy)*(1-sx)+at(ix+1,iy)*sx,b=at(ix,iy+1)*(1-sx)+at(ix+1,iy+1)*sx;
      return a*(1-sy)+b*sy;
    }
    const pixels=ctx.createImageData(n,n);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
      const cloud=noise(x/n,y/n,grids[0])*.57+noise(x/n,y/n,grids[1])*.30+noise(x/n,y/n,grids[2])*.13;
      const value=Math.max(0,Math.min(1,(cloud-.25)*1.9)),i=(y*n+x)*4;
      pixels.data[i]=164+value*74;pixels.data[i+1]=156+value*75;pixels.data[i+2]=142+value*79;pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);ctx.lineCap=ctx.lineJoin='round';
    function vein(x,y,angle,length,width,depth=0) {
      const points=[[x,y]];
      const steps=Math.max(8,Math.ceil(length/6));
      for(let i=0;i<steps;i++) {
        angle+=(rand()-.5)*.20;
        x+=Math.cos(angle)*length/steps;y+=Math.sin(angle)*length/steps;points.push([x,y]);
      }
      const edges=points.map(([px,py],i)=>{
        const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
        const angle=Math.atan2(next[1]-prev[1],next[0]-prev[0]),taper=i===0||i===points.length-1?.08:1;
        return {x:px,y:py,nx:-Math.sin(angle),ny:Math.cos(angle),left:width*(.2+rand()*2.8)*taper,right:width*(.2+rand()*2.8)*taper};
      });
      // 不规则矿物脉带的两侧分别变化，避免平行描边形成管线视觉。
      // 九宫格复制使跨纹理边缘的石脉继续相接。
      for(const ox of [-n,0,n])for(const oy of [-n,0,n]) {
        for(const [scale,color] of [[3.5,'rgba(222,217,201,.24)'],[1.8,'rgba(99,90,75,.20)'],[1,'rgba(68,59,47,.58)']]) {
          ctx.fillStyle=color;ctx.beginPath();
          edges.forEach((p,i)=>{const xx=p.x+ox+p.nx*p.left*scale,yy=p.y+oy+p.ny*p.left*scale;if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);});
          for(let i=edges.length-1;i>=0;i--){const p=edges[i];ctx.lineTo(p.x+ox-p.nx*p.right*scale,p.y+oy-p.ny*p.right*scale);}
          ctx.closePath();ctx.fill();
        }
      }
      if(depth<2)for(let i=0;i<(depth?2:3);i++) {
        const index=2+Math.floor(rand()*(points.length-4)),[bx,by]=points[index];
        const heading=Math.atan2(points[index+1][1]-by,points[index+1][0]-bx)+(i%2?1:-1)*(.35+rand()*.7);
        vein(bx,by,heading,length*(.18+rand()*.22),width*.43,depth+1);
      }
    }
    for(let i=0;i<6;i++)vein(rand()*n,rand()*n,-.85+(rand()-.5)*1.8,n*(.6+rand()*.65),2.2+rand()*3.6);
    const minerals=ctx.getImageData(0,0,n,n);
    for(let i=0;i<minerals.data.length;i+=4){const grain=(rand()-.5)*13;for(let c=0;c<3;c++)minerals.data[i+c]+=grain;}
    ctx.putImageData(minerals,0,0);
    if(joints) {
      // 1200×1200 mm 大板、2 mm 拼缝，与建筑世界坐标 UV 对齐。
      ctx.strokeStyle='rgba(64,59,52,.28)';ctx.lineWidth=n*.002/2.4;
      for(const p of [0,n/2,n]){ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,n);ctx.moveTo(0,p);ctx.lineTo(n,p);ctx.stroke();}
    }
  });
  map.name=joints?'灰褐分叉石纹 1200×1200 mm 大板':'灰褐天然分叉石纹';map.userData.pattern=joints?'large-slab':'branching-marble';map.userData.veining='branching';
  return map;
}
function leatherMap() {
  return texture(256,(ctx,n,rand)=>{
    const pixels=ctx.createImageData(n,n);
    for(let i=0;i<pixels.data.length;i+=4){const v=185+rand()*65;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}
    ctx.putImageData(pixels,0,0);
  },5);
}
function paleOakMap(planks=false) {
  const map=texture(1024,(ctx,n,rand)=>{
    const rows=planks?12:1,board=n/rows;
    for(let row=0;row<rows;row++)for(let col=-1;col<2;col++){
      const x=col*n/2+(row%3)*n/6,y=row*board;
      woodBoard(ctx,x,y,n/2,board,rand,false,true);
      ctx.fillStyle='rgba(238,230,210,.64)';ctx.fillRect(x+.5,y+.5,n/2-1,board-1);
    }
  });
  map.name=planks?'浅橡木 1200×200 mm 错缝直拼':'浅橡木开放木纹';
  map.userData.pattern=planks?'straight-plank':'oak-grain';return map;
}
export function createMaterials(style='french') {
  const italian=style==='italian',modern=style==='modern',song=style==='song';
  const parquet = modern?paleOakMap(true):italian||song?straightWoodMap():parquetMap(), walnut = modern?paleOakMap():woodMap(), oak = modern?walnut:woodMap(true), weave = weaveMap(), marble = marbleMap();
  if(!italian&&!modern&&!song){parquet.center.set(.5,.5); parquet.rotation=Math.PI/4;}
  const plaster = texture(128, (ctx,n,rand)=>{
    const data=ctx.createImageData(n,n);for(let i=0;i<data.data.length;i+=4){let v=218+rand()*25;data.data[i]=data.data[i+1]=data.data[i+2]=v;data.data[i+3]=255;}ctx.putImageData(data,0,0);
  }, 4);
  const std = (color, roughness=.7, extra={}) => new THREE.MeshStandardMaterial({color,roughness,...extra});
  const mats = {
    wall: std('#e5ddcd',.94,{bumpMap:plaster,bumpScale:.012}),
    trim: std('#e8e0d0',.56),
    parquet: std('#c7b49b',.54,{map:parquet,bumpMap:parquet,bumpScale:.014}),
    walnut: std('#c9a783',.4,{map:walnut,bumpMap:walnut,bumpScale:.007}),
    oak: std('#dac7a5',.57,{map:oak,bumpMap:oak,bumpScale:.01}),
    fabric: std('#693e37',.96,{bumpMap:weave,bumpScale:.018}),
    cream: std('#d6c5a4',.96,{bumpMap:weave,bumpScale:.012}),
    sage: std('#596149',.94,{bumpMap:weave,bumpScale:.015}),
    brass: std('#ac8750',.28,{metalness:.78}),
    marble: std('#ede7da',.3,{map:marble,bumpMap:marble,bumpScale:.002}),
    stone: std('#c1b59b',.9,{bumpMap:plaster,bumpScale:.025}),
    tile: std('#ddd3be',.38,{map:marble}),
    glass: new THREE.MeshPhysicalMaterial({color:'#e9eee7',roughness:.06,metalness:0,transparent:true,opacity:.17,depthWrite:false,side:THREE.DoubleSide}),
    dark: std('#282b24',.44), white: std('#f2ecdf',.24),
    rug: std('#ffffff',1,{map:italian||modern||song?weave:rugMap(),bumpMap:weave,bumpScale:.016}),
    leaf: std('#3b5033',.85,{side:THREE.DoubleSide}), ceramic: std('#b6a07e',.28),
    light: std('#fff1c9',.3,{emissive:'#ffc77a',emissiveIntensity:.7}),
    metal: std('#4d4b40',.37,{metalness:.85}),
  };
  if(italian) {
    const stone=italianMarbleMap(),slabs=italianMarbleMap(true),leather=leatherMap();
    Object.assign(mats,{
      wall:std('#a59d90',.91,{bumpMap:plaster,bumpScale:.004}),
      trim:std('#6b6155',.52),
      parquet:std('#95816b',.52,{map:parquet,bumpMap:parquet,bumpScale:.005}),
      walnut:std('#796754',.42,{map:walnut,bumpMap:walnut,bumpScale:.004}),
      oak:std('#88735c',.50,{map:oak,bumpMap:oak,bumpScale:.004}),
      fabric:std('#444440',.69,{bumpMap:leather,bumpScale:.007}),
      cream:std('#9e9586',.89,{bumpMap:weave,bumpScale:.007}),
      sage:std('#454c38',.85,{bumpMap:weave,bumpScale:.008}),
      brass:std('#8d7754',.34,{metalness:.83}),
      marble:std('#c6bdae',.25,{map:stone,bumpMap:stone,bumpScale:.001}),
      stone:std('#c2b9ab',.32,{map:slabs,bumpMap:slabs,bumpScale:.001}),
      tile:std('#b9b0a2',.48,{map:slabs,bumpMap:slabs,bumpScale:.001}),
      dark:std('#26231e',.43),white:std('#c3bbad',.65),
      rug:std('#7f7d72',.99,{map:weave,bumpMap:weave,bumpScale:.010}),
      ceramic:std('#807466',.39),metal:std('#38332b',.32,{metalness:.85}),
    });
    mats.smokedWood=mats.parquet.clone();mats.smokedWood.name='烟熏木直拼地板';
    // 保留家具接口 key，饰面已按参考图换为灰褐分叉大理石。
    mats.travertine=mats.marble.clone();mats.travertine.name='灰褐大理石墙板';mats.travertine.roughness=.32;
    mats.fabric.userData.paletteRole='fabric';mats.sage.userData.paletteRole='sage';
    mats.leather=mats.fabric.clone();mats.leather.userData.paletteRole='fabric';
  }
  if(modern) {
    Object.assign(mats,{
      wall:std('#f0ede5',.96,{bumpMap:plaster,bumpScale:.003}),trim:std('#e8e4da',.82),
      parquet:std('#f0e6d3',.78,{map:parquet,bumpMap:parquet,bumpScale:.003}),
      walnut:std('#f2e8d6',.72,{map:walnut,bumpMap:walnut,bumpScale:.003}),
      oak:std('#f2e8d6',.72,{map:oak,bumpMap:oak,bumpScale:.003}),
      fabric:std('#c5bca9',.98,{bumpMap:weave,bumpScale:.010}),
      sage:std('#929b83',.96,{bumpMap:weave,bumpScale:.009}),
      cream:std('#e7e2d7',.96,{bumpMap:weave,bumpScale:.008}),
      marble:std('#ded8cb',.79,{bumpMap:plaster,bumpScale:.002}),
      stone:std('#d6d0c4',.89,{bumpMap:plaster,bumpScale:.004}),
      tile:std('#dfdcd4',.82,{bumpMap:plaster,bumpScale:.003}),
      brass:std('#525653',.70,{metalness:.42}),metal:std('#505551',.70,{metalness:.42}),
      dark:std('#414641',.78),white:std('#f2efe8',.75),ceramic:std('#c6bead',.86),
      rug:std('#dbd4c7',1,{bumpMap:weave,bumpScale:.01}),
    });
    mats.fabric.userData.paletteRole='fabric';mats.sage.userData.paletteRole='sage';
  }
  if(song) {
    Object.assign(mats,{
      wall:std('#e8e1d2',.96,{bumpMap:plaster,bumpScale:.003}),trim:std('#82715a',.79),
      parquet:std('#deceb1',.74,{map:parquet,bumpMap:parquet,bumpScale:.004}),
      walnut:std('#d5bea0',.67,{map:walnut,bumpMap:walnut,bumpScale:.003}),
      oak:std('#cdb895',.75,{map:oak,bumpMap:oak,bumpScale:.003}),
      fabric:std('#cbbfa6',.97,{bumpMap:weave,bumpScale:.009}),
      sage:std('#8ea49a',.96,{bumpMap:weave,bumpScale:.009}),
      cream:std('#e0d6c0',.96,{bumpMap:weave,bumpScale:.007}),
      marble:std('#a4aba0',.76,{bumpMap:plaster,bumpScale:.002}),
      stone:std('#a4a89b',.86,{bumpMap:plaster,bumpScale:.004}),
      tile:std('#b9c1b5',.81,{bumpMap:plaster,bumpScale:.003}),
      brass:std('#625c49',.69,{metalness:.38}),metal:std('#56584e',.69,{metalness:.42}),
      dark:std('#363d35',.62),white:std('#ece5d5',.70),ceramic:std('#8faa9b',.24),
      rug:std('#cbbfa7',1,{bumpMap:weave,bumpScale:.010}),
    });
    mats.fabric.userData.paletteRole='fabric';mats.sage.userData.paletteRole='sage';
  }
  const original = {fabric:'#693e37',sage:'#596149',wall:'#e5ddcd',trim:'#e8e0d0'};
  function setPalette(name) {
    if(modern||song){
      const colors=getDesignStyle(style).palettes[name];if(!colors)return;
      mats.fabric.color.set(colors.fabric);mats.sage.color.set(colors.sage);return;
    }
    if(italian) {
      const colors=name==='olive'?{fabric:'#555748',sage:'#84735d'}:name==='ivory'?{fabric:'#8e8575',sage:'#51513e'}:{fabric:'#444440',sage:'#454c38'};
      for(const [key,color] of Object.entries(colors))mats[key].color.set(color);
      mats.leather.color.set(colors.fabric);return;
    }
    const colors = name==='olive' ? {...original,fabric:'#525b42',sage:'#9b765b',wall:'#e2dccb'} : name==='ivory' ? {...original,fabric:'#cab998',sage:'#857666',wall:'#eee5d4'} : original;
    for(const [key,color] of Object.entries(colors))mats[key].color.set(color);
  }
  return {mats,setPalette};
}
