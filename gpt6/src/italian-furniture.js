// Contemporary Italian furniture uses the same measured placement envelopes as
// the French scheme. Dimensions are metres; all shapes are original geometry.
export function createItalianFurniture(THREE, mats, h) {
  const {box,cyl,sphere,bar,mesh,cushion,book,vase,ivory,linen,wine,moss,ink,mirror,pages} = h;
  const wood=mats.walnut,stone=mats.marble,metal=mats.brass;
  function lamp(g,x,y,z,height=.43) {
    cyl(g,.075,.085,.022,metal,x,y+.011,z);
    bar(g,[x,y+.025,z],[x,y+height-.09,z],.009,metal);
    sphere(g,mats.light,[x,y+height-.075,z],[.075,.075,.075]);
    cyl(g,.082,.082,.012,metal,x,y+height-.014,z);
  }
  function rug(g,w,d) {
    box(g,w,.014,d,mats.rug,0,.012,0,.026);
    // A quiet woven field with a narrow sewn edge, without a historical medallion.
    for(const x of [-w/2+.018,w/2-.018])box(g,.008,.002,d-.03,linen,x,.020,0,.001);
  }
  function sofa(g,w=2.48) {
    box(g,w-.24,.18,.66,ink,0,.09,-.015,.025);
    box(g,w-.08,.19,.80,wine,0,.245,0,.07);
    for(let i=0;i<3;i++) {
      const x=(i-1)*(w-.32)/3;
      cushion(g,x,.405,.015,(w-.32)/3-.012,.15,.72,wine);
      cushion(g,x,.645,-.306,(w-.32)/3-.012,.36,.20,wine,-.05);
    }
    for(const s of [-1,1])box(g,.16,.32,.80,wine,s*(w/2-.10),.46,0,.07);
    cushion(g,-.81,.635,-.085,.39,.35,.13,ivory,-.08,-.15);
    cushion(g,.79,.615,-.07,.39,.32,.13,moss,-.07,.13);
    g.userData.design={family:'italian-modular',seatHeight:.480};
  }
  function caneChair(g,scale=1,upholstery=ivory) {
    const w=.62*scale,d=.53*scale;
    for(const s of [-1,1]) {
      const x=s*w*.43;
      bar(g,[x,.03,-d*.4],[x,.42,-d*.36],.014,metal);
      bar(g,[x,.03,d*.4],[x,.42,d*.36],.014,metal);
      bar(g,[x,.40,-d*.38],[x,.63,-d*.37],.014,metal);
      bar(g,[x,.63,-d*.37],[x,.63,d*.32],.016,metal);
      box(g,.055,.045,d*.66,wood,x,.638,0,.02);
    }
    cushion(g,0,.423,.015,w-.07,.094,d-.03,upholstery);
    box(g,w-.04,.35,.095,upholstery,0,.686,-d*.43,.045);
    g.userData.design={family:'italian-slim-lounge',seatHeight:.470};
  }
  function diningChair(g) {
    for(const x of [-.20,.20])for(const z of [-.19,.19])
      bar(g,[x,.015,z],[x*.90,.425,z*.89],.012,metal);
    box(g,.45,.03,.425,ink,0,.402,0,.013);
    cushion(g,0,.434,0,.46,.052,.44,moss);
    for(const x of [-.175,.175])bar(g,[x,.42,-.19],[x,.85,-.215],.010,metal);
    box(g,.465,.25,.065,moss,0,.759,-.207,.034);
    g.userData.design={family:'italian-metal-chair',seatHeight:.460};
  }
  function roundTable(g) {
    // Hollow-looking fluted-free stone drum sits clear of knees at the perimeter.
    cyl(g,.245,.30,.035,ink,0,.023,0,48);
    cyl(g,.205,.25,.68,stone,0,.38,0,48);
    cyl(g,.59,.59,.016,ink,0,.738,0,64);
    cyl(g,.61,.61,.032,stone,0,.762,0,64);
    vase(g,0,.779,0,.20);
    for(let i=0;i<6;i++) {
      const a=i*Math.PI/3,setting=new THREE.Group();setting.position.set(Math.sin(a)*.42,0,Math.cos(a)*.42);setting.rotation.y=a;g.add(setting);
      cyl(setting,.095,.09,.012,mats.ceramic,0,.787,0,28);
      cyl(setting,.065,.068,.008,ivory,0,.797,0,28);
      box(setting,.043,.006,.10,linen,.105,.783,0,.002);
      bar(setting,[-.108,.786,-.045],[-.108,.786,.045],.0027,metal);
      cyl(setting,.026,.028,.10,mats.glass,.066,.831,-.12,24);
    }
  }
  function sideboard(g,w=1.50,height=.85,d=.42) {
    box(g,w-.13,.10,d-.10,ink,0,.05,0,.005);
    box(g,w,height-.13,d,wood,0,.10+(height-.13)/2,0,.012);
    for(let i=0;i<3;i++)box(g,w/3-.012,height-.18,.016,wood,(i-1)*w/3,height/2+.035,d/2+.007,.004);
    box(g,w-.10,.009,.008,metal,0,height-.07,d/2+.018,.001);
    box(g,w+.025,.025,d+.018,stone,0,height-.002,0,.01);
    vase(g,-w*.28,height+.012,0,.25);book(g,w*.20,height+.032,0,.24,.035,.18,ink);
  }
  function bedside(g) {
    box(g,.40,.045,.32,ink,0,.025,0,.008);
    box(g,.47,.48,.39,wood,0,.285,0,.012);
    for(const y of [.18,.405])box(g,.447,.21,.014,wood,0,y,.202,.003);
    box(g,.46,.009,.010,metal,0,.297,.207,.001);
    box(g,.50,.025,.42,stone,0,.545,0,.01);
    lamp(g,-.06,.558,-.015,.41);book(g,.115,.57,.09,.12,.018,.15,ink);
  }
  function bed(g,w=1.8,d=2.05,color=ivory) {
    box(g,w-.12,.17,d-.13,ink,0,.085,0,.018);
    box(g,w+.035,.19,d+.07,wood,0,.265,0,.045);
    box(g,w,.21,d,ivory,0,.435,0,.07);
    box(g,w-.018,.075,d-.025,color,0,.575,.012,.045);
    // Straight upholstered headboard with a fine shadow reveal, no crest or studs.
    box(g,w+.08,1.13,.10,wood,0,.645,-d/2-.059,.02);
    for(const x of [-w*.25,w*.25])box(g,w*.5-.012,.83,.082,color,x,.784,-d/2+.002,.043);
    for(const x of [-w*.25,w*.25]) {
      cushion(g,x,.68,-d*.34,w*.43,.17,.41,ivory,.09);
      cushion(g,x,.788,-d*.35,w*.37,.15,.35,color,.09);
    }
    box(g,w+.012,.043,d*.45,linen,0,.63,d*.25,.03);
    box(g,w+.02,.025,.37,moss,0,.664,d*.31,.018);
    g.userData.design={family:'italian-upholstered-platform',mattress:[w,d]};
  }
  function desk(g,w=1.12,d=.52) {
    for(const x of [-w/2+.05,w/2-.05])for(const z of [-d/2+.04,d/2-.04])
      box(g,.023,.724,.023,metal,x,.362,z,.004);
    box(g,w+.02,.036,d+.012,wood,0,.751,0,.01);
    box(g,w-.06,.03,.03,ink,0,.718,-d/2+.035,.003);
    box(g,.235,.115,d-.02,wood,w/2-.165,.667,0,.008);
    box(g,.22,.006,.012,metal,w/2-.165,.684,d/2+.006,.001);
    book(g,-.19,.79,.055,.21,.029,.26,ink,.04);
    lamp(g,w/2-.17,.77,-.09,.37);
    box(g,.19,.006,.14,pages,.05,.775,.06,.001);
    g.userData.design={family:'italian-side-drawer-desk',centralKneeHeight:.733};
  }
  function art(g,w=.75,height=.95) {
    box(g,w,height,.025,ink,0,0,0,.001);
    box(g,w-.028,height-.028,.011,linen,0,0,.018,.001);
    // Original sculptural composition: a charcoal disc, dark timber field and bronze line.
    mesh(g,new THREE.CircleGeometry(w*.22,48),ink,[-w*.16,height*.16,.025]);
    box(g,w*.30,height*.63,.010,wood,w*.16,-height*.02,.03,.07);
    bar(g,[-w*.32,-height*.30,.04],[w*.31,height*.19,.04],.004,metal);
  }
  function daybed(g) {
    box(g,1.22,.31,2.12,wood,0,.17,0,.016);
    box(g,1.13,.012,.57,wood,0,.329,-.69,.004);
    for(const z of [-.69,0,.69])cushion(g,0,.40,z,1.19,.16,.67,linen);
    box(g,1.17,.028,1.40,ivory,0,.494,.28,.02);
    for(const z of [-1.06,1.06])box(g,1.24,.31,.07,wood,0,.49,z,.018);
    cushion(g,0,.584,-.72,1.03,.16,.37,ivory,.05);
    cushion(g,0,.703,-.91,.73,.28,.10,moss,-.05);
    box(g,1.20,.032,.47,moss,0,.526,.53,.012);
    for(const z of [.10,.75]) {
      box(g,.018,.19,.58,wood,.619,.20,z,.003);
      bar(g,[.639,.24,z-.09],[.639,.24,z+.09],.006,metal);
    }
  }
  function bookshelf(g,w=1.08,height=2.33) {
    box(g,w,height,.026,wood,0,height/2,-.135,.004);
    for(const x of [-w/2+.013,w/2-.013])box(g,.026,height,.37,wood,x,height/2,.025,.004);
    for(const y of [.08,.47,.91,1.35,1.79,2.30])box(g,w-.026,.028,.37,wood,0,y,.025,.004);
    for(let row=0;row<5;row++) {
      for(let i=0;i<5;i++)box(g,.045,.21+(i%3)*.027,.19,[ivory,ink,linen][i%3],-w*.36+i*.07,.107+row*.443+(.21+(i%3)*.027)/2,.055,.002);
      if(row%2===0)vase(g,w*.29,.109+row*.443,.06,.20);
    }
    box(g,.018,height-.055,.018,metal,w/2-.048,height/2,.205,.002);
  }
  function fireplace(g) {
    // A suspended stone media console replaces the French mantel entirely.
    box(g,1.48,.26,.42,stone,0,.335,0,.012);
    box(g,1.30,.012,.018,ink,0,.25,.218,.003);
    for(const x of [-.46,0,.46])box(g,.003,.20,.003,ink,x,.344,.213,.001);
    const picture=new THREE.Group();picture.position.set(0,1.52,-.067);g.add(picture);art(picture,1.08,.83);
    vase(g,-.53,.473,0,.27);book(g,.35,.497,.01,.27,.043,.20,ink);
    g.userData.design={family:'italian-stone-media-console'};
  }
  function wallSconce(g) {
    box(g,.075,.27,.035,metal,0,0,.012,.01);
    box(g,.028,.23,.035,mats.light,-.042,0,.022,.01);
    box(g,.028,.23,.035,mats.light,.042,0,.022,.01);
  }
  const itemBuilders={
    'living-coffee':g=>{
      box(g,.88,.055,.43,ink,0,.034,0,.025);
      box(g,1.16,.32,.62,stone,0,.221,0,.022);
      book(g,-.22,.406,.045,.25,.05,.19,ink,.05);
      vase(g,.27,.383,-.055,.19);cyl(g,.035,.035,.046,mats.ceramic,.06,.406,.12);
      g.userData.design={family:'italian-stone-monolith'};
    },
    'living-side-table':g=>{
      cyl(g,.16,.17,.023,ink,0,.016,0);cyl(g,.06,.085,.51,wood,0,.273,0);
      cyl(g,.22,.22,.026,stone,0,.554,0);lamp(g,0,.568,0,.45);
    },
    'entry-cabinet':g=>{
      box(g,1.28,.08,.27,ink,0,.04,0,.008);box(g,1.34,.81,.31,wood,0,.485,0,.01);
      for(const x of [-.335,.335])box(g,.654,.75,.014,wood,x,.49,.161,.004);
      box(g,1.36,.026,.335,stone,0,.905,0,.008);
      vase(g,-.42,.919,0,.19);cyl(g,.09,.085,.02,metal,.31,.93,0);
      mesh(g,new THREE.CircleGeometry(.32,48),mirror,[0,1.55,-.05]);
      mesh(g,new THREE.TorusGeometry(.327,.006,7,48),metal,[0,1.55,-.042]);
    },
    'living-oil-painting':g=>{art(g,1.46,.94);g.name='客厅原创抽象浮雕画';},
  };
  return {helpers:{lamp,rug,sofa,caneChair,diningChair,roundTable,sideboard,bedside,bed,desk,art,daybed,bookshelf,fireplace,wallSconce},itemBuilders};
}

// Keep operational limitations alongside the new finishes: a style change does
// not create more circulation width, storage volume, drainage or ventilation.
export const ITALIAN_SPECS = {
  'living-plant':['琴叶榕与素陶盆','含叶幅约0.87 × 0.88 × 1.48 m','素陶盆 · 室内绿植'],
  'guest-plant':['次卧2窗边绿植','含叶幅约0.42 × 0.43 × 0.72 m','素陶盆 · 室内绿植'],
  'balcony-plant-a':['阳台高株盆栽','含叶幅约0.80 × 0.81 × 1.37 m','素陶盆 · 绿植'],
  'balcony-plant-b':['阳台中株盆栽','含叶幅约0.56 × 0.57 × 0.95 m','素陶盆 · 绿植'],
  'balcony-plant-c':['阳台小株盆栽','含叶幅约0.36 × 0.36 × 0.61 m','素陶盆 · 绿植'],
  'living-rug':['客厅素色羊毛地毯','2.40 × 3.70 m','燕麦灰羊毛短绒 · 窄锁边'],
  'living-sofa':['意式模块炭灰皮革沙发','2.44 × 0.82 × 0.84 m','黑棕木内框 · 炭灰皮革软包 · 暖灰靠垫 · 深橄榄配色','座面高480mm，低靠背和宽扶手；茶几至座垫前沿约380mm，主要通行保留在茶几西侧。'],
  'living-coffee':['灰褐纹大理石体块茶几','1.16 × 0.62 × 0.38 m（含花器高0.55m）','哑光灰褐纹大理石饰面 · 内部轻质承托','采用中空承托结构加石材饰面，避免整块实心石材过重；圆角处理，至沙发座垫约380mm。'],
  'living-chair':['薄金属框软包休闲椅','0.64 × 0.60 × 0.87 m','古铜金属 · 深橄榄织物 · 黑棕木扶手','座面高470mm；简洁金属框架，坐垫可拆洗，保持原椅位通行范围。'],
  'living-fireplace':['悬浮石材影音柜与抽象画','1.48 × 0.44 × 1.94 m','灰褐纹大理石饰面 · 隐藏承重连接件 · 抽象画','采用墙挂悬浮柜，原壁炉位置改为影音与陈设区；下沿离地205mm。墙体承载与插座须深化，上方可按电视型号换装。'],
  'living-side-table':['石面圆边几与球形台灯','Ø 0.44 × 1.02 m（含台灯）','黑棕木 · 灰褐纹大理石 · 古铜金属 · 乳白玻璃'],
  'dining-table':['圆石面六人餐桌','Ø 1.22 × 0.78 m；含花器高0.96m','哑光灰褐纹大理石饰面 · 中央承托柱'],
  'dining-sideboard':['黑棕木平板餐边柜','1.53 × 0.46 × 0.87 m；含陈设高1.08m','黑棕木平板门 · 灰褐纹大理石台面 · 隐藏拉手'],
  'entry-cabinet':['黑棕木玄关薄柜与圆镜','1.36 × 0.34 × 1.88 m（含镜）','黑棕木平板门 · 灰褐纹大理石 · 细金属镜框','保留310mm柜体深度与原入户通道；平板对开门，玄关镜与托盘用于日常整理。'],
  'dining-art':['餐区抽象构成浮雕画','0.75 × 0.95 m','细黑框 · 素色底板 · 木质与金属构成','原创几何浮雕构图，安装中心高1.70m；画框固定在实墙。'],
  'master-rug':['主卧素色羊毛地毯','2.45 × 2.55 m','燕麦灰羊毛短绒'],
  'master-bed':['主卧直线软包悬浮床','1.88 × 2.20 × 1.21 m；床垫1.80 × 2.05 m','黑棕木床架 · 暖灰软包床头 · 棉麻床品'],
  'master-nightstand-left':['主卧平板床头柜与球形灯','0.50 × 0.42 × 0.97 m','黑棕木 · 灰褐纹大理石 · 乳白玻璃灯'],
  'master-nightstand-right':['主卧平板床头柜与球形灯','0.50 × 0.42 × 0.97 m','黑棕木 · 灰褐纹大理石 · 乳白玻璃灯'],
  'master-wardrobe':['主卧0.90m平板成品衣柜','0.90 × 0.72 × 2.42 m（预留外包）','黑棕木平板门 · 细金属拉手'],
  'master-art':['主卧抽象浮雕画','0.64 × 0.73 m','木质构成 · 细黑框'],
  'guest-rug':['次卧2素色地毯','2.05 × 2.15 m','燕麦灰短绒羊毛'],
  'guest-bed':['次卧2黑棕木软包床','1.58 × 2.15 × 1.21 m；床垫1.50 × 2.00 m','黑棕木 · 灰褐棉麻 · 平直软包'],
  'guest-nightstand':['次卧2石面床头柜','0.50 × 0.42 × 0.97 m（含灯）','黑棕木 · 灰褐纹大理石 · 乳白玻璃','柜顶高558mm，接近床垫面；灯与床头插座分区控制。'],
  'guest-wardrobe':['次卧2平板折叠衣物浅柜','1.49 × 0.40 × 2.42 m（预留外包）','黑棕木 · 平板柜门'],
  'guest-desk':['次卧2薄金属脚窗边书桌','1.27 × 0.51 × 0.77 m；含灯高1.14m','黑棕木桌面 · 古铜金属脚 · 侧抽屉','桌面高769mm，中央腿位净高733mm；配460mm座面，膝上净空273mm。窗扇开启仍须现场复核。'],
  'second-rug':['次卧1素色羊毛地毯','1.80 × 2.20 m','羊毛短绒 · 窄锁边'],
  'second-bed':['次卧1直线软包小双人床','1.43 × 2.15 × 1.21 m；床垫1.35 × 2.00 m','黑棕木 · 深橄榄软包 · 棉麻床品'],
  'second-nightstand':['次卧1窄款平板床头柜','0.42 × 0.42 × 0.97 m（含灯）','黑棕木 · 灰褐纹大理石 · 球形台灯'],
  'second-wardrobe':['次卧1双轨平板推拉衣柜','1.94 × 0.73 × 2.42 m（预留外包）','黑棕木平板门 · 双轨 · 内嵌拉手'],
  'study-daybed':['黑棕木收纳日间床','1.28 × 2.19 × 0.85 m','黑棕木平板抽屉 · 棉麻分体床垫','睡眠净面约1.19×2.05m；北段上翻取物，另外两格向东抽屉行程不超过500mm，延续避让书桌的使用方式。'],
  'study-desk':['书房薄金属脚书桌','1.14 × 0.54 × 0.77 m；含灯高1.14m','黑棕木 · 古铜金属 · 侧抽屉','桌面高769mm，中央腿位净高733mm；座面高460mm，膝上净空273mm。右侧抽屉不占中央腿位。'],
  'study-bookcase':['黑棕木开放书柜','1.08 × 0.38 × 2.33 m','黑棕木层板 · 细金属收边'],
  'study-art':['书房抽象构成画','0.61 × 0.73 m','细黑框 · 原创几何浮雕'],
  'kitchen-sink':['厨房平板洗切柜与金属龙头',null,'岩灰平板门 · 石材台面 · 不锈钢水槽'],
  'kitchen-cooking':['厨房平板烹饪柜与嵌入式烤箱',null,'岩灰平板柜门 · 石材 · 古铜金属'],
  'kitchen-fridge':['哑光平板双门冰箱','0.68 × 0.75 × 1.95 m（含把手）','哑光面板 · 细金属拉手'],
  'kitchen-shelf':['黑棕木开放搁板','1.02 × 0.20 × 0.67 m（含托架及杯具）','黑棕木 · 古铜金属托架'],
  'bathroom-vanity':['公卫平板浴室柜与直线镜','0.86 × 0.57 × 2.02 m（含镜灯）','防潮黑棕木板 · 石材 · 陶瓷 · 线性镜灯'],
  'ensuite-vanity':['主卫浅款平板浴室柜与直线镜','1.05 × 0.41 × 2.02 m（含镜灯）','防潮黑棕木板 · 浅石台面 · 陶瓷盆 · 线性镜灯'],
  'ensuite-towel':['主卫细金属毛巾架',null,'古铜金属 · 棉质毛巾'],
  'balcony-rug':['阳台素色编织地毯','2.50 × 0.94 m','耐候编织纤维 · 素色'],
  'balcony-chair-left':['阳台金属框休闲椅','0.59 × 0.56 × 0.87 m','耐候金属 · 户外织物 · 木扶手'],
  'balcony-chair-right':['阳台金属框休闲椅','0.59 × 0.56 × 0.87 m','耐候金属 · 户外织物 · 木扶手'],
  'balcony-table':['阳台石面金属边桌','Ø 0.48 × 0.53 m（不含花器）','石材 · 古铜金属','与休闲椅成组布置，保留南侧连续通行带；花器可移除，排水点保持可检修。'],
  'balcony-cabinet':['阳台平板低矮收纳柜','1.21 × 0.46 × 0.78 m；含陈设高0.99m','耐候黑棕木色木作 · 石面'],
  'living-oil-painting':['客厅原创抽象浮雕画','1.46 × 0.06 × 0.95 m','细黑框 · 黑灰木质构成 · 古铜线条','原创几何浮雕作品，保留沙发上方挂画位置；无外部画作图片依赖。'],
  'living-curtains':['客厅极简落地帘','轨道3.66m；高2.53m','棉麻布 · 薄纱 · 顶装细轨道','顶装细轨道与均匀褶皱，双侧窄收帘；保留阳台采光，帘底离地约60mm。'],
};
for(const id of [...Array.from({length:6},(_,i)=>`dining-chair-${i+1}`),'guest-chair','study-chair'])
  ITALIAN_SPECS[id]=[id.startsWith('dining')?`意式薄框餐椅 ${id.slice(-1)}`:id==='guest-chair'?'次卧2薄框书椅':'书房薄框软包椅','0.48 × 0.47 × 0.89 m','古铜金属 · 深橄榄织物软包','未压缩座面高460mm；金属细腿与薄软包靠背，保持原有单人就座和通行安排。'];
for(const id of ['sconce-living-north','sconce-living-south','sconce-master'])
  ITALIAN_SPECS[id]=['双侧线性壁灯','0.12 × 0.06 × 0.27 m','古铜金属 · 2700K漫射灯罩','安装中心距地1820mm；独立灯光回路，双侧漫射减少直视眩光。'];
for(const id of ['bathroom-shower','ensuite-shower'])
  ITALIAN_SPECS[id]=['极简金属花洒与双轨玻璃隔断',id==='bathroom-shower'?'0.91 × 1.57 × 2.14 m（含花洒及拉手）':'0.91 × 1.70 × 2.14 m（含花洒及拉手）','钢化玻璃 · 古铜金属 · 防滑石材'];
