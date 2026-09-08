# 对比视频与图片

首次收录日期：2026-09-06。最初六个素材来自「了解视频制作能力」任务的已生成成片和预览，按原文件复制，未重新压缩或改写画面。2026-09-08 新增现代简约与宋式两张实际全景页面对比图。全部对比图左侧为 Fable 5.1，右侧为 GPT 6 Astra，对应仓库的 `fable/` 和 `gpt6/`。

## 视频

| 文件 | 内容 | 大小 |
| --- | --- | --- |
| [house-comparison.mp4](videos/house-comparison.mp4) | 实时三维交互对比：全屋、平面、房间漫游、家具查看、昼夜与触屏；21 个章节 | 88,936,830 bytes（84.8 MiB） |
| [house-realistic-comparison-plan-music.mp4](videos/house-realistic-comparison-plan-music.mp4) | 最新实景版：11 秒平面图开场，随后依次对比客餐厅、主卧、次卧 2、书房及厨房的双风格全景，再展示风格切换、缩放与保存视角；15 个章节 | 80,423,147 bytes（76.7 MiB） |

两段均为 180 秒、3200 × 1800、30 fps、5,400 帧，H.264 视频与 AAC 立体声音频（48 kHz）。MP4 保留章节，可下载后使用支持章节的播放器播放。实景版收录带平面图开场及新配乐的最终修订版，未重复收录此前使用旧配乐的同题成片。

## 预览图片

| 图片 | 对应内容 |
| --- | --- |
| [interaction-comparison.jpg](images/interaction-comparison.jpg) | 交互版的实时三维客厅配对预览 |
| [floor-plan-comparison.jpg](images/floor-plan-comparison.jpg) | 最新实景版的平面图开场 |
| [french-living-comparison.png](images/french-living-comparison.png) | 法式客餐厅实景配对预览 |
| [italian-living-comparison.png](images/italian-living-comparison.png) | 意式轻奢客餐厅实景配对预览 |
| [modern-living-comparison.png](images/modern-living-comparison.png) | 2026-09-08 现代简约客餐厅，Fable 与 GPT6 并排对比 |
| [song-living-comparison.png](images/song-living-comparison.png) | 2026-09-08 Fable 宋式与 GPT6 宋韵雅居，客厅区域并排对比 |

前四张为原视频制作时生成的预览。后两张为本次实际全景查看器的页面截图，规格与来源如下。

### 2026-09-08 现代简约与宋式对比图

以提交 `63595f8` 中的两套全景查看器和原始 Cycles 图片为来源，在本地直接加载各自的查看器模块和样式，用浏览器原有房间、风格、方向键、拖动和缩放控件选取视角。深色标题、左右等宽页面和下方材质说明通过 HTML/CSS 排版，由 Playwright 截取 1600 × 900 PNG；没有重新生成或修饰室内图像，原有场景和全景文件未变。

| 对比图 | Fable 左侧 | GPT6 右侧 |
| --- | --- | --- |
| 现代简约 | `fable/public/pano/modern-living.jpg`，3072 × 1536，客餐厅机位 | `gpt6/public/panoramas/modern-living-8k.jpg`，8192 × 4096，客餐厅机位 |
| 宋式 | `fable/public/pano/song-lounge.jpg`，3072 × 1536，客厅机位 | `gpt6/public/panoramas/song-living-8k.jpg`，8192 × 4096，客餐厅机位 |

两边机位与取景角度不同；宋式使用 Fable 客厅机位以展示木榻、水墨和阳台。保留各自原始灯光、材质和源图分辨率，统一排版尺寸不代表两套图片具有相同细节水平。两张图已逐张检查左右标签、对应风格、清晰度和页面完整性。

## 录制来源与比较范围

交互版由本地页面录制与线上补录组成；实景版录制于 [Fable 在线演示](https://www.lyx666.cn/maison/) 和 [GPT6 在线演示](https://www.lyx666.cn/housegpt/)。实景制作记录中的入口脚本分别为 `assets/index-Dc_JUQwF.js`、`assets/index-CUYsQAhU.js`，这些文件名仅用于辨认当时的版本，不保证线上持续保留。

两边使用相同展示面积，按房间、风格、家具主体和相近视向配对。两个项目的全景来自各自的固定机位，并非完全相同的物理相机位置。录制时 Fable 全景为 3072 × 1536，GPT6 为 8192 × 4096；成片统一输出尺寸并不代表两套源素材分辨率相同。

录制早于本次 Fable 0.3.3 同步，视频仍保留「三居室」「书房」等当时的界面文字，也未覆盖新增次卧 1 全景。后续源码、线上部署和文案可能变化；这些素材用于展示迭代阶段的效果，不能代替当前代码的交互验收，也不构成严格的模型排名。

## 配乐与授权

按制作任务保留的来源记录：

- 交互版：为该成片制作的原创 80 BPM 钢琴配乐，以钢琴、贝斯和弦乐配器，由系统乐器离线合成。
- 最新实景版：原创 *Rooms in the Afternoon*，96 BPM，C 大调 / A 小调，使用尼龙吉他、电钢琴、贝斯、暖音垫及轻打击。旋律和配器事件由制作脚本生成；macOS 系统 DLS 乐器通过 AVAudioEngine 离线渲染，打击部分由程序合成。没有沿用交互版的旋律或音频。

两段配乐均为 180 秒、无演唱。这里只收录已混入 MP4 的音轨，不附系统音色库。自有录制、剪辑、版式及原创配乐随根目录 [Apache License 2.0](../LICENSE) 发布；画面中第三方素材及输入户型参考图保留 [素材与授权说明](../THIRD_PARTY_NOTICES.md) 中的范围。

## 文件校验

[manifest.json](manifest.json) 记录全部八个媒体文件的 SHA-256、字节数及来源，以及视频规格与章节。首次收录时检查复制前后哈希一致，并对两段成片重新执行 FFmpeg 全片音视频解码；本次新增图片另记录源全景哈希、截图尺寸和取景参数。

在仓库根目录可以运行：

```bash
shasum -a 256 media/videos/*.mp4 media/images/*
```
