# 自我提升标准流程（SOP）

> 目的：把「规则层 / 调度层 / 执行层」打通，确保自我提升可重复、可审计、可迭代。

## 0. 运行时机制
- `openclaw-context-engine`：为 private/direct/cron/subagent 会话注入压缩后的工作区上下文快照；shared 会话默认不注入私人 durable memory。
- `openclaw-checkpoint-guardian`：在长探索链路后提醒做 checkpoint，并在 reset 前记录未落盘探索审计。
- `self-improvement` hook：可选提醒层；当前默认保持禁用，主链路以 workspace bootstrap + context-engine + checkpoint-guardian 为准。

## 1. 触发条件（来自 MEMORY.md）
- 空闲≥30分钟且无新任务时主动提升
- 每天 22:00 进行日结总结

## 2. 调度来源（HEARTBEAT / Cron）
- HEARTBEAT.md：承载“可漂移”的周期检查任务
- Cron：承载固定时间点任务（22:00 日结）

## 3. 执行流程（每次提升的固定步骤）
1) **判断是否值得执行**
   - 是否空闲≥30分钟
   - 是否有可提升事项（无则跳过）
2) **优先处理待做池 + 状态池**
   - 先查看 `self_improve_todo.md` 与 `self_improve_status.md`
   - 待执行事项进入 todo；执行中标记 doing；完成后标记 done；受阻标记 blocked
3) **先做 `.openclaw` 环境卫生自检**
   - 先运行 `node scripts/openclaw_hygiene_audit.cjs --json`
   - 默认扫描：`.openclaw` 根目录 + `logs/` + `backup/` + `qqbot/downloads/` + workspace 临时区
   - 仅当结果属于 `safeActions` 时，再运行 `node scripts/openclaw_hygiene_audit.cjs --apply-safe --archive-age-days 7`
   - 安全动作范围：
     - 根目录备份类产物 → `backup/root-backups-<timestamp>/`
     - 明确临时文件 → `D:\桌面\openclaw`
     - 7 天以上低价值更新日志 → `backup/hygiene-archive-<timestamp>/logs/`
   - 必须人工确认，不自动处理：
     - `qqbot/downloads/**/*`
     - 语义不明确的 `_tmp_*` 目录
     - 未知顶层条目或疑似项目/人工整理内容
4) **执行清单（优先级顺序）**
   - 优先复盘 .learnings/ERRORS.md 与 .learnings/LEARNINGS.md
   - 梳理定时任务/设置是否需要调整
   - 阅读本地文档（OpenClaw docs/skills）并更新操作流程
   - 复盘近期对话，优先判断是否需要补强 Hindsight 的 durable memory 规则或本地 archive
   - 发现可改进点 → 执行优化 → 简要汇报
   - 关注 ClawHub/GitHub/Discord 新工具/插件（先询问再安装）
5) **记录与留痕**
   - runtime durable memory 主线 → `hindsight-openclaw`（auto-recall / auto-retain）
   - 本地可读 archive → `MEMORY.md`
   - local archive candidate flow：`memory_extract_candidates -> memory_list_candidates -> memory_promote_candidate`
   - 候选抽取结果 → 先写入 `memory/inbox/*.jsonl`，再人工审核沉淀到 `MEMORY.md`
   - 操作流程/工具习惯/排障命令/路径治理 → `AGENTS.md` / `TOOLS.md`
   - `.openclaw` 环境卫生安全动作执行结果 → `self_improve_status.md`
   - 需要人工确认的目录卫生问题 → `self_improve_todo.md`
   - 若目录卫生问题反复出现，说明流程仍有缺口 → `self_improve_quality.md`
   - 操作失误/失败 → .learnings/ERRORS.md
   - 方法论改进 → .learnings/LEARNINGS.md / AGENTS.md
   - 质量自检问题 → self_improve_quality.md
   - 若当下不做 → 记录到 self_improve_todo.md
   - 状态流转 → self_improve_status.md
6) **汇报原则**
   - 只要 heartbeat 实际执行了任一项检查/整理，就要给用户一条简短中文总结
   - 总结至少包含：做了什么、发现/改了什么、是否需要用户输入
   - 即使结果是“检查完毕，无异常”，也要给出简短总结
   - 只有完全未执行任何动作时，才允许回复 `HEARTBEAT_OK`
   - 日结中控制条数（提升≤10、未执行≤10）
   - 22:00 日结只汇报已经落入 `todo/status/quality/inbox/history` 的结果

## 4. 为什么要“流程文档化”
- skill 是“能力模块”，流程文档是“本地 SOP”，可将你的偏好、约束、习惯稳定固化
- 避免因 skill 升级/替换导致行为漂移
- 方便审计与复盘，减少重复沟通成本

## 5. 记录格式
- `self_improve_todo.md`: `- [高|中|低] 动作 -> 价值`
- `self_improve_status.md`: `- status | 标题 | YYYY-MM-DD [| note]`
- `self_improve_quality.md`: `- YYYY-MM-DD | 场景 | 问题 | 影响 | 优先级 | 处理动作`

## 6. 校验
- 轻量校验脚本：`node scripts/validate-self-improve.cjs`
- 目录卫生审计脚本：`node scripts/openclaw_hygiene_audit.cjs --json`
- 修改 todo/status/quality 结构后，优先跑一次校验
- 记忆系统变更后，优先跑一次 `openclaw plugins list`、`openclaw memory-hub status --json`，并确认 Hindsight 外部 API 模式可用

## 7. 变更规则
- 任何规则变更都需同步到 MEMORY.md 与 HEARTBEAT.md
- 重要变更记录到 .learnings/LEARNINGS.md
