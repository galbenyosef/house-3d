// Original deterministic ink landscape. No external painting pixels are used.
export function createSongArtMaterial(THREE){
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1024;
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  c.fillStyle='#e4dccb';c.fillRect(0,0,w,h);
  let seed=37;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<20000;i++){
    c.fillStyle=`rgba(108,94,71,${rnd()*.055})`;c.fillRect(rnd()*w,rnd()*h,1+rnd()*2,1);
  }
  // Far peaks dissolve into a large, unpainted river and sky.
  for(let layer=0;layer<4;layer++){
    c.beginPath();c.moveTo(-20,h*(.60+layer*.07));
    for(let x=-20;x<=w+30;x+=18){
      const peak=Math.sin(x/w*8+layer*.85)*.10+Math.sin(x/w*19+layer*.4)*.045;
      c.lineTo(x,h*(.64+layer*.055-peak*(1-layer*.13))+rnd()*9);
    }
    c.lineTo(w,h*.86);c.lineTo(0,h*.86);c.closePath();
    const wash=c.createLinearGradient(0,h*.35,0,h*.86);
    wash.addColorStop(0,`rgba(52,66,58,${.30+layer*.08})`);wash.addColorStop(1,'rgba(96,110,97,0)');
    c.fillStyle=wash;c.fill();
  }
  c.strokeStyle='rgba(58,66,54,.54)';c.lineWidth=4;c.lineCap='round';
  c.beginPath();c.moveTo(1160,827);c.bezierCurveTo(1144,777,1170,744,1138,691);c.stroke();
  for(let j=0;j<6;j++){
    const y=715+j*15,x=1150+j*2;c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x-35-j*8,y-18);c.stroke();
    for(let k=0;k<13;k++){
      c.beginPath();c.moveTo(x-20-k*3,y-12);c.lineTo(x-32-k*3,y-25-rnd()*12);c.stroke();
    }
  }
  c.strokeStyle='rgba(90,103,91,.17)';c.lineWidth=1;
  for(let i=0;i<24;i++){const x=130+rnd()*1050,y=780+rnd()*130;c.beginPath();c.moveTo(x,y);c.lineTo(x+30+rnd()*70,y);c.stroke();}
  c.fillStyle='#965448';c.fillRect(1370,854,23,28);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.name='原创水墨 · 远山一枝';
  map.anisotropy=8;
  return new THREE.MeshStandardMaterial({name:'原创水墨绢本画面',map,roughness:.96});
}
