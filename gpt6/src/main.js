import './style.css';
import * as THREE from 'three';
import { ROOMS } from './layout.js';
import { mountUI, materialDialog, sourceDialog, helpDialog, furnitureDialog, guideDialog, makeGuideMarkdown } from './ui.js';
import { createHouseScene } from './scene.js';
import { getDesignStyle, STYLE_IDS } from './design-styles.js';
import { mountFurnitureEditor } from './editor-ui.js';

mountUI();
let house,toastTimer,currentModal=null,currentFilter='all',lastFocus=null,room='living',mode='interior',palette='burgundy';
let style='french',switching=false;
let visualOpen=false,visualViewer=null,visualGeneration=0;
let furnitureEditor;
try {const requested=new URL(location.href).searchParams.get('style')||localStorage.getItem('maison-style');if(STYLE_IDS.includes(requested))style=requested;} catch {}
const $=selector=>document.querySelector(selector);
const all=selector=>document.querySelectorAll(selector);
const touchDevice=matchMedia('(pointer: coarse)').matches;
const titles={living:'客餐厅 · 温柔的旧时光',master:'主卧 · 一夜好梦',bedroom2:'次卧 2 · 留一间给相聚',bedroom1:'次卧 1 · 安静的日常',study:'书房 · 与一本书独处',kitchen:'厨房 · 三餐也有诗意',bathroom:'公卫 · 方寸间的讲究',ensuite:'主卫 · 私享的晨间',balcony:'阳台 · 把阳光请进来'};
function toast(message){$('.toast').textContent=message;$('.toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('.toast').classList.remove('show'),3500);}
function syncRoom(id){
  room=id;const r=ROOMS.find(item=>item.id===id),index=ROOMS.indexOf(r);
  all('[data-room]').forEach(el=>{const active=el.dataset.room===id;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
  $('.scene-caption .kicker').textContent=`${String(index+1).padStart(2,'0')} / ${r.en.toUpperCase()}`;
  const design=getDesignStyle(style);
  $('.scene-caption h2').textContent=id==='living'?design.livingTitle:titles[id];$('.scene-subtitle').textContent=id==='living'?`${style==='song'?'茶褐木 / 青灰石面':style==='modern'?'浅橡木 / 浅砂石材':style==='italian'?'灰褐石材 / 深烟熏木':'胡桃木'} / ${design.palettes[palette].surface} / ${style==='song'?'青瓷与绢光':style==='modern'?'石墨色五金':style==='italian'?'古铜':'做旧黄铜'}`:`${r.area.toFixed(2)} m² · ${design.name} · 方案建议尺度`;
}
function syncStyleUI(){
  const design=getDesignStyle(style);document.body.dataset.designStyle=style;document.title=`MAISON · ${design.name}${style==='song'?'':'居所'}`;
  $('.project-intro .eyebrow').textContent=design.english;$('.project-intro h1').innerHTML=design.heading;$('.intro-en').textContent=design.subtitle;
  $('.space-header span:last-child').textContent=['modern','song'].includes(style)?'THE SPACES':style==='italian'?'GLI SPAZI':'LES ESPACES';
  $('.palette-block .section-mini span').textContent=style==='italian'?'皮革配色':'织物配色';
  all('[data-style]').forEach(el=>{const active=el.dataset.style===style;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));el.disabled=!house||switching||house.getEditorState().busy;});
  all('.swatch').forEach(el=>{const active=el.dataset.palette===palette,colors=design.palettes[el.dataset.palette];el.style.setProperty('--swatch',colors.fabric);el.setAttribute('aria-label',colors.name);el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
  const panorama=$('[data-action="panorama"]');
  panorama.disabled=!design.panorama||switching||!house;
  panorama.setAttribute('aria-label',design.panorama?'进入高清全景':`${design.name}：高清全景尚未生成，可在下方实时漫游`);
  panorama.title=design.panorama?'查看法式、意式、现代简约与宋韵雅居的高清全景':'该风格高清全景尚未生成';
  panorama.querySelector('strong').textContent=design.panorama?'进入高清全景':'实时漫游已开启';
  panorama.querySelector('small').textContent=design.panorama?'9 个空间 · 四种风格':'本风格暂无高清全景';
  $('.palette-label').textContent=design.palettes[palette].name;syncView(mode);
}
async function switchStyle(next){
  if(!house||switching||next===style)return;
  switching=true;syncStyleUI();$('.style-switch').setAttribute('aria-busy','true');$('.style-bar-note').textContent='正在准备另一种家的模样…';
  try {
    await house.setStyle(next);style=next;palette=house.getState().palette;
    if(currentModal)openModal(currentModal,currentFilter);
    const url=new URL(location.href);url.searchParams.set('style',style);history.replaceState(null,'',url);
    try {localStorage.setItem('maison-style',style);} catch {}
    toast(`已切换 · ${getDesignStyle(style).name}`);
  } catch(error){console.error('风格载入失败',error);toast('另一套方案暂未载入，请稍后重试。');}
  finally {switching=false;syncStyleUI();$('.style-switch').setAttribute('aria-busy','false');$('.style-bar-note').textContent='保留视角，对比四种生活提案';}
}
function syncView(next){
  mode=next;$('.touch-move').hidden=next!=='interior';all('[data-view]').forEach(el=>{const active=el.dataset.view===next;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
  $('.interaction-hint span').textContent=next==='interior'?'拖动环顾 · 滚轮变焦 · WASD 移动 · 点击家具查看细节':next==='overview'?'拖动旋转 · 滚轮缩放 · 点击家具查看尺寸':'右键拖动平移 · 滚轮缩放 · 点击房间进入漫游';
  if(touchDevice)$('.interaction-hint span').textContent=next==='interior'?'单指环顾 · 双指缩放 · 按住方向移动':'单指旋转 · 双指缩放与平移 · 点击房间';
  if(next==='overview'){$('.scene-caption .kicker').textContent='THE COMPLETE RESIDENCE';$('.scene-caption h2').textContent='全屋总览 · 家的全貌';$('.scene-subtitle').textContent='原始户型还原 / 四房双卫 / 110.71 m²';}
  else if(next==='plan'){$('.scene-caption .kicker').textContent='THE SPATIAL ARRANGEMENT';$('.scene-caption h2').textContent='平面视图 · 生活的尺度';$('.scene-subtitle').textContent='墙线按图推导 / 面积取原图标注 / 尺寸待复测';}
  else syncRoom(room);
  $('.render-badge').textContent=next==='interior'?'THREE.JS · 实时渲染':'剖切展示 · 隐藏上部墙体';
  if(house?.getEditorState().enabled)$('.interaction-hint span').textContent='拖动家具移动 · 点击后调整尺寸与旋转 · 右键或双指平移';
}
function showItem(item){
  $('.touch-move').hidden=mode!=='interior'||!!item;house?.stopMovement();
  $('.inspector').classList.toggle('open',!!item);$('#selection-label').style.display=item?'block':'none';
  if(!item)return;
  $('.inspector h3').textContent=item.name;$('.inspector-dimension').textContent=item.dimensions;$('.inspector-material').textContent=item.material;$('.inspector-note').textContent=item.note;$('#selection-label').textContent=item.name;
}
function openModal(type,filter='all'){
  house?.stopMovement();
  if(!currentModal)lastFocus=document.activeElement;
  currentModal=type;
  currentFilter=filter;
  $('.modal-body').innerHTML=type==='materials'?materialDialog(style):type==='source'?sourceDialog():type==='help'?helpDialog():type==='guide'?guideDialog(style):furnitureDialog(house?.items||[],filter);
  $('.modal-backdrop').hidden=false;$('.modal').focus();
  if(type==='materials')$('.modal-footer').insertAdjacentHTML('afterbegin',`<div class="filter-row" style="margin:0">${Object.entries(getDesignStyle(style).palettes).map(([key,value])=>`<button class="filter-chip" data-palette="${key}">${value.short}</button>`).join('')}</div>`);
}
function closeModal(){$('.modal-backdrop').hidden=true;currentModal=null;lastFocus?.focus();}
function download(blob,name){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),15000);}
function csv(){
  const rows=[['家具/物件','空间','建议尺寸','材质','复刻建议'],...house.items.map(it=>[it.name,ROOMS.find(r=>r.id===it.room)?.name||it.room,it.dimensions,it.material,it.note])];
  download(new Blob(['\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),`MAISON-${getDesignStyle(style).name}-家具尺寸清单.csv`);toast('家具尺寸清单已导出');
}
all('[data-move]').forEach(button=>{
  button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);button.classList.add('pressed');house?.setMovement(button.dataset.move,true);});
  const release=()=>{button.classList.remove('pressed');house?.setMovement(button.dataset.move,false);};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,release);
});
all('.mini-room').forEach(el=>el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();house?.setRoom(el.dataset.room);}}));
document.addEventListener('click',async event=>{
  const button=event.target.closest('button,a.brand,[data-room]');if(!button)return;
  if(button.dataset.style){await switchStyle(button.dataset.style);return;}
  if(button.matches('a.brand')){event.preventDefault();house?.setRoom('living');return;}
  if(button.dataset.modal){openModal(button.dataset.modal);return;}
  if(button.dataset.filter){openModal('furniture',button.dataset.filter);return;}
  if(button.dataset.room){house?.setRoom(button.dataset.room);return;}
  if(button.dataset.view){house?.setView(button.dataset.view);return;}
  if(button.dataset.light){house?.setLight(button.dataset.light);all('[data-light]').forEach(el=>{const active=el===button;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});return;}
  if(button.dataset.palette){
    palette=button.dataset.palette;
    house?.setPalette(button.dataset.palette);all('.swatch').forEach(el=>{const active=el.dataset.palette===button.dataset.palette;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
    const name=getDesignStyle(style).palettes[palette].name;$('.palette-label').textContent=name;if(mode==='interior')syncRoom(room);toast(`已切换配色 · ${name}`);return;
  }
  switch(button.dataset.action){
    case 'panorama':{
      if(visualOpen||!getDesignStyle(style).panorama)return;
      visualOpen=true;house?.stopMovement();button.disabled=true;const focus=document.activeElement,generation=++visualGeneration;
      const loading=document.createElement('dialog');loading.className='visual-start';loading.setAttribute('aria-label','正在准备高清全景');
      loading.innerHTML='<p>正在准备高清全景…</p><button>取消</button>';document.body.append(loading);loading.showModal();
      const removeLoading=()=>{if(loading.open)loading.close();loading.remove();};
      const restore=()=>{if(generation!==visualGeneration)return;visualGeneration++;removeLoading();visualOpen=false;visualViewer=null;$('.app-shell').inert=false;button.disabled=false;focus?.focus();};
      loading.querySelector('button').onclick=restore;loading.addEventListener('cancel',event=>{event.preventDefault();restore();});
      $('.app-shell').inert=true;
      try {
        const open=(await import('./panorama-viewer.js')).openPanorama;
        if(generation!==visualGeneration)break;removeLoading();
        const currentRoom=mode==='interior'?(house?.getState().lightingRoom||room):room;
        const viewer=await open({style,room:currentRoom,onClose:restore});
        if(generation===visualGeneration)visualViewer=viewer;else viewer.close();
      } catch(error){if(generation!==visualGeneration)break;restore();console.error('高清全景载入失败',error);toast('高清全景暂未载入，请稍后重试。');}
      break;
    }
    case 'home':house?.setRoom('living');break;
    case 'close-modal':closeModal();break;
    case 'close-inspector':house?.clearSelection();break;
    case 'reset':house?.reset();break;
    case 'zoom-in':house?.zoom(1);break;
    case 'zoom-out':house?.zoom(-1);break;
    case 'fullscreen':try{if(!document.fullscreenElement)await $('.app-shell').requestFullscreen();else await document.exitFullscreen();}catch{toast('当前浏览器未允许全屏，可使用浏览器全屏模式。');}break;
    case 'capture':{
      if(!house)return;button.disabled=true;const name=`MAISON-${getDesignStyle(style).name}-${ROOMS.find(r=>r.id===room).name}-${mode}.png`;const blob=await house.capture();if(blob){download(blob,name);toast('当前视角已保存为 PNG');}else toast('图片暂未生成，请再试一次。');button.disabled=false;break;
    }
    case 'download-csv':csv();break;
    case 'download-guide':download(new Blob([makeGuideMarkdown(house?.items||[],style)],{type:'text/markdown;charset=utf-8'}),`MAISON-${getDesignStyle(style).name}-落地手册.md`);toast('材质与复刻说明已导出');break;
  }
});
$('.modal-backdrop').addEventListener('click',event=>{if(event.target===$('.modal-backdrop'))closeModal();});
document.addEventListener('keydown',event=>{
  if(event.target.matches('[data-style]')&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();const index=STYLE_IDS.indexOf(event.target.dataset.style),next=STYLE_IDS[(index+(event.key==='ArrowRight'?1:-1)+STYLE_IDS.length)%STYLE_IDS.length],button=$(`[data-style="${next}"]`);if(!button.disabled){button.focus();button.click();}}
  if(event.key==='Escape'){if(currentModal)closeModal();else house?.clearSelection();}
  if(currentModal&&event.key==='Tab'){
    const focusable=[...$('.modal').querySelectorAll('button,a,input,[tabindex="0"]')],first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===$('.modal'))){last?.focus();event.preventDefault();}else if(!event.shiftKey&&document.activeElement===last){first?.focus();event.preventDefault();}
  }
  if(!currentModal&&document.activeElement===$('#scene')){if(event.key.toLowerCase()==='r')house?.reset();if(event.key.toLowerCase()==='h')openModal('help');}
});
// Labels are projected from actual room centers, keeping plan navigation aligned with geometry.
$('#room-labels').innerHTML=ROOMS.map(r=>`<button class="projected-room" data-room="${r.id}"><span>${r.name}</span><small>${r.area.toFixed(2)} m²</small></button>`).join('');
const projected=new THREE.Vector3(),labelElements=[...all('.projected-room')];
function updateLabels(camera,view,item){
  const w=$('#scene').clientWidth,h=$('#scene').clientHeight;
  $('#mini-camera').setAttribute('cx',camera.position.x*10);$('#mini-camera').setAttribute('cy',camera.position.z*10);$('#mini-camera').style.display=view==='interior'?'':'none';
  $('#room-labels').style.display=view==='interior'||house?.getEditorState().enabled?'none':'block';
  if(view!=='interior')ROOMS.forEach((r,i)=>{projected.set(r.center[0],.84,r.center[1]).project(camera);labelElements[i].style.left=`${(projected.x*.5+.5)*w}px`;labelElements[i].style.top=`${(-projected.y*.5+.5)*h}px`;labelElements[i].style.display=projected.z<1?'':'none';});
  if(item){$('#selection-label').textContent=item.name;new THREE.Box3().setFromObject(item.object).getCenter(projected);projected.y+=.6;projected.project(camera);$('#selection-label').style.left=`${(projected.x*.5+.5)*w}px`;$('#selection-label').style.top=`${(-projected.y*.5+.5)*h}px`;$('#selection-label').style.display=projected.z<1?'block':'none';}
}
try {
  syncStyleUI();
  house=await createHouseScene($('#scene'),{onRoom:syncRoom,onView:syncView,onSelect:showItem,onWarning:toast,onFrame:updateLabels,onEditChange:state=>{
    furnitureEditor?.sync(state);
    all('[data-style]').forEach(button=>{button.disabled=!house||switching||state.busy;});
  }},style);
  furnitureEditor=mountFurnitureEditor({house,toast,onModeChange:()=>syncView(mode)});
  syncStyleUI();
  window.maison={getState:()=>house.getState(),getComparisonState:()=>visualViewer?.getState()||null};
  requestAnimationFrame(()=>{$('.loading').classList.add('hidden');setTimeout(()=>$('.loading')?.remove(),700);});
} catch(error) {
  console.error('无法创建三维场景',error);
  $('.loading').innerHTML='<div class="error-message">三维场景暂时无法载入。<br>请确认浏览器已启用硬件加速，或刷新重试。<button onclick="location.reload()">重新载入</button></div>';
}
