# GPT6 · MAISON 双风格家装

这是 [House 3D](../README.md) 的 **GPT6 版本**，原项目目录名为 `housegpt`。与 [Fable 版本](../fable/) 一起，用于比较两个模型生成的 3D 家装项目效果。模型标签描述生成来源；页面运行不调用模型 API。

基于输入户型图，以 Three.js 构建九个空间，提供复古法式与意式轻奢两套方案。法式采用深胡桃木人字拼、古典线脚与酒红织物；意式采用炭灰皮革、深橄榄软包、黑棕木作、灰褐大理石及古铜。两套方案各有 64 件可查看物件。

## 运行和检查

使用 Node.js 20.19+（20.x）或 22.12+，建议 Node.js 24。以下命令在本目录运行：

```bash
npm ci
npm run dev -- --port 5173 --strictPort
# http://127.0.0.1:5173/housegpt/

npm test
npm run build
npm run preview -- --port 4173 --strictPort
# http://127.0.0.1:4173/housegpt/
```

[法式在线体验](https://www.lyx666.cn/housegpt/?style=french) · [意式在线体验](https://www.lyx666.cn/housegpt/?style=italian)。在线演示可能独立更新，本地版本以检出的 Git 提交为准。

## 功能与操作

- 顶部切换法式/意式；也可用 `?style=french` 或 `?style=italian` 指定。切换时保留房间、视角、变焦和日夜状态；若新家具占用当前位置，则回到房间安全视点。
- 全屋剖切、俯视平面、九个空间的室内视角；鼠标拖动环顾，滚轮或 ± 变焦，单击家具查看建议尺寸、材质和说明。
- 室内先单击场景，再用 WASD / 方向键移动；R 复位、H 帮助、Esc 关闭详情或弹窗。
- 日夜光照、每套三组配色，PNG 当前视角、CSV 家具清单与 Markdown 手册导出。
- 手机支持单指环顾、双指缩放、方向按钮与底部房间栏；小屏降低渲染分辨率和环境遮蔽采样。
- 程序化纹理与 CC0 PBR 石材、木作、皮革和织物通道，环境反射、阴影、SSAO；静止时停止重绘。两种吊灯使用随仓库提供的 Blender GLB。
- 「进入高清全景」提供同源场景的 Blender Cycles 渲染：9 房 × 2 风格，桌面 8192 × 4096、手机 4096 × 2048，并含预览图；支持房间/风格切换、环顾、缩放和保存视角。全景采用固定机位、默认配色和日间光照，行走与材质编辑继续使用实时模式。
- 最新主页面已移除 World Labs 入口，生产构建不打包 Spark。`src/worldlabs-viewer.js` 作为研究源码保留，若自行接入会使用官方 CDN，需要联网；官方图书馆不是本户型，第三方二进制未纳入仓库。

## 代码与设计资料

`src/layout.js` 定义户型和视角；`architecture.js` 构建建筑；`furniture.js` 与 `italian-furniture.js` 构建家具；`materials.js` 创建纹理；`scene.js` 负责渲染与交互；`ui.js`、`main.js` 和 `style.css` 构成界面。

- [法式落地手册](docs/复古法式-落地手册.md)与[家具清单](docs/家具与尺寸.csv)。
- [意式落地手册](docs/意式轻奢-落地手册.md)与[家具清单](docs/意式轻奢-家具与尺寸.csv)。
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

全景重建先运行 `node scripts/export-render-scene.mjs french`（或 `italian`），再按 [Cycles 文档](docs/cycles-rendering.md) 执行 `scripts/render-interior.py`。导出器使用新增的 `@napi-rs/canvas`；渲染脚本当前使用 macOS Metal GPU，其他设备需调整 Cycles 设备配置。本次同步保留已有全景，不重新执行耗时渲染。PBR 文件已随仓库提供；可选下载脚本 `scripts/download-pbr-assets.py` 需 Python 3 和网络，并会覆盖同名贴图及 manifest。

## 许可证

自有代码、文档和程序化资产适用仓库根目录 [Apache License 2.0](../LICENSE)。第三方油画和输入户型图的范围见 [素材与授权说明](../THIRD_PARTY_NOTICES.md)。
