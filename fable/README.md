# Fable · Maison 双风格家装

这是 [House 3D](../README.md) 的 **Fable 版本**，原项目目录名为 `house`。与 [GPT6 版本](../gpt6/) 一起，用于比较两个模型生成的 3D 家装项目效果。模型标签描述生成来源；页面运行不调用模型 API。

基于 8853 × 16375 mm 户型，提供法式与意式轻奢两套方案，包含四间卧室（含榻榻米房）、客餐厅、厨房、双卫及阳台。房屋、装饰线、门窗和纹理由 Three.js 程序化构建；家具、灯具和设施由 Blender 参数化生成。

## 运行和检查

使用 Node.js 20.19+（20.x）或 22.12+，建议 Node.js 24。以下命令在本目录运行：

```bash
npm ci
npm run dev -- --host 127.0.0.1
# http://127.0.0.1:5174/maison/

npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4174 --strictPort
# http://127.0.0.1:4174/maison/
```

[法式在线体验](https://www.lyx666.cn/maison/?style=french) · [意式在线体验](https://www.lyx666.cn/maison/?style=italian)。默认法式，页面右上角可切换风格。在线演示可能独立更新，本地版本以检出的 Git 提交为准。

## 操作

- 拖动旋转，右键拖动或双指平移，滚轮/捏合缩放；通过工具栏切换俯视和房间视角。
- 点击房间或家具查看说明，双击定位；风格切换时重新加载对应场景资产。
- `F`：第一人称漫游，配合 WASD 与鼠标；触屏使用摇杆与拖动环顾。
- `C`：天花板；`N`：夜间；`L`：标签；`R`：自动环绕。工具栏提供 AO 开关和截图导出。
- “高清全景”：查看两套风格、每套七个房间的 Cycles 离线全景；支持拖动环顾、滚轮/捏合缩放、房间与风格切换，以及保存当前视角。

桌面使用 GTAO、阴影和泛光；移动端默认关闭 AO 并限制像素比。具体交互实现保留在 `src/main.js`、`src/ui.js` 中。

## 目录

```text
src/plan.js                毫米制户型、墙体、开口和可行走区域
src/styles.js              两套风格的材质与装饰描述
src/house.js               建筑外壳、门窗、窗帘与装饰
src/materials.js           程序化 PBR 纹理
src/furnishings.js         GLB 加载、材质重映射与法式家具布置
src/placements_italian.js  意式家具布置
src/lights.js              日夜与灯光
src/main.js / ui.js        渲染、导航、拾取与触屏操作
src/pano.js                高清全景浏览器
blender/                   资产建模、导出、联系表与 Cycles 全景渲染脚本
public/models/             121 个预生成 GLB 及尺寸 manifest
public/pano/               14 张全景与 14 张加载预览图
mobile-preview.html        开发服务中的双风格移动端预览页
scripts/gen-spec.mjs       设计手册生成器
test/                     户型、双风格摆放与全景覆盖检查
```

[设计与复刻手册](docs/design-spec.md) 由场景数据生成。尺寸包含从输入图推导的结果，不能替代现场测绘、施工图或产品安装要求。

## 可选：重新生成资产

运行页面和构建网站无需 Blender。重新生成时，先安装 Blender 并将 `blender` 放入 PATH：

```bash
npm run assets
npm run assets:sheet
npm run spec
```

`assets` 会覆盖 `public/models/` 中的生成资产和 `manifest.json`；`assets:sheet` 输出 `.scratch/contact_sheet.png`；`spec` 更新 `docs/design-spec.md`。已有资产的原构建记录使用 Blender 5.2.1，本次开源整理未重新执行 Blender，其他 Blender 版本未在本次验证。

macOS 未配置 PATH 时可直接运行：

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python blender/build_assets.py -- public/models
/Applications/Blender.app/Contents/MacOS/Blender -b --python blender/contact_sheet.py -- public/models .scratch/contact_sheet.png
```

## 可选：重新渲染高清全景

`public/pano/` 已包含两套风格的客餐厅、客厅、主卧、次卧 1、次卧 2、榻榻米房和厨房全景。高清图为 3072 × 1536，加载预览为 1024 × 512。它们由同一套 Three.js 场景导出后使用 Blender Cycles 渲染，属于离线图像；页面中的日夜、家具或材质调整不会实时改变已生成的全景。

先运行 `npm run dev -- --host 127.0.0.1`，在 Chrome 打开页面，等场景加载完成后，在开发者工具控制台逐条执行：

```js
await __app.setStyle('french');
await __app.exportScene();
await __app.setStyle('italian');
await __app.exportScene();
```

这会通过仅在 Vite 开发服务启用的导出接口，写入 `.scratch/export/french.glb`、`french.json`、`italian.glb` 和 `italian.json`。预览服务和静态部署不提供此接口。

然后在本目录执行（需要 Bash 和 PATH 中的 Blender）：

```bash
bash blender/render_all.sh 3072 96
```

脚本使用固定的七个房间机位，覆盖 `public/pano/<style>-<room>.jpg`，渲染日志位于 `.scratch/pano_<style>-<room>.log`。预览图需将对应全景缩小为 1024 × 512，并保存为 `<style>-<room>-preview.jpg`；脚本本身只生成高清图。macOS 未配置 PATH 时可使用：

```bash
BLENDER_BIN=/Applications/Blender.app/Contents/MacOS/Blender bash blender/render_all.sh 3072 96
```

`blender/render_pano.py` 可单独渲染，支持 `--cam X Y Z`、`--yaw`、`--samples`、`--res`，以及 `--test`（1024 宽、32 samples）和 `--persp`（普通透视图）。脚本按材质名转换玻璃、镜面与发光材质，使用物理天空及场景灯具；优先尝试 Metal GPU，无法启用时回退 CPU。本次同步保留已有渲染图，未重新执行 Cycles。

## 静态部署

`npm run build` 输出 `dist/`。默认 `base` 为 `/maison/`，应将构建结果部署到站点对应路径；如需改到其他前缀，在构建时使用 `npm run build -- --base=/your-prefix/`，并让静态服务器路径保持一致。请通过 HTTP(S) 服务访问，不直接双击构建后的 HTML。

## 许可证与来源

自有代码、文档和程序化资产适用根目录 [MIT License](../LICENSE)。121 个 GLB（法式 60、意式 61）均有仓库内生成脚本，不引用外部图片或外部 URI；画作、木纹、石纹等由 Canvas 生成。28 张全景及预览 JPG 来自本项目场景的 Blender Cycles 渲染，没有引入外部摄影图片。依赖和素材范围见 [素材与授权说明](../THIRD_PARTY_NOTICES.md)。
