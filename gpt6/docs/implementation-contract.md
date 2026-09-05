# Maison 家装方案实现约定

用户授权基于原图直接设计并实现可交互的法式家装，自主推进，不使用 Superpowers。用户已选复古法式：深胡桃木、古典线脚、做旧黄铜、酒红/苔绿织物，不提交 Git。

- 坐标：米，x 向原图右，z 向原图下，y 向上；原图外包尺寸 8.853 × 16.375 m。房高假设 2.8 m，墙厚估算 0.18 m。
- 原图房间标注面积合计 110.71 m²；各房间标签使用原图标注，不把推导多边形面积宣称为实测。
- 全景保留完整平面；剖切模式外墙缩短/隐藏，室内模式恢复完整墙高；3D 资产用可复现参数化几何制作，米制家具尺寸。
- src/layout.js：导出 ROOMS（id,name,en,area,polygon:[[x,z]],center:[x,z],description,dimension）、WALLS、FOOTPRINT 等，由建筑代理定义并告知。
- src/architecture.js：export buildArchitecture(THREE, mats) returns {group, walls, ceilings, windows, setCutaway(bool), setCeiling(bool)}. 建筑模块与材质创建解耦。
- src/furniture.js：export buildFurniture(THREE, mats) returns {group, items, lights}; items 对象 {id,name,room,dimensions,material,note,object}；lights 灯光数组。家具位置按固定 layout 坐标，家具可选中。
- 所有 mats 属性均为 THREE.Material：wall, trim, oak, walnut, fabric, cream, sage, brass, marble, stone, glass, dark, white, rug, leaf, ceramic, light（自发光），metal。
- 主代理负责材质纹理、renderer/controls/lighting、UI、集成测试和 Chrome 验收。
- 建筑与家具代理只改各自负责文件；不要改 package、main、style 等主代理文件。

## 验收
1. 原图九个空间、入户和通道关系可核对。
2. 场景真实渲染，可轨道旋转/缩放、总览、俯视、房间室内视角、日夜、配色、选家具、下载清单与截图。
3. npm run build 成功；用真实 Chrome 操作验证，记录截图和限制。
4. 提供复刻说明，明确图纸估算与施工前复测项。
