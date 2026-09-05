# Fable · Maison 双风格家装

这是 [House 3D](../README.md) 的 **Fable 版本**，原项目目录名为 `house`。与 [GPT6 版本](../gpt6/) 一起，用于比较两个模型生成的 3D 家装项目效果。模型标签描述生成来源；页面运行不调用模型 API。

基于 8853 × 16375 mm 户型，提供法式与意式轻奢两套方案，包含三间卧室、榻榻米房、客餐厅、厨房、双卫及阳台。房屋、装饰线、门窗和纹理由 Three.js 程序化构建；家具、灯具和设施由 Blender 参数化生成。

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
blender/                   资产建模、导出与联系表渲染脚本
public/models/             121 个预生成 GLB 及尺寸 manifest
scripts/gen-spec.mjs       设计手册生成器
test/                     户型与双风格摆放检查
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

## 静态部署

`npm run build` 输出 `dist/`。默认 `base` 为 `/maison/`，应将构建结果部署到站点对应路径；如需改到其他前缀，在构建时使用 `npm run build -- --base=/your-prefix/`，并让静态服务器路径保持一致。请通过 HTTP(S) 服务访问，不直接双击构建后的 HTML。

## 许可证与来源

自有代码、文档和程序化资产适用根目录 [MIT License](../LICENSE)。121 个 GLB（法式 60、意式 61）均有仓库内生成脚本，不引用外部图片或外部 URI；画作、木纹、石纹等由 Canvas 生成。依赖和素材范围见 [素材与授权说明](../THIRD_PARTY_NOTICES.md)。
