# 资产来源与复现

完整授权范围见仓库根目录 [素材与授权说明](../../THIRD_PARTY_NOTICES.md)。

- 建筑和家具：`src/architecture.js`、`src/furniture.js`、`src/italian-furniture.js`，项目内米制程序化几何。
- 地板、木纹、布纹、地毯、石纹、皮革：`src/materials.js` 的固定种子 Canvas 纹理，运行时生成。
- 八臂黄铜吊灯：`public/models/french-chandelier.glb`，生成脚本 `scripts/build_chandelier.py`；尺寸与多边形记录见 `artifacts/chandelier-metadata.json`。
- 意式双椭圆线光吊灯：`public/models/italian-pendant.glb`，生成脚本 `scripts/build_italian_pendant.py`；详见[资产尺寸与复现](italian-assets.md)。
- 客厅油画：Camille Corot，The Banks of the Seine at Conflans，约 1865–1870，The Metropolitan Museum of Art，藏品 21.70.4 / object 435989。2026-09-05 核验[馆方页面](https://www.metmuseum.org/art/collection/search/435989)标记为 Public Domain。`public/textures/corot-seine.jpg` 源于馆方 API 的 `primaryImageSmall`，展示时裁切纹理坐标。
- 输入户型：`public/floor-plan.jpg`，用于原图对照。它不在本仓库 Apache-2.0 授权范围内，独立复用请先确认权利；此处已随开源项目公开，原本仅限本地的描述不再适用。
- 风格参考图片：只作材质与氛围参考，未作为贴图或独立资产分发。
- 字体：使用系统字体回退，无 Google Fonts 请求或随仓库分发的字体文件。
- 渲染与构建：Three.js 与 Vite；准确版本由本子项目的 `package-lock.json` 锁定。

## 2026-09-06 同步补充

- `public/textures/pbr/`：Poly Haven 木作、皮革与织物通道，以及 ambientCG Marble012 石材，均为 CC0。详见 [PBR 资产说明](pbr-assets.md)和 `public/textures/pbr/manifest.json` 的来源、作者与哈希。
- `public/panoramas/`：本项目同源场景在 Blender Cycles 中生成的 9 房 × 2 风格全景，包含 8K、4K 与预览，共 54 张 JPG。场景导出与重渲染见 [Cycles 文档](cycles-rendering.md)，机位和文件信息见 `public/panoramas/manifest.json`。
- World Labs 官方图书馆样例：最新主页面已移除入口，仅保留研究用查看器源码；如自行接入，源码从官方 CDN 按需加载。该示例不是本户型，未纳入 Apache-2.0 或仓库二进制。详见[来源与许可边界](worldlabs-comparison-research.md)。
- Spark 用于高斯点查看，`@napi-rs/canvas` 用于离线场景导出，包版本由本项目锁文件固定；第三方许可证见根目录素材说明。
