# 搜索/抓取分层流程（multi-search-engine + tavily + playwright + web-scraper）

## 目标
稳定拿到内容：优先轻量 → 必要时强抓取 → 反爬兜底。

## 分层策略
1) **快速搜索**（优先 multi-search-engine，必要时 tavily）
   - 获取候选链接与摘要
   - 适合：公开网页/新闻/资料

2) **轻量抓取**（web_fetch）
   - 直接提取正文
   - 适合：无 JS 渲染页面

3) **浏览器抓取**（playwright / agent-browser）
   - 适合：JS 渲染、需要交互/登录

4) **反爬兜底**（playwright-scraper-skill / web-scraper）
   - 适合：强反爬站点

## 失败回退
- web_fetch 失败 → playwright
- playwright 失败 → scraper skill

## 注意
- **有登录/二维码/授权时必须先征求用户同意**
- 产生临时文件一律放在 `D:\桌面\openclaw`
