export const STYLE_IDS = ['french', 'italian'];
export const DESIGN_STYLES = {
  french: {
    name:'复古法式', english:'THE FRENCH RESIDENCE',
    heading:'把日子，<br>过成旧时光。', subtitle:'A little Paris, a place of your own.',
    concept:'深胡桃木、古典石膏线与暖色织物，构成有时间感的法式居所。',
    livingTitle:'客餐厅 · 温柔的旧时光',
    palettes:{
      burgundy:{name:'勃艮第酒红',short:'酒红',fabric:'#693e37',sage:'#66704d',surface:'酒红丝绒'},
      olive:{name:'苔绿亚麻',short:'苔绿',fabric:'#525b42',sage:'#9b765b',surface:'苔绿亚麻'},
      ivory:{name:'暖米亚麻',short:'亚麻',fabric:'#cab998',sage:'#857666',surface:'暖米亚麻'},
    },
    materials:[
      ['wood','深胡桃木','WALNUT PARQUET','人字拼建议 600 × 150 mm；哑光开放漆。家具木作同色系，保留天然木纹与色差。'],
      ['plaster','象牙白石膏','IVORY PLASTER','墙色参考 #E5DDCD，哑光面。踢脚线高约 130 mm；细框线脚约 20–30 mm，现场按墙面分格。'],
      ['brass','做旧黄铜','AGED BRASS','拉丝、低光泽表面。吊灯、龙头与柜体拉手使用同一暖金色，局部允许自然氧化。'],
      ['velvet','勃艮第酒红','BURGUNDY VELVET','沙发布艺参考 #693E37。选择耐磨短绒面料，大面积深色与木作、暖白墙面相配。'],
      ['stone','暖白纹理石材','WARM VEINED STONE','台面与湿区使用暖白细纹石材或同纹瓷砖，湿区选择适配的防滑面。'],
      ['olive','苔绿亚麻','MOSS & LINEN','参考 #596149。作为卧室、扶手椅和靠垫辅色，亚麻质感遮光帘搭配米白纱帘。'],
    ],
    pendant:{file:'models/french-chandelier.glb',id:'blender-chandelier',name:'八臂黄铜水晶吊灯',room:'living',dimensions:'Ø 922 × H 933 mm',material:'做旧黄铜 · 蜡烛灯 · 切面水晶',note:'Blender 原创模型。顶碗贴合2.80m假设天花，灯底约1.87m，安装于固定圆餐桌正上方；现场核对吊点和吊链。'},
  },
  italian: {
    name:'意式轻奢', english:'THE ITALIAN RESIDENCE',
    heading:'让质感，<br>回归生活。', subtitle:'Materia, luce, una casa da vivere.',
    concept:'炭灰皮革、深橄榄绿与黑棕木作，衬托灰褐纹理大理石和低光泽古铜，保留沉稳的明暗层次。',
    livingTitle:'客餐厅 · 石与光的秩序',
    palettes:{
      burgundy:{name:'炭灰与深橄榄',short:'炭灰',fabric:'#444440',sage:'#454c38',surface:'炭灰皮革',accent:'深橄榄'},
      olive:{name:'苔灰与烟褐',short:'苔灰',fabric:'#555748',sage:'#84735d',surface:'苔灰皮革',accent:'烟褐'},
      ivory:{name:'暖灰与古铜',short:'暖灰',fabric:'#8e8575',sage:'#51513e',surface:'暖灰皮革',accent:'暗橄榄'},
    },
    materials:[
      ['italian-stone','灰褐纹理大理石','GREIGE VEINED MARBLE','公共区大板石材采用灰褐底色、白色与炭灰分叉石纹；可使用同纹瓷砖，控制抛光度。湿区选择防滑面，纹理排版与伸缩缝按现场深化。'],
      ['italian-wood','烟熏木饰面','SMOKED TIMBER','卧室直拼木地板，柜体与床侧木作采用烟熏深木色。先确认实物木皮，控制光泽和相邻木纹方向。'],
      ['italian-leather','炭灰皮革','CHARCOAL LEATHER','参考 #444440。低矮模块沙发搭配简洁包覆线条，座面约450–480mm，最终以家具实际规格为准。'],
      ['italian-metal','低光泽古铜','BRUSHED BRONZE','细框和小面积五金采用低反射古铜，窗框使用黑棕金属。灯具保留柔和香槟色，控制金属反光面积。'],
      ['italian-wall','暖灰平整墙面','MINERAL WALL','低饱和哑光墙面配局部大块饰面，使用细踢脚和简洁门套。湿区仍需防水与耐水基层。'],
      ['italian-textile','深橄榄与暖灰织物','OLIVE & WARM GREY','深橄榄软包与暖灰细纹窗帘、地毯柔化石材和皮革。炭灰、苔灰、暖灰三组配色均保持克制，可在同一视角比较。'],
    ],
    pendant:{file:'models/italian-pendant.glb',id:'blender-chandelier',name:'双椭圆香槟线光吊灯',room:'living',dimensions:'947 × 631 × H 941 mm',material:'香槟金属 · 乳白线性扩散罩 · 细钢索',note:'Blender 原创双环灯；顶盘贴合2.80m假设天花，灯底1.859m，距桌面约1.08m；投影距Ø1.22m固定圆餐桌边至少115mm。现场复核吊点和钢索长度。'},
  },
};
export const getDesignStyle = id => DESIGN_STYLES[id] || DESIGN_STYLES.french;
