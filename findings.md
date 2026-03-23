# Findings Log

## Scope
- `moltcn/`
- `workspace/scripts/*molt*`
- `cron/jobs.json` 与 `cron/runs/`
- `logs/`
- `agents/main/sessions/`

## Discoveries
- `molt` 在仓库内对应 `moltbook` 站点，`moltcn` 与 `moltbook` 共用 `workspace/scripts/moltbook_automation.cjs`，仅通过 `--site` 切换站点配置。
- `cron/jobs.json` 中 `moltbook-*` 与 `moltcn-*` 三个时段任务均为 `enabled: true`，最近运行状态均为 `ok`，说明不是 cron 停止触发。
- `workspace/scripts/moltbook_automation.cjs` 中 `canPostInSlot()` 明确只允许 `morning` 与 `evening` 发帖，`afternoon` 固定返回 `slot_not_allowed`。
- `moltcn/activity.jsonl` 显示 2026-03-23 早/午轮次多次记录 `生成降级：buildPostCandidates` 与 `本轮无合格发帖候选`，且互动仅有点赞，没有回复/评论/发帖。
- `cron/runs/moltbook-afternoon.jsonl` 在 2026-03-23 14:40 记录 `Network request failed for GET /agents/me`，属于站点/API 网络错误，导致整轮 0 互动、0 发帖。
- `cron/runs/moltcn-morning.jsonl` 早期曾出现 `Missing Moltcn credentials`，后续凭证已补上；2026-03-22 曾出现 `发帖未发布成功：unknown`，说明至少有一段时间不是“无候选”，而是“提交后未确认发布成功”。
- `resolveGenerationConfig()` 直接返回 `openclaw.json` 中 `models.providers.qwen.apiKey` 的配置对象；`openAiCompatibleChat()` 又直接把它拼进 `Authorization: Bearer ${config.apiKey}`。在当前配置下，这个 header 实际是 `Bearer [object Object]`。
- 已最小复现该问题：同样的模型请求使用当前脚本拼出的鉴权头会返回 `401 invalid_api_key`；同时环境变量 `QWEN_API_KEY` 本身是存在的，因此根因是“未解析 env 型 apiKey 配置”，不是环境变量缺失。
- 当前 dry-run 也复现了两边的生成降级：`moltcn` 晚巡检仅输出 `生成降级：buildPostCandidates`；`moltbook` 晚巡检同时输出 `生成降级：commentOnPost` 和 `生成降级：buildPostCandidates`，且评论文本退回到通用 fallback 文案。
- `moltcn` 的功能开关被显式关闭为 `dmRequests=false`、`dmConversations=false`、`followingFeed=false`，只保留 `readNotifications=true`；这会天然压低其互动来源。
- 互动策略整体偏保守：每轮最多点赞 5 次、每天最多 12 次；评论目标最多 1 条；发帖候选只取 `rankedPosts.slice(0, 5)` 热点，并且必须同时满足 `relevance>=8`、`novelty>=7`、`specificity>=7` 才会发。
- 修复后，`node workspace/scripts/moltbook_automation.cjs run --slot evening --dry-run` 已重新生成正常中文评论与 `本轮可发帖候选`；`moltcn` 的晚巡检 dry-run 也恢复为正常中文评论并产出发帖候选，说明生成链路已恢复。
- 修复后午后 slot 不再被硬编码禁发，发帖时段策略已转为站点 profile 内的 `postingPolicy.allowedSlots`，后续调优可按站点配置而不是改核心逻辑。
- 评论策略已从“只评论已有评论的帖子”调整为“优先评论已有讨论帖，若没有则回退到相关新帖”，能提高低活跃时段的互动概率而不依赖额外站点能力。
- 2026-03-23 晚间的 `moltbook` live run 显示候选已生成，但 `/posts` 返回 `500 Error`；同一错误在 summary 中出现两次，是因为 `maybePostJson()` 和 `runSlot()` 最外层 `catch` 都在重复记录同一异常，不代表实际发了两次请求。
- 已新增发帖容错：当 `/posts` 出现可重试错误（5xx/网络错误）时，脚本会对候选内容做保守化处理（去 markdown/backticks/hashtags、规范标点与长度）后重试，而不是整轮直接失败。
- 2026-03-23 21:30 的新 live run 表明，修复后 `500` 路径已变化为“验证码回答错误 + 后续重试触发 2.5 分钟发帖限流”；这说明一旦服务端已经创建了待验证 post，就不应在同一轮继续尝试下一条候选。
- 通过站点 API 直接核验，`melancholic_claw` 的帖子 `Gateway Refactor: Hidden PowerShell Script & Git Status Anomaly` 已真实存在、可公开访问且已有外部评论，但其 `verification_status` 为 `failed`。因此 Moltbook 的 `failed` 在实践中不等于“未发布”，脚本此前把这类帖子记为 `发帖 0` 属于误判。
- 已修正发布状态判定：`verification_status !== "pending"` 且帖子实体存在、未删除时，视为已发布；这样 `failed` 但可见的帖子会被正确计入发帖成功，同时仍保留验证失败告警。
- 已补充网络层错误包装：在代理开启且 `curl` 与 `fetch` 都失败时，错误现在会保留具体 endpoint 与代理失败信息，不再只显示无上下文的 `fetch failed`。
