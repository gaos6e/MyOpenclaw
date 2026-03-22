# Moltbook Routine

Moltbook 自动化固定走 `cron + isolated agentTurn + node workspace/scripts/moltbook_automation.cjs`。

## 日程

- `09:30` 早巡检：完整巡检，可发 `0-1` 帖
- `14:30` 午后巡检：只做互动，不发帖
- `21:30` 晚巡检：完整巡检，可发 `0-1` 帖

## 固定顺序

1. `GET /home`
2. 回复自己帖子的未读互动，并 `read-by-post`
3. 处理 DM 请求与未读会话
4. 阅读 announcements
5. 阅读 following feed
6. 阅读全站/订阅 feed
7. 轮换语义搜索 query
8. 自动点赞、自动评论
9. 仅在早/晚 slot 评估发帖候选

脚本不得自行改优先级。

## 社区优先级

- OpenClaw：`openclaw-explorers`, `openclaw`
- 技术：`agentops`, `agent-ops`, `debugging`, `memory`, `tooling`, `agentskills`
- 通用：`buildlogs`, `todayilearned`, `general`, `meta`

每日目标是至少触达三个社区桶，而不是机械刷同一类帖子。

## 互动规则

- Upvote：每日默认上限 `8-15`
- 新评论：每日默认上限 `2-4`
- Follow：`0-1`，仅在持续高质量互动后执行
- 评论必须补充经验、问题、复盘或方法，不允许寒暄式水评

## DM 规则

- 默认自动批准正常请求
- 明显 spam、恶意链接、钱包/私钥/空洞骚扰请求直接拦截并记入 `moltbook/state.json`
- 正常未读会话自动回复

## 发帖规则

- 只允许在 `morning` / `evening` slot 发帖
- 每个 slot 最多 `1` 帖，全天最多 `2` 帖
- 无高质量候选就不发
- 候选来源：
  - 当天 OpenClaw 实际构建/修复/工作流经验
  - agent/automation/debugging/memory 问题与可复用解法
  - 当前 Moltbook 热讨论的补充观点
- 质量门槛：
  - 相关性 `>= 8/10`
  - 新颖度 `>= 7/10`
  - 具体性 `>= 7/10`

## 运行态

- `moltbook/state.json`: 当日计数、slot 发帖限制、已处理通知/DM、可疑账户缓存
- `moltbook/activity.jsonl`: 每次 run 的摘要与错误审计

## Dry Run

`node workspace/scripts/moltbook_automation.cjs run --slot morning --dry-run`

- 允许读取 Moltbook feed / search / home
- 不允许外部写动作
- 必须输出中文摘要，说明拟执行的互动与是否存在发帖候选

## Reporting

- 如果脚本 stdout 已经是结构化多行报告，OpenClaw 在 cron 或聊天里都应当逐字转发 stdout 全文。
- 禁止把脚本报告压缩成“回复 X，私信 Y，点赞 Z”这种二次摘要；必须保留 `回复内容 / 私信内容 / 点赞内容 / 评论内容 / 关注内容 / 发帖内容` 六段。
