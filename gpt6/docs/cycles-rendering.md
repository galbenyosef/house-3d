# 同源户型的 Cycles 高清渲染

本文保留原项目的渲染参数和开发记录。本仓库同步已生成的 JPG、manifest 与 `scripts/` 下的生成脚本；下文 `artifacts/cycles/` 的大体积导出、过程日志和旧验收产物未收录，本次同步的检查范围见[发布记录](../../docs/publication.md)。命令应在 `gpt6/` 目录执行。

高清全景由本项目的建筑、家具和吊灯资产在 Blender Cycles 中实际渲染。建筑和家具直接读取 `src/architecture.js`、`src/furniture.js`、`src/materials.js`；扫描与程序 PBR 使用 `src/pbr-materials.js` 的相同贴图、配色和米制 UV。它不是另一套 AI 猜测的户型，也不是实拍。

保留完整墙体与天花、原家具尺度、门洞及摆放。离线渲染使用真正参与遮挡的窗外面光源、太阳、局部灯具和间接光反弹，使墙角、家具接触、玻璃和石材反射在同一场景中计算。日光的方向和强度是效果方案，并非现场日照测量。窗外未模拟真实小区景观。

高清内容按原户型的 9 个房间提供固定机位：客餐厅、主卧、两间次卧、书房、厨房、公卫、主卫、阳台；每个房间有复古法式、意式轻奢、现代简约、宋韵雅居四种风格，默认配色、日间光照。桌面使用原生渲染的 8192 × 4096，手机使用 4096 × 2048。新增房间的手机图由同一 8K 成品在 Blender 内降采样生成，位置、灯光和画面一致，没有把小图放大成 8K。可以切换房间、旋转和缩放；任意行走、配色和灯光编辑继续使用 Three.js 实时模式。

## 重建

在项目根目录执行：

```sh
node scripts/export-render-scene.mjs italian
node scripts/export-render-scene.mjs french
node scripts/export-render-scene.mjs modern
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/render-interior.py -- --style italian --mode preview --rooms remaining --width 1280 --samples 32 --adaptive-threshold 0.03 --exposure 0.3
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/render-interior.py -- --style italian --mode both --rooms remaining --width 8192 --mobile-panorama --samples 64 --adaptive-threshold 0.03 --exposure 0.3
```

将 `--style` 换为 `french` 可重建法式，换为 `modern` 可重建现代简约，换为 `song` 可重建宋韵雅居。当前脚本使用 macOS Metal GPU，非 macOS 需要改为对应 Cycles 设备后运行。首轮实测机器为 Apple M4 Max，Blender 5.2.1 LTS。

`--rooms remaining` 仅渲染客餐厅以外的 8 房，保留既有客餐厅图片及其清单字段。`--room master` 可单独渲染主卧，`--rooms kitchen,bathroom,ensuite` 可运行指定批次，`--rooms all` 明确选择重建全部 9 房。每个风格只导入一次场景，房间间复用 GPU/BVH。脚本仅在本次记录包含实际新生成的 8K、4K，且 JPEG 可解码、尺寸正确后更新清单；取消、失败和单独预览不会将旧全景登记成新结果，单独预览也不会覆盖已发布房间的缩略图。

导出的 `artifacts/cycles/<style>/scene.json` 记录每个可见网格的真实世界顶点、法线、UV、材质、贴图变换和全部房间相机。它不进入网页发布包。Three.js 到 Blender 的坐标转换为 `(x, y, z) → (x, -z, y)`，单位均为米。各机位直接读取 `src/layout.js` 的 `ROOMS[].view`；没有移动墙体或家具迁就摄影角度。透视预览使用 22 mm / 36 mm sensor 的摄影机；360° 全景以各房目标的水平投影作为画面中心，保持地平线水平。初始俯角逐房由目标计算，公卫约 −29.18°、主卫约 −19.72°，没有沿用客餐厅俯角。

正式全景使用 AgX、64 samples、降噪、10 次最大反弹、6 次漫反射反弹；新增房间的自适应采样阈值为 0.03，保留的客餐厅版本为 0.015。新增记录按 `artifacts/cycles/<style>/rooms/<room>/<mode>-<UTC时间>.json` 保存，不覆盖前轮客餐厅记录。记录包含实际参数、耗时、输出文件哈希、源文件 SHA256 和灯光假设；全部房间最终图片验收见 `artifacts/cycles/all-rooms-verification.json`。网页资源及方向见 `public/panoramas/manifest.json`，`url` 为桌面版本，`mobileUrl` 为手机版本。全景不宣称现场尺寸或施工图准确性，原户型推导和复尺限制仍适用。

离线玻璃用薄玻璃与透明混合，保持原实时模型的通透度；纱帘覆盖率延用原材质。未增加无阴影的全房环境补光。纹理来源和许可沿用 `public/textures/pbr/manifest.json` 与项目资产来源文档。

## 厨房与两卫的功能照明

新增房间的初次预览暴露出厨房和两卫照明不足，现增加真实窗洞外的面积光，并保留磨砂玻璃的 0.12 透射与高粗糙度。窗外光位置为厨房 `(0.94, 1.60, 2.22)`、公卫 `(8.62, 1.62, 4.51)`、主卫 `(8.62, 1.62, 9.60)`，分别朝房内投射，墙体继续参与遮挡。

另外增加贴于假设 2.80 m 天花的功能灯盘，灯具下方的面积光中心高 2.77 m，外壳顶面与天花贴合。灯盘仅在所查看的对应房间开启，均投射真实阴影并参与间接光。这是照明方案的补充，原墙体、门窗和家具摆放保持不变。

| 房间 | Three.js 米制光源位置 | 扩散罩直径 | Blender 面积光功率 |
| --- | --- | --- | --- |
| 厨房 | (1.60, 2.77, 4.20) | 200 mm | 18 W |
| 公卫主照明 | (6.52, 2.77, 4.37) | 160 mm | 12 W |
| 公卫淋浴区 | (7.43, 2.77, 4.45) | 120 mm | 4 W |
| 主卫主照明 | (6.45, 2.77, 9.70) | 160 mm | 12 W |
| 主卫淋浴区 | (7.46, 2.77, 9.65) | 120 mm | 4 W |

表内功率为渲染器辐射功率参数，不是灯具电器额定瓦数。真实选型、安装和湿区耐水构造仍需结合现场深化；法式湿区原有装饰线脚应采用适合湿区的耐水饰面。

## 图片验收

原开发环境曾使用 `artifacts/cycles/verify-all-rooms.mjs`，解码 54 张图片并核对尺寸、SHA256、清单字节数、每房相机、源文件哈希、手机图来源及客餐厅旧图保持不变。该脚本依赖原始渲染记录和旧基线，未作为本仓库可直接运行的命令提供。当前可从 `public/panoramas/manifest.json` 核对每房风格、图像路径、分辨率和已有哈希字段；本次同步另外验证源文件与发布副本一致，结果见发布记录。

## 现代简约全景（2026-09-08）

九个空间新增 27 张图片：9 张原生 8192 × 4096 全景、9 张由同一 8K 成品降采样的 4096 × 2048 手机全景、9 张 1280 × 720 透视预览。使用 Blender 5.2.1 LTS / Cycles / Metal、64 samples、阈值 0.03、AgX 曝光 +0.3，默认燕麦与鼠尾草配色。机位与原有两种风格保持一致；圆盘吊灯从 `src/modern-pendant.js` 导出同源几何。

```sh
node scripts/export-render-scene.mjs modern
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/render-interior.py -- --style modern --mode preview --rooms all --width 1280 --samples 32 --adaptive-threshold 0.03 --exposure 0.3
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/render-interior.py -- --style modern --mode both --rooms all --width 8192 --mobile-panorama --samples 64 --adaptive-threshold 0.03 --exposure 0.3
node --test tests/panorama-assets.test.mjs
```

Blender 可执行文件路径按本机安装位置替换。本次使用 Apple M4；每房渲染记录保存在 `artifacts/cycles/modern/rooms/`，正式图片校验值写入公开清单。资产测试核对四种风格的九房覆盖，并分别解码现代简约与宋韵雅居各 27 张图片检查尺寸、字节数与 SHA256。

## 宋韵雅居全景（2026-09-08）

同一九机位，默认米绢与青瓷配色；茶褐木框、细腿几案、青瓷和原创水墨由实时场景直接导出，六方木骨绢光灯共用 `src/song-pendant.js`。厨卫使用现有真实灯具位置，功能光相对基础方案提高至 1.5 倍并调整为中性暖光，其余风格参数保持不变。

```sh
node scripts/export-render-scene.mjs song
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/render-interior.py -- --style song --mode both --rooms all --width 8192 --mobile-panorama --samples 64 --adaptive-threshold 0.03 --exposure 0.3
```

本次运行机器为 Apple M4。先检查全部 1280×720 预览，再生成原生 8192×4096 全景与同图降采样的 4096×2048 手机版。原始模型哈希、相机、采样数、输出哈希及耗时写入 `artifacts/cycles/song/rooms/`；发布清单只在该房间三种资产完整后更新。

正式九房渲染用时合计 3429.68 秒（约 57.2 分钟）。27 张新图片的尺寸与 SHA256 校验通过，原有 81 张全景资产保持不变。
