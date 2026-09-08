import { createItalianFurniture, ITALIAN_SPECS } from './italian-furniture.js';

// Retain tested utility furniture and placements; key living/dining silhouettes
// have their own geometry. All dimensions are metres.
export function createModernFurniture(THREE,mats,h){
  const {box,cyl,mesh,cushion,book,vase,ivory,linen,wine,moss,ink}=h;
  const base=createItalianFurniture(THREE,mats,h),wood=mats.walnut;
  function sofa(g,w=2.48){
    box(g,w-.30,.12,.65,wood,0,.06,0,.015);
    box(g,w-.10,.24,.80,wine,0,.25,0,.10);
    for(const side of [-1,1]){
      cushion(g,side*(w-.38)/4,.405,.035,(w-.38)/2-.012,.15,.69,wine);
      cushion(g,side*(w-.38)/4,.66,-.28,(w-.38)/2-.012,.35,.19,wine,-.04);
      box(g,.18,.34,.78,wine,side*(w/2-.12),.47,.0,.08);
    }
    cushion(g,-.75,.64,-.04,.35,.33,.12,ivory,-.05,-.12);
    cushion(g,.75,.64,-.04,.35,.33,.12,moss,-.05,.12);
    g.userData.design={family:'modern-soft-sofa',seatHeight:.480};
  }
  function diningChair(g){
    for(const x of [-.185,.185])for(const z of [-.175,.175])cyl(g,.018,.021,.414,wood,x,.207,z,12);
    box(g,.45,.025,.42,wood,0,.414,0,.012);
    cushion(g,0,.437,0,.45,.046,.43,moss);
    for(const x of [-.18,.18])box(g,.027,.43,.026,wood,x,.63,-.19,.009);
    box(g,.465,.205,.05,wood,0,.767,-.207,.023);
    box(g,.425,.16,.025,moss,0,.767,-.168,.012);
    g.userData.design={family:'modern-oak-chair',seatHeight:.460};
  }
  function roundTable(g){
    cyl(g,.22,.29,.71,wood,0,.365,0,48);
    cyl(g,.61,.61,.04,wood,0,.758,0,64);
    vase(g,0,.779,0,.18);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3,x=Math.sin(a)*.42,z=Math.cos(a)*.42;
      cyl(g,.095,.09,.013,mats.white,x,.787,z,28);
      cyl(g,.065,.065,.008,ivory,x,.797,z,28);
    }
    g.userData.design={family:'modern-oak-pedestal'};
  }
  function art(g,w=.75,height=.95){
    box(g,w,height,.027,wood,0,0,0,.003);
    box(g,w-.035,height-.035,.012,ivory,0,0,.019,.001);
    mesh(g,new THREE.CircleGeometry(w*.20,48),moss,[-w*.16,height*.16,.027]);
    box(g,w*.30,height*.46,.009,linen,w*.17,-height*.12,.028,.08);
    g.userData.design={family:'modern-tonal-relief'};
  }
  return {
    helpers:{...base.helpers,sofa,diningChair,roundTable,art},
    itemBuilders:{...base.itemBuilders,
      'living-coffee':g=>{
        for(const x of [-.43,.43])box(g,.065,.335,.43,wood,x,.172,0,.025);
        box(g,1.16,.04,.62,wood,0,.36,0,.02);
        book(g,-.22,.406,.035,.25,.05,.19,linen,.05);
        vase(g,.28,.381,-.04,.18);
        g.userData.design={family:'modern-open-oak-table'};
      },
      'living-fireplace':g=>{
        box(g,1.48,.26,.42,wood,0,.335,0,.018);
        for(const x of [-.25,.25])box(g,.003,.215,.003,ink,x,.335,.212,.001);
        const picture=new THREE.Group();picture.position.set(0,1.52,-.067);g.add(picture);art(picture,1.08,.83);
        vase(g,-.53,.47,0,.22);
        g.userData.design={family:'modern-floating-oak-console'};
      },
      'living-oil-painting':g=>art(g,1.46,.94),
    },
  };
}

// Shared dimensions and operational notes stay aligned with the utility meshes.
const finish=text=>text?.replaceAll('意式','现代').replaceAll('黑棕木','浅橡木').replaceAll('烟熏木','浅橡木')
  .replaceAll('古铜','石墨色').replaceAll('炭灰皮革','燕麦织物').replaceAll('深橄榄','鼠尾草')
  .replaceAll('灰褐纹大理石','浅砂石材').replaceAll('灰褐纹理石材','浅砂石材')
  .replaceAll('灰褐棉麻','暖白棉麻').replaceAll('燕麦灰','暖米色').replaceAll('暖灰','暖白')
  .replaceAll('黑灰木质构成','浅色木质构成').replaceAll('细黑框','浅木框').replaceAll('岩灰','暖白');
export const MODERN_SPECS=Object.fromEntries(Object.entries(ITALIAN_SPECS).map(([id,spec])=>[id,spec.map(finish)]));
Object.assign(MODERN_SPECS,{
  'bathroom-toilet':['公卫陶瓷坐便器',null,'釉面陶瓷 · 石墨色按钮'],
  'living-sofa':['圆角双座棉麻沙发','2.42 × 0.80 × 0.84 m','浅橡木内框 · 燕麦织物 · 暖白靠垫 · 鼠尾草配色','座面高480mm，双座分体坐垫与低靠背；茶几至座垫约380mm，西侧保留主通道。'],
  'living-coffee':['浅橡木开放茶几','1.16 × 0.62 × 0.38 m；含陈设高0.54m','哑光浅橡木 · 圆角桌面','双片木腿支撑，桌下开放；桌面圆角减少磕碰，至沙发座垫约380mm。'],
  'dining-table':['浅橡木圆餐桌','Ø 1.22 × 0.78 m；含花器高0.94m','哑光浅橡木 · 中央承托柱','中央木柱让出周边腿位，六席使用沿用原餐区布置。'],
  'living-fireplace':['浅橡木悬浮影音柜与留白画','1.48 × 0.44 × 1.94 m','浅橡木平板柜 · 原创浅色浮雕画','柜底离地205mm，隐藏承重连接件；墙体承载和电位需按现场深化。'],
  'living-oil-painting':['客厅留白几何画','1.46 × 0.06 × 0.94 m','浅木框 · 暖白底板 · 鼠尾草与浅砂浮雕','原创低对比圆形与圆角构图，保留沙发上方挂画位置。'],
});
for(const id of [...Array.from({length:6},(_,i)=>`dining-chair-${i+1}`),'guest-chair','study-chair'])
  MODERN_SPECS[id]=[id.startsWith('dining')?`浅橡木餐椅 ${id.slice(-1)}`:id==='guest-chair'?'次卧2浅橡木书椅':'书房浅橡木书椅','0.47 × 0.46 × 0.88 m','浅橡木细腿 · 鼠尾草织物软包','座面高460mm，平直木靠背内覆薄软包；沿用既有座位和通道。'];
