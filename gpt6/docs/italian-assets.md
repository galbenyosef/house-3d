# 意式轻奢原创吊灯资产

**Orbite · 双椭圆线性吊灯**采用错位且略微倾斜的上下两只椭圆环，配纤细香槟金金属灯体、内侧及下沿乳白连续扩散光。六根独立细钢索定义灯环姿态，适配现有直径 1.22 m 的圆餐桌。造型由本项目原创，不依赖外部模型或贴图。

## 文件

- 网页模型：`public/models/italian-pendant.glb`
- 可复现脚本：`scripts/build_italian_pendant.py`
- Cycles 预览：`artifacts/italian-pendant-preview.png`
- 实测元数据：`artifacts/italian-pendant-metadata.json`

## 可用于界面与尺寸导出的数据

| 项目 | 实际输出 |
|---|---:|
| 外包长 × 宽 × 总高 | **946.765 × 631.463 × 941.191 mm** |
| glTF 的 X × Y × Z 尺寸 | 0.946765 × 0.941191 × 0.631463 m |
| 最大投影半径（以吊点轴线计） | 495.300 mm |
| 与直径 1220 mm 餐桌边缘的最小内缩 | 114.700 mm |
| 顶部安装高度 | 2.800000 m |
| 安装后灯具最低点 | **1.858809 m** |
| 距当前 0.7725 m 餐桌面的净高 | 1.086309 m |
| 下椭圆中心线长轴 × 短轴 | 948 × 594 mm |
| 上椭圆中心线长轴 × 短轴 | 710 × 454 mm |
| 金属灯体截面 | 15 × 19 mm |
| 钢索 | 6 根，模型直径 2.3 mm |
| 三角形 | 15,360 |
| 材质 / 网格 | 3 / 3 |
| GLB 大小 | **282,388 bytes，约 276 KiB** |
| 外部纹理 | 0 |

坐标原点就是吊顶碗与天花接触的平面，模型沿 **glTF −Y** 方向下垂；放置时直接使用天花净高，不额外下移。现有餐桌中心对应以下位置：

```js
const { scene: pendant } = await loader.loadAsync('models/italian-pendant.glb');
pendant.position.set(2.25, HOUSE.height, 8.65);
```

保持原始比例，围绕 Y 轴旋转也不会超出圆餐桌投影。若餐桌中心改变，应使吊点同步跟随。此处 2.80 m 是项目现有净高假设；施工前按现场净高与成品灯具吊线长度复核。

## 材质与照明

- 香槟金阳极氧化铝视觉：metallic 0.82，roughness 0.27。
- 低反差深香槟五金：metallic 0.72，roughness 0.34。
- 乳白线性扩散罩：roughness 0.32，emissive strength 3.2；GLB 使用 `KHR_materials_emissive_strength`，无透明折射材质。

发光材质负责呈现灯带亮面。Three.js 常规光栅渲染仍需要场景中的灯光照亮餐桌，不能把自发光材质当作真实面光源。灯带功率、显色性、驱动器、调光协议、吊点承重和供电方式尚未选定，应交由实际灯具产品或厂家深化；本资产提供造型及安装尺寸依据。

## 复现与检查

使用本机 Blender 5.2.1 实际执行：

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/build_italian_pendant.py -- --render
```

脚本会导出 GLB、读取其实际 accessor 和索引数据，断言文件小于 400,000 bytes、长宽均不超过 1.05 m、安装后灯底不低于 1.82 m，并检查所有顶点均落在直径 1.22 m 的餐桌投影内。

悬挂几何已额外检查：钢索中心线彼此最近间距约 6.890 mm，大于钢索直径；下环钢索至上环中心线最近约 40.258 mm，避开上环实体。64 采样 Cycles 预览已完成并目视检查。

既有复古法式吊灯及场景代码均未改动。
