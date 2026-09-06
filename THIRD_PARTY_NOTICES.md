# 素材来源与授权范围

根目录 [MIT 许可证](LICENSE) 适用于本仓库自有代码、文档与程序化生成资产。以下资料和依赖保留各自的权利状态，不因随仓库发布而更换许可证。

## 依赖与工具

| 组件 | 用途 | 许可证与来源 |
| --- | --- | --- |
| Three.js | WebGL 渲染、控制器、GLB 加载和后处理 | MIT；[上游许可证](https://github.com/mrdoob/three.js/blob/dev/LICENSE) |
| Vite | 开发服务器和生产构建 | MIT；[上游许可证](https://github.com/vitejs/vite/blob/main/LICENSE) |
| Spark 2.1.0 | GPT6 保留的研究用高斯点查看器，默认应用不打包 | MIT；[上游许可证](https://github.com/sparkjsdev/spark/blob/main/LICENSE) |
| @napi-rs/canvas 1.0.8 | GPT6 离线场景导出与图像处理 | MIT；[上游许可证](https://github.com/Brooooooklyn/canvas/blob/main/LICENSE) |
| Blender | 可选的模型生成和预览工具，不随仓库分发 | [Blender 许可证说明](https://www.blender.org/about/license/) |

准确的依赖版本由两个子项目各自的 `package-lock.json` 锁定。传递依赖的许可证以安装后相应软件包的 LICENSE / NOTICE 为准。网页使用系统字体回退，仓库未分发字体文件。

## 项目生成的资产

- `gpt6/public/models/french-chandelier.glb` 和 `italian-pendant.glb` 分别由 `gpt6/scripts/build_chandelier.py`、`build_italian_pendant.py` 生成；相关元数据与预览保存在 `gpt6/artifacts/`。
- `fable/public/models/` 中的 121 个 GLB 由 `fable/blender/` 下的程序化建模脚本生成，`manifest.json` 记录模型尺寸；这些 GLB 不引用外部图片或外部文件。
- 两个版本的建筑、其他程序化几何及 Canvas 材质纹理见各自 `src/`。上述项目自有脚本和生成资产随本仓库按 MIT 发布。
- `gpt6/public/panoramas/` 的 54 张 JPG 和 `fable/public/pano/` 的 28 张 JPG 是各自场景的 Blender Cycles 渲染结果。生成脚本随仓库提供；图中第三方素材保留以下独立权利状态。
- 模型中的家具样式或名称用于描述外观，不代表品牌原版模型、官方合作、商标许可或产品认证。

## 对比视频与预览图片

`media/` 收录两套项目的录屏剪辑和配对预览图。自有录制、剪辑、版式及原创配乐随本仓库按 MIT 发布；画面中出现的第三方素材仍遵循本文件对应说明，输入户型参考图的权利范围不因被录入视频或截图而改变。

制作记录表明：交互版使用为该视频创作的 80 BPM 钢琴配乐；最新实景版使用另行创作的 96 BPM lounge 配乐 *Rooms in the Afternoon*。乐器音频通过 macOS 系统乐器离线合成，实景版另含程序合成打击声；仓库不分发系统音色库。录制来源、音乐制作方式和文件哈希见 [媒体说明](media/README.md) 与 [媒体清单](media/manifest.json)。

## 公共领域油画

`gpt6/public/textures/corot-seine.jpg`：Camille Corot，*The Banks of the Seine at Conflans*，约 1865–1870，The Metropolitan Museum of Art，藏品号 21.70.4、object ID 435989。

该文件源自馆方公开 API 的 `primaryImageSmall`。2026-09-05 核验的[馆方藏品页面](https://www.metmuseum.org/art/collection/search/435989)标注 **Public Domain**；参见 [The Met Open Access](https://www.metmuseum.org/about-the-met/policies-and-documents/open-access)。此图片保留其公共领域状态，未重新赋予 MIT 许可证。项目在画框展示时裁切纹理坐标。

## CC0 PBR 贴图

`gpt6/public/textures/pbr/` 的 10 张 JPG 沿用 **CC0-1.0**，不重新标为 MIT：

- [Poly Haven Smoked Walnut Veneer](https://polyhaven.com/a/smoked_walnut_veneer)，Jenelle van Heerden：颜色、OpenGL 法线及粗糙度。
- [Poly Haven Leather White](https://polyhaven.com/a/leather_white)，Rob Tuytel：OpenGL 法线及粗糙度。
- [Poly Haven Fabric Pattern 05](https://polyhaven.com/a/fabric_pattern_05)，Rob Tuytel：OpenGL 法线及粗糙度。
- [ambientCG Marble012](https://ambientcg.com/a/Marble012)：颜色、OpenGL 法线及粗糙度；该石材为程序 PBR，不宣称实物扫描。

[Poly Haven 许可](https://polyhaven.com/license)与 [ambientCG 许可](https://docs.ambientcg.com/license/)允许随项目分发。原下载地址、作者、尺寸和 SHA-256 保存在 [PBR manifest](gpt6/public/textures/pbr/manifest.json)，使用说明见 [PBR 文档](gpt6/docs/pbr-assets.md)。

## World Labs 官方测试样例

GPT6 最新主页面已移除 World Labs 入口；保留的研究用查看器源码如被自行接入，将从官方 CDN 按需加载 *Elegant Library with Fireplace* 的 500k SPZ，来源为 [World Labs 导出示例页](https://docs.worldlabs.ai/marble/export/specs)。此示例不是本户型的生成结果，也不属于本仓库的 MIT 资产。

目前未找到该测试样例明确的独立再分发许可证，因此仓库不收录原项目本地的 `elegant-library-500k.spz` 或 `elegant-library-collider.glb`。查看功能需要联网，并受 [World Labs 服务条款](https://www.worldlabs.ai/terms-of-service)约束；官方链接的持续可用性由第三方决定。有关生成接口的研究不表示本项目已经调用生成服务或使用用户图纸生成内容。

## 输入户型参考图

`gpt6/public/floor-plan.jpg` 是项目输入的户型参考资料，随示例保留，用于理解两种实现的共同设计背景。其原始作者与独立再授权信息未随项目提供，**不包含在本仓库 MIT 授权范围内**。本仓库不授予该参考图的独立转载、销售或再许可权；需要复用时，请取得相应权利人的授权或替换为自己的图纸。

额外的风格参考图片未作为网页贴图或单独资产收录。若发现素材归属错误，请通过仓库 [Issues](https://github.com/hahaliu1029/house-3d/issues) 联系维护者并提供来源线索。
