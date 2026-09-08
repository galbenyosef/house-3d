import { createItalianFurniture, ITALIAN_SPECS } from './italian-furniture.js';
import { createSongArtMaterial } from './song-art.js';

export function createSongFurniture(THREE,mats,h){
  const {box,cyl,sphere,bar,mesh,cushion,book,ivory,linen,wine,moss,ink,pages}=h;
  const wood=mats.walnut,ceramic=mats.ceramic,artMaterial=createSongArtMaterial(THREE);
  function vase(g,x,y,z,s=.2,flowers=false){
    const profile=[[.16,0],[.20,.025],[.27,.25],[.25,.48],[.12,.62],[.105,.92],[.13,.96]];
    mesh(g,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),32),ceramic,[x,y,z],[0,0,0],[s,s,s]);
    if(flowers){
      const tip=[x+.08,y+s+.20,z-.02];bar(g,[x,y+s*.7,z],tip,.0025,wood);
      for(let i=0;i<4;i++){
        const yy=y+s+.04+i*.047,xx=x+.02+i*.015;
        bar(g,[xx,yy,z],[xx-.04,yy+.025,z+.02],.0014,wood);
        sphere(g,ivory,[xx-.04,yy+.025,z+.02],[.017,.012,.014]);
      }
    }
  }
  const plainCushion=(g,x,y,z,w,height,d,material,rx=0,rz=0)=>{
    const pillow=box(g,w,height,d,material,x,y,z,Math.min(.065,height*.38));pillow.rotation.set(rx,0,rz);return pillow;
  };
  const base=createItalianFurniture(THREE,mats,{...h,vase,cushion:plainCushion});
  function legs(g,w,d,height){
    for(const x of [-w/2+.045,w/2-.045])for(const z of [-d/2+.045,d/2-.045])box(g,.038,height,.038,wood,x,height/2,z,.004);
  }
  function tea(g,x,y,z){
    cyl(g,.092,.095,.012,wood,x,y+.006,z,32);
    const profile=[[.025,0],[.028,.009],[.063,.049],[.064,.057],[.058,.056],[.023,.015]];
    mesh(g,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),32),ink,[x,y+.014,z]);
  }
  function lamp(g,x,y,z,height=.43){
    cyl(g,.075,.08,.024,wood,x,y+.012,z);
    cyl(g,.009,.01,height*.47,wood,x,y+height*.25,z,12);
    cyl(g,.093,.093,height*.49,ivory,x,y+height*.73,z,6);
    for(const yy of [.48,.98])cyl(g,.10,.10,.009,wood,x,y+height*yy,z,6);
    sphere(g,mats.light,[x,y+height*.55,z],[.035,.028,.035]);
  }
  function sofa(g,w=2.48){
    legs(g,w-.12,.72,.36);
    box(g,w-.10,.07,.78,wood,0,.355,0,.012);
    for(const z of [-.32,.32])box(g,w-.18,.045,.026,wood,0,.20,z,.003);
    for(const x of [-w/2+.07,w/2-.07]){
      for(const z of [-.32,.30])box(g,.035,.30,.035,wood,x,.55,z,.004);
      box(g,.065,.045,.72,wood,x,.704,0,.012);
      box(g,.025,.035,.62,wood,x,.51,0,.003);
    }
    for(const x of [-w/2+.07,0,w/2-.07])box(g,.035,.42,.035,wood,x,.59,-.345,.003);
    box(g,w-.07,.045,.06,wood,0,.81,-.345,.01);
    for(const side of [-1,1]){
      cushion(g,side*(w-.30)/4,.435,.018,(w-.30)/2-.01,.09,.66,wine);
      cushion(g,side*(w-.30)/4,.637,-.265,(w-.30)/2-.04,.30,.13,ivory,-.035);
    }
    cushion(g,-.79,.63,-.03,.34,.31,.10,moss,-.05,-.1);
    g.userData.design={family:'song-exposed-frame-settee',seatHeight:.480};
  }
  function diningChair(g){
    legs(g,.43,.42,.423);box(g,.455,.03,.435,wood,0,.421,0,.006);
    cushion(g,0,.447,0,.418,.026,.40,moss);
    for(const x of [-.183,.183])box(g,.025,.44,.025,wood,x,.65,-.192,.004);
    box(g,.48,.035,.05,wood,0,.866,-.192,.012);
    box(g,.094,.37,.016,wood,0,.65,-.192,.007);
    for(const x of [-.17,.17])box(g,.019,.022,.34,wood,x,.20,0,.003);
    box(g,.33,.022,.020,wood,0,.23,.16,.003);
    g.userData.design={family:'song-slim-timber-chair',seatHeight:.460};
  }
  function caneChair(g,scale=1,upholstery=ivory){
    const w=.62*scale,d=.53*scale;legs(g,w-.035,d,.415);
    box(g,w,.045,d,wood,0,.415,0,.01);cushion(g,0,.453,.006,w-.05,.034,d-.04,upholstery);
    for(const x of [-w*.43,w*.43]){
      for(const z of [-d*.4,d*.36])box(g,.026,.28,.026,wood,x,.545,z,.004);
      box(g,.045,.032,d*.90,wood,x,.68,0,.008);
      box(g,.026,.37,.026,wood,x,.677,-d*.4,.004);
    }
    box(g,w-.025,.036,.05,wood,0,.85,-d*.4,.01);
    box(g,.10,.40,.019,wood,0,.64,-d*.4,.004);
    g.userData.design={family:'song-open-frame-lounge',seatHeight:.470};
  }
  function roundTable(g){
    legs(g,.77,.77,.734);
    for(const z of [-.34,.34])box(g,.75,.065,.025,wood,0,.68,z,.005);
    cyl(g,.61,.61,.04,wood,0,.758,0,64);
    vase(g,0,.779,0,.17,true);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;tea(g,Math.sin(a)*.43,.779,Math.cos(a)*.43);}
    g.userData.design={family:'song-four-leg-round-table'};
  }
  function art(g,w=.75,height=.95){
    box(g,w,height,.016,linen,0,0,0,.001);
    mesh(g,new THREE.PlaneGeometry(w*.80,height*.73),artMaterial,[0,0,.012]);
    for(const y of [-height/2,height/2]){
      const roller=cyl(g,.012,.012,w+.045,wood,0,y,.013,16);roller.rotation.z=Math.PI/2;
    }
    g.userData.design={family:'song-original-ink-scroll'};
  }
  function bed(g,w=1.8,d=2.05,color=ivory){
    legs(g,w-.05,d-.08,.30);box(g,w+.025,.15,d+.06,wood,0,.305,0,.015);
    box(g,w,.21,d,ivory,0,.435,0,.055);box(g,w-.018,.075,d-.025,color,0,.575,.012,.035);
    for(const x of [-w/2-.015,w/2+.015])box(g,.05,1.16,.06,wood,x,.60,-d/2-.045,.005);
    for(const y of [.49,1.16])box(g,w+.08,.055,.065,wood,0,y,-d/2-.045,.008);
    box(g,w-.035,.61,.028,linen,0,.827,-d/2-.054,.002);
    for(const x of [-w*.24,w*.24])box(g,.018,.61,.037,wood,x,.827,-d/2-.032,.003);
    for(const x of [-w*.25,w*.25]){
      box(g,w*.43,.17,.41,ivory,x,.68,-d*.34,.065).rotation.x=.09;
      box(g,w*.37,.15,.35,color,x,.788,-d*.35,.06).rotation.x=.09;
    }
    box(g,w+.012,.043,d*.45,linen,0,.63,d*.25,.02);
    box(g,w+.02,.025,.37,moss,0,.664,d*.31,.012);
    g.userData.design={family:'song-timber-panel-bed',mattress:[w,d]};
  }
  function desk(g,w=1.12,d=.52){
    legs(g,w,d,.733);box(g,w+.02,.036,d+.012,wood,0,.751,0,.006);
    box(g,w-.07,.052,.025,wood,0,.694,-d/2+.035,.003);
    box(g,.225,.10,d-.02,wood,w/2-.165,.683,0,.005);
    book(g,-.19,.79,.055,.21,.029,.26,linen,.04);lamp(g,w/2-.17,.77,-.09,.37);
    box(g,.19,.006,.14,pages,.05,.775,.06,.001);
    box(g,.085,.016,.056,ink,-.10,.781,-.08,.008);
    bar(g,[.02,.782,.01],[.15,.782,-.08],.0025,wood);
    g.userData.design={family:'song-writing-desk',centralKneeHeight:.733};
  }
  function bedside(g){
    legs(g,.45,.37,.52);box(g,.47,.21,.39,wood,0,.40,0,.007);
    box(g,.445,.177,.014,wood,0,.398,.202,.002);
    box(g,.075,.010,.016,mats.metal,0,.415,.214,.002);
    box(g,.50,.025,.42,wood,0,.545,0,.006);lamp(g,-.06,.558,-.015,.41);
    book(g,.115,.57,.09,.12,.018,.15,linen);
  }
  function sideboard(g,w=1.50,height=.85,d=.42){
    legs(g,w-.04,d-.025,.20);box(g,w,height-.21,d,wood,0,.20+(height-.21)/2,0,.008);
    for(let i=0;i<3;i++){
      const x=(i-1)*w/3;box(g,w/3-.03,height-.27,.016,wood,x,height/2+.055,d/2+.009,.003);
      box(g,w/3-.075,height-.325,.008,wood,x,height/2+.055,d/2+.02,.002);
      cyl(g,.013,.013,.015,mats.metal,x,height/2+.08,d/2+.033,12).rotation.x=Math.PI/2;
    }
    box(g,w+.025,.025,d+.018,wood,0,height-.002,0,.006);
    vase(g,-w*.28,height+.012,0,.21,true);book(g,w*.2,height+.032,0,.24,.035,.18,linen);
  }
  function wallSconce(g){
    box(g,.11,.27,.024,wood,0,0,.012,.004);
    box(g,.085,.225,.049,ivory,0,0,.040,.005);
    for(const y of [-.116,.116])box(g,.107,.015,.06,wood,0,y,.043,.004);
    box(g,.064,.004,.033,mats.light,0,-.111,.05,.001);
  }
  return {helpers:{...base.helpers,vase,sofa,caneChair,diningChair,roundTable,art,bed,desk,bedside,sideboard,lamp,wallSconce},itemBuilders:{
    ...base.itemBuilders,
    'living-coffee':g=>{
      legs(g,1.10,.56,.35);box(g,1.16,.04,.62,wood,0,.36,0,.01);
      for(const z of [-.235,.235])box(g,1.035,.055,.025,wood,0,.31,z,.004);
      box(g,.38,.015,.22,wood,.19,.389,.025,.006);tea(g,.14,.398,.045);tea(g,.29,.398,.045);
      vase(g,-.35,.38,-.07,.18,true);
      cyl(g,.041,.043,.052,ceramic,-.05,.406,-.12);cyl(g,.042,.042,.009,wood,-.05,.437,-.12);
      g.userData.design={family:'song-tea-table'};
    },
    'living-fireplace':g=>{
      sideboard(g,1.45,.66,.40);
      const picture=new THREE.Group();picture.position.set(0,1.48,-.067);g.add(picture);art(picture,1.02,.90);
      g.userData.design={family:'song-console-and-scroll'};
    },
    'living-side-table':g=>{legs(g,.32,.32,.52);box(g,.44,.028,.44,wood,0,.55,0,.006);lamp(g,0,.565,0,.45);},
    'living-oil-painting':g=>art(g,1.46,.94),
    'entry-cabinet':g=>{
      sideboard(g,1.335,.90,.30);
      mesh(g,new THREE.CircleGeometry(.32,48),h.mirror,[0,1.55,-.05]);
      mesh(g,new THREE.TorusGeometry(.327,.008,8,48),wood,[0,1.55,-.042]);
    },
    'balcony-table':g=>{legs(g,.33,.33,.50);cyl(g,.24,.24,.028,wood,0,.514,0,48);tea(g,.065,.53,0);vase(g,-.09,.53,-.04,.15);},
  }};
}

const finish=text=>text?.replaceAll('意式','宋韵').replaceAll('黑棕木','茶褐木').replaceAll('烟熏木','茶褐木')
  .replaceAll('古铜','哑光深铜').replaceAll('炭灰皮革','米绢织物').replaceAll('深橄榄','青瓷色')
  .replaceAll('灰褐纹大理石','青灰石材').replaceAll('灰褐纹理石材','青灰石材').replaceAll('灰褐棉麻','米绢棉麻')
  .replaceAll('燕麦灰','米绢色').replaceAll('暖灰','米绢色').replaceAll('细黑框','茶褐木画轴')
  .replaceAll('原创抽象浮雕画','原创水墨挂轴').replaceAll('抽象构成浮雕画','水墨山景挂轴')
  .replaceAll('抽象浮雕画','水墨挂轴').replaceAll('抽象构成画','水墨挂轴').replaceAll('木质构成','原创水墨绢本')
  .replaceAll('原创几何浮雕构图','原创远山水墨构图').replaceAll('原创几何浮雕','原创水墨').replaceAll('岩灰','青灰');
export const SONG_SPECS=Object.fromEntries(Object.entries(ITALIAN_SPECS).map(([id,spec])=>[id,spec.map(finish)]));
Object.assign(SONG_SPECS,{
  'bathroom-toilet':['公卫陶瓷坐便器',null,'釉面陶瓷 · 哑光深铜按钮'],
  'living-sofa':['木框坐榻式软垫沙发','2.41 × 0.78 × 0.84 m','茶褐木 · 米绢织物 · 青瓷色靠垫','当代坐榻式设计，露木框、横枨与可拆洗坐垫；座面高480mm，保持茶几西侧主通道。'],
  'living-coffee':['细腿茶几与茶席','1.16 × 0.62 × 0.38 m；含瓶花高0.76m','茶褐木 · 黑釉茶盏 · 青瓷花器与香盒','茶盘、双盏和单枝瓶花；原创概括器形，桌边柔化，茶几至坐垫约380mm。'],
  'living-chair':['直背木框休闲椅','0.62 × 0.53 × 0.87 m','茶褐木 · 青瓷色软垫','露木框与中央背板，座面高470mm；扶手不超出既有座椅占地。'],
  'dining-table':['茶褐木四腿圆餐桌','Ø 1.22 × 0.78 m；含瓶花高1.15m','茶褐木 · 青瓷瓶花 · 黑釉茶盏','四腿支撑和薄桌边为当代设计；保留原有六席布置，采购时核对餐椅与桌腿关系。'],
  'living-fireplace':['茶褐木陈设柜与山景挂轴','1.48 × 0.44 × 1.94 m','茶褐木框板柜 · 青瓷 · 原创水墨挂轴','低柜配绢本意象挂轴，设备和陈设共用原影音位置；现场核对插座与画轴固定。'],
  'living-side-table':['方边几与木骨绢光台灯','0.44 × 0.44 × 1.02 m','茶褐木 · 米绢扩散罩','细腿方几，电光源台灯分路控制。'],
  'entry-cabinet':['茶褐木玄关薄柜与圆镜','1.36 × 0.34 × 1.88 m','茶褐木框板门 · 木框圆镜 · 青瓷','柜体深300mm，保留入户通道；瓶花不超出镜顶。'],
  'living-oil-painting':['客厅远山水墨挂轴','1.51 × 0.04 × 0.96 m','原创水墨画面 · 米绢装裱 · 茶褐木画轴','原创远山与松枝意象，大面积绢本留白；仅作宋韵当代设计，不是古画复制品。'],
  'balcony-table':['阳台木色茶桌','Ø 0.48 × 0.68 m（含花器）','耐候茶褐木色 · 黑釉茶盏 · 青瓷','细腿茶桌与休闲椅成组布置，保持连续通行和排水检修。'],
});
for(const [id,width,depth] of [['master-bed',1.8,2.05],['guest-bed',1.5,2],['second-bed',1.35,2]])
  SONG_SPECS[id]=[id==='master-bed'?'主卧木框绢面床':id==='guest-bed'?'次卧2木框绢面床':'次卧1木框绢面床',`${(width+.08).toFixed(2)} × ${(depth+.12).toFixed(2)} × 1.19 m；床垫${width.toFixed(2)} × ${depth.toFixed(2)} m`,'茶褐木框板床头 · 米绢棉麻 · 青瓷色床尾巾','当代标准床垫，木框床头内嵌绢面，保持既有床位和床侧通道。'];
for(const id of ['master-nightstand-left','master-nightstand-right','guest-nightstand','second-nightstand'])
  SONG_SPECS[id]=[id==='second-nightstand'?'次卧1窄款木框床头柜':'木框床头柜与绢光台灯',id==='second-nightstand'?'0.42 × 0.42 × 0.97 m':'0.50 × 0.42 × 0.97 m','茶褐木 · 木骨米绢灯罩','抽屉柜顶约558mm，台灯使用电光源，核对床头插座。'];
for(const id of ['guest-desk','study-desk'])SONG_SPECS[id]=[id==='guest-desk'?'次卧2窗边书案':'书房书案与笔砚',id==='guest-desk'?'1.27 × 0.51 × 1.14 m（含灯）':'1.14 × 0.54 × 1.14 m（含灯）','茶褐木细腿 · 侧抽屉 · 米绢灯罩 · 笔砚','桌面高769mm，中央腿位净高733mm；460mm座面，抽屉偏置留出膝部空间。'];
for(const id of ['balcony-chair-left','balcony-chair-right'])SONG_SPECS[id]=['阳台木框休闲椅','0.57 × 0.49 × 0.87 m','耐候茶褐木色 · 户外织物','露木框与可拆软垫，保留原椅位及通行范围。'];
for(const id of [...Array.from({length:6},(_,i)=>`dining-chair-${i+1}`),'guest-chair','study-chair'])
  SONG_SPECS[id]=[id.startsWith('dining')?`细腿直背餐椅 ${id.slice(-1)}`:id==='guest-chair'?'次卧2直背书椅':'书房直背书椅','0.48 × 0.44 × 0.89 m','茶褐木 · 青瓷色织物','直背板与横枨，座面高460mm；当代人体尺度，保持既有座位和通行范围。'];
for(const id of ['sconce-living-north','sconce-living-south','sconce-master'])SONG_SPECS[id]=['木骨绢面壁灯','0.11 × 0.08 × 0.27 m','茶褐木 · 米绢扩散罩 · 电光源','安装中心距地1820mm，2700K暖光，独立灯光回路。'];
