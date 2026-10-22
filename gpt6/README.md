# GPT6 · MAISON 四风格家装

这是 [House 3D](../README.md) 的 **GPT6 版本**，原项目目录名为 `housegpt`。与 [Fable 版本](../fable/) 一起，用于比较两个模型生成的 3D 家装项目效果。模型标签描述生成来源；页面运行不调用模型 API。

基于输入户型图，以 Three.js 构建九个空间，提供复古法式、意式轻奢、现代简约与宋韵雅居四套方案。法式采用深胡桃木人字拼、古典线脚与酒红织物；意式采用炭灰皮革、深橄榄软包、黑棕木作、灰褐大理石及古铜。现代简约采用暖白墙面、浅橡木、燕麦织物、浅砂石材和石墨色五金，配独立圆角沙发、木茶几、木餐椅与圆盘吊灯。宋韵雅居以茶褐木框坐榻、细腿几案、青瓷、米绢与原创水墨挂轴，转化宋人花、香、画、茶的生活意象；采用当代家具尺度和现代厨卫。四套方案各有 64 件可查看物件。

## 运行和检查

使用 Node.js 20.19+（20.x）或 22.12+，建议 Node.js 24。以下命令在本目录运行：

```bash
npm ci
npm run dev -- --port 5173 --strictPort
# http://127.0.0.1:5173/housegpt/?style=modern

npm test
npm run build
npm run preview -- --port 4173 --strictPort
# http://127.0.0.1:4173/housegpt/
```

[法式在线体验](https://www.lyx666.cn/housegpt/?style=french) · [意式在线体验](https://www.lyx666.cn/housegpt/?style=italian)。在线演示可能独立更新，本地版本以检出的 Git 提交为准。

## 功能与操作

- 顶部切换法式/意式/现代/宋韵；也可用 `?style=french`、`?style=italian` 、`?style=modern` 或 `?style=song` 指定。键盘左右方向键依次循环四种风格。切换时保留房间、视角、变焦和日夜状态；若新家具占用当前位置，则回到房间安全视点。
- 全屋剖切、俯视平面、九个空间的室内视角；鼠标拖动环顾，滚轮或 ± 变焦，单击家具查看建议尺寸、材质和说明。
- 室内先单击场景，再用 WASD / 方向键移动；R 复位、H 帮助、Esc 关闭详情或弹窗。
- 日夜光照、每套三组配色，PNG 当前视角、CSV 家具清单与 Markdown 手册导出。
- 手机支持单指环顾、双指缩放、方向按钮与底部房间栏；小屏降低渲染分辨率和环境遮蔽采样。
- 程序化纹理与 CC0 PBR 石材、木作、皮革和织物通道，环境反射、阴影、SSAO；静止时停止重绘。法式、意式吊灯使用随仓库提供的 Blender GLB；现代圆盘灯与宋韵木骨绢光灯由 Three.js 参数化生成，并以同源几何导入 Cycles。
- 「进入高清全景」提供同源场景的 Blender Cycles 渲染：9 房 × 4 风格，桌面 8192 × 4096、手机 4096 × 2048，并含预览图；支持房间/风格切换、环顾、缩放和保存视角。全景采用固定机位、默认配色和日间光照，行走与材质编辑继续使用实时模式。四种风格均覆盖全部九个空间，现代简约使用燕麦与鼠尾草默认配色，宋韵雅居使用米绢与青瓷默认配色。
- 最新主页面已移除 World Labs 入口，生产构建不打包 Spark。`src/worldlabs-viewer.js` 作为研究源码保留，若自行接入会使用官方 CDN，需要联网；官方图书馆不是本户型，第三方二进制未纳入仓库。

## 家具编辑与方案保存

点击“布置家具”进入俯视编辑。可以拖动家具，选中后输入宽度、进深、高度（mm）和旋转角度，再点击“应用尺寸与角度”；±15° 按钮和 R 键可快速旋转。在空白处右键拖动或双指操作可以平移视图，也可切到全屋总览编辑。

桌面端左侧切换风格，右侧集中放置家具编辑、方案菜单和高清全景入口。手机端使用小型浮动工具条，不额外占用画布高度。撤销、重做只在编辑时显示；保存、导出和导入位于「方案」菜单中。

每次拖动松手、应用尺寸或旋转各记为一步。工具栏支持撤销与重做，快捷键为 Ctrl/⌘ Z、Ctrl/⌘ Shift Z 或 Ctrl/⌘ Y。四种风格分别保存修改和最多 100 步会话历史。每次修改自动保存到当前浏览器，刷新后恢复布局；撤销历史不跨刷新保存。“保存方案”可手动重试，JSON 导出和导入用于备份或迁移四套风格。

拖动会在墙体、门扇、栏杆或其他家具前停止，快速拖动也不能越过障碍。尺寸和旋转发生冲突时保留原值，不增加历史。碰撞按家具各构件的方向与高度计算，保留桌下空腔和普通地毯铺底。原始安装接缝及旧存档已有交叠不被自动修改，但编辑不能加深交叠。导入产生新冲突时整份拒绝，保留当前方案。

高清全景继续提供原始四风格、九个空间的固定机位照片，不包含家具编辑结果。尺寸调整按现有模型整体缩放，不会重新设计构件。碰撞约束用于布置推敲，不等于门扇全行程、人体通行净距或施工验收。实时漫游碰撞和导出的家具尺寸会随调整更新。详细行为与验证见 [家具编辑说明](docs/furniture-editor.md)。

## 代码与设计资料

`src/layout.js` 定义户型和视角；`architecture.js` 构建建筑；`furniture.js`、`italian-furniture.js` 与 `modern-furniture.js` 构建家具；`modern-pendant.js` 构建现代圆盘吊灯；`song-furniture.js`、`song-art.js` 和 `song-pendant.js` 构建宋韵家具、原创水墨与木骨绢光灯；`materials.js` 创建纹理；`scene.js` 负责渲染与交互；`ui.js`、`main.js` 和 `style.css` 构成界面。

- [法式落地手册](docs/复古法式-落地手册.md)与[家具清单](docs/家具与尺寸.csv)。
- [意式落地手册](docs/意式轻奢-落地手册.md)与[家具清单](docs/意式轻奢-家具与尺寸.csv)。
- [宋韵雅居落地手册](docs/宋韵雅居-落地手册.md)、[家具清单](docs/宋韵雅居-家具与尺寸.csv)与[风格资料及设计说明](../docs/plans/2026-09-08-song-style.md)。
- [现代简约落地手册](docs/现代简约-落地手册.md)与[家具清单](docs/现代简约-家具与尺寸.csv)。
- [米制参数](public/design-specification.json)、[建筑假设](docs/architecture-assumptions.md)、[设计合理性审查](docs/设计合理性审查.md)。
- [资产来源](docs/asset-sources.md)、[意式吊灯规格](docs/italian-assets.md)、[验证说明](docs/verification.md)、[部署说明](docs/deployment.md)。
- [PBR 资产与许可](docs/pbr-assets.md)、[Cycles 渲染复现](docs/cycles-rendering.md)、[全景房间审查](docs/panorama-room-review.md)、[World Labs 来源与边界](docs/worldlabs-comparison-research.md)。

图中面积合计 110.71 m²，不能视为建筑面积；外包标注 8.853 × 16.375 m，净高 2.8 m、墙厚 0.18 m 等属于方案假设。模型尺寸和家具净距不能直接用于下单或施工，需现场复尺和专业深化。

## 重新生成设计资料与吊灯

```bash
node scripts/export-design.mjs

# 可选：将 Blender 加入 PATH 后重新生成模型
blender --background --python scripts/build_chandelier.py
blender --background --python scripts/build_italian_pendant.py
# 增加 -- --render 可输出 Cycles 预览
```

模型生成脚本使用 Blender 的 Python 环境，无需另装 `bpy`。既有资产记录使用 Blender 5.2.1；本次开源整理直接保留现有 GLB，未重新执行 Blender。macOS 若未配置 PATH，可将 `blender` 替换为 `/Applications/Blender.app/Contents/MacOS/Blender`。脚本输出到 `public/models/` 与 `artifacts/`，会覆盖同名生成文件。

全景重建先运行 `node scripts/export-render-scene.mjs french`（或 `italian`、`modern`、`song`），再按 [Cycles 文档](docs/cycles-rendering.md) 执行 `scripts/render-interior.py`。导出器使用新增的 `@napi-rs/canvas`；渲染脚本当前使用 macOS Metal GPU，其他设备需调整 Cycles 设备配置。现代简约与宋韵雅居全景于 2026-09-08 渲染；法式与意式沿用已有图片。PBR 文件已随仓库提供；可选下载脚本 `scripts/download-pbr-assets.py` 需 Python 3 和网络，并会覆盖同名贴图及 manifest。

## 新增风格工作流

项目内的 [house-style-generation skill](skills/house-style-generation/SKILL.md) 说明如何接入新风格、生成同源全景、验证与交付。它以本目录为源码根；仅同步代码或修复页面不需要全屋重渲染。

## 许可证

自有代码、文档和程序化资产适用仓库根目录 [Apache License 2.0](../LICENSE)。第三方油画和输入户型图的范围见 [素材与授权说明](../THIRD_PARTY_NOTICES.md)。
