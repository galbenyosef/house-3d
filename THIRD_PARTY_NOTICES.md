# 素材来源与授权范围

根目录 [MIT 许可证](LICENSE) 适用于本仓库自有代码、文档与程序化生成资产。以下资料和依赖保留各自的权利状态，不因随仓库发布而更换许可证。

## 依赖与工具

| 组件 | 用途 | 许可证与来源 |
| --- | --- | --- |
| Three.js | WebGL 渲染、控制器、GLB 加载和后处理 | MIT；[上游许可证](https://github.com/mrdoob/three.js/blob/dev/LICENSE) |
| Vite | 开发服务器和生产构建 | MIT；[上游许可证](https://github.com/vitejs/vite/blob/main/LICENSE) |
| Blender | 可选的模型生成和预览工具，不随仓库分发 | [Blender 许可证说明](https://www.blender.org/about/license/) |

准确的依赖版本由两个子项目各自的 `package-lock.json` 锁定。传递依赖的许可证以安装后相应软件包的 LICENSE / NOTICE 为准。网页使用系统字体回退，仓库未分发字体文件。

## 项目生成的资产

- `gpt6/public/models/french-chandelier.glb` 和 `italian-pendant.glb` 分别由 `gpt6/scripts/build_chandelier.py`、`build_italian_pendant.py` 生成；相关元数据与预览保存在 `gpt6/artifacts/`。
- `fable/public/models/` 中的 121 个 GLB 由 `fable/blender/` 下的程序化建模脚本生成，`manifest.json` 记录模型尺寸；这些 GLB 不引用外部图片或外部文件。
- 两个版本的建筑、其他程序化几何及 Canvas 材质纹理见各自 `src/`。上述项目自有脚本和生成资产随本仓库按 MIT 发布。
- 模型中的家具样式或名称用于描述外观，不代表品牌原版模型、官方合作、商标许可或产品认证。

## 公共领域油画

`gpt6/public/textures/corot-seine.jpg`：Camille Corot，*The Banks of the Seine at Conflans*，约 1865–1870，The Metropolitan Museum of Art，藏品号 21.70.4、object ID 435989。

该文件源自馆方公开 API 的 `primaryImageSmall`。2026-09-05 核验的[馆方藏品页面](https://www.metmuseum.org/art/collection/search/435989)标注 **Public Domain**；参见 [The Met Open Access](https://www.metmuseum.org/about-the-met/policies-and-documents/open-access)。此图片保留其公共领域状态，未重新赋予 MIT 许可证。项目在画框展示时裁切纹理坐标。

## 输入户型参考图

`gpt6/public/floor-plan.jpg` 是项目输入的户型参考资料，随示例保留，用于理解两种实现的共同设计背景。其原始作者与独立再授权信息未随项目提供，**不包含在本仓库 MIT 授权范围内**。本仓库不授予该参考图的独立转载、销售或再许可权；需要复用时，请取得相应权利人的授权或替换为自己的图纸。

额外的风格参考图片未作为网页贴图或单独资产收录。若发现素材归属错误，请通过仓库 [Issues](https://github.com/hahaliu1029/house-3d/issues) 联系维护者并提供来源线索。
