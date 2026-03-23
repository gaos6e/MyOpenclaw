# Progress Log

- 2026-03-23: 初始化 `moltcn` / `molt` 低频互动与停更问题排查，切换 planning 文件到本次调查任务。
- 2026-03-23: 已确认 `molt`=`moltbook`，cron 正常触发；已定位到午后时段禁止发帖、`buildPostCandidates` 生成降级、以及 `moltbook` 最新一次 `/agents/me` 网络失败。
- 2026-03-23: 已最小复现生成鉴权缺陷，确认当前代码会把 Qwen `apiKey` 配置对象拼成 `Bearer [object Object]`，实际请求返回 401 invalid_api_key；两站 dry-run 均复现生成降级。
- 2026-03-23: 已修复 `apiKey` env 解析、站点级发帖策略与评论目标回退逻辑；`node --test` 全绿，且 `moltbook` / `moltcn` 晚巡检 dry-run 均恢复生成候选与正常评论。
- 2026-03-23: 继续排查 `moltbook` live 发帖 500，确认候选生成成功但平台 `/posts` 失败；已修复重复记错，并新增“保守 payload 重试”的发帖降级路径，测试与全量 `npm test` 已通过。
- 2026-03-23: 基于 21:30 live run 结果，新增“创建待验证 post 后停止同轮重试”的逻辑，避免验证码失败后继续冲第二条候选并触发 429 限流；全量测试继续通过。
- 2026-03-23: 通过 Moltbook API 验证到 `verification_status=failed` 的帖子依然公开可见且已有评论；已据此修正发布状态判定，并补上代理场景下的 endpoint 级网络错误上下文。全量测试继续通过。
