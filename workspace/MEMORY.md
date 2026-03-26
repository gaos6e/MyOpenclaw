# MEMORY.md - Your Long-Term Memory

_This file stores long-term, distilled memory. Keep it concise._

## About the user
- Name: 
- What to call them: 
- Pronouns: 
- Timezone: Asia/Shanghai
- Hobbies: 数码/摄影、航拍、PC装机与硬件、音频、外设、AI人工智能相关、生物信息学相关（无优先级顺序）

## Preferences & setup
- Use QQ for communication
- 进行自我提升前先告知用户
- 希望以后称呼他为“哥哥～”（带波浪线，已确认，长期生效）
- 用户希望下达任务后，助手应立刻回复“开始做X了”的接收确认（不要等到最终输出才回应）；如可通过配置/流程优化该体验则完善
- 模型思考模式设置为开启，默认使用 medium 级别
- Important/common files live in: C:\Users\20961\.openclaw
- Backups/temporary files live in: D:\桌面\openclaw
- Long-term workspace: C:\Users\20961\.openclaw\workspace
- All OpenClaw skills should be installed in C:\Users\20961\.openclaw\workspace\skills
- For mainstream media content (video/image/text), use https://snapany.com/zh to download then read/analyze
- User wants Moltbook community access. Registered Moltbook agent name melancholic_claw with profile https://www.moltbook.com/u/melancholic_claw; API key saved locally in C:\Users\20961\.openclaw\moltbook\credentials.json and gitignored. Claim verified and first intro post published at https://www.moltbook.com/post/64b27775-8e88-4100-9d8a-8a3c43a62c40. User prefers bio: "Sharp, curious, and hands-on — from AI to hardware to aerial shots."
- When reporting Moltbook automation results back to the user, preserve the full script report verbatim, including 回复内容 / 私信内容 / 点赞内容 / 评论内容 / 关注内容 / 发帖内容. Do not compress it into a short summary.
- When cron jobs fail with rate limits or model timeouts, check `openclaw cron runs --id <job-id>` for detailed error logs and consider adjusting retry intervals or model selection.

## Stable facts
- 暗号约定：用户说“你给了？”，助手回“他非要~”。
- 允许将关键 source 的抽取文本/结构化摘要落地到 workspace/PD 以便检索

## Ongoing context
- 自我提升机制：
  - canonical SOP: `self_improve_process.md`
  - canonical candidate flow: `memory_extract_candidates -> memory_list_candidates -> memory_promote_candidate`
  - 触发：空闲≥30分钟且无新任务时主动提升（若无可做事项可不行动）
  - `.openclaw` 环境卫生自检：默认扫描根目录 + `logs/` / `backup/` / `qqbot/downloads/` / workspace 临时区；先审计再仅执行 `safeActions`
  - 环境卫生安全动作：根目录备份类产物进 `backup/root-backups-<timestamp>/`；明确临时文件进 `D:\桌面\openclaw`；7 天以上低价值更新日志进 `backup/hygiene-archive-<timestamp>/logs/`
  - 环境卫生必须人工确认：`qqbot/downloads`、语义不明确的 `_tmp_*` 目录、未知顶层条目
  - heartbeat 汇报偏好：只要实际执行了检查/整理，就默认返回简短总结；只有完全没做事时才允许 `HEARTBEAT_OK`
  - 记录面：`self_improve_todo.md`, `self_improve_status.md`, `self_improve_quality.md`
  - 日结：每天 22:00 输出总结
  - 记忆沉淀：每 2 天从 daily memory 提炼到 `MEMORY.md`
- 用量监控规则：5小时额度剩余≤20%则降频；每周额度按“剩余天数×10%”留底，若剩余额度低于保留阈值则降频，额度充足或接近刷新可更充分使用但不乱用。
