# Modern minimalist style implementation plan

**Goal:** Add a third, modern minimalist scheme to GPT6 and run it locally.

**Design:** Warm white mineral walls, pale straight oak flooring, oatmeal upholstery, muted sage accents, matte stone and small graphite details. Flat doors and cabinetry; distinct rounded sofa, open oak coffee table, timber dining chairs and a white disc pendant. Retain the nine-room footprint, operational furniture and existing circulation.

**Architecture:** Extend the style registry with `modern`. Reuse shared room placements and contemporary utility furniture while supplying a dedicated modern furniture builder, material set and procedural pendant. Style-dependent UI and exports describe the active scheme; existing French/Italian panorama assets remain explicitly limited to those schemes.

**Tech stack:** Three.js, Vite, Node test runner, native canvas for geometry/material verification.

1. Add behavioral tests covering modern geometry, door motion, all nine room viewpoints, palette isolation and accurate guide content. Run them before implementation.
2. Add modern registry, materials, flat architecture and furniture overrides. Preserve French/Italian geometry and validate with the existing suite.
3. Integrate procedural pendant, style switching, keyboard cycling, palette descriptions and clear panorama availability. Adapt the three-option bar for mobile widths.
4. Update export scripts and GPT6 documentation. Verify production build, desktop/mobile rendering and state preservation across style changes.
5. Leave the local Vite server running and open the modern scheme for review.

## 高清全景追加需求（2026-09-08）

用户随后要求生成现代简约高清全景。已从相同米制场景用 Blender 5.2.1 LTS / Cycles / Metal 渲染九个空间，采用 64 samples、AgX 曝光 +0.3；新增 9 张原生 8K、9 张同源降采样 4K 和 9 张预览。现代简约的 `panorama` 标记已启用，查看器改为三种风格，并完成桌面九房切换、手机 4K、窄屏布局和保存视角验证。`tests/panorama-assets.test.mjs` 校验覆盖范围、实际解码尺寸及 SHA256。

部署使用原服务器 39.105.24.39 的 443 端口和 `/housegpt/` 路径，正式访问地址为 `https://www.lyx666.cn/housegpt/?style=modern`。完整过程、渲染记录及上线校验保存在本地 `gpt6/artifacts/cycles/modern/` 与 `gpt6/artifacts/deploy-modern-panorama-20260908/`。
