import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HOUSE, ROOMS, WALLS, FOOTPRINT } from './layout.js';
import { setSurfaceUV } from './surface-uv.js';

/** 米制参数化建筑；按材质合批，剖切几何独立于完整墙体，避免门楣浮空。 */
export function buildArchitecture(THREE, mats, style='french') {
  const italian=style==='italian', modern=style==='modern', song=style==='song', contemporary=italian||modern||song;
  const group = new THREE.Group();
  group.name = song?'Maison · 宋韵建筑':modern?'Maison · 现代简约建筑':contemporary?'Atelier · 意式建筑':'Maison · 建筑';
  const full = new THREE.Group(); full.name = '完整建筑';
  const cut = new THREE.Group(); cut.name = '0.78 m 剖切墙'; cut.visible = false;
  const windows = new THREE.Group(); windows.name = song?'茶褐细框玻璃窗':contemporary?'细金属框玻璃窗':'木框玻璃窗';
  const ceilings = new THREE.Group(); ceilings.name = '天花'; ceilings.visible = false;
  const walls = new THREE.Group(); walls.name = contemporary?'平整墙面与整板饰面':'墙体与古典木作';
  group.add(walls, ceilings); walls.add(full, cut); full.add(windows);
  const batches = new Map();
  const height = HOUSE.height, thick = HOUSE.wallThickness, cutHeight = .78;
  const mat = name => mats[name] || mats.wall;
  const frostedGlass = new THREE.MeshPhysicalMaterial({name:'卫生间磨砂隐私玻璃',color:'#d5ddd4',roughness:.95,metalness:0,transmission:.12,thickness:.018,transparent:false,opacity:1,side:THREE.DoubleSide});

  function addGeometry(parent, material, geometry) {
    setSurfaceUV(geometry, material);
    // 标准化为非索引几何，使圆柱、盒体和线框能在同一材质批次合并。
    if (geometry.index) { const source = geometry; geometry = source.toNonIndexed(); source.dispose(); }
    let byMaterial = batches.get(parent);
    if (!byMaterial) batches.set(parent, byMaterial = new Map());
    if (!byMaterial.has(material)) byMaterial.set(material, []);
    byMaterial.get(material).push(geometry);
  }
  function box(parent, material, w, h, d, x, y, z, rotation = 0) {
    if (Math.min(w,h,d) < .001) return;
    const g = new THREE.BoxGeometry(w,h,d); g.rotateY(rotation); g.translate(x,y,z);
    addGeometry(parent,material,g);
  }
  function cylinder(parent, material, radius, length, x,y,z, radialSegments = 10) {
    const g = new THREE.CylinderGeometry(radius,radius,length,radialSegments);
    g.translate(x,y,z); addGeometry(parent,material,g);
  }
  function shapeGeometry(points, depth = 0) {
    const shape = new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z)));
    const g = depth ? new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}) : new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI/2);
    const p = g.getAttribute('position'), uv = g.getAttribute('uv');
    for (let i=0;i<p.count;i++) uv.setXY(i,p.getX(i)/2.4,p.getZ(i)/2.4);
    return g;
  }
  const slab = shapeGeometry(FOOTPRINT,.14); slab.translate(0,-.14,0);
  addGeometry(group,mat('stone'),slab);

  for (const room of ROOMS) {
    const floorMat = ['bathroom','ensuite'].includes(room.id) ? mat('tile') : ['kitchen','balcony',...(italian?['living']:[])].includes(room.id) ? mat('stone') : mat(italian?'smokedWood':'parquet');
    const floor = shapeGeometry(room.polygon); floor.translate(0,.012,0);
    setSurfaceUV(floor, floorMat);
    const mesh = new THREE.Mesh(floor,floorMat);
    mesh.name = `${room.name} · 地坪`; mesh.receiveShadow = true;
    mesh.userData = {roomId:room.id,architectural:true}; group.add(mesh);
    const ceiling = new THREE.Mesh(shapeGeometry(room.polygon),mat(contemporary?'white':'cream'));
    // 反转三角形绕序，天花底面向下且平面轮廓与地坪重合。
    const ci = ceiling.geometry.index;
    for (let i=0;i<ci.count;i+=3) { const b=ci.getX(i+1); ci.setX(i+1,ci.getX(i+2)); ci.setX(i+2,b); }
    ceiling.geometry.computeVertexNormals(); ceiling.position.y = height;
    ceiling.name = `${room.name} · 天花`; ceiling.receiveShadow = true; ceilings.add(ceiling);
  }

  const wetWallIds = new Set(['bathroom-west','ensuite-west','ensuite-south']);
  for (const wall of WALLS) {
    const [ax,az]=wall.a, [bx,bz]=wall.b, length=Math.hypot(bx-ax,bz-az);
    const dx=(bx-ax)/length,dz=(bz-az)/length, rotation=-Math.atan2(dz,dx);
    const normal=[-dz,dx];
    const openingList=[...(wall.openings||[])].sort((a,b)=>a.offset-b.offset);
    const localBox=(parent,material,w,h,d,u,y,n=0)=>box(parent,material,w,h,d,ax+dx*u+normal[0]*n,y,az+dz*u+normal[1]*n,rotation);
    function skirting(parent,start,end,sign) {
      if(contemporary) {
        // 60 mm 平踢脚与上口 6 mm 阴影缝，完成面以上高度按米建模。
        localBox(parent,mat('trim'),end-start,.06,.009,(start+end)/2,.042,sign*(thick/2+.0045));
        localBox(parent,mat('dark'),end-start,.006,.004,(start+end)/2,.075,sign*(thick/2+.002));
      } else {
        localBox(parent,mat('trim'),end-start,.13,.024,(start+end)/2,.077,sign*(thick/2+.012));
        localBox(parent,mat('trim'),end-start,.028,.036,(start+end)/2,.154,sign*(thick/2+.014));
      }
    }
    function segment(start,end) {
      if(end-start<.001)return;
      localBox(full,mat('wall'),end-start,height,thick,(start+end)/2,height/2);
      localBox(cut,mat('wall'),end-start,cutHeight,thick,(start+end)/2,cutHeight/2);
      // 实体墙底的踢脚线：三层收边在剖切与室内视角中都成立。
      for (const sign of [-1,1]) {
        for (const parent of [full,cut]) skirting(parent,start,end,sign);
        // 护墙板双道框线；竖向留白比例以古典法式墙面分格为基准。
        if(!contemporary && end-start>.55 && !wetWallIds.has(wall.id)) {
          const count=Math.max(1,Math.floor((end-start)/1.18));
          const available=(end-start)/count;
          for(let i=0;i<count;i++) {
            const center=start+available*(i+.5), frameW=available-.24;
            frame(localBox,full,center,.67,frameW,.80,sign*(thick/2+.024),.023);
            frame(localBox,full,center,1.83,frameW,1.18,sign*(thick/2+.024),.023);
            if(frameW>.55) {
              frame(localBox,full,center,.67,frameW-.11,.69,sign*(thick/2+.031),.010);
              frame(localBox,full,center,1.83,frameW-.11,1.07,sign*(thick/2+.031),.010);
            }
          }
        }
      }
      // 客厅西墙以黑棕木饰面衬两块灰褐石板，保留暖灰顶面与深色背景的对比。
      if(italian && wall.id==='west' && start>4 && end-start>2.4) {
        const backing=new THREE.Group();backing.name='意式客厅 · 深烟熏木底墙';full.add(backing);
        localBox(backing,mat('walnut'),end-start-.02,2.54,.010,(start+end)/2,1.35,-(thick/2+.005));
        const panels=new THREE.Group();panels.name='意式客厅 · 大理石整板墙';full.add(panels);
        const span=Math.min(end-start-.4,3.2),center=(start+end)/2,panelWidth=(span-.006)/2;
        for(const side of [-1,1])localBox(panels,mat('travertine'),panelWidth,2.38,.012,center+side*(panelWidth+.006)/2,1.36,-(thick/2+.016));
        // 薄暖光槽贴原天花边缘，不做降板或额外横梁。
        localBox(full,mat('light'),end-start-.04,.006,.018,(start+end)/2,height-.018,-(thick/2+.015));
      }
    }
    function frame(local,parent,u,y,w,h,n,profile) {
      if(w<.08)return;
      local(parent,mat('trim'),w,profile,.014,u,y-h/2,n);
      local(parent,mat('trim'),w,profile,.014,u,y+h/2,n);
      local(parent,mat('trim'),profile,h,.014,u-w/2,y,n);
      local(parent,mat('trim'),profile,h,.014,u+w/2,y,n);
    }
    let end=0;
    for(const opening of openingList) {
      segment(end,opening.offset);
      const sill=opening.sill||0, top=sill+opening.height, center=opening.offset+opening.width/2;
      if(sill>0) {
        localBox(full,mat('wall'),opening.width,sill,thick,center,sill/2);
        const low=Math.min(cutHeight,sill);
        localBox(cut,mat('wall'),opening.width,low,thick,center,low/2);
        for(const sign of [-1,1]) for(const parent of [full,cut]) skirting(parent,opening.offset,opening.offset+opening.width,sign);
      }
      if(top<height) localBox(full,mat('wall'),opening.width,height-top,thick,center,(height+top)/2);
      if(opening.type==='window' || opening.type==='slider') makeWindow(opening,localBox,wall);
      else makeDoor(opening,wall,localBox,rotation,dx,dz,normal);
      end=opening.offset+opening.width;
    }
    segment(end,length);
    // 整面墙的三层顶角线；完整组隐藏时所有顶线同步退出剖切场景。
    for(const sign of [-1,1]) {
      if(contemporary) {
        localBox(full,mat('dark'),length,.014,.006,length/2,height-.021,sign*(thick/2+.003));
        continue;
      }
      localBox(full,mat('trim'),length,.045,.045,length/2,height-.175,sign*(thick/2+.022));
      localBox(full,mat('trim'),length,.053,.068,length/2,height-.125,sign*(thick/2+.032));
      localBox(full,mat('trim'),length,.070,.105,length/2,height-.063,sign*(thick/2+.048));
      localBox(full,mat('trim'),length,.025,.13,length/2,height-.016,sign*(thick/2+.063));
    }
    // 门洞处的石材过门条，持续可见。
    for(const opening of openingList.filter(o=>o.type!=='window'))
      localBox(group,mat('marble'),opening.width,.018,thick+.065,opening.offset+opening.width/2,.022);
  }

  function makeWindow(opening,local,wall) {
    if(opening.type==='slider')return makeGlazedSlider(opening,local,wall);
    const sill=opening.sill||0, w=opening.width,h=opening.height,c=opening.offset+w/2;
    const frameMat=mat(contemporary?'metal':'cream');
    const t=contemporary?.028:.045,profile=contemporary?.032:.065,depth=contemporary?.075:.13;
    local(windows,frameMat,w,profile,depth,c,sill+(contemporary?.016:.032));
    local(windows,frameMat,w,profile,depth,c,sill+h-(contemporary?.016:.032));
    local(windows,frameMat,profile,h,depth,opening.offset+(contemporary?.016:.032),sill+h/2);
    local(windows,frameMat,profile,h,depth,opening.offset+w-(contemporary?.016:.032),sill+h/2);
    const panes=Math.max(1,Math.round(w/(contemporary?1.15:.75)));
    for(let i=0;i<panes;i++) {
      const pw=(w-(contemporary?.06:.12))/panes, pc=opening.offset+(contemporary?.03:.06)+(i+.5)*pw;
      local(windows,opening.frosted?frostedGlass:mat('glass'),pw-(contemporary?.016:.035),h-(contemporary?.06:.14),.009,pc,sill+h/2);
      if(i>0) local(windows,frameMat,t,h-.08,contemporary?.065:.082,opening.offset+(contemporary?.03:.06)+i*pw,sill+h/2);
      // 法式竖窗用上下三分格，阳台滑门保留通透的两分格。
      const bars=contemporary?[]:[.37,.73];
      for(const fraction of bars) local(windows,frameMat,pw-.02,.026,.05,pc,sill+h*fraction);
      local(windows,mat('brass'),.018,.105,.032,pc+pw/2-.072,sill+Math.min(h*.48,1.0),(opening.handleSide??(opening.type==='slider'?-1:1))*.066);
    }
    for(const sign of [-1,1]) {
      if(contemporary) {
        local(windows,mat('brass'),w+.04,.015,.012,c,sill+h+.008,sign*.096);
        for(const u of [opening.offset-.008,opening.offset+w+.008])local(windows,mat('brass'),.015,h+.024,.012,u,sill+h/2,sign*.096);
        if(sill>.3)local(windows,mat('stone'),w+.05,.022,.20,c,sill-.004,sign*.01);
        continue;
      }
      local(windows,mat('trim'),w+.17,.08,.045,c,sill+h+.025,sign*.10);
      local(windows,mat('trim'),.066,h+.09,.045,opening.offset-.035,sill+h/2,sign*.10);
      local(windows,mat('trim'),.066,h+.09,.045,opening.offset+w+.035,sill+h/2,sign*.10);
      if(sill>.3) local(windows,mat('marble'),w+.20,.048,.23,c,sill-.012,sign*.028);
    }
  }


  function makeGlazedSlider(opening,local,wall) {
    const root=new THREE.Group(); root.name=`阳台滑门 ${opening.offset.toFixed(2)}`;
    root.userData.glazedDoor=true; root.userData.openingOffset=opening.offset; windows.add(root);
    const w=opening.width,h=opening.height,c=opening.offset+w/2,frameMat=mat(contemporary?'metal':'walnut');
    local(root,frameMat,w,contemporary?.035:.065,.13,c,h-(contemporary?.0175:.032));
    for(const u of [opening.offset+.03,opening.offset+w-.03])local(root,frameMat,contemporary?.035:.06,h,.13,u,h/2);
    const track=new THREE.Group();track.name='阳台低轨';root.add(track);
    local(track,mat('metal'),w,.016,.13,c,.022);
    const panelWidth=(w-.12)/2+.025, parked=opening.offset+w-.06-panelWidth/2;
    const length=Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]);
    const dx=(wall.b[0]-wall.a[0])/length,dz=(wall.b[1]-wall.a[1])/length,rotation=-Math.atan2(dz,dx);
    for(let i=0;i<2;i++) {
      const panel=new THREE.Group();panel.name=`${root.name} · 开启叠放玻璃扇 ${i+1}`;
      const n=-.055+i*.08;
      panel.position.set(wall.a[0]+dx*parked-dz*n,0,wall.a[1]+dz*parked+dx*n);panel.rotation.y=rotation;
      panel.userData.walkObstacle=true;root.add(panel);
      box(panel,mat('glass'),panelWidth-(contemporary?.05:.07),h-.15,.009,0,h/2+.006,0);
      for(const x of [-panelWidth/2+.02,panelWidth/2-.02])box(panel,frameMat,contemporary?.028:.04,h-.075,.055,x,h/2+.01,0);
      for(const y of [.06,h-.035])box(panel,frameMat,panelWidth,contemporary?.028:.04,.055,0,y,0);
      if(!contemporary)box(panel,frameMat,panelWidth-.04,.026,.04,0,h*.67,0);
      box(panel,mat('brass'),.022,.13,.016,-panelWidth/2+.07,1.04,.033);
    }
    // 展示状态真实打开西侧半幅：两扇分轨叠放，导航仍阻挡东侧玻璃实体。
    root.userData.openClearWidth=w-.12-panelWidth;
  }

  function makeDoor(opening,wall,local,rotation,dx,dz,normal) {
    const w=opening.width,h=opening.height,c=opening.offset+w/2;
    for(const sign of [-1,1]) {
      if(contemporary) {
        for(const u of [opening.offset-.012,opening.offset+w+.012])local(full,mat('metal'),.024,h+.028,.018,u,h/2,sign*.099);
        local(full,mat('metal'),w+.048,.024,.018,c,h+.012,sign*.099);
        continue;
      }
      local(full,mat('trim'),.084,h+.08,.045,opening.offset-.033,h/2,sign*.107);
      local(full,mat('trim'),.084,h+.08,.045,opening.offset+w+.033,h/2,sign*.107);
      local(full,mat('trim'),w+.15,.095,.059,c,h+.04,sign*.114);
      local(full,mat('trim'),w+.22,.027,.07,c,h+.10,sign*.116);
      local(full,mat('trim'),.107,.14,.06,opening.offset-.033,.09,sign*.11);
      local(full,mat('trim'),.107,.14,.06,opening.offset+w+.033,.09,sign*.11);
    }
    if(opening.operation==='sliding') {
      const root=new THREE.Group(); root.name=`${wall.id} · 密封上吊移门`;
      root.position.set(wall.a[0],0,wall.a[1]); root.rotation.y=rotation; full.add(root);
      root.userData.doorRoot=true;
      const count=opening.panels||1, direction=opening.slideDirection||1, side=opening.slideSide||1;
      const width=w/count+(opening.panelOverlap??.03), parkGap=opening.parkGap??.02;
      const parked=direction>0?opening.offset+w+parkGap:opening.offset-width-parkGap;
      const trackPadding=opening.trackPadding??.04, trackOverhang=opening.trackOverhang??.04;
      const trackMin=Math.min(opening.offset-.02,parked)-trackPadding, trackMax=Math.max(opening.offset+w+.02,parked+width)+trackPadding;
      const trackNormal=side*(count===2?.245:.18), trackDepth=count===2?.30:.16;
      local(full,mat('trim'),trackMax-trackMin,contemporary?.08:.115,trackDepth,(trackMin+trackMax)/2,h+.145,trackNormal);
      if(!contemporary)local(full,mat('walnut'),trackMax-trackMin+trackOverhang,.024,trackDepth+.02,(trackMin+trackMax)/2,h+.21,trackNormal);
      local(full,mat('brass'),trackMax-trackMin,.018,.032,(trackMin+trackMax)/2,h+.073,side*.18);
      for(let i=0;i<count;i++) {
        const leaf=new THREE.Group(); leaf.name=`${wall.id} · 移门扇 ${i+1}`;
        const closed=opening.offset+i*w/count-.015, normal=side*(.185+i*.13);
        leaf.position.set(parked,0,normal); root.add(leaf);
        leaf.userData.doorLeaf=true;
        leaf.userData.doorMotion={operation:'sliding',closedPosition:[closed,0,normal],openPosition:[parked,0,normal],width,height:h,thickness:.045};
        doorPanel(leaf,width,h,opening,true);
        // 扇缘压条、下部落地密封条和框侧搭接，避免明装门仅以裸缝拼合。
        box(leaf,mat('dark'),width,.014,.025,width/2,.028,0);
        for(const x of [.018,width-.018])box(leaf,mat(contemporary?'metal':'walnut'),.026,h-.08,.058,x,h/2,0);
        for(const x of [.07,width-.07])box(leaf,mat('brass'),.025,.075,.024,x,h+.025,0);
      }
      return;
    }
    const leaf = new THREE.Group(); leaf.name=`${wall.id} · 开启木门`;
    const hinge=opening.hinge||(opening.entry?'end':'start');
    const hingeOffset=hinge==='end'?opening.offset+w-.035:opening.offset+.035;
    const hingeNormal=opening.hingeNormal||0;
    leaf.position.set(wall.a[0]+dx*hingeOffset+normal[0]*hingeNormal,0,wall.a[1]+dz*hingeOffset+normal[1]*hingeNormal);
    const closedRotation=rotation+(hinge==='end'?Math.PI:0);
    const angle=THREE.MathUtils.degToRad(opening.openAngle??(opening.entry?85:78));
    leaf.rotation.y=closedRotation+(hinge==='end'?1:-1)*(opening.swing??1)*angle;
    leaf.userData.doorLeaf=true;
    leaf.userData.doorMotion={operation:'hinged',closedRotation,openRotation:leaf.rotation.y,width:w-.07,height:h,thickness:.045};
    full.add(leaf);
    doorPanel(leaf,w-.07,h,opening);
    for(const yy of [.29,1.90]) cylinder(leaf,mat('brass'),.012,.13,.025,yy,.017,8);
  }

  function doorPanel(leaf,width,h,opening,sliding=false) {
    if(contemporary) {
      // 平板木门保留同一门芯与运动外包；薄金属收口代替凸起古典门板框线。
      leaf.userData.finish='flush-panel';
      if(opening.glazed) {
        for(const x of [.024,width-.024])box(leaf,mat('metal'),.048,h-.055,.045,x,(h-.055)/2+.02,0);
        for(const y of [.044,h-.059])box(leaf,mat('metal'),width,.048,.045,width/2,y,0);
        box(leaf,mat('glass'),width-.075,h-.12,.018,width/2,h/2,0);
      } else box(leaf,mat(opening.entry?'walnut':'trim'),width,h-.055,.045,width/2,(h-.055)/2+.02,0);
      for(const side of [-1,1])if(!sliding||side===(opening.slideSide??1)) {
        box(leaf,mat('metal'),.036,.10,.008,width-.09,sliding?1.12:1.03,side*.027);
        if(sliding)box(leaf,mat('brass'),.016,.14,.020,width-.09,1.12,side*.047);
        else box(leaf,mat('brass'),.10,.020,.022,width-.13,1.055,side*.050);
      }
      return;
    }
    const leafMat=mat(opening.entry?'walnut':'cream');
    if(opening.glazed) {
      box(leaf,leafMat,width,.84,.045,width/2,.44,0);
      box(leaf,leafMat,width,.13,.045,width/2,h-.095,0);
      for(const x of [.052,width-.052]) box(leaf,leafMat,.105,h-.91,.045,x,(h+.80)/2,0);
    } else box(leaf,leafMat,width,h-.055,.045,width/2,(h-.055)/2+.02,0);
    const panelHeights=opening.glazed ? [] : [{cy:.55,h:.72},{cy:1.55,h:1.02}];
    for(const side of [-1,1]) {
      for(const panel of panelHeights) {
        box(leaf,leafMat,width-.18,panel.h,.020,width/2,panel.cy,side*.032);
        for(const yy of [panel.cy-panel.h/2,panel.cy+panel.h/2]) box(leaf,mat('trim'),width-.17,.020,.022,width/2,yy,side*.044);
        for(const xx of [.085,width-.085]) box(leaf,mat('trim'),.020,panel.h,.022,xx,panel.cy,side*.044);
      }
      if(!sliding||side===(opening.slideSide??1)) {
        box(leaf,mat('brass'),.040,.18,.018,width-.09,sliding?1.12:1.03,side*.039);
        if(sliding) box(leaf,mat('brass'),.018,.14,.025,width-.09,1.12,side*.057);
        else box(leaf,mat('brass'),.11,.024,.03,width-.13,1.055,side*.063);
      }
    }
    if(opening.glazed) {
      // 厨房玻璃门中央玻璃覆盖框门，浅层玻璃与三道细木分格呈现旧宅细节。
      box(leaf,mat('glass'),width-.20,h-1.02,.018,width/2,1.48,.031);
      for(const yy of [1.06,1.49,1.92]) box(leaf,leafMat,width-.16,.034,.022,width/2,yy,.050);
    }
  }

  // 南侧阳台保留开放栏杆；净高从可站立的基座顶计算，只设连续竖杆和顶扶手。
  const railing = new THREE.Group(); railing.name=song?'细金属阳台栏杆':'法式铁艺阳台栏杆'; group.add(railing);
  const left=.18,right=7.12,z=16.22,railMat=mat('metal');
  const base=new THREE.Group(),handrail=new THREE.Group(),uprights=new THREE.Group();
  base.name='栏杆石材基座';handrail.name='栏杆顶部扶手';uprights.name='栏杆连续竖杆';
  railing.add(base,handrail,uprights);
  const baseTop=.114, railTop=1.34, bays=64, pitch=(right-left)/bays, radius=.009;
  box(base,mat('stone'),right-left+.08,.11,.22,(left+right)/2,.059,z);
  box(handrail,railMat,right-left,.05,.055,(left+right)/2,railTop-.025,z);
  for(let i=0;i<=bays;i++) {
    const x=left+pitch*i, r=i%8===0?.017:radius;
    cylinder(uprights,railMat,r,railTop-.025-baseTop,x,(railTop-.025+baseTop)/2,z,10);
  }
  railing.userData={editorObstacle:true,heightFromBase:railTop-baseTop,maxClearGap:pitch-2*radius,verticalBars:bays+1,designAssumption:'新设计保守目标：净高不低于1.20m、竖杆净距不大于110mm、无可攀横杆；既有栏杆现场复核'};
  // 地坪黄铜边界缝：连接窗前石材与木地板。
  box(group,mat('brass'),7.00,.012,.018,3.65,.028,14.42);

  for(const [parent,byMaterial] of batches) for(const [material,geometries] of byMaterial) {
    const merged=mergeGeometries(geometries,false);
    if(!merged) throw new Error('建筑几何合并失败');
    const mesh=new THREE.Mesh(merged,material); mesh.name=`合批 · ${material.name||'建筑材质'}`;
    mesh.castShadow=material!==mat('glass'); mesh.receiveShadow=material!==mat('glass');
    parent.add(mesh); geometries.forEach(g=>g.dispose());
  }
  let ceilingWanted=false;
  return {
    group,walls,ceilings,windows,
    setCutaway(value) { full.visible=!value; cut.visible=!!value; ceilings.visible=!value&&ceilingWanted; },
    setCeiling(value) { ceilingWanted=!!value; ceilings.visible=ceilingWanted&&full.visible; }
  };
}
