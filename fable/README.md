# Fable · Maison 四风格家装

这是 [House 3D](../README.md) 的 **Fable 版本**，原项目目录名为 `house`。与 [GPT6 版本](../gpt6/) 一起，用于比较两个模型生成的 3D 家装项目效果。模型标签描述生成来源；页面运行不调用模型 API。

基于 8853 × 16375 mm 户型，提供法式、意式轻奢、现代简约和宋式四套方案，包含四间卧室（含榻榻米房）、客餐厅、厨房、双卫及阳台。房屋、装饰线、门窗和纹理由 Three.js 程序化构建；家具、灯具和设施由 Blender 参数化生成。

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

[法式在线体验](https://www.lyx666.cn/maison/?style=french) · [意式在线体验](https://www.lyx666.cn/maison/?style=italian)。默认法式，页面右上角可切换四套风格；本地还可使用 `?style=modern` 或 `?style=song` 直接进入新增方案。在线演示可能独立更新，本地版本以检出的 Git 提交为准。

## 操作

- 拖动旋转，右键拖动或双指平移，滚轮/捏合缩放；通过工具栏切换俯视和房间视角。
- 点击房间或家具查看说明，双击定位；风格切换时重新加载对应场景资产。
- `F`：第一人称漫游，配合 WASD 与鼠标；触屏使用摇杆与拖动环顾。
- `C`：天花板；`N`：夜间；`L`：标签；`R`：自动环绕。工具栏提供 AO 开关和截图导出。
- “高清全景”：查看四套风格、每套七个房间的 Cycles 离线全景；支持拖动环顾、滚轮/捏合缩放、房间与风格切换，以及保存当前视角。

桌面使用 GTAO、阴影和泛光；移动端默认关闭 AO 并限制像素比。具体交互实现保留在 `src/main.js`、`src/ui.js` 中。

## 家具布置

按 `E` 或点击“布置”，进入同一 3D 场景的俯视编辑模式。拖动空白地面平移，滚轮或双指缩放；点击房间可将视图移到该房间。

- 直接拖动家具或地毯移动，默认按 10 mm 网格及墙面吸附，按住 `Alt` 可关闭吸附。墙挂家具沿所在墙面移动；选中轮廓周围显示到最近墙面的距离。
- 拖动金色圆点旋转，默认每次吸附 15°，按住 `Shift` 可自由旋转。`R` / `Shift+R` 每次旋转 90°。拖动角点调整尺寸，也可在浮动工具栏输入宽、深或比例，并复位单件家具。
- 方向键每次移动 10 mm，配合 `Shift` 为 100 mm；`Esc` 取消选择。放在家具上的灯、花瓶和书本会跟随该家具移动、旋转和缩放，天花灯具保持在原灯光系统中。
- “防碰撞”默认开启。移动、旋转或缩放不能进一步穿入墙体或同高度的家具；受阻拖动会沿障碍滑动，并标记障碍。椅子、植物和落地灯保留默认摆放规则中的交叠容差，地毯只检查墙体。这个检查用于布置交互，不能替代施工净距校核。
- `⌘/Ctrl+Z` 撤销，`⌘/Ctrl+Shift+Z` 或 `Ctrl+Y` 重做。每套风格分别自动保存到当前浏览器的 `localStorage`（`maison-layout-v1:<style>`），刷新或切换风格后恢复；“⋯”菜单可导出、导入 JSON，或恢复默认布置。浏览器禁用本地存储时仍可编辑，但不会自动保存。

高清全景仍展示默认布置的离线渲染图，不随上述编辑实时更新。`__app.exportScene()` 会导出当前已编辑的场景；如需全景反映编辑结果，按下方流程重新渲染。编辑交互参考了 [wy51ai/floorplan-3d](https://github.com/wy51ai/floorplan-3d)（MIT）的网格吸附、撤销重做和本地保存方式，来源说明见 [素材与授权说明](../THIRD_PARTY_NOTICES.md)。

## 目录

```text
src/plan.js                毫米制户型、墙体、开口和可行走区域
src/styles.js              四套风格描述及 STYLES 注册表
src/house.js               建筑外壳、门窗、窗帘与装饰
src/materials.js           程序化 PBR 纹理
src/furnishings.js         GLB 加载、材质重映射与法式家具布置
src/placements_*.js       意式、现代简约及宋式家具布置
src/specs_*.js             新风格的房间说明
src/lights.js              日夜与灯光
src/main.js / ui.js        渲染、导航、拾取与触屏操作
src/layout.js              家具变换、吸附、防碰撞、历史与本地保存
src/editor.js              布置模式的鼠标、触屏与快捷键
src/editor-overlay.js      选中轮廓、旋转/尺寸手柄、墙距与浮动工具栏
src/pick.js                可见家具拾取与轮廓命中
src/pano.js                高清全景浏览器
blender/                   资产建模、导出、联系表与 Cycles 全景渲染脚本
public/models/             223 个预生成 GLB 及尺寸 manifest
public/pano/               28 张全景与 28 张加载预览图
mobile-preview.html        开发服务中的四风格移动端预览页
scripts/gen-spec.mjs       设计手册生成器（文案位于 spec-text*.mjs）
scripts/new-style.mjs      新风格脚手架
test/                     户型、四风格摆放、全景覆盖、编辑模型及拾取检查
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

## 新增装修风格

脚手架先复制一套已有方案，建立可切换的新风格及其家具摆放、房间说明和手册文案：

```bash
npm run style:new -- sample 示例风格 --from italian
```

随后在 `src/styles.js` 的新描述对象中修改材质、颜色和建筑装饰；在 `blender/assets_<id>.py` 中添加程序化资产并运行 `npm run assets`，再调整 `src/placements_<id>.js` 的家具摆放。`src/specs_<id>.js` 控制房间说明，`scripts/spec-text_<id>.mjs` 控制手册文案，运行 `npm run spec` 更新设计手册。

新风格最初复用基础方案的模型和外观，需完成上述设计与资产工作后才是一套独立方案。按下一节导出、渲染其七个房间全景，再运行 `npm test` 与 `npm run build`；全景覆盖测试会要求每个已注册风格都具备高清图和预览图。脚手架还支持 `npm run style:new -- --remove sample`，只移除该脚手架生成的注册和文案文件，Blender 资产及全景需自行处理。

## 可选：重新渲染高清全景

`public/pano/` 已包含四套风格的客餐厅、客厅、主卧、次卧 1、次卧 2、榻榻米房和厨房全景。高清图为 3072 × 1536，加载预览为 1024 × 512。它们由同一套 Three.js 场景导出后使用 Blender Cycles 渲染，属于离线图像；页面中的日夜、家具或材质调整不会实时改变已生成的全景。

先运行 `npm run dev -- --host 127.0.0.1`，在 Chrome 打开页面，等场景加载完成后，在开发者工具控制台逐条执行：

```js
await __app.setStyle('french');
await __app.exportScene();
await __app.setStyle('italian');
await __app.exportScene();
await __app.setStyle('modern');
await __app.exportScene();
await __app.setStyle('song');
await __app.exportScene();
```

这会通过仅在 Vite 开发服务启用的导出接口，为每套风格写入 `.scratch/export/<style>.glb` 和 `<style>.json`。预览服务和静态部署不提供此接口。

然后在本目录执行（需要 Bash 和 PATH 中的 Blender；自动生成预览图使用 macOS 的 `sips`）：

```bash
npm run pano -- 3072 96
# 也可以只渲染指定风格：
npm run pano -- 3072 96 modern song
```

脚本默认遍历已导出的风格，使用固定的七个房间机位，覆盖 `public/pano/<style>-<room>.jpg`，并通过 `sips` 生成 1024 × 512 的 `<style>-<room>-preview.jpg`。意式、现代简约和宋式主卧使用对应的朝向；各风格共用亮度参数。渲染日志位于 `.scratch/pano_<style>-<room>.log`。非 macOS 环境需自行替换 `sips` 缩略图步骤。macOS 未配置 PATH 时可使用：

```bash
BLENDER_BIN=/Applications/Blender.app/Contents/MacOS/Blender npm run pano -- 3072 96
# 也可以只渲染指定风格：
npm run pano -- 3072 96 modern song
```

`blender/render_pano.py` 可单独渲染，支持 `--cam X Y Z`、`--yaw`、`--samples`、`--res`，以及 `--test`（1024 宽、32 samples）和 `--persp`（普通透视图）。脚本按材质名转换玻璃、镜面与发光材质，使用物理天空及场景灯具；优先尝试 Metal GPU，无法启用时回退 CPU。本次同步保留已有渲染图，未重新执行 Cycles。

## 静态部署

`npm run build` 输出 `dist/`。默认 `base` 为 `/maison/`，应将构建结果部署到站点对应路径；如需改到其他前缀，在构建时使用 `npm run build -- --base=/your-prefix/`，并让静态服务器路径保持一致。请通过 HTTP(S) 服务访问，不直接双击构建后的 HTML。

## 许可证与来源

自有代码、文档和程序化资产适用根目录 [Apache License 2.0](../LICENSE)。223 个 GLB（法式 60、意式 61、现代简约 46、宋式 56）均有仓库内生成脚本，不引用外部图片或外部 URI；画作、木纹、石纹等由 Canvas 生成。56 张全景及预览 JPG 来自本项目场景的 Blender Cycles 渲染，没有引入外部摄影图片。依赖和素材范围见 [素材与授权说明](../THIRD_PARTY_NOTICES.md)。
