import { ROOMS, HOUSE } from './layout.js';
import { icon } from './icons.js';
import { assetUrl } from './assets.js';
import { getDesignStyle } from './design-styles.js';

export function mountUI() {
  document.querySelector('#app').innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="Maison 返回客厅"><span class="brand-mark">m</span><div><div class="brand-name">MAISON</div><div class="brand-sub">一 屋 · 一 种 生 活</div></div></a>
      <nav class="top-nav" aria-label="项目导航"><button class="nav-link active" data-action="home">空间漫游</button><button class="nav-link" data-modal="materials">材质叙事</button><button class="nav-link" data-modal="guide">落地手册</button></nav>
      <div class="top-actions"><span class="project-status"><i class="status-dot"></i> 同一户型 · 双风格方案</span><button class="outline-button" data-modal="furniture" aria-label="家具与尺寸">${icon('download')}<span class="button-text">家具与尺寸</span></button></div>
    </header>
    <div class="style-bar"><div class="style-bar-intro"><span class="style-bar-label">TWO WAYS TO CALL IT HOME</span><span class="style-bar-note" aria-live="polite">保留视角，对比两种生活提案</span></div><div class="style-switch" role="group" aria-label="家装风格"><button data-style="french" aria-pressed="true" class="active"><span>01</span>复古法式</button><button data-style="italian" aria-pressed="false"><span>02</span>意式轻奢</button></div><button class="panorama-entry" data-action="panorama" aria-label="进入高清全景" aria-haspopup="dialog"><span class="panorama-entry-mark" aria-hidden="true">360°</span><span class="panorama-entry-copy"><strong>进入高清全景</strong><small>9 个空间 · 双风格</small></span>${icon('chevron')}</button></div>
    <main class="workspace">
      <aside class="sidebar" aria-label="空间与配色">
        <div class="project-intro"><div class="eyebrow">THE FRENCH RESIDENCE</div><h1>把日子，<br>过成旧时光。</h1><p class="intro-en">A little Paris, a place of your own.</p><div class="project-meta"><div class="meta-item"><strong>110.71 <small style="font-size:12px">m²</small></strong><span>原图标注面积合计</span></div><i class="meta-divider"></i><div class="meta-item"><strong>4 <small style="font-size:12px">/</small> 2</strong><span>四房 · 双卫</span></div></div></div>
        <div class="space-header"><span>探索空间</span><span>LES ESPACES</span></div>
        <nav class="room-list" aria-label="选择房间">${ROOMS.map((r,i)=>`<button class="room-button ${i===0?'active':''}" data-room="${r.id}" aria-pressed="${i===0}"><span class="room-index">${String(i+1).padStart(2,'0')}</span><span class="room-name">${r.name}</span><span class="room-area">${r.area.toFixed(2)}</span>${icon('chevron')}</button>`).join('')}</nav>
        <div class="palette-block"><div class="section-mini"><span>织物配色</span><small>点击，感受另一种氛围</small></div><div class="swatches"><button class="swatch active" style="--swatch:#693e37" data-palette="burgundy" aria-label="酒红与胡桃木配色" aria-pressed="true"></button><button class="swatch" style="--swatch:#596149" data-palette="olive" aria-label="苔绿与胡桃木配色" aria-pressed="false"></button><button class="swatch" style="--swatch:#c7b796" data-palette="ivory" aria-label="亚麻与胡桃木配色" aria-pressed="false"></button><span class="palette-label">勃艮第酒红</span></div></div>
        <button class="sidebar-footer" data-modal="source"><span>查看原始户型与尺寸依据</span>${icon('arrow')}</button>
      </aside>
      <section class="canvas-area" aria-label="可交互三维家装">
        <div id="scene" class="scene" tabindex="0" role="application" aria-label="三维家装场景。拖动环顾，双指缩放，按住方向按钮或使用WASD移动，点击家具查看尺寸。"></div>
        <div id="room-labels" class="room-labels"></div>
        <div class="scene-top"><div class="scene-caption"><span class="kicker">01 / LIVING & DINING</span><h2>客餐厅 · 温柔的旧时光</h2><div class="scene-subtitle">胡桃木 / 酒红丝绒 / 做旧黄铜</div></div><div class="scene-top-actions"><button class="square-button" data-action="capture" title="保存当前视角" aria-label="保存当前视角">${icon('camera')}</button><button class="square-button" data-action="fullscreen" title="全屏浏览" aria-label="全屏浏览">${icon('expand')}</button><button class="square-button" data-modal="help" title="操作说明" aria-label="操作说明">${icon('info')}</button></div></div>
        <span class="render-badge">THREE.JS · 实时渲染</span>
        <div class="zoom-controls"><button class="square-button" data-action="zoom-in" aria-label="放大" title="放大">${icon('plus')}</button><button class="square-button" data-action="zoom-out" aria-label="缩小" title="缩小">${icon('minus')}</button><button class="square-button" data-action="reset" aria-label="复位视角" title="复位视角">${icon('rotate')}</button></div>
        <div class="touch-move" role="group" aria-label="移动位置"><button data-move="forward" aria-label="向前移动">↑</button><button data-move="left" aria-label="向左移动">←</button><button data-move="back" aria-label="向后移动">↓</button><button data-move="right" aria-label="向右移动">→</button><span>按住移动</span></div>
        <div class="interaction-hint">${icon('mouse')}<span>拖动环顾 · 滚轮变焦 · WASD 移动 · 点击家具查看细节</span></div>
        <div class="scene-bottom"><div class="view-controls" role="group" aria-label="视图和光照"><button class="view-control" data-view="overview" aria-pressed="false">${icon('cube')}全屋总览</button><button class="view-control active" data-view="interior" aria-pressed="true">${icon('walk')}室内漫游</button><button class="view-control" data-view="plan" aria-pressed="false">${icon('plan')}平面视图</button><i class="control-divider"></i><button class="light-button active" data-light="day" aria-label="日间光照" title="日间光照" aria-pressed="true">${icon('sun')}</button><button class="light-button" data-light="night" aria-label="夜间光照" title="夜间光照" aria-pressed="false">${icon('moon')}</button></div><div class="mini-plan-card"><div class="mini-plan-title">你在这里 <span>PLAN 01</span></div><svg class="mini-plan" viewBox="-3 -3 94 172" aria-label="可点击的户型导航">${ROOMS.map(r=>`<g><polygon class="mini-room ${r.id==='living'?'active':''}" data-room="${r.id}" points="${r.polygon.map(([x,z])=>`${x*10},${z*10}`).join(' ')}" tabindex="0" role="button" aria-label="前往${r.name}"/><text x="${r.center[0]*10}" y="${r.center[1]*10}" text-anchor="middle">${r.id==='study'?'书房':r.name}</text></g>`).join('')}<circle id="mini-camera" class="mini-camera" cx="8" cy="99" r="2.8"/></svg></div></div>
        <span class="view-credit">DESIGNED TO BE LIVED IN.</span><div class="floating-selection" id="selection-label"></div>
        <aside class="inspector" aria-label="家具详情"><button class="close-button" data-action="close-inspector" aria-label="关闭家具详情">${icon('close')}</button><div class="eyebrow">THE OBJECT</div><h3></h3><div class="inspector-dimension"></div><div class="inspector-label">材质与饰面</div><p class="inspector-material"></p><div class="inspector-label">复刻建议</div><p class="inspector-note"></p><div class="inspector-bottom">${icon('ruler')}方案建议尺寸 · 下单前现场复尺</div></aside>
        <div class="toast" role="status" aria-live="polite"></div>
        <div class="loading"><div class="loading-mark">m</div><p>一座家的时光，正在展开</p><div class="loading-line"></div><p style="letter-spacing:1px;font-size:9px">构建材质与光线</p></div>
      </section>
    </main>
    <div class="modal-backdrop" hidden><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><button class="close-button" data-action="close-modal" aria-label="关闭窗口">${icon('close')}</button><div class="modal-body"></div></section></div>
  </div>`;
}
export function materialDialog(style='french') {
  const materialData=getDesignStyle(style).materials;
  return `<div class="eyebrow">THE MATERIAL LIBRARY</div><h2 id="modal-title">材质，是空间的记忆。</h2><p class="modal-lead">六种克制的材质，串起整座家的设计气质。色号用于传达设计意图，实际颜色以自然光下的实物小样为准。</p><div class="material-grid">${materialData.map(([cl,n,en,d])=>`<article class="material-card"><div class="sample ${cl}"></div><h3>${n}</h3><div class="material-en">${en}</div><p>${d}</p></article>`).join('')}</div><div class="modal-footer"><span class="subtle-note">木作、皮革与织物使用 CC0 扫描贴图，石材使用专业 PBR 纹理；地板铺贴保留程序建模。颜色属于方案建议。</span><button class="filled-button" data-action="download-guide">${icon('download')}下载材质与复刻说明</button></div>`;
}
export function sourceDialog() {
  return `<div class="eyebrow">FROM PLAN TO HOME</div><h2 id="modal-title">每一处，都有来处。</h2><p class="modal-lead">依据你提供的平面图保留四房、双卫、客餐厅及阳台。原图外包尺寸、局部尺寸与面积标签未完全闭合，三维墙线按图片比例推导。</p><div class="plan-compare"><img class="plan-image" src="${assetUrl('floor-plan.jpg')}" alt="用户提供的原始房屋平面图，含房间标注和毫米尺寸"/><div><h3>已读取的尺寸</h3><div class="dimension-list"><div class="dimension-row"><span>原图最大外包</span><span>8.853 × 16.375 m</span></div><div class="dimension-row"><span>原图房间面积合计</span><span>110.71 m²</span></div><div class="dimension-row"><span>阳台原图净宽 / 进深</span><span>6.792 / 1.531 m</span></div><div class="dimension-row"><span>模拟层高（估算）</span><span>2.800 m</span></div><div class="dimension-row"><span>模拟墙厚（估算）</span><span>0.180 m</span></div></div><h3>保留原有格局</h3><p>入户位于西侧，厨房邻近餐厅；北侧两房、中部次卧与公卫、南侧客厅和主卧通向阳台。没有把房间面积合计作为建筑面积，也未据此修改承重结构。</p><h3>尺寸仍需复尺</h3><p>模型墙线按图像推导，扣除模拟墙厚后，公卫进深约 1.630 m，原图为 1.495 m；主卫约 1.780 m，原图为 1.708 m。阳台模型约 6.920 × 1.565 m，原图为 6.792 × 1.531 m。此差异会影响洁具、柜体和通行，不可直接用模型下单。</p><h3>现场需要确认</h3><p>墙体性质、实际净尺寸、梁柱位置、门窗洞口及开启方向、净高、烟道与上下水位置。三维用于空间与家装方案推敲；施工和定制前用现场测绘图复核。</p></div></div>`;
}
export function helpDialog() {
  return `<div class="eyebrow">MAKE YOURSELF AT HOME</div><h2 id="modal-title">慢慢看，随意走。</h2><p class="modal-lead">点击顶部“进入高清全景”，可查看同源户型的九个日间空间，直接切换房间、转头、缩放和切换两种风格。顶部可切换复古法式和意式轻奢，沿用当前视角、房间和日夜光照。若新家具占用了当前位置，将回到当前房间安全视点。全屋总览用于理解布局，室内漫游用于感受日常尺度。</p><div class="help-keys"><div class="key-row">室内环顾<kbd>按住拖动</kbd></div><div class="key-row">前后 / 左右移动<kbd>W A S D / 方向键</kbd></div><div class="key-row">调整视野<kbd>滚轮 / ＋ −</kbd></div><div class="key-row">查看家具尺寸<kbd>单击家具</kbd></div><div class="key-row">全屋旋转<kbd>总览下拖动</kbd></div><div class="key-row">平移户型<kbd>右键拖动 / 双指</kbd></div><div class="key-row">恢复当前房间<kbd>R / 复位按钮</kbd></div><div class="key-row">关闭详情 / 弹窗<kbd>Esc</kbd></div></div><p>手机单指拖动环顾、双指捏合缩放，按住屏幕方向按钮移动；底部房间栏和户型图可切换房间。日夜切换将同时调整环境光与室内灯具。织物或皮革配色可在左侧选择；小屏设备在“材质叙事”查看完整配方。</p><button class="outline-button" data-modal="source">查看原始户型与尺寸依据</button>`;
}
export function furnitureDialog(items, room='all') {
  return `<div class="eyebrow">MADE TO MEASURE</div><h2 id="modal-title">喜欢的家，可以照着做。</h2><p class="modal-lead">模型使用米制家具尺寸。以下为设计建议，可用于寻找近似成品或与木作厂家沟通；最终数量、安装条件与尺寸以现场复核为准。</p><div class="filter-row"><button class="filter-chip ${room==='all'?'active':''}" data-filter="all">全部空间</button>${ROOMS.map(r=>`<button class="filter-chip ${room===r.id?'active':''}" data-filter="${r.id}">${r.name}</button>`).join('')}</div><table class="furniture-table"><thead><tr><th>家具 / 物件</th><th>所在空间</th><th>建议尺寸</th><th>材质与复刻说明</th></tr></thead><tbody>${items.filter(it=>room==='all'||it.room===room).map(it=>`<tr><td>${it.name}</td><td>${ROOMS.find(r=>r.id===it.room)?.name||'客餐厅'}</td><td>${it.dimensions}</td><td>${it.material}<span class="spec-note">${it.note}</span></td></tr>`).join('')}</tbody></table><div class="modal-footer"><span class="subtle-note">${items.length} 件可查看物件 · 不绑定品牌与采购链接</span><button class="filled-button" data-action="download-csv">${icon('download')}导出完整家具清单 CSV</button></div>`;
}
export function guideDialog(style='french') {
  const design=getDesignStyle(style),italian=style==='italian';
  return `<div class="eyebrow">THE DESIGN NOTEBOOK</div><h2 id="modal-title">${italian?'让质感，走进真实生活。':'让复古，走进真实生活。'}</h2><p class="modal-lead">${design.concept}以下为可以交给设计师或施工方讨论的实施顺序。</p><div class="material-grid"><article><h3>01 / 先复尺，再定家具</h3><p>现场确认每间房的净长、净宽、层高及梁位。先放置床、沙发、餐桌和柜体，核对房门开启与日常通道，再调整装饰分格。</p></article><article><h3>02 / 木作与墙线一起放样</h3><p>${italian?'木皮拼缝、柜体收边与石材排版共同放样。样板确认深烟熏木、灰褐纹理石材和古铜金属，再按现场尺寸深化。':'踢脚线、柜门框线与墙面装饰线保持统一比例。样板确认胡桃木色和黄铜五金，再让厂家按现场尺寸深化。'}</p></article><article><h3>03 / 灯光分成三个层次</h3><p>2700–3000 K 暖光为主，吊灯负责氛围，壁灯与落地灯补充局部照明。厨房操作面和卫浴镜前单独设置功能照明。</p></article><article><h3>04 / 湿区做独立深化</h3><p>原图未提供排水和烟道信息。厨房及两卫的设备位置先与现场管线核对，再确认柜体、玻璃隔断和检修空间。</p></article><article><h3>05 / 软装保留层次</h3><p>${italian?'炭灰皮革、深橄榄软包与黑棕木作相配，地毯采用灰褐细纹。可在同一视角比较炭灰、苔灰与暖灰三组沉稳配色。':'酒红沙发、苔绿扶手椅与米色窗帘组合，地毯使用低饱和复古纹样。织物可在实时场景中切换比较。'}</p></article><article><h3>06 / 用样品校准屏幕</h3><p>渲染中的颜色会受到屏幕、曝光与模拟光源影响。油漆、地板、石材和面料应放在同一自然光环境下比样。</p></article><article><h3>07 / 核对门与使用空间</h3><p>主卧与次卧 2 改为带密封收边的上吊移门，让出餐区通道；两卫采用双片联动移门，次卧 1 改内开房门及推拉柜门。主卫开口在模型中向南校正 150 mm，须按现有洞口复尺，不能据此直接改墙。移门的私密、隔声和检修节点需厂家深化。</p></article><article><h3>08 / 补齐长期居住需求</h3><p>洗衣、晾晒、空调内外机、排烟及电位尚未定位。主卧现有 900 mm 衣柜、次卧 2 的 400 mm 浅柜不能默认满足长期居住，需结合常住人数和衣物量补充收纳；浅柜仅作叠放和小件储物。</p></article></div><div class="modal-footer"><span class="subtle-note">当前为可交互家装设计方案，未完成现场测绘、施工图或结构验证。</span><button class="filled-button" data-action="download-guide">${icon('download')}下载完整落地说明</button></div>`;
}
export function makeGuideMarkdown(items,style='french') {
  const design=getDesignStyle(style),materialData=design.materials;
  return `# MAISON · ${design.name}家装方案\n\n${design.concept}\n\n## 户型与尺寸依据\n\n原图外包尺寸 8.853 × 16.375 m；九个空间标注面积合计 110.71 m²（不是建筑面积）。四房、双卫、客餐厅、阳台格局保留。墙线由图片比例与局部标注推导，墙厚 0.18 m、净高 2.8 m 为估算，门窗位置需要复测。\n\n${ROOMS.map(r=>`- ${r.name}：图示 ${r.area} m²；${r.dimension}。${roomDescription(r,style)}`).join('\n')}\n\n## 材质配方\n\n${materialData.map(([_,n,en,d])=>`- ${n} / ${en}：${d}`).join('\n')}\n\n## 复刻顺序\n\n1. 现场测绘净尺寸、梁柱、窗台、门洞、墙体性质、烟道、给排水和电位。\n2. 确认床/柜/沙发/餐桌尺度与门扇开启，通道建议以 800–900 mm 为优先目标并按实际空间调整。\n3. ${style==='italian'?'墙面分缝、细踢脚和柜体统一放样；深烟熏木、古铜、灰褐石材与炭灰皮革共同打样。':'墙面线框、踢脚线和柜门统一放样；胡桃木色、黄铜、石材和面料共同打样。'}\n4. 主灯与壁灯/台灯分路控制，暖光 2700–3000 K 为方案建议；厨房操作区和镜前补充功能照明。\n5. 湿区柜体与淋浴按现场管线独立深化。\n6. 固定木作与地面完工后，按家具清单逐件复尺进场。\n\n## 家具与物件\n\n|物件|空间|建议尺寸|材质|复刻建议|\n|---|---|---|---|---|\n${items.map(it=>`|${it.name}|${ROOMS.find(r=>r.id===it.room)?.name||it.room}|${it.dimensions}|${it.material}|${it.note}|`).join('\n')}\n\n## 合理性审查与落地前提\n\n- 主卧和次卧 2 采用带密封收边的上吊移门，保留原模型洞口；两卫采用双片联动移门；次卧 1 改西铰内开房门及双轨推拉柜门。主卫模型开口向南校正 150 mm。门洞位置原为推导值，先复测现状，不表示可直接挪洞或改墙。公卫移门停放处仅约 7 mm 端部余量，须定制并按现场净深复核。上吊轨承重、密封隔声、防夹及检修需深化。\n- 公卫模型净进深 1.630 m，原图 1.495 m；主卫模型 1.780 m，原图 1.708 m；阳台模型约 6.920 × 1.565 m，原图 6.792 × 1.531 m。这些偏差会影响布局，现场净尺寸优先。\n- 主卧东侧原假设长窗已取消；两卫使用不透明磨砂效果。真实窗洞、通风和玻璃选型仍按现场确定。\n- 洗衣、晾晒、空调内外机、厨房排烟、电位及湿区排水未定位，需补齐后才能形成完整居住方案。阳台目前仅作休闲布置；不能默认具备洗衣排水条件。\n- 主卧衣柜宽 900 mm、次卧 2 柜深 400 mm。现有收纳不能默认满足长期多人居住，需按常住人数和衣物量深化；浅柜仅作叠放和小件储物。\n- 主卧床头靠主卫隔墙，需核对给排水管位置并处理隔声；防水和检修不能被木作覆盖。\n- 通行校核采用模型中的家具和实际开启门叶；结果是方案阶段的空间检查，不是结构、无障碍或施工验收。\n\n## 渲染与真实落地边界\n\n全屋资产为米制程序化建模；${design.pendant.name}来自可复现 Blender 脚本。实时渲染使用 Three.js、PBR 材质与屏幕空间环境遮蔽，九个空间另提供同源模型的 Cycles 离线路径追踪全景，固定日间与默认配色，可切换房间并环顾、不可自由走动；未做现场光照实测。显示材质为设计示意，需用现场小样校准。图纸信息不足以直接生成施工图；结构、水电、防水、通风与安装节点需由现场专业人员深化。当前方案不包含预算报价或指定品牌采购。\n`;
}

export function roomDescription(room,style='french') {
  if(style!=='italian')return room.description;
  return {
    living:'灰褐纹理大理石、炭灰模块沙发与深烟熏木构成公共空间，保留客餐厅主通道。',
    master:'宽软包床头与简约木作，低对比织物控制层次；床侧尺度沿用紧凑布局。',
    bedroom2:'烟熏木、简洁软包和窗边书写位，浅柜用于叠放储物。',
    bedroom1:'简洁软包床与双轨推拉衣柜，内开房门保留北侧通道。',
    study:'平板书柜、侧抽屉书桌与低矮日间床，兼顾书写和休憩。',
    kitchen:'平板柜门、暖灰台面与简约五金；保留真实水槽空腔、连续转角和独立设备柜位。',
    bathroom:'简约镜柜与暖灰湿区，两片移门在现有洞口内侧叠放；端部尺寸需精确定制。',
    ensuite:'浅款浴室柜、简约镜灯与短款洁具，花洒安装在南侧实墙。',
    balcony:'轻巧户外座椅、低对比织物与简洁铁艺，保持栏杆防护和连续通行。',
  }[room.id];
}
