# 实景材质资产与接入

本文记录原项目的材质来源、接入方式与开发时检查。本次开源同步的独立验证范围见[发布记录](../../docs/publication.md)。

2026-09-06 核验。资产随站点自托管，运行页面不访问外部素材 API。10 张 1024 × 1024 JPG 共 **6,096,235 字节（约 6.10 MB）**；制作时下载量（含仅在内存中解包的官方石材压缩包）约 8.67 MB。原有 Corot 画作单独保留。

| 材质 | 官方来源与许可 | 文件与使用方式 |
| --- | --- | --- |
| 灰色无拼缝石材 | [ambientCG Marble012](https://ambientcg.com/a/Marble012)，[CC0](https://docs.ambientcg.com/license/) | `Marble012_1K-JPG_Color.jpg` / `NormalGL.jpg` / `Roughness.jpg`；官方分类 **PBRProcedural**，是完整 PBR 程序资产，不宣称实物扫描。设定一幅覆盖 1.8 m，该数值为设计比例，非厂家板材尺寸。 |
| 烟熏胡桃木饰面 | [Poly Haven Smoked Walnut Veneer](https://polyhaven.com/a/smoked_walnut_veneer)，[CC0](https://polyhaven.com/license)；Jenelle van Heerden | `smoked_walnut_veneer_diff_1k.jpg` / `nor_gl_1k.jpg` / `rough_1k.jpg`；官方覆盖尺寸 1000 × 1000 mm，用于木作；保留原人字拼/直拼地板铺法。 |
| 细皮革表面 | [Poly Haven Leather White](https://polyhaven.com/a/leather_white)，[CC0](https://polyhaven.com/license)；Rob Tuytel | `leather_white_nor_gl_1k.jpg` / `rough_1k.jpg`；官方约 300 × 300 mm；采用表面法线及粗糙度，保留方案选择的炭灰/苔灰/暖灰皮革颜色。 |
| 棉织物肌理 | [Poly Haven Fabric Pattern 05](https://polyhaven.com/a/fabric_pattern_05)，[CC0](https://polyhaven.com/license)；Rob Tuytel | `fabric_pattern_05_nor_gl_1k.jpg` / `rough_1k.jpg`；官方约 500 × 500 mm；采用织物表面通道，不采用原格纹配色。 |

所有上表文件位于 `public/textures/pbr/`。`public/textures/pbr/manifest.json` 记录官方 URL、作者、分辨率、文件字节数及 SHA-256，石材还记录原压缩包 SHA-256。`scripts/download-pbr-assets.py` 通过两家官方 API 获取文件元数据，再校验下载；Poly Haven 文件同时核对官方 MD5，ambientCG 原压缩包核对官方大小并由 ZIP 验证 CRC。

## Three.js

在 `createMaterials(style)` 后、`buildArchitecture` 和 `buildFurniture` 前调用：

```js
import { enhanceMaterials } from './pbr-materials.js';
const { mats, setPalette } = createMaterials(style);
await enhanceMaterials(mats, style);
// 再创建建筑及家具，使其克隆材质继承 PBR 贴图。
```

`enhanceMaterials` 修改并返回传入的 `mats`。同一材质集合重复调用复用 Promise；每种风格使用独立纹理实例，其内部相同饰面共享实例。只加载当前风格所用贴图，加载失败前不修改原材质。待替换的旧贴图仅在未被传入集合中其他材质引用时释放。

- 色彩图显式设置 sRGB；OpenGL 法线和粗糙度为 NoColorSpace。两种数据通道均不使用色彩图充当 bump。
- 所有新纹理 `repeat = [1, 1]`。材质 `userData.textureSizeMeters` 提供米制覆盖宽度，几何 UV 应按 `米坐标 / textureSizeMeters` 投影一次；不得另外再乘纹理重复数。
- `PBR_BINDINGS[style][materialKey]` 给出资产名、法线强度、粗糙度乘数和色调补偿。皮革与织物不叠加原白/格纹色彩图，避免破坏深色配色；石材和木材只轻微将原材质 tint 向白色插值，原颜色记录于 `material.userData.pbr.originalColor`。
- 石材原粗糙度均值约 0.066，是高度抛光饰面；在内存中按 `0.26 + 原线性粗糙度 × 0.38` 转为柔和哑光底图，再乘各材质粗糙度。未改变下载的源文件。此效果不等于产品的防滑等级或真实工艺检测结果。
- 法式波斯地毯、原地板拼法和未绑定材质保留现有实现。此升级不代表全屋资产均已替换为扫描模型。

JPG 压缩减少传输体积，不能压缩解码后的显存。仅这些 PBR 贴图在开启 mipmap 后，法式约 43 MiB、意式约 53 MiB；两套都缓存约 96 MiB（估算，不含其他材质、几何及渲染缓冲）。如后续手机实测显存吃紧，再转 KTX2 或释放非当前风格，不能以小下载量推断低显存占用。

## Blender / Cycles

`src/pbr-materials.js` 导出 `PBR_ASSETS` 与 `PBR_BINDINGS`。文件路径均相对 `public/`，可直接拼到本地根目录。同步目录清单也在 `public/textures/pbr/manifest.json`。

优先导出已经执行 `enhanceMaterials` 的材质和贴图，这样 Cycles 与浏览器共享原配色、法线强度和石材粗糙度重映射。若直接读原始 JPG，需要将 color 设为 sRGB、normal/roughness 设为 Non-Color；法线使用 OpenGL 方向，不翻转 G 通道；石材应用 `PBR_ASSETS.stone.roughnessRange` 后再乘绑定的 roughness。UV 保持同源米制比例。

## 已完成验证

- `node --check src/pbr-materials.js` 通过。
- 十张 JPG 均可解码，实际分辨率全部为 1024 × 1024。
- 逐文件 SHA-256 与 manifest 一致，总字节数匹配，所有导出路径存在。
- 视觉检查排除了带砖缝的候选 `marble_01`，避免整板桌面出现错误砌筑接缝；该候选文件已删除。
- 浏览器完整材质效果和移动端性能由主任务集成后验证，本文不将语法检查当作视觉验收。
