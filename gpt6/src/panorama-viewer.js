import * as THREE from 'three';
import { assetUrl } from './assets.js';
import { STYLE_IDS, getDesignStyle } from './design-styles.js';

// Cycles panoramas are fixed camera photographs of the same metre-based model.
export async function openPanorama({style='italian', room='living', onClose}={}) {
  let view,views=[];
  const aborter=new AbortController();
  const overlay=document.createElement('dialog');overlay.className='photo-viewer';
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','本户型高清全景');
  overlay.innerHTML=`<header><div><small>THE SAME HOME · CYCLES</small><h2>光，落在真实的尺度里。</h2></div><button data-photo="close" aria-label="返回实时漫游">关闭 ×</button></header>
    <nav class="photo-rooms" aria-label="高清全景房间"></nav>
    <div class="photo-canvas" tabindex="0" aria-label="拖动环顾高清全景，双指或滚轮缩放"></div>
    <div class="photo-toolbar"><div role="group" aria-label="高清全景风格">${STYLE_IDS.filter(id=>getDesignStyle(id).panorama).map(id=>`<button data-photo-style="${id}" disabled>${getDesignStyle(id).name}</button>`).join('')}</div><span class="photo-status" role="status">正在载入高清全景…</span><div><button data-photo="out" aria-label="缩小全景">−</button><button data-photo="in" aria-label="放大全景">＋</button><button data-photo="save" disabled>保存视角</button></div></div>
    <footer><strong>原始方案高清全景</strong><span>固定机位 · 日间 / 默认配色 · 不含家具编辑结果</span><p>家具的位置、旋转及尺寸调整仅在实时场景中显示。此处保留原始方案的九个空间与四种风格，可切换房间、环顾和缩放。实际窗外环境与光照待现场确认。</p></footer>`;
  document.body.append(overlay);overlay.showModal();
  const container=overlay.querySelector('.photo-canvas'),status=overlay.querySelector('.photo-status');
  let renderer,texture,closed=false,loading=false,raf=0,yaw=-Math.PI/2,pitch=THREE.MathUtils.degToRad(-8.53),viewportLandscape=innerWidth>innerHeight;
  const mobile=innerWidth<=900||matchMedia('(pointer:coarse)').matches;
  const camera=new THREE.PerspectiveCamera(mobile?64:54,1,.1,10),scene=new THREE.Scene();
  const geo=new THREE.SphereGeometry(5,64,40);geo.scale(-1,1,1);
  const material=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
  scene.add(new THREE.Mesh(geo,material));
  const pointers=new Map();let lastDrag=null,pinch=0;
  function render(){
    if(closed||!renderer)return;
    cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{
      camera.lookAt(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
      renderer.render(scene,camera);
    });
  }
  function defaultFov(){return Math.max(35,Math.min(mobile?64:54,THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(50))/camera.aspect))));}
  function resize(){
    if(!renderer)return;const r=container.getBoundingClientRect(),landscape=innerWidth>innerHeight;
    renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;
    if(!texture||viewportLandscape!==landscape)camera.fov=defaultFov();viewportLandscape=landscape;
    camera.updateProjectionMatrix();render();
  }
  function zoom(value){camera.fov=THREE.MathUtils.clamp(value,35,90);camera.updateProjectionMatrix();render();}
  const observer=new ResizeObserver(resize);
  function close(notify=true){
    if(closed)return;closed=true;aborter.abort();observer.disconnect();cancelAnimationFrame(raf);
    window.removeEventListener('keydown',keyboard);texture?.dispose();geo.dispose();material.dispose();renderer?.dispose();overlay.close();overlay.remove();if(notify)onClose?.();
  }
  async function loadView(nextView,nextStyle=style){
    if(loading||closed||!nextView)return;loading=true;
    status.textContent=`正在进入${nextView.name} · ${getDesignStyle(nextStyle).name}…`;
    container.setAttribute('aria-busy','true');
    const focus=document.activeElement,buttons=[...overlay.querySelectorAll('[data-photo-style],[data-photo-room]')];buttons.forEach(b=>b.disabled=true);
    overlay.querySelector('[data-photo="save"]').disabled=true;
    try {
      const entry=nextView.styles[nextStyle];if(!entry)throw new Error('该风格全景尚未生成');
      const path=(mobile||renderer.capabilities.maxTextureSize<entry.width)&&entry.mobileUrl?entry.mobileUrl:entry.url;
      const map=await new THREE.TextureLoader().loadAsync(assetUrl(path));
      if(closed){map.dispose();return;}
      map.colorSpace=THREE.SRGBColorSpace;map.minFilter=THREE.LinearFilter;map.generateMipmaps=false;
      if(view?.id!==nextView.id){yaw=-Math.PI/2;pitch=THREE.MathUtils.degToRad(nextView.initialPitchDegrees??-8.53);zoom(defaultFov());}
      texture?.dispose();texture=map;material.map=map;material.needsUpdate=true;style=nextStyle;view=nextView;
      buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.photoStyle?b.dataset.photoStyle===style:b.dataset.photoRoom===view.id)));
      overlay.querySelector('footer strong').textContent=`${view.name} · 同源户型渲染`;
      overlay.querySelector(`[data-photo-room="${view.id}"]`).scrollIntoView({block:'nearest',inline:'nearest'});
      status.textContent=`${view.name} · ${getDesignStyle(style).name} · ${map.image.width} × ${map.image.height}`;render();
    } catch(error){status.textContent=`${nextView.name}暂未载入，请再次选择重试。`;console.error('全景载入失败',error);}
    finally {
      loading=false;container.setAttribute('aria-busy','false');buttons.forEach(b=>b.disabled=b.dataset.photoStyle?!((view||nextView).styles[b.dataset.photoStyle]):false);overlay.querySelector('[data-photo="save"]').disabled=!texture;
      if(!closed&&document.activeElement===document.body&&buttons.includes(focus))focus.focus();
    }
  }
  function keyboard(e){
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(e.key==='Tab'){
      const stops=[...overlay.querySelectorAll('button:not(:disabled),[tabindex="0"]')],first=stops[0],last=stops.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
    if(e.target!==container)return;
    if(e.key==='ArrowLeft')yaw+=.08;else if(e.key==='ArrowRight')yaw-=.08;
    else if(e.key==='ArrowUp')pitch=Math.min(1.4,pitch+.06);else if(e.key==='ArrowDown')pitch=Math.max(-1.4,pitch-.06);
    else return;e.preventDefault();render();
  }
  overlay.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.photoStyle){await loadView(view||views.find(v=>v.id===room)||views[0],b.dataset.photoStyle);return;}
    if(b.dataset.photoRoom){await loadView(views.find(v=>v.id===b.dataset.photoRoom));return;}
    if(b.dataset.photo==='close')close();
    if(b.dataset.photo==='in')zoom(camera.fov-6);
    if(b.dataset.photo==='out')zoom(camera.fov+6);
    if(b.dataset.photo==='save'&&texture&&!loading){
      renderer.render(scene,camera);const name=`MAISON-${getDesignStyle(style).name}-${view.name.replaceAll('/','-')}-高清全景视角.png`;
      renderer.domElement.toBlob(blob=>{if(!blob)return;const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),15000);});
    }
  });
  window.addEventListener('keydown',keyboard);
  overlay.addEventListener('cancel',e=>{e.preventDefault();close();});
  container.addEventListener('pointerdown',e=>{
    container.focus();container.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});lastDrag={x:e.clientX,y:e.clientY};
    if(pointers.size===2){const [a,b]=pointers.values();pinch=Math.hypot(a.x-b.x,a.y-b.y);}
  });
  container.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const [a,b]=pointers.values(),distance=Math.hypot(a.x-b.x,a.y-b.y);if(distance&&pinch)zoom(camera.fov*pinch/distance);pinch=distance;return;}
    if(lastDrag){yaw-=(e.clientX-lastDrag.x)*.0033;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastDrag.y)*.0033,-1.4,1.4);render();}
    lastDrag={x:e.clientX,y:e.clientY};
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])container.addEventListener(type,e=>{pointers.delete(e.pointerId);lastDrag=pointers.values().next().value||null;pinch=0;});
  container.addEventListener('wheel',e=>{e.preventDefault();zoom(camera.fov+e.deltaY*.025);},{passive:false});
  try {
    renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));container.append(renderer.domElement);observer.observe(container);resize();
    overlay.querySelector('[data-photo="close"]').focus();
    const response=await fetch(assetUrl('panoramas/manifest.json'),{signal:aborter.signal,cache:'no-cache'});
    if(!response.ok)throw new Error('高清全景清单未载入');
    const manifest=await response.json();if(closed)return {close};views=manifest.viewpoints;
    if(!views.length)throw new Error('尚无可用全景');
    for(const entry of views){
      const button=document.createElement('button');button.dataset.photoRoom=entry.id;button.textContent=entry.name;button.setAttribute('aria-pressed','false');
      overlay.querySelector('.photo-rooms').append(button);
    }
    await loadView(views.find(v=>v.id===room)||views[0]);
  } catch(error){if(closed)return {close};close(false);throw error;}
  return {close,getState:()=>({type:'same-house-panorama',style,loading,closed,viewpoint:view?.id,roomCount:views.length,fov:camera.fov,yaw,pitch,width:texture?.image.width,height:texture?.image.height,textures:renderer?.info.memory.textures})};
}
