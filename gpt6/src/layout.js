/**
 * 原图转译：坐标单位为米，x 向图右，z 向图下。面积取原图标签；
 * 轮廓由标注尺寸与图像比例推导，墙厚和净高需要现场复测。
 */
export const HOUSE = { width: 8.853, depth: 16.375, height: 2.8, wallThickness: 0.18, area: 110.71 };
export const FOOTPRINT = [[1.70,.10],[8,.10],[8,5.39],[8.753,5.39],[8.753,8.72],[8,8.72],[8,14.53],[7.20,14.53],[7.20,16.275],[.10,16.275],[.10,2.84],[1.70,2.84]];
export const ROOMS = [
  {id:'living', name:'客餐厅', en:'Living & Dining', area:39.09,
    polygon:[[2.98,3.58],[5.76,3.58],[5.76,5.39],[4.28,5.39],[4.28,14.53],[.10,14.53],[.10,5.77],[2.98,5.77]],
    center:[2.15,10.05], dimension:'主区约 4.00 × 8.52 m，含北侧通道',
    description:'深胡桃木人字拼地板、奶油石膏线与酒红丝绒，客餐一体保留连续动线。',
    view:{position:[.82,1.64,9.90],target:[3.45,1.08,12.55]}},
  {id:'master', name:'主卧', en:'Primary Bedroom', area:14.88,
    polygon:[[4.28,8.72],[5.48,8.72],[5.48,10.68],[8,10.68],[8,14.53],[4.28,14.53]],
    center:[6.18,12.56], dimension:'睡眠区约 3.54 × 3.65 m，含入室通道',
    description:'胡桃木床与暖白护墙，灰绿织物在柔和光线中呈现安静的旧宅气质。',
    view:{position:[4.83,1.62,14.05],target:[6.58,1.08,11.40]}},
  {id:'bedroom2', name:'次卧 2', en:'Guest Bedroom', area:13.34,
    polygon:[[4.28,5.39],[8.753,5.39],[8.753,8.72],[4.28,8.72]],
    center:[6.45,7.05], dimension:'约 4.29 × 3.15 m，含东侧窗边区',
    description:'复古胡桃木家具、暖米色床品与窗边阅读位，兼顾客房和日常休息。',
    view:{position:[4.77,1.56,8.14],target:[6.65,1.0,6.03]}},
  {id:'bedroom1', name:'次卧 1', en:'Second Bedroom', area:10.01,
    polygon:[[4.68,.10],[8,.10],[8,3.58],[4.68,3.58]],
    center:[6.34,1.87], dimension:'原图标注 3.068 × 3.263 m',
    description:'低饱和灰绿与深色木家具相配，保留窗前自然采光和床侧活动空间。',
    view:{position:[5.30,1.54,3.05],target:[7.23,1.02,1.26]}},
  {id:'study', name:'榻榻米 / 书房', en:'Library & Daybed', area:8.34,
    polygon:[[1.70,.10],[4.68,.10],[4.68,3.58],[2.98,3.58],[2.98,2.84],[1.70,2.84]],
    center:[3.18,1.50], dimension:'原图主区 2.810 × 2.484 m，含入口凹位',
    description:'以法式书房重释原榻榻米空间，深木书柜、书桌与日间休憩床组合。',
    view:{position:[4.18,1.52,3.04],target:[2.55,1.0,1.11]}},
  {id:'kitchen', name:'厨房', en:'Kitchen', area:7.24,
    polygon:[[.10,2.84],[2.98,2.84],[2.98,5.77],[.10,5.77]],
    center:[1.54,4.30], dimension:'约 2.62 × 2.76 m',
    description:'奶油色古典框门、深木操作台与黄铜五金，用石材地面衔接客餐厅。',
    view:{position:[1.80,1.56,5.34],target:[1.04,1.04,3.50]}},
  {id:'bathroom', name:'公卫', en:'Guest Bathroom', area:3.36,
    polygon:[[5.76,3.58],[8,3.58],[8,5.39],[5.76,5.39]],
    center:[6.91,4.50], dimension:'原图进深 1.495 m，宽度约 2.24 m',
    description:'暖白石材、黄铜龙头和古典镜框，小空间保持清晰的干湿分区。',
    view:{position:[6.60,1.52,4.23],target:[7.35,1.04,4.65]}},
  {id:'ensuite', name:'主卫', en:'Ensuite', area:4.05,
    polygon:[[5.48,8.72],[8,8.72],[8,10.68],[5.48,10.68]],
    center:[6.77,9.68], dimension:'原图进深 1.708 m，宽度约 2.52 m',
    description:'温润石材与胡桃木浴室柜延续主卧调性，留出淋浴和台盆操作空间。',
    view:{position:[5.88,1.52,9.63],target:[7.33,1.0,9.60]}},
  {id:'balcony', name:'阳台', en:'Winter Garden', area:10.4,
    polygon:[[.10,14.53],[7.20,14.53],[7.20,16.275],[.10,16.275]],
    center:[3.67,15.41], dimension:'原图标注 6.792 × 1.531 m',
    description:'法式铁艺栏杆与浅色石地，藤编休闲家具构成连接客厅的阳光角落。',
    view:{position:[5.10,1.55,15.87],target:[2.48,1.02,15.17]}}
];

// 开口 offset / width 沿墙起点到终点计；窗 sill = 0.86 m，门净高 2.24 m（方案假设）。
const door = (offset,width=0.9,extra={}) => ({type:'door',offset,width,height:2.24,sill:0,...extra});
const window = (offset,width,extra={}) => ({type:'window',offset,width,height:1.53,sill:.87,...extra});
export const WALLS = [
  {id:'north',a:[1.70,.10],b:[8,.10],exterior:true, openings:[window(.66,1.50),window(3.83,1.82)]},
  {id:'study-west',a:[1.70,.10],b:[1.70,2.84],exterior:true},
  {id:'kitchen-north',a:[.10,2.84],b:[2.98,2.84],openings:[window(.33,.96)],exterior:true},
  {id:'west',a:[.10,2.84],b:[.10,14.53],exterior:true,openings:[door(3.38,1.13,{entry:true})]},
  {id:'east-north',a:[8,.10],b:[8,5.39],exterior:true,openings:[window(3.97,.88,{frosted:true})]},
  {id:'bedroom2-bay-north',a:[8,5.39],b:[8.753,5.39],exterior:true},
  {id:'bay-east',a:[8.753,5.39],b:[8.753,8.72],exterior:true,openings:[window(.30,2.55,{sill:.55,height:1.85})]},
  {id:'bedroom2-bay-south',a:[8,8.72],b:[8.753,8.72],exterior:true},
  {id:'east-south',a:[8,8.72],b:[8,14.53],exterior:true,openings:[window(.41,.92,{frosted:true})]},
  {id:'south',a:[.10,14.53],b:[8,14.53],exterior:true,openings:[door(.60,3.32,{type:'slider',height:2.42}),door(4.45,2.23,{type:'slider',height:2.42})]},
  {id:'balcony-west',a:[.10,14.53],b:[.10,16.275],exterior:true,openings:[window(.20,1.30,{sill:.18,height:2.28,handleSide:-1})]},
  {id:'balcony-east',a:[7.20,14.53],b:[7.20,16.275],exterior:true,openings:[window(.20,1.30,{sill:.18,height:2.28})]},
  {id:'study-bedroom1',a:[4.68,.10],b:[4.68,3.58]},
  {id:'study-south',a:[2.98,3.58],b:[4.68,3.58],openings:[door(.14,.98,{hinge:'start',swing:1,openAngle:78})]},
  {id:'bedroom1-south',a:[4.68,3.58],b:[8,3.58],openings:[door(.15,.84,{hinge:'start',swing:-1,openAngle:90,designNote:'次卧1改为西铰内开，模型门宽按公卫T形墙内面收至840mm；原图门宽未标，须复尺'})]},
  {id:'kitchen-east',a:[2.98,2.84],b:[2.98,5.77]},
  {id:'kitchen-south',a:[.10,5.77],b:[2.98,5.77],openings:[door(1.60,1.12,{glazed:true})]},
  {id:'bathroom-west',a:[5.76,3.58],b:[5.76,5.39],openings:[door(.47,.82,{operation:'sliding',panels:2,slideDirection:1,slideSide:-1,panelOverlap:.006,parkGap:.007,trackPadding:0,trackOverhang:0,designNote:'公卫保留洞口，内侧双联门各416mm，南端停放余量仅7mm；需精确定制轨道门套及闭合搭接，原图1495mm净深须现场重配确认'})]},
  {id:'bedroom2-north',a:[4.28,5.39],b:[8,5.39]},
  {id:'bedroom2-west',a:[4.28,5.39],b:[4.28,8.72],openings:[door(2.16,.92,{operation:'sliding',panels:1,slideDirection:-1,slideSide:1})]},
  {id:'bedroom2-south',a:[4.28,8.72],b:[8,8.72]},
  {id:'master-west',a:[4.28,8.72],b:[4.28,14.53],openings:[door(.40,.92,{operation:'sliding',panels:1,slideDirection:1,slideSide:1})]},
  {id:'ensuite-west',a:[5.48,8.72],b:[5.48,10.68],openings:[door(.43,.80,{operation:'sliding',panels:2,slideDirection:1,slideSide:1,positionAssumption:'原图估算开口沿原墙段南调150mm，施工前复尺确认'})]},
  {id:'ensuite-south',a:[5.48,10.68],b:[8,10.68]}
];
// 主卧东侧长窗缺少原图依据，默认实墙；现场确认后再决定该立面。
export const DOORS = WALLS.flatMap(wall => (wall.openings || []).filter(o=>o.type!=='window').map(opening=>({wall:wall.id,...opening})));
