# 新风格接入地图

先读本文，再按需要读源码。以下路径均相对 `gpt6/`。当前已接入法式、意式、现代和宋韵；新增风格仍需核对各模块，不能只添加风格名称。

## 首次检查

```sh
cat package.json
rg -n 'STYLE_IDS|DESIGN_STYLES|italian|french|burgundy|olive|ivory' src scripts tests
rg --files src scripts tests docs public/models public/textures
```

有 Git 时记录已有改动；没有 Git 时不要为运行此流程自动初始化仓库。先保存本次会涉及的文件与既有全景哈希基线，不覆盖别的任务成果。不要处理 `*.orig` 备份或其他发布/运行副本。

## 接入点与真实陷阱

下表保留原双风格架构的检查线索；发布副本已经扩展为四风格，包括循环切换、高清按钮、两端渲染脚本的风格参数以及现代/宋韵家具。表中二选一描述不代表当前仍只有两套方案，实际分支应以源码为准。新增第五种风格时，同样逐项检查默认回退和固定列表。

| 文件 / 接口 | 新增风格时要做的事 |
| --- | --- |
| `src/design-styles.js`：`STYLE_IDS`、`DESIGN_STYLES`、`getDesignStyle` | 注册稳定 ID；补齐名称、标题、理念、材质、配色和吊灯元数据。`getDesignStyle` 对未知 ID 回退法式，所以必须验证新 ID 真正命中新对象。 |
| `src/materials.js`：`createMaterials` | 现有意式/法式分支需扩展。创建独立材质实例，避免一套配色改变另一套；保持模型使用的材质键齐全。 |
| `src/pbr-materials.js`：`PBR_BINDINGS`、`enhanceMaterials` | 增加新风格绑定；当前无绑定会用法式。在家具克隆材质前完成增强；检查贴图颜色空间、粗糙度/法线与米制尺寸，不只改 base color。 |
| `src/surface-uv.js`、`src/architecture.js` | 墙面、门套、踢脚、地板、吊顶与局部饰面决定风格。现有 `isItalian` 分支把其他 ID 当法式，需改为明确映射或策略；共享墙、门洞、房间多边形保持一致。 |
| `src/furniture.js`：`buildFurniture`，`src/italian-furniture.js` | 当前用法式公共装配与意式替换函数。让新风格的家具生成器显式接入；不要写了新文件却仍返回法式。保留 `{group, items, lights}` 契约与唯一 item ID、房间、尺寸、材质、说明和可选中对象。 |
| `scripts/build_chandelier.py`、`scripts/build_italian_pendant.py`，`public/models/` | 可参考生成新的吊灯 GLB，另存脚本与文件。核对模型原点、轴向、米制尺度、吊点、灯底和桌面关系；不能仅复制元数据尺寸。 |
| `src/scene.js`：`loadStyle`、`setStyle`、`applyPalette`、`setLight` | 接入材质、模型、艺术品及灯具资产。日夜曝光、局部光强和家具文案有两风格条件，需逐项决定。检查缓存复用、资源独立、相机保持与冲突复位。 |
| `src/main.js` | URL `?style=` 和 `maison-style` 已读 `STYLE_IDS`，但字幕、配色标签和方向键仍有法式/意式条件。左右键需按风格列表循环，不能继续二选一。 |
| `src/ui.js`、`src/style.css` | 顶部两枚风格按钮、双风格文案与手机宽度是手写的。让按钮从注册数据生成，材料与手册用本风格内容，数量描述从实际数据得到。 |
| `src/panorama-viewer.js` | 高清的两个风格按钮也是手写的。由可支持的风格列表生成，并依据当前房间真实清单启用；没有成品显示“尚未生成”，不能借用其他风格图片。 |
| `scripts/export-design.mjs` | 循环已使用 `STYLE_IDS`，但临时材质键列表、顶层法式兼容字段和“两套各64件”日志仍固定。补齐新材质键与真实统计，确认 `styles[newId]`、新 CSV 和手册内容正确。 |
| `scripts/export-render-scene.mjs` | 命令行只接受 french/italian；扩展校验后确认同源家具、PBR与新 GLB 都进入导出。艺术品加载是法式特例；新资产如需离线加载要显式实现。 |
| `scripts/render-interior.py` | `--style` choices 只有两项，照明也有分支；扩展后检查新风格的灯光与默认配色元数据。不要让新风格误用法式补光。 |

第三套是把重复的二选一判断整理成数据或明确策略的时机；不要求重写引擎。对新增 ID 应显式支持，未支持的 ID 应可诊断，不能靠 fallback 获得“看起来能打开”的结果。

## 配色和默认值

当前每套使用历史键 `burgundy / olive / ivory`，意式这些键实际代表炭灰、苔灰、暖灰。`main.js`、材质/场景初始化及离线记录把 `burgundy` 作为默认。

选择一种一致的实现：沿用兼容键但填写真实名称和色值；或引入每风格 `defaultPalette`，同时改 UI、材质、实时状态、离线导出、渲染记录和清单读取。不要只换键导致 `design.palettes[palette]` 为空，也不要记录一个并未渲染的配色名。

## 几何与复刻资料

读取 `src/layout.js`、`src/collision.js`、`src/navigation.js` 和现有家具测试。当前房间为 `living, master, bedroom2, bedroom1, study, kitchen, bathroom, ensuite, balcony`，顺序与名称以 `ROOMS` 为准。

- Three.js 坐标为米，x 向右、y 向上、z 向原图下方。家具形体必须有可核对的真实尺寸；旋转后的包围盒与门叶扫掠要重新验证。
- 家具 item ID 是选择、清单和通行校核的联系。复用同用途 ID 可以保持交互稳定；新增/删除物件时同步检查消费者，不把历史 63/64 件当成永远的目标数。
- 保留 `userData.doorLeaf`、`walkObstacle`、`walkBoxes`、`movablePart` 等碰撞/活动部件语义。淋浴若丢失分部 `walkBoxes`，整体包围盒可能封死入口；合并网格时不能吞掉需要单独检查的活动门片。
- 既有测试分别有默认法式与意式专测，不能证明第三风格已覆盖。将新风格纳入 `collectWalkBlockers` / `canWalkTo` 检查，复核 0.18 m 相机碰撞半径、0.30 m 半径的二维通行包络及入户到各房的连续可达；这些是模型校核尺度，不是法规或无障碍认证。
- 重点继承已有门洞/移门与湿区限制；相关原图净尺寸差异、收纳不足、洗衣与设备未定位等在 `docs/设计合理性审查.md`。不能用截图漂亮代替这些检查。
- 新模型需要的材质键还应补到导出器和相关测试夹具。测试应验证实际几何、风格差异和可用性，不为配色常量逐个写镜像断言。
- 样板说明写出真实材料替代、纹理尺度、表面工艺与安装约束；没有报价依据时不编品牌、预算或“可直接施工”。

检查后运行：

```sh
npm test
node scripts/export-design.mjs
npm run build
```

`export-design.mjs` 当前会重写所有已注册风格的手册、CSV 和 `public/design-specification.json`。执行后检查差异，既有方案的语义不能被新风格污染；若本次需严格隔离写入，先增加目标风格参数并保留汇总兼容性。

## 资产来源

优先复用 `public/textures/pbr/manifest.json` 已登记资产和原创 Blender 脚本。新增下载须核对真实来源、许可与可本地托管性，更新 `docs/asset-sources.md` / `docs/pbr-assets.md` 或新风格资产记录。不要把网页热链、参考图中的摄影作品或用户私人文件自动打包公开。所有运行资源经 `src/assets.js` 的前缀处理，保持 Vite `/housegpt/` base。
