# World Labs / Marble 对比核查

本文保留 2026-09-06 原项目的来源研究；价格、接口与账号权限应以官方当前资料为准。原文中的浏览器操作和 `artifacts/` 截图属于开发阶段记录，未随仓库提供，本次同步未重新执行这些步骤。

**开源副本的处理：**未找到官方图书馆测试样例的明确再分发许可，因此不收录原项目本地 `public/worldlabs/` 的 SPZ/GLB。最新主页面已移除 World Labs 入口且不打包 Spark；保留的研究用查看器如自行接入，会从官方 CDN 加载 SPZ，需要联网。该样例不属于 MIT 素材，独立使用请遵循 [World Labs 条款](https://www.worldlabs.ai/terms-of-service)。完整素材范围见[根目录说明](../../THIRD_PARTY_NOTICES.md)。

核查日期：2026-09-06。仅使用 World Labs 官方文档、官方 GitHub 示例及其链接的公开测试资产。本次没有登录、读取密钥、上传本户型或调用收费生成；已完成公开 SPZ/GLB 文件的网络与格式核验，未在本研究子任务中进行浏览器渲染。

## 对本项目的结论

适合把 Marble 作为另一条视觉体验路线，同时保留 HouseGPT 的米制模型和通行审查。能从现有模型生成对比输入，但不能把生成结果直接当成施工模型。优先比较同一客餐厅视点；完整九空间需分别生成、再拼接核对。

| 输入路线 | 已确认的能力 | 本项目用途及边界 |
| --- | --- | --- |
| 现有模型导出 GLB → 网页 Chisel | Chisel 可导入 GLB/FBX，调整位置、比例和全景相机，结合文本生成 | 可保留粗空间布局作为引导；没有找到毫米/厘米误差保证。[Chisel](https://docs.worldlabs.ai/marble/create/chisel-tools/chisel-basics) |
| 米制模型 → 深度全景 → `pano:depth_to_rgb` | 输入完整 360°、2:1 等距柱状深度全景及文字，生成 RGB 全景 | 比仅给装修截图更明确地引导可见几何；API schema 明确是宽松遵循几何，而非严格锁定尺寸。[接口](https://docs.worldlabs.ai/api/reference/pano/depth_to_rgb) |
| 渲染 RGB 全景 → `worlds:generate` | 支持由三维软件渲染的全景；已验证完整全景可设 `is_pano: true` | 能从当前视点生成可移动 SPZ 场景。原图若仍像粗模，输入本身不会保证最终达到摄影质感。[全景指南](https://docs.worldlabs.ai/marble/create/prompt-guides/pano-prompt)、[API 示例](https://docs.worldlabs.ai/api/world-generation-examples) |
| 单张截图 / 多视角图片 | 支持单图、带方位的多图；未见独立“平面图尺寸约束”输入类型 | 单张平面图不能替代空间建模。未看到的门后、墙后会合理补全，官方明确不保证匹配隐藏区域的真实平面图。[多图指南](https://docs.worldlabs.ai/marble/create/prompt-guides/multi-image-prompt) |

“RGB 全景后生成三维”与“深度引导重绘全景”是两步不同操作；前者不能被描述成严格保留原模型并自动增加真实材质。单次生成不接受多张全景；官方建议分房间/视点生成后使用 Compose 组合。[全景限制](https://docs.worldlabs.ai/marble/create/prompt-guides/pano-prompt)

## 实际接入所需输入

建议先做客餐厅单点验证，输出以下准备材料，不需要先购买服务：

1. 保留米制单位的客餐厅 GLB，包括墙、门窗、主要家具和天花。
2. 同一站位、同一朝向的 RGB 全景与深度全景，记录世界坐标、相机高度、坐标系及深度范围。
3. 意式深色材质文字：炭灰软包、深橄榄皮革、黑棕木、灰褐天然石材、低饱和暖光。保留开口和家具位置作为比较目标；文本不能形成硬尺寸约束。
4. 生成后导出 SPZ 和 collider；分别检查可见家具数量、门窗位置、地面高度与通行宽度，再决定是否用于演示。

深度输入可用浮点 EXR（不传 `z_min`/`z_max`），或 PNG（两者均必须传）。**官方网页示例使用径向距离的反向对数编码，而非普通相机 Z 深度或线性灰度**：`encoded = 1 - (log(depth) - log(z_min)) / (log(z_max) - log(z_min))`。实现应参照该示例生成并对照，不要只根据接口的“normalized”一句自行猜编码。[官方 Three.js 深度 PNG 示例源码](https://github.com/worldlabsai/worldlabs-api-examples/blob/main/web-chisel-depth-png/index.html)

API 使用 `WLT-Api-Key`；新生成返回长任务 operation，需轮询成功状态，再取 `pano_url` 或 world assets。可以用上传媒体、公开 URL 或接口支持的内联数据作为输入；不能在公开前端放密钥。[生成接口](https://docs.worldlabs.ai/api/reference/worlds/generate)、[深度接口](https://docs.worldlabs.ai/api/reference/pano/depth_to_rgb)

## Three.js 与导出

官方推荐 Spark 在浏览器中渲染 Marble splat；Spark 本身建立在 Three.js 之上，可以与普通网格共存。当前官方 quickstart 配对 Three `0.180.0` 和 Spark `2.1.0`，用 `SparkRenderer`、`SplatMesh` 加载 SPZ，适合本项目已有 Three r180。手机应优先低分辨率 splat 并实测内存与帧率；官方兼容声明不等于本机性能通过。[World Labs 推荐](https://docs.worldlabs.ai/api/examples)、[Spark quickstart](https://sparkjs.dev/docs/)

API 默认资产含 100k、500k、full-res SPZ、collider GLB、RGB 全景。当前 `worlds/{id}:export` reference 支持 PLY 与 HQ GLB（纹理/顶点色）。粗 collider 用于碰撞，不能当作高质量展示网格。[快速开始](https://docs.worldlabs.ai/api)、[导出接口](https://docs.worldlabs.ai/api/reference/worlds/export)

API 原始 SPZ 应应用返回的 `metric_scale_factor` 与 `ground_plane_offset`，再做渲染器轴转换；官方 API 页说明 raw OpenCV 资产在 Three.js 中需绕 X 轴转 180°。网页导出已有坐标系选项，不能对所有文件重复翻转。米制转换表示单位换算，不证明重建尺寸吻合本户型。[SPZ 尺度处理](https://docs.worldlabs.ai/api/rendering-spz)、[导出坐标系更新](https://docs.worldlabs.ai/marble/release-notes)

## 费用与当前信息冲突

API 与 Marble 网页额度独立。当前 API 为 1,250 credits / USD 1，最低购买 USD 5。选择固定价 `marble-1.1` 时，已完成 RGB 全景生成三维为 USD 1.20；单图为 USD 1.264；多图为 USD 1.28。Draft 对应全景 USD 0.12、单图 USD 0.184。HQ mesh 首次导出另 USD 2.80。深度到 RGB 的独立价格未在本次定价表中明确列出，不能将其全流程总价声称为 USD 1.20。[API 价格](https://docs.worldlabs.ai/api/pricing)

网页现价为 Free / Standard USD 20 月 / Pro USD 35 月 / Max USD 95 月；Free 列出最多四次生成与 Chisel，导出 splat 从 Standard 开始，HQ mesh 与商业权限在 Pro。以实际账号界面和现价页为准，本次没有购买。[Marble 价格](https://marble.worldlabs.ai/pricing)

核查发现官方旧 FAQ 与当前 reference 不一致：FAQ 仍称 API 不支持 PLY，但当前 Export API 已列出 PLY；Models 页与 Generate reference 的默认模型描述也不同。实现必须显式传 `model: "marble-1.1"`，导出按当前 reference 必填 schema，而非复制缺少 `asset_type`/`format` 的简化示例。[旧 FAQ](https://docs.worldlabs.ai/api/faq)、[当前导出 schema](https://docs.worldlabs.ai/api/reference/worlds/export)、[当前生成 schema](https://docs.worldlabs.ai/api/reference/worlds/generate)

## 已验证的免费公开样例

官方 export specs 提供供测试的 `Elegant library with fireplace`。它是官方图书馆示例，**不是本户型，不是已为用户生成的意式装修**。可用于验证 splat 的真实浏览观感与移动端成本，不能用来宣称同户型效果胜出。[官方样例入口](https://docs.worldlabs.ai/marble/export/specs)、[官方世界查看页](https://marble.worldlabs.ai/world/20fc27f9-5b1f-4c76-8b22-67b866195aaf)

2026-09-06 使用普通 HTTPS GET，在内存中读取并校验公开文件，无账号、无额度消耗：

| 文件 | 结果 |
| --- | --- |
| [500k SPZ](https://wlt-ai-cdn.art/example_exports/elegant_library_with_fireplace/elegant_library_with_fireplace_500k.spz) | HTTP 200；CORS `*`；7,707,659 bytes；gzip 解压 9,500,016 bytes；SPZ v2；500,000 splats |
| [Collider GLB](https://wlt-ai-cdn.art/example_exports/elegant_library_with_fireplace/elegant_library_with_fireplace_collider.glb) | HTTP 200；CORS `*`；1,544,588 bytes；glTF 2 文件长度头一致 |

SHA-256：

```text
SPZ      c89fb6606929faf7cefcf2577f54fa141b1bceaf55af070d54f7b986fab96870
Collider 813c622312de2cc2abfd107d55430c660a015e4c070cd12b510cf4de2f508c05
```

下一步如要真正比较本户型，需要可用的 Marble 账号/World API 额度或已生成的该户型资产。现阶段可把输入准备、独立官方样例浏览、HouseGPT 原模型渲染改进先完成；不能将以上公开样例格式核验写成已完成本户型生成。

## 本轮实际接入结果

2026-09-06，主任务在 Chrome 的生产构建和手机模拟中真实打开官方 Elegant Library 样例，500000个高斯点完成解析，画面方向经截图核对正常。入口为页面“World Labs 对比”。新增±0.3m小范围左右视点移动用于观察视差，支持拖动环顾、双指/滚轮缩放；不把它表述为本户型或可施工模型。

Spark按onDirty补帧；静止连续读回的renderedFrames均为26，交互后才增加。手机双指输入使FOV从68°变为48°，关闭后原实时页面恢复可操作。实际截图：`artifacts/worldlabs-local-desktop.png`、`artifacts/worldlabs-mobile-390.png`。

以上是原项目开发阶段的实际点击、状态读回和截图记录。本轮没有登录Marble，没有用用户户型生成或消费额度。
