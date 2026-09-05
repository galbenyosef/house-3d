# 资产来源与复现

完整授权范围见仓库根目录 [素材与授权说明](../../THIRD_PARTY_NOTICES.md)。

- 建筑和家具：`src/architecture.js`、`src/furniture.js`、`src/italian-furniture.js`，项目内米制程序化几何。
- 地板、木纹、布纹、地毯、石纹、皮革：`src/materials.js` 的固定种子 Canvas 纹理，运行时生成。
- 八臂黄铜吊灯：`public/models/french-chandelier.glb`，生成脚本 `scripts/build_chandelier.py`；尺寸与多边形记录见 `artifacts/chandelier-metadata.json`。
- 意式双椭圆线光吊灯：`public/models/italian-pendant.glb`，生成脚本 `scripts/build_italian_pendant.py`；详见[资产尺寸与复现](italian-assets.md)。
- 客厅油画：Camille Corot，The Banks of the Seine at Conflans，约 1865–1870，The Metropolitan Museum of Art，藏品 21.70.4 / object 435989。2026-09-05 核验[馆方页面](https://www.metmuseum.org/art/collection/search/435989)标记为 Public Domain。`public/textures/corot-seine.jpg` 源于馆方 API 的 `primaryImageSmall`，展示时裁切纹理坐标。
- 输入户型：`public/floor-plan.jpg`，用于原图对照。它不在本仓库 MIT 授权范围内，独立复用请先确认权利；此处已随开源项目公开，原本仅限本地的描述不再适用。
- 风格参考图片：只作材质与氛围参考，未作为贴图或独立资产分发。
- 字体：使用系统字体回退，无 Google Fonts 请求或随仓库分发的字体文件。
- 渲染与构建：Three.js 与 Vite；准确版本由本子项目的 `package-lock.json` 锁定。
