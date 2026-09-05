# 静态部署说明

本项目使用 Vite，默认 URL 前缀为 `/housegpt/`。开源副本提供可复现的静态构建和配置示例；个人服务器拓扑、运维记录和历史发布包未收录。

## 本地构建与预览

在 `gpt6/` 目录执行：

```bash
npm ci
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

访问 `http://127.0.0.1:4173/housegpt/`。构建结果在 `dist/`；它不包含后端，也不需要 API Key。`vite preview` 用于本地核验，生产环境使用静态文件服务器。

## 部署路径

可以将 `dist/` 内容放到静态站点的 `/housegpt/` 对应目录，也可以使用 `deploy/nginx-static.conf` 与 `deploy/nginx-location.conf` 两份配置示例：前者示范独立静态服务，后者将站点前缀转发至该服务。配置中的文件目录和上游服务名需要按你的环境替换，不能直接视作已有服务。

如需更换前缀，可修改 `vite.config.js` 中的 `base` 后重新构建。运行时资产通过 `import.meta.env.BASE_URL` 拼接，静态服务也必须使用同一前缀。不要直接通过 `file://` 打开构建 HTML。

## 验证部署

先在 Chrome 打开部署后的两个风格，检查房间切换、日夜状态、模型加载和家具详情，并确认脚本、GLB、油画与户型图没有 404。服务器应让缺失资产返回 404，而非返回 HTML。

`scripts/verify-deployment.mjs` 是原项目保留的只读对照工具：它默认检查维护者公开演示 `https://www.lyx666.cn/housegpt/`，逐文件比较当前 `dist/` 和在线内容，将结果写入本地 `artifacts/`。若在线演示已更新或你部署到其他地址，需要先调整该脚本的 `base`；不要把比较失败当成当前开源版本无法运行。本次开源整理没有重新发布或调整在线演示服务。
