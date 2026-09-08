// 宋式 (song) per-room design notes for the UI panel. Furniture lists are derived at
// runtime from the placement table; docs/design-spec.md is generated from the same data.
export const SPECS_SONG = {
  living: {
    title: '客餐厅',
    palette: ['#EFEAE0', '#D9CDB4', '#A8C3BD', '#6E6F6A', '#9E3B33'],
    notes: [
      '宣纸白肌理漆（石灰基艺术漆）通刷，白蜡木平踢脚 60 mm，不做线脚',
      '白蜡木宽板直铺全屋，厨房与阳台改青砖，卫生间青石大板',
      '西墙白蜡木直棂格栅电视墙：悬浮白蜡木柜 + 柜底灯带 + 壁挂 75" 电视',
      '玄关翘头条案 + 水墨挂轴；四扇宣纸屏风软隔餐厅与客厅',
      '条案式餐桌 + 6 把玫瑰椅，上方 Ø600 宣纸圆灯笼吊灯',
      '罗汉床式三人沙发 + 矮几 + 松树盆景，一对圈椅 + 香几',
    ],
    materials: ['肌理漆 宣纸白 #EFEAE0', '白蜡木地板 190 mm 直铺', '白蜡木直棂格栅', '汝窑天青瓷', '宣纸灯笼'],
  },
  kitchen: {
    title: '厨房',
    palette: ['#EFEAE0', '#D9CDB4', '#737876', '#1E1E1E'],
    notes: ['白蜡木平板门，细缝拉手', '青石 20 mm 台面 + 通顶挡板', '黑色嵌入式灶具，白蜡木高柜冰箱', '吊柜底 LED 线性灯', '300×150 青砖错缝铺地'],
    materials: ['白蜡木饰面', '青石台面', '青砖', '黑色龙头'],
  },
  tatami: {
    title: '榻榻米茶室',
    palette: ['#CFDAD3', '#D9CDB4', '#A8C3BD', '#4A5468'],
    notes: ['天青色肌理漆墙面（全屋唯一的彩墙）', '白蜡木地台 2000×1800，草席面，东侧茶席 + 蒲团', '画案 + 圈椅，博古架陈列天青瓷', '南墙白蜡木格子对开玻璃门'],
    materials: ['肌理漆 天青 #CFDAD3', '白蜡木地板', '草席'],
  },
  bed1: {
    title: '次卧 1',
    palette: ['#EBE6DA', '#D9CDB4', '#C4CFC8', '#4A5468'],
    notes: ['宣纸白肌理漆', '白蜡木地台床，直棂床头', '白蜡木框宣纸衬格栅门衣柜', '方几床头几 + 天青瓷底宣纸台灯，梳妆台 + 镜架'],
    materials: ['肌理漆 #EBE6DA', '白蜡木直铺', '米白亚麻'],
  },
  bed2: {
    title: '次卧 2',
    palette: ['#ECE7DC', '#D9CDB4', '#DCE1DD', '#4A5468'],
    notes: ['飘窗台面白蜡木 + 草席坐垫', '地台床靠北墙，月白色床尾毯', '方几 ×2，格栅门衣柜', '西墙梳妆台 + 镜架'],
    materials: ['肌理漆 #ECE7DC', '白蜡木', '草席'],
  },
  bed3: {
    title: '主卧',
    palette: ['#DDE2DC', '#D9CDB4', '#A8C3BD', '#4A5468'],
    notes: ['月白肌理漆', '1800 白蜡木地台床靠西墙，直棂床头', '北墙 2200 格栅门衣柜', '东侧圈椅 + 宣纸落地灯 + 竹', 'Ø600 宣纸圆灯笼吊灯'],
    materials: ['肌理漆 #DDE2DC', '白蜡木', '宣纸'],
  },
  bath1: {
    title: '公卫',
    palette: ['#737876', '#1E1E1E', '#F1F0EE'],
    notes: ['青石大板通铺到顶', '无框玻璃淋浴 + 黑色顶喷 + 长条地漏', '壁挂马桶'],
    materials: ['青石大板 800×2400', '黑色五金'],
  },
  bath2: {
    title: '主卫',
    palette: ['#737876', '#F1F0EE', '#D9CDB4', '#1E1E1E'],
    notes: ['亚光白椭圆浴缸 + 黑色落地龙头', '悬浮白蜡木浴室柜 + 青石台面 + 米白圆盆', '白蜡木框圆镜'],
    materials: ['青石大板', '人造石浴缸', '白蜡木'],
  },
  vestibule: { title: '主卧玄关', palette: ['#EFEAE0', '#D9CDB4'], notes: ['白蜡木方形门套', '白蜡木框落地镜'] },
  balcony: {
    title: '阳台',
    palette: ['#8E9494', '#D9CDB4', '#737876', '#A8C3BD'],
    notes: ['青砖错缝铺地', '竹躺椅 ×2 + 石鼓凳', '青石圆桌 + 石鼓凳 ×2，青石花箱观赏草，天青瓷盆苔藓'],
    materials: ['青砖 300×150', '竹', '青石'],
  },
};
