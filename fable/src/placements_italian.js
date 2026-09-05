// Italian contemporary-luxury placement table (plan mm; r = yaw, 0 = faces south).
import * as THREE from 'three';
const deg = THREE.MathUtils.degToRad;

export const PLACEMENTS_ITALIAN = [
  // ---- 玄关 / 客餐厅 -----------------------------------------------------
  { a: 'it_wine_cabinet', x: 2000, y: 6061, r: 0, n: '黑框玻璃酒柜 1600×2400', note: '烟灰玻璃层板逐层 LED 背光，滑动玻璃门', room: 'living' },
  { a: 'it_console', x: 3550, y: 6061, r: 0, n: '玄关矮柜 1400', note: '炭灰烤漆 + 灰色大理石台面，香槟金饰线', room: 'living', skip: true },
  { a: 'it_vase_black', x: 489, y: 9850, r: 0, z: 700, n: '黑陶高瓶 + 枝叶', room: 'living', skip: true },
  { a: 'it_hook_rail', x: 254, y: 7300, r: 90, n: '黑钛挂衣杆', note: '入户门南侧，离地 1600', room: 'living' },
  { a: 'it_bench', x: 482, y: 7400, r: 90, n: '皮革换鞋凳 1000', note: '焦糖皮革 + 黑钛雪橇腿', room: 'living' },
  { a: 'it_dining_table', x: 1900, y: 8550, r: 90, n: '长方餐桌 1800×900', note: '黑金花石台面 + 炭灰烤漆板式底座 + 香槟金底托', room: 'living' },
  { a: 'it_dining_chair', x: 1150, y: 8180, r: 90, n: '弧背丝绒餐椅（墨绿）', room: 'living' },
  { a: 'it_dining_chair_cognac', x: 1150, y: 8920, r: 90, n: '弧背丝绒餐椅（焦糖）', room: 'living' },
  { a: 'it_dining_chair_cognac', x: 2650, y: 8180, r: -90, n: '弧背丝绒餐椅（焦糖）', room: 'living' },
  { a: 'it_dining_chair', x: 2650, y: 8920, r: -90, n: '弧背丝绒餐椅（墨绿）', room: 'living' },
  { a: 'it_dining_chair', x: 1900, y: 7350, r: 0, n: '弧背丝绒餐椅（墨绿）', room: 'living' },
  { a: 'it_dining_chair_cognac', x: 1900, y: 9750, r: 180, n: '弧背丝绒餐椅（焦糖）', room: 'living' },
  { a: 'it_sideboard', x: 489, y: 9300, r: 90, n: '餐边柜 2200', note: '西墙，炭灰烤漆 + 灰色大理石台面 + 香槟金饰线', room: 'living' },
  { a: 'it_table_lamp', x: 489, y: 10200, r: 0, z: 700, n: '玻璃球台灯', room: 'living' },
  { a: 'it_art_large', x: 254, y: 9300, r: 90, z: 1000, n: '抽象画 1200×900', seed: 0, room: 'living' },
  { a: 'it_vase_travertine', x: 489, y: 8700, r: 0, z: 700, n: '洞石花器', room: 'living' },
  { a: 'it_candle_set', x: 489, y: 9300, r: 90, z: 700, n: '黑色烛台组', room: 'living' },
  { a: 'it_sculpture', x: 489, y: 9850, r: 0, z: 700, n: '青铜雕塑', room: 'living' },
  { a: 'it_media_wall', x: 254, y: 12200, r: 90, n: '岩板媒体墙 3200×2600', note: '卡拉卡塔岩板通顶，黄铜网面透视电壁炉，悬浮炭灰柜，壁挂 75" 电视', room: 'living' },
  { a: 'it_sofa', x: 3686, y: 12000, r: -90, n: '模块沙发 2600', note: '炭灰布艺，黑钛收缩底座，香槟金靠背饰线', room: 'living' },
  { a: 'it_chaise', x: 3361, y: 13725, r: -90, n: '贵妃位模块 850×1650', note: '与沙发同线延伸', room: 'living' },
  { a: 'it_coffee_table_set', x: 2450, y: 12000, r: 180, n: '大理石圆茶几 Ø900 + 黑金花圆几', note: '香槟金包边，黄铜托盘', room: 'living' },
  { a: 'it_ottoman', x: 1900, y: 13300, r: 0, n: '墨绿丝绒拉扣脚凳 1000×1000', room: 'living' },
  { a: 'it_armchair', x: 2600, y: 10600, r: 0, n: '圈圈绒桶形休闲椅', room: 'living' },
  { a: 'it_armchair_olive', x: 1500, y: 10600, r: 0, n: '橄榄绿丝绒桶形椅', room: 'living' },
  { a: 'it_arco_lamp', x: 3850, y: 10350, r: 0, n: 'Arco 弧形落地灯', note: '大理石底座，弧臂跨越沙发', room: 'living' },
  { a: 'it_planter_olive', x: 3780, y: 6350, r: 0, n: '黑色高筒花器 + 油橄榄', room: 'living' },
  { a: 'it_art_tall', x: 4186, y: 11400, r: -90, z: 1300, n: '抽象画 800×1000', seed: 1, room: 'living' },
  { a: 'it_art_tall', x: 4186, y: 12400, r: -90, z: 1300, n: '抽象画 800×1000', seed: 2, room: 'living' },
  // ---- 过道 --------------------------------------------------------------
  { a: 'it_vanity_wide', x: 4800, y: 5244, r: 180, z: 550, n: '悬浮洗手台 1100', note: '胡桃木柜体 + 灰色大理石台面 + 黑陶台上盆', room: 'living' },
  { a: 'it_mirror_led', x: 4800, y: 5244, r: 180, z: 1000, n: 'LED 背光圆镜 Ø700', room: 'living' },
  { a: 'it_art_small', x: 2997, y: 5450, r: 90, z: 1300, n: '小幅抽象画', seed: 3, room: 'living' },
  // ---- 厨房 --------------------------------------------------------------
  { a: 'it_kitchen_set', x: 240, y: 2967, r: 0, n: '无拉手一体橱柜', note: '炭灰烤漆平板门、卡拉卡塔台面与通顶挡板、黑色嵌入式灶具与高柜冰箱、吊柜下 LED', room: 'kitchen', corner: true },
  // ---- 书房 --------------------------------------------------------------
  { a: 'it_platform', x: 2704, y: 1214, r: 0, n: '胡桃木地台 2000×1800', note: '黑色收缩踢脚内藏 LED', room: 'tatami' },
  { a: 'it_shelving', x: 4296, y: 900, r: -90, n: '黑钛胡桃木开放架', room: 'tatami' },
  { a: 'it_desk', x: 4084, y: 2600, r: -90, n: '胡桃木书桌 1600×700', note: '黑钛雪橇架', room: 'tatami' },
  { a: 'it_desk_chair', x: 3500, y: 2600, r: 90, n: '黑色皮革转椅', room: 'tatami' },
  { a: 'it_table_lamp', x: 4150, y: 2050, r: 0, z: 770, n: '玻璃球台灯', room: 'tatami' },
  { a: 'it_art_large', x: 1704, y: 1200, r: 90, z: 1300, n: '抽象画 1200×900', seed: 1, room: 'tatami' },
  // ---- 次卧1 ---------------------------------------------------------------
  { a: 'it_bed_double', x: 6729, y: 1700, r: -90, n: '1500 低床', note: '炭灰布艺床体 + 黑色皮革宽床头 + 香槟金饰线', room: 'bed1' },
  { a: 'it_nightstand_s', x: 7754, y: 560, r: -90, z: 450, n: '悬浮床头柜 450', room: 'bed1' },
  { a: 'it_wardrobe', x: 6900, y: 3247, r: 180, n: '通顶衣柜 1600×2650', note: '炭灰烤漆平板门，香槟金缝线，无拉手', room: 'bed1' },
  { a: 'it_dresser', x: 4714, y: 2000, r: 90, z: 650, n: '悬浮梳妆台 1200', room: 'bed1' },
  { a: 'it_mirror_led', x: 4714, y: 2000, r: 90, z: 950, n: 'LED 背光圆镜', room: 'bed1' },
  { a: 'it_table_lamp', x: 4950, y: 1600, r: 0, z: 830, n: '玻璃球台灯', room: 'bed1' },
  { a: 'it_art_tall', x: 7754, y: 1700, r: -90, z: 1450, n: '抽象画 800×1000', seed: 2, room: 'bed1' },
  // ---- 次卧2 ---------------------------------------------------------------
  { a: 'it_bed_double', x: 6044, y: 6497, r: 0, n: '1500 低床', note: '黑色皮革宽床头 + 焦糖丝绒床尾毯', room: 'bed2' },
  { a: 'it_nightstand_s', x: 4900, y: 5472, r: 0, z: 450, n: '悬浮床头柜 450', room: 'bed2' },
  { a: 'it_nightstand_s', x: 7190, y: 5472, r: 0, z: 450, n: '悬浮床头柜 450', room: 'bed2' },
  { a: 'it_wardrobe', x: 6000, y: 8297, r: 180, n: '通顶衣柜 1600×2650', room: 'bed2' },
  { a: 'it_dresser', x: 4334, y: 6600, r: 90, z: 650, n: '悬浮梳妆台 1200', room: 'bed2' },
  { a: 'it_mirror_led', x: 4334, y: 6600, r: 90, z: 950, n: 'LED 背光圆镜', room: 'bed2' },
  { a: 'it_table_lamp', x: 4569, y: 6200, r: 0, z: 830, n: '玻璃球台灯', room: 'bed2' },
  { a: 'it_bay_cushion', x: 8190, y: 7035, r: 90, z: 480, n: '飘窗皮革坐垫 + 抱枕', note: '飘窗台面铺灰色大理石', room: 'bed2' },
  { a: 'it_art_large', x: 6044, y: 5472, r: 0, z: 1450, n: '抽象画 1200×900', seed: 3, room: 'bed2' },
  // ---- 主卧玄关 ------------------------------------------------------------
  { a: 'it_mirror_full', x: 4800, y: 8937, r: 0, n: '黑框落地镜 600×1800', note: '斜靠北墙', room: 'vestibule' },
  // ---- 主卫 ----------------------------------------------------------------
  { a: 'it_bathtub', x: 7290, y: 9667, r: 90, n: '独立椭圆浴缸 1600', note: '亚光白人造石 + 黑色落地龙头', room: 'bath2' },
  { a: 'it_toilet', x: 6000, y: 8827, r: 0, n: '壁挂马桶', room: 'bath2' },
  { a: 'it_vanity', x: 6200, y: 10507, r: 180, z: 550, n: '悬浮浴室柜 900', note: '黑陶台上盆 + 入墙黑色龙头', room: 'bath2' },
  { a: 'it_mirror_led', x: 6200, y: 10507, r: 180, z: 1050, n: 'LED 背光圆镜', room: 'bath2' },
  // ---- 公卫 ----------------------------------------------------------------
  { a: 'it_shower', x: 7299, y: 4237, r: 0, n: '无框淋浴区 900×900', note: '黑色顶喷 + 长条地漏', room: 'bath1' },
  { a: 'it_toilet', x: 6500, y: 5244, r: 180, n: '壁挂马桶', room: 'bath1' },
  // ---- 主卧 ----------------------------------------------------------------
  { a: 'it_bed_queen', x: 5359, y: 13020, r: 90, n: '1800 低床', note: '床头靠西墙，黑色皮革宽床头 + 香槟金饰线', room: 'bed3' },
  { a: 'it_nightstand_s', x: 4334, y: 11760, r: 90, z: 450, n: '悬浮床头柜 450', room: 'bed3' },
  { a: 'it_wardrobe_wide', x: 6500, y: 11037, r: 0, n: '通顶衣柜 2200×2650', note: '北墙，门东侧', room: 'bed3' },
  { a: 'it_dresser', x: 7100, y: 14353, r: 180, z: 650, n: '悬浮梳妆台 1200', note: '南墙窗侧', room: 'bed3' },
  { a: 'it_mirror_led', x: 7350, y: 14353, r: 180, z: 1000, n: 'LED 背光圆镜', room: 'bed3' },
  { a: 'it_armchair_olive', x: 7200, y: 12400, r: -135, n: '橄榄绿丝绒桶形椅', room: 'bed3' },
  { a: 'it_floor_lamp', x: 7450, y: 13200, r: 0, n: '黑钛落地灯', room: 'bed3' },
  { a: 'it_art_tall', x: 4334, y: 13020, r: 90, z: 1400, n: '抽象画 800×1000', seed: 0, room: 'bed3' },
  // ---- 阳台 ----------------------------------------------------------------
  { a: 'it_lounge_outdoor', x: 900, y: 15371, r: 90, n: '柚木户外躺椅', room: 'balcony' },
  { a: 'it_lounge_outdoor', x: 2400, y: 15371, r: -90, n: '柚木户外躺椅', room: 'balcony' },
  { a: 'it_outdoor_table', x: 1600, y: 15371, r: 0, n: '黑钛户外边几', room: 'balcony' },
  { a: 'it_planter_grass', x: 3600, y: 15756, r: 0, n: '黑色花箱 + 观赏草', room: 'balcony' },
  { a: 'it_planter_grass', x: 4700, y: 15756, r: 0, n: '黑色花箱 + 观赏草', room: 'balcony' },
  { a: 'it_planter_olive', x: 5700, y: 15600, r: 30, n: '黑色高筒花器 + 油橄榄', room: 'balcony' },
  { a: 'it_washer', x: 6706, y: 15371, r: -90, n: '黑色滚筒洗衣机', room: 'balcony' },
];

export const RUGS_ITALIAN = [
  { x: 2500, y: 12300, w: 3000, d: 2400, v: 0, room: 'living', n: '手工羊毛地毯 3000×2400' },
  { x: 1900, y: 8550, w: 2400, d: 3000, v: 1, room: 'living', n: '餐区地毯 2400×3000' },
  { x: 3700, y: 4800, w: 800, d: 1800, v: 2, room: 'living', n: '过道地毯 800×1800' },
  { x: 6000, y: 1700, w: 1800, d: 2400, v: 3, room: 'bed1', n: '卧室地毯 1800×2400' },
  { x: 6044, y: 7700, w: 2200, d: 1500, v: 2, room: 'bed2', n: '卧室地毯 2200×1500' },
  { x: 5900, y: 13000, w: 2200, d: 1600, v: 0, room: 'bed3', n: '卧室地毯 2200×1600' },
  { x: 2704, y: 2400, w: 1600, d: 560, v: 1, room: 'tatami', n: '床前地毯 1600×560' },
];
void deg;
