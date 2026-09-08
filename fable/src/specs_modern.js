// 现代简约 (modern) per-room design notes for the UI panel. Furniture lists are derived at
// runtime from the placement table; docs/design-spec.md is generated from the same data.
export const SPECS_MODERN = {
  living: {
    title: '客餐厅',
    palette: ['#EFEBE4', '#D8BF98', '#1E1E1E', '#D9D2C6', '#8C9A8B'],
    notes: [
      '暖白艺术漆通刷，顶部灯槽 3000 K 暖光洗墙，收缩踢脚阴影缝',
      '190 mm 宽浅橡木直铺全屋，厨房与卫生间改暖灰哑光岩板砖',
      '西墙浅橡木竖向格栅电视墙：悬浮暖白电视柜 + 柜底灯带 + 壁挂 75" 电视',
      '玄关暖白无拉手鞋柜 + 黑色细框圆镜；换鞋凳为橡木 + 燕麦织物',
      '暖白岩板餐桌 + 6 把橡木弧背餐椅，上方 1200 黑色线性吊灯',
      '燕麦圈圈绒模块沙发 + 贵妃位，洞石圆茶几 + 陶土圆几，磁吸轨道射灯',
    ],
    materials: ['艺术漆 暖白 #EFEBE4', '浅橡木地板 190 mm 直铺', '暖白岩板', '黑色细框金属', 'LED 灯带 3000 K'],
  },
  kitchen: {
    title: '厨房',
    palette: ['#EFEBE4', '#D8BF98', '#E9E4DC', '#1E1E1E'],
    notes: ['暖白烤漆无拉手平板门（黑色收缩踢脚）', '浅橡木吊柜 + 吊柜底 LED 线性灯', '暖白岩板 20 mm 台面 + 通顶挡板', '黑色嵌入式灶具与烤箱，暖白高柜冰箱', '800×800 暖灰哑光岩板砖地面'],
    materials: ['烤漆门板 暖白', '浅橡木饰面', '岩板台面', '黑色不锈钢龙头'],
  },
  tatami: {
    title: '榻榻米书房',
    palette: ['#E7E2D8', '#D8BF98', '#1E1E1E', '#9C948A'],
    notes: ['暖灰白艺术漆 + 顶部灯槽', '浅橡木地台 2000×1800，前脸三组抽屉', '浅橡木书桌 + 黑色细雪橇架，橡木开放架', '磁吸轨道射灯，圆盘吊灯'],
    materials: ['艺术漆 #E7E2D8', '浅橡木地板', '浅橡木饰面'],
  },
  bed1: {
    title: '次卧 1',
    palette: ['#EBE5DC', '#D8BF98', '#D9CFC1', '#8C9A8B'],
    notes: ['暖米艺术漆 + 灯槽', '燕麦织物低床 + 圈圈绒宽床头', '暖白无拉手通顶衣柜，橡木侧板', '悬浮橡木床头柜与梳妆台，黑色细框圆镜'],
    materials: ['艺术漆 #EBE5DC', '浅橡木直铺', '燕麦圈圈绒'],
  },
  bed2: {
    title: '次卧 2',
    palette: ['#ECE7DF', '#D8BF98', '#8C9A8B', '#D9D2C6'],
    notes: ['飘窗台面暖灰岩板 + 亚麻坐垫', '低床靠北墙，鼠尾草绿床尾毯', '悬浮床头柜 ×2，暖白通顶衣柜', '西墙悬浮梳妆台 + 圆镜'],
    materials: ['艺术漆 #ECE7DF', '暖灰岩板', '亚麻坐垫'],
  },
  bed3: {
    title: '主卧',
    palette: ['#E3DED5', '#D8BF98', '#1E1E1E', '#8C9A8B'],
    notes: ['浅暖灰艺术漆 + 灯槽', '1800 低床靠西墙，燕麦圈圈绒宽床头', '北墙 2200 暖白通顶衣柜', '东侧奶油圈圈绒桶椅 + 黑色细杆落地灯', '哑白圆盘吊灯 Ø450'],
    materials: ['艺术漆 #E3DED5', '浅橡木', '暖白烤漆'],
  },
  bath1: {
    title: '公卫',
    palette: ['#A8A5A0', '#1E1E1E', '#F1F0EE'],
    notes: ['600×1200 暖灰哑光砖通铺到顶', '无框玻璃淋浴 + 黑色顶喷 + 长条地漏', '壁挂马桶'],
    materials: ['哑光岩板砖', '黑色五金'],
  },
  bath2: {
    title: '主卫',
    palette: ['#A8A5A0', '#F1F0EE', '#D8BF98', '#1E1E1E'],
    notes: ['亚光白椭圆浴缸 + 黑色落地龙头', '悬浮浅橡木浴室柜 + 米白台上盆', '黑色细框圆镜'],
    materials: ['哑光岩板砖', '人造石浴缸', '浅橡木'],
  },
  vestibule: { title: '主卧玄关', palette: ['#EFEBE4', '#1E1E1E'], notes: ['黑色细框方形门套', '橡木框落地镜'] },
  balcony: {
    title: '阳台',
    palette: ['#A8A5A0', '#D8BF98', '#1E1E1E', '#8C9A8B'],
    notes: ['600×600 暖灰哑光砖地面', '橡木条户外躺椅 ×2 + 黑色边几', '陶土花箱观赏草，油橄榄'],
    materials: ['哑光砖 600×600', '橡木条', '陶土'],
  },
};
