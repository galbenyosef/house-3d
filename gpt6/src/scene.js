import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createMaterials } from './materials.js';
import { enhanceMaterials } from './pbr-materials.js';
import { buildArchitecture } from './architecture.js';
import { buildFurniture } from './furniture.js';
import { ROOMS, HOUSE, FOOTPRINT, WALLS } from './layout.js';
import { canWalkTo, pointInPolygon } from './navigation.js';
import { collectWalkBlockers } from './collision.js';
import { assetUrl } from './assets.js';
import { getDesignStyle, STYLE_IDS } from './design-styles.js';

export async function createHouseScene(container, callbacks = {}, initialStyle = 'french') {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#dbdfd4');
  const mobileGraphics=matchMedia('(pointer: coarse)').matches || window.innerWidth<=900;
  const renderer = new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobileGraphics?1.25:1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.info.autoReset=false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(64, 1, .06, 120);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping=true; controls.dampingFactor=.085; controls.maxPolarAngle=Math.PI/2-.02; controls.minDistance=4; controls.maxDistance=32;
  controls.target.set(4.3,0,8.2); controls.enabled=false;
  const pmrem = new THREE.PMREMGenerator(renderer), roomEnv = new RoomEnvironment();
  const environment = pmrem.fromScene(roomEnv, .04); scene.environment=environment.texture; scene.environmentIntensity=.5;
  roomEnv.dispose(); pmrem.dispose();
  const styleSets=new Map();
  async function loadStyle(id) {
    if(styleSets.has(id))return styleSets.get(id);
    const materialSet=createMaterials(id),mats=materialSet.mats;
    await enhanceMaterials(mats,id);
    const architecture=buildArchitecture(THREE,mats,id),furniture=buildFurniture(THREE,mats,id);
    const root=new THREE.Group();root.name=`${getDesignStyle(id).name} · 完整方案`;root.visible=false;
    root.add(architecture.group,furniture.group);
    architecture.ceilings.traverse(o=>{if(o.isMesh)o.castShadow=true;});
    try {
      if(id==='french') {
        const artCanvas=furniture.group.getObjectByName('artworkCanvas');
        if(artCanvas) {
          const artMap=await new THREE.TextureLoader().loadAsync(assetUrl('textures/corot-seine.jpg'));
          artMap.colorSpace=THREE.SRGBColorSpace;artMap.anisotropy=8;
          const imageAspect=artMap.image.width/artMap.image.height,targetAspect=1.35/.82;
          if(imageAspect<targetAspect){artMap.repeat.y=imageAspect/targetAspect;artMap.offset.y=(1-artMap.repeat.y)/2;}
          artCanvas.material=new THREE.MeshStandardMaterial({map:artMap,roughness:.94});
        }
      }
      const {file,...spec}=getDesignStyle(id).pendant;
      const gltf=await new GLTFLoader().loadAsync(assetUrl(file)),chandelier=gltf.scene;
      chandelier.position.set(2.25,HOUSE.height,8.65);
      chandelier.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
      chandelier.userData.itemId=spec.id;root.add(chandelier);
      furniture.items.push({...spec,object:chandelier});
      const result={...materialSet,root,architecture,furniture,chandelier,palette:'burgundy',blockers:collectWalkBlockers(furniture.items,architecture)};
      styleSets.set(id,result);scene.add(root);return result;
    } catch(error) {
      disposeModel(root);
      throw error;
    }
  }
  function disposeModel(root) {
    const geometries=new Set(),materials=new Set(),textures=new Set();
    root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
    for(const m of materials){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();}
    geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());
  }
  let styleId=STYLE_IDS.includes(initialStyle)?initialStyle:'french';
  let activeStyle=await loadStyle(styleId);
  let {mats,architecture,furniture,chandelier,blockers}=activeStyle;
  activeStyle.root.visible=true;
  const selection = new THREE.Box3Helper(new THREE.Box3(), '#b99562'); selection.visible=false; scene.add(selection);
  const hemi = new THREE.HemisphereLight('#e8eddf','#796044',.52); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d7',3.3);sun.position.set(-1,9,24);sun.target.position.set(3,0,8);sun.castShadow=true;
  sun.shadow.mapSize.setScalar(mobileGraphics?2048:4096);sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=11;sun.shadow.camera.bottom=-11;sun.shadow.camera.near=.5;sun.shadow.camera.far=40;
  sun.shadow.bias=-.00005; sun.shadow.normalBias=.003;scene.add(sun,sun.target);
  const roomLights=[];
  for(const r of ROOMS) {
    if(r.id==='balcony')continue;
    const light = new THREE.SpotLight('#ffe0b5',10,5,Math.PI*.43,1,2);
    const center=r.id==='living'?[2.1,12]:r.center;
    light.position.set(center[0],2.65,center[1]);light.target.position.set(center[0],0,center[1]);
    light.userData.roomId=r.id;scene.add(light,light.target);roomLights.push(light);
  }
  const diningLight = new THREE.PointLight('#ffd294',15,6,2);diningLight.position.set(2.25,1.97,8.65); scene.add(diningLight);roomLights.push(diningLight);
  // One local shadowed light, rather than nine unoccluded room-wide fills.
  const localLight=new THREE.SpotLight('#ffe0b5',0,5,Math.PI*.43,1,2);
  localLight.castShadow=true;localLight.shadow.mapSize.setScalar(mobileGraphics?512:1024);
  localLight.shadow.bias=-.00003;localLight.shadow.normalBias=.002;
  scene.add(localLight,localLight.target);
  const base = new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#deddd0',roughness:1}));
  base.rotation.x=-Math.PI/2;base.position.y=-.17;base.receiveShadow=true;scene.add(base);
  // Exterior light and distant architectural silhouettes give the real windows depth.
  const exterior = new THREE.Group();
  const facadeMat=new THREE.MeshStandardMaterial({color:'#d6d7cc',roughness:1});
  const exteriorWindow=new THREE.MeshStandardMaterial({color:'#8e9c96',roughness:.4});
  for(let i=0;i<5;i++) {
    const b=new THREE.Mesh(new THREE.BoxGeometry(5,6+i%3*1.4,3),facadeMat);b.position.set(-10+i*7,2.5,32+i%2*3);exterior.add(b);
    for(let x=-1.5;x<=1.5;x+=1.5)for(let y=1;y<5;y+=1.7) {const w=new THREE.Mesh(new THREE.PlaneGeometry(.65,1.1),exteriorWindow);w.rotation.y=Math.PI;w.position.set(b.position.x+x,y, b.position.z-1.51);exterior.add(w);}
  }
  scene.add(exterior);
  const renderTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:mobileGraphics?2:4});
  const composer=new EffectComposer(renderer,renderTarget);
  composer.addPass(new RenderPass(scene,camera));
  const ao=new SSAOPass(scene,camera,1,1,mobileGraphics?16:32);ao.kernelRadius=.16;ao.minDistance=.003;ao.maxDistance=.04;composer.addPass(ao);composer.addPass(new OutputPass());
  let mode='interior',roomId='living',lightingRoom='living',lightMode='day',transition=null,yaw=0,pitch=0,lastTime=0,dirtyFrames=3,selectedItem=null,renderMs=0;
  const keys=new Set(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  let drag=null,pinchDistance=0;
  const pointers=new Map(),touchMoves=new Set();
  const tmpV=new THREE.Vector3();
  function syncAngles(){camera.getWorldDirection(tmpV);yaw=Math.atan2(tmpV.x,tmpV.z);pitch=Math.asin(tmpV.y);}
  function look(){camera.lookAt(camera.position.x+Math.sin(yaw)*Math.cos(pitch),camera.position.y+Math.sin(pitch),camera.position.z+Math.cos(yaw)*Math.cos(pitch));}
  function invalidate(){dirtyFrames=8;}
  function transitionTo(position,target,fov,instant=false){
    const endPos=new THREE.Vector3(...position),endTarget=new THREE.Vector3(...target);
    if(instant||matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.copy(endPos);camera.fov=fov;camera.updateProjectionMatrix();controls.target.copy(endTarget);camera.lookAt(endTarget);syncAngles();transition=null;invalidate();return;}
    const startTarget=camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(camera.position.distanceTo(endTarget)));
    transition={start:performance.now(),from:camera.position.clone(),to:endPos,fromTarget:startTarget,toTarget:endTarget,fromFov:camera.fov,toFov:fov};invalidate();
  }
  function clearSelection(){selectedItem=null;selection.visible=false;callbacks.onSelect?.(null);invalidate();}
  function setView(next,instant=false){
    mode=next;keys.clear();touchMoves.clear();pointers.clear();drag=null;clearSelection();controls.enabled=next!=='interior';controls.enableRotate=next==='overview';controls.enablePan=next!=='interior';
    const inside=next==='interior';applyViewVisibility();
    updateLocalLight();
    if(inside) {const r=ROOMS.find(r=>r.id===roomId);transitionTo(r.view.position,r.view.target,64,instant);}
    else if(next==='overview'){controls.minDistance=8;controls.maxDistance=34;controls.maxPolarAngle=Math.PI/2-.06;transitionTo([15.5,15,20],[4.3,.1,8.15],43,instant);}
    else {controls.minDistance=12;controls.maxDistance=38;transitionTo([4.4,26,8.3],[4.4,0,8.18],42,instant);}
    callbacks.onView?.(mode,roomId);invalidate();
    renderer.shadowMap.needsUpdate=true;
  }
  function applyViewVisibility(){
    const inside=mode==='interior';architecture.setCutaway(!inside);architecture.setCeiling(inside);exterior.visible=inside;
    if(chandelier)chandelier.visible=inside;
    // Overhead lights are omitted from the cutaway, keeping the model easy to read.
    furniture.group.traverse(o=>{if(o.userData.ceilingFixture)o.visible=inside;});
    for(const item of furniture.items) {
      if(item.id.includes('art')||item.id.includes('painting')||item.id.startsWith('sconce-')||item.id.includes('curtain'))item.object.visible=inside;
    }
  }
  async function setStyle(next){
    if(!STYLE_IDS.includes(next))throw new Error('未知家装风格');
    if(next===styleId)return;
    if(transition)transitionTo(transition.to.toArray(),transition.toTarget.toArray(),transition.toFov,true);
    stopMovement();pointers.clear();drag=null;syncAngles();clearSelection();
    const nextStyle=await loadStyle(next);
    clearSelection();
    activeStyle.root.visible=false;activeStyle=nextStyle;styleId=next;
    ({mats,architecture,furniture,chandelier,blockers}=activeStyle);
    activeStyle.root.visible=true;applyViewVisibility();applyPalette(activeStyle.palette);setLight(lightMode);
    if(mode==='interior'&&!canWalkTo(camera.position.x,camera.position.z,.18,blockers)){
      const r=ROOMS.find(r=>r.id===roomId);transitionTo(r.view.position,r.view.target,camera.fov,true);
    }
    renderer.shadowMap.needsUpdate=true;invalidate();
  }
  function applyPalette(name){
    const design=getDesignStyle(styleId),colors=design.palettes[name];
    if(!colors)return;
    activeStyle.palette=name;activeStyle.setPalette(name);
    furniture.group.traverse(o=>{if(o.isMesh&&o.material.userData.paletteRole)o.material.color.set(colors[o.material.userData.paletteRole]);});
    for(const item of furniture.items){
      item.originalMaterial??=item.material;
      item.material=styleId==='italian'
        ?item.originalMaterial.replace(/炭灰皮革|苔灰皮革|暖灰皮革/g,colors.surface).replace(/深橄榄/g,colors.accent)
        :item.originalMaterial.replace(/酒红|苔绿|灰绿/g,color=>color==='酒红'?(name==='olive'?'苔绿':name==='ivory'?'暖米亚麻':'酒红'):(name==='olive'?'陶土色':name==='ivory'?'暖灰':color));
    }
    if(selectedItem)callbacks.onSelect?.(selectedItem);invalidate();
  }
  function setRoom(id){roomId=id;setView('interior');callbacks.onRoom?.(id);}
  function updateLocalLight(id=roomId){
    lightingRoom=id;
    const source=roomLights.find(l=>l.userData.roomId===id),night=lightMode==='night';
    localLight.visible=mode==='interior'&&!!source;
    if(source){localLight.position.copy(source.position);localLight.target.position.copy(source.target.position);}
    localLight.intensity=night?(styleId==='italian'?16:22):1.4;
    roomLights.forEach(l=>{if(l.userData.roomId)l.visible=l.userData.roomId!==id||mode!=='interior';});
    renderer.shadowMap.needsUpdate=true;
  }
  function setLight(value){
    lightMode=value;const night=value==='night',italian=styleId==='italian';
    scene.background.set(night?'#222c35':italian?'#b5b7b2':'#dbdfd4');scene.environmentIntensity=night?.13:italian?.30:.4;hemi.intensity=night?.12:italian?.24:.32;sun.intensity=night?.06:italian?2.4:3;sun.color.set(night?'#adbeda':'#fff4e5');
    renderer.toneMappingExposure=italian?(night?.94:.94):(night?1.05:1.02);
    roomLights.forEach(l=>l.intensity=night?(italian?5:7):.8);diningLight.intensity=night?(italian?14:18):2.5;
    (furniture.lights||[]).forEach(l=>{l.intensity=night?(italian?3:4):.35;});
    updateLocalLight(mode==='interior'?(ROOMS.find(r=>pointInPolygon(camera.position.x,camera.position.z,r.polygon))?.id||roomId):roomId);
    mats.light.emissiveIntensity=night?2:.6;invalidate();
    renderer.shadowMap.needsUpdate=true;
  }
  function selectAt(event){
    const bounds=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);raycaster.setFromCamera(pointer,camera);
    // Check architecture too, so an item behind a wall is never selected through it.
    const intersections=raycaster.intersectObjects([architecture.group,furniture.group,...(chandelier&&chandelier.visible?[chandelier]:[])],true);
    let item=null;
    for(const hit of intersections){
      let visible=true;for(let p=hit.object;p;p=p.parent)if(!p.visible){visible=false;break;}if(!visible)continue;
      let root=hit.object;while(root&&!root.userData.itemId)root=root.parent;
      if(root){item=furniture.items.find(it=>it.id===root.userData.itemId);break;}
      if(hit.object.material?.transparent)continue;
      if(hit.object.isMesh)break;
    }
    if(item){selectedItem=item;selection.box.setFromObject(item.object);selection.visible=true;callbacks.onSelect?.(item);invalidate();}else clearSelection();
  }
  renderer.domElement.addEventListener('pointerdown',event=>{
    container.focus({preventScroll:true});pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===1)drag={lastX:event.clientX,lastY:event.clientY,moved:0};
    else {drag.moved=Infinity;const [a,b]=pointers.values();pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);}
    if(mode==='interior')renderer.domElement.setPointerCapture(event.pointerId);transition=null;invalidate();
  });
  renderer.domElement.addEventListener('pointermove',event=>{
    if(!drag||!pointers.has(event.pointerId))return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size>1){
      if(mode==='interior'){
        const [a,b]=pointers.values(),distance=Math.hypot(a.x-b.x,a.y-b.y);
        if(pinchDistance>0&&distance>0){camera.fov=THREE.MathUtils.clamp(camera.fov*pinchDistance/distance,38,85);camera.updateProjectionMatrix();}
        pinchDistance=distance;
      }
      invalidate();return;
    }
    const dx=event.clientX-drag.lastX,dy=event.clientY-drag.lastY;drag.moved+=Math.abs(dx)+Math.abs(dy);
    if(mode==='interior'){yaw-=dx*.0033;pitch=THREE.MathUtils.clamp(pitch+dy*.0033,-1.15,1.15);look();}
    drag.lastX=event.clientX;drag.lastY=event.clientY;invalidate();
  });
  function endPointer(event){
    if(event.type==='pointerup'&&drag&&drag.moved<6&&pointers.size===1&&event.button===0)selectAt(event);
    pointers.delete(event.pointerId);pinchDistance=0;
    const remaining=pointers.values().next().value;
    drag=remaining?{lastX:remaining.x,lastY:remaining.y,moved:Infinity}:null;
  }
  renderer.domElement.addEventListener('pointerup',endPointer);
  renderer.domElement.addEventListener('pointercancel',endPointer);
  renderer.domElement.addEventListener('lostpointercapture',endPointer);
  renderer.domElement.addEventListener('wheel',event=>{if(mode==='interior'){event.preventDefault();camera.fov=THREE.MathUtils.clamp(camera.fov+event.deltaY*.025,38,85);camera.updateProjectionMatrix();invalidate();}},{passive:false});
  controls.addEventListener('change',invalidate);
  window.addEventListener('keydown',event=>{
    if(event.target.closest?.('input,textarea,[role="dialog"]')||!document.querySelector('.modal-backdrop').hidden)return;
    if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)&&document.activeElement===container){keys.add(event.key);event.preventDefault();invalidate();}
  });
  function stopMovement(){keys.clear();touchMoves.clear();}
  window.addEventListener('keyup',event=>keys.delete(event.key));window.addEventListener('blur',stopMovement);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMovement();});
  function zoom(direction){if(mode==='interior'){camera.fov=THREE.MathUtils.clamp(camera.fov-direction*6,38,85);camera.updateProjectionMatrix();}else{const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(direction>0?.86:1.16);if(offset.length()>controls.minDistance&&offset.length()<controls.maxDistance)camera.position.copy(controls.target).add(offset);}invalidate();}
  const resizeObserver=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);composer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();invalidate();});resizeObserver.observe(container);
  function move(delta){
    let forward=Number(keys.has('w')||keys.has('ArrowUp')||touchMoves.has('forward'))-Number(keys.has('s')||keys.has('ArrowDown')||touchMoves.has('back'));
    let strafe=Number(keys.has('d')||keys.has('ArrowRight')||touchMoves.has('right'))-Number(keys.has('a')||keys.has('ArrowLeft')||touchMoves.has('left'));
    if(!forward&&!strafe)return;const norm=Math.hypot(forward,strafe);forward/=norm;strafe/=norm;
    const dx=(Math.sin(yaw)*forward-Math.cos(yaw)*strafe)*delta*1.3,dz=(Math.cos(yaw)*forward+Math.sin(yaw)*strafe)*delta*1.3;
    if(canWalkTo(camera.position.x+dx,camera.position.z,.18,blockers))camera.position.x+=dx;
    if(canWalkTo(camera.position.x,camera.position.z+dz,.18,blockers))camera.position.z+=dz;
    const currentRoom=ROOMS.find(r=>pointInPolygon(camera.position.x,camera.position.z,r.polygon));
    if(currentRoom&&currentRoom.id!==lightingRoom)updateLocalLight(currentRoom.id);
    look();invalidate();
  }
  let raf,alive=true;
  function frame(now){
    if(!alive)return;raf=requestAnimationFrame(frame);const delta=Math.min((now-lastTime)/1000,.045);lastTime=now;
    if(transition){const t=THREE.MathUtils.clamp((now-transition.start)/900,0,1),e=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,e);controls.target.lerpVectors(transition.fromTarget,transition.toTarget,e);camera.fov=THREE.MathUtils.lerp(transition.fromFov,transition.toFov,e);camera.updateProjectionMatrix();camera.lookAt(controls.target);if(t>=1){transition=null;syncAngles();}invalidate();}
    if(mode==='interior'&&!transition&&(keys.size||touchMoves.size))move(delta);
    if(controls.enabled&&!transition)controls.update();
    if(dirtyFrames>0){
      ao.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix);
      ao.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);
      renderer.info.reset();const start=performance.now();composer.render();renderMs=performance.now()-start;dirtyFrames--;callbacks.onFrame?.(camera,mode,selectedItem);
    }
  }
  applyPalette('burgundy');setView('interior',true);setLight('day');requestAnimationFrame(frame);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();callbacks.onWarning?.('图形上下文已中断，请刷新页面恢复。');});
  return {
    get items(){return furniture.items;},get mats(){return mats;},scene,camera,renderer,setView,setRoom,setLight,setStyle,clearSelection,zoom,stopMovement,
    setMovement(direction,active){if(active&&mode==='interior'){transition=null;touchMoves.add(direction);invalidate();}else touchMoves.delete(direction);},
    setPalette:applyPalette,
    reset(){setView(mode);},
    async capture(){composer.render();return new Promise(resolve=>renderer.domElement.toBlob(resolve,'image/png'));},
    getState(){return {style:styleId,palette:activeStyle.palette,loadedStyles:[...styleSets.keys()],geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,mode,roomId,lightingRoom,lightMode,exposure:renderer.toneMappingExposure,position:camera.position.toArray(),orientation:camera.quaternion.toArray(),selectedId:selectedItem?.id||null,fov:camera.fov,items:furniture.items.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,renderCpuMs:Math.round(renderMs*100)/100};},
    dispose(){alive=false;cancelAnimationFrame(raf);resizeObserver.disconnect();for(const edition of styleSets.values())disposeModel(edition.root);controls.dispose();composer.dispose();renderer.dispose();environment.dispose();},
  };
}
