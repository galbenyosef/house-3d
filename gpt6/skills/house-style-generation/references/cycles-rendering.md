# 同源模型的 Cycles 渲染

优先核对当前 [项目渲染说明](../../../docs/cycles-rendering.md)。先完成新风格接入与几何审查，再执行昂贵渲染。调用 Blender 前核对可执行文件、版本、设备与输出空间；当前脚本硬编码 Metal，非 macOS 要选择实际支持的 Cycles 设备并同步记录，不能把 CPU 回退写成 GPU 已通过。

## 场景导出与来源

`scripts/export-render-scene.mjs` 导出 Three.js 建筑、家具、PBR 与吊灯的实际世界顶点、法线、UV 和材质，保存到 `artifacts/cycles/<styleId>/scene.json`。坐标只转换一次：`(x,y,z) → (x,-z,y)`。不在 Blender 中另猜一套布局；完整墙高与天花应参与遮挡。

当前 `sourceHashes` 只列了部分来源，缺少 `design-styles.js`、导出器/渲染器本身及完整贴图输入等。新增风格时把它的家具模块、风格配置、模型、贴图/清单及两端脚本加入可复核来源；最好保存本次输入快照及哈希，而非仅引用会继续变化的工作文件。

渲染前冻结这些输入。历史渲染对应历史源版本，不能因为共享源码增加第三风格就篡改旧记录的 source hash；既有图片通过渲染前基线证明未变，新图对照本次冻结输入。若需要证明旧图可复现，应使用它的历史输入快照重新核对。

## 命令模板

**前提：已扩展两个脚本的 style 校验并实际接入此 ID。当前已支持 french、italian、modern 和 song。** 以下 `wabi-sabi` 只是新风格示例，应替换为本次 ID。在项目根目录运行：

```sh
STYLE_ID='wabi-sabi'
BLENDER_BIN='/Applications/Blender.app/Contents/MacOS/Blender'
CYCLES_EXPOSURE='0'
node scripts/export-render-scene.mjs "$STYLE_ID"
"$BLENDER_BIN" --background --factory-startup --python scripts/render-interior.py -- --style "$STYLE_ID" --mode preview --rooms all --width 1280 --samples 32 --adaptive-threshold 0.03 --exposure "$CYCLES_EXPOSURE"
```

先检查所有预览，再更新 `CYCLES_EXPOSURE` 为本次确认的曝光值并正式渲染：

```sh
"$BLENDER_BIN" --background --factory-startup --python scripts/render-interior.py -- --style "$STYLE_ID" --mode both --rooms all --width 8192 --preview-width 1280 --mobile-panorama --samples 64 --adaptive-threshold 0.03 --exposure "$CYCLES_EXPOSURE"
```

这些变量在同一 shell 中有效；分开执行工具调用时重新设置。曝光 0 是试片起点，不是统一风格参数。现有 .3 是既有批次的结果，深色材料应先校准基色、真实光源与反射，再调曝光，避免提亮成米白或压成死黑。

| 参数 | 确切含义 |
| --- | --- |
| `--room master` | 单独一房；未提供房间参数时默认仅客餐厅 |
| `--rooms kitchen,bathroom,ensuite` | 明确的房间列表，可用于修正或恢复未完成批次 |
| `--rooms all` | 导出场景中的全部房间，新风格全屋使用此项 |
| `--rooms remaining` | 永远仅排除 living；不会检查已完成记录 |
| `--mode preview` | 透视试片，不构成已交付高清全景 |
| `--mode both` + `--mobile-panorama` | 同时输出预览、指定宽度全景与由成品生成的手机版 |

两种房间参数互斥。单块 GPU 串行运行 Blender，不并发争抢显存；脚本在同一风格内复用场景与 BVH。中断后查看每房完成记录与实际文件，显式选择未完成房间重跑，不把残留 JPEG 当成功。

## 逐房试片审查

房间相机读取 `ROOMS[].view`。核对眼点与家具/墙体碰撞、近处遮挡、主体构图、地平线和开门状态。保留旧全景时默认锁定既有全景机位，通过合理的家具布局解决遮挡，不能让相机穿墙。全景朝向用目标的水平投影，初始俯角逐房计算；小卫生间不能复制客厅俯角。

当前清单的相机/俯角是房间级共享字段，`write_manifest` 仅在新增房间时写入它们。只改 `ROOMS[].view` 会使新图配上旧元数据；直接覆盖共享清单又会让旧图方向失配。若确需独立机位，先在导出器、渲染器、清单、查看器和验收器中实现按风格保存/读取 camera、target、朝向及俯角，保留旧风格数据；或在明确扩大重渲范围后同步更新所有受影响风格。不能只移动相机就继续批量输出。

每次至少查看全部目标房间的实际预览，重点观察厨房与两卫：

- 光是否从真实窗洞进入，是否被相邻房实墙挡住；不使用穿墙或无阴影补光假装采光良好。
- 保留卫浴磨砂隐私玻璃；现有 0.12 透射是方案材质，不能为提亮改透明。
- 补充功能灯要有合理安装位置与灯具尺寸，避免隐藏在柜体或天花里。当前脚本的厨房/两卫灯盘是方案补充，Blender 辐射 W 不等于采购灯具电功率。
- 检查木纹与石纹尺度、粗糙度、法线强度、接触阴影、金属与织物细节；增加 samples 不能修复错误材质或缺失几何。

当前透视预览为 1280 × 720、22 mm / 36 mm sensor；全景为等距柱状 2:1。正式基线为 AgX、64 samples、降噪、adaptive .03、10 次最大/6 次漫反射反弹。按实际噪声和材质需要调整并记录，不能仅为数字更高全屋重复渲染。

## 成品、清单与显示

`public/panoramas/manifest.json` 的 `viewpoints[]` 每房含 `camera`、`target`、`centerHeadingThree`、`initialPitchDegrees`；`styles[styleId]` 指向该房该风格的实际文件：

| 字段 | 产物 |
| --- | --- |
| `url`、`width`、`height`、`bytes`、`sha256` | 原生 8192 × 4096 桌面全景 |
| `mobileUrl`、`mobileWidth`、`mobileHeight`、`mobileBytes`、`mobileSha256` | 4096 × 2048 手机版 |
| `preview`、`previewSha256` | 1280 × 720 透视缩略图 |
| `record`、`samples`、`adaptiveThreshold`、`exposure`、`mobileSource` | 本次真实渲染记录与参数 |

新版记录保存在 `artifacts/cycles/<styleId>/rooms/<roomId>/<mode>-<runId>.json`。每次记录的 outputs 必须含本次确实写出的图片、尺寸、字节与哈希；手机输出以 `derivedFromSha256` 指向此次 8K。清单字段可以扩展，但不得伪造旧脚本没生成的元数据。

脚本仅在本次记录含有效 8K 与 4K 时更新该项；preview-only 不替换已有发布缩略图。渲染器仍会直接写 `public/panoramas` 文件，重渲既有风格前保存图片/清单基线并采用隔离输出或可回退备份，失败不能留下被旧清单引用的新字节。完整新风格未验收前不发布半套清单。

8K 在 Blender 中降采样为 4K；不能上采样小图冒充原生高清。已应用 AgX 的 sRGB JPEG 在 Three.js 显示时不再 tone mapping，避免二次变暗/过曝。场景 JSON、导出纹理副本、blend 与核验日志留在 artifacts，不进入 public/dist。

## 图片验证必须适配新风格

原开发目录的 `artifacts/cycles/verify-all-rooms.mjs` 未随仓库收录；它是旧两风格批次验收器：固定 french/italian、18 组、54 张；所有 living 都读旧 `both-render.json` 和旧客厅基线。直接运行它既不会覆盖第三风格，也会错误处理新风格客厅。

先把范围改为本次明确的 style/room 集，或将通用校验抽取到 scripts 中。期望数量由计划与注册信息计算，不能从已经缺图的 manifest 自推“完整”。所有新房间包括 living 应读取清单中的本次 `record`；旧客厅兼容逻辑只适用于确有旧记录的两项。

真实解码每张图片，核对尺寸、哈希、字节、相机、俯角、来源版本、记录完成状态和手机降采样来源。新图与未变旧图分别核验，源版本变动不是放松哈希断言或重写旧证明的理由。相同图片哈希跨房/风格应报告，防止复制占位。校验失败须非零退出，报告保存本次唯一文件名。

当前 `tests/panorama-assets.test.mjs` 覆盖现代与宋韵的已有图片；新增风格时应扩展该测试，并另外核对完整渲染来源记录，不能运行未收录的旧验收器。
