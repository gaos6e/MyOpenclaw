# 自我提升标准流程（SOP）

> 目的：把「规则层 / 调度层 / 执行层」打通，确保自我提升可重复、可审计、可迭代。

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
3) **执行清单（优先级顺序）**
   - 优先复盘 .learnings/ERRORS.md 与 .learnings/LEARNINGS.md
   - 梳理定时任务/设置是否需要调整
   - 阅读本地文档（OpenClaw docs/skills）并更新操作流程
   - 复盘近期对话，记录重要偏好/规则到 MEMORY.md
   - 发现可改进点 → 执行优化 → 简要汇报
   - 关注 ClawHub/GitHub/Discord 新工具/插件（先询问再安装）
4) **记录与留痕**
   - 重要规则/偏好 → MEMORY.md
   - Mem0 抽取结果 → 先写入当日 memory/YYYY-MM-DD.md，再人工挑选沉淀到 MEMORY.md
   - 操作失误/失败 → .learnings/ERRORS.md
   - 方法论改进 → .learnings/LEARNINGS.md / AGENTS.md
   - 质量自检问题 → self_improve_quality.md
   - 若当下不做 → 记录到 self_improve_todo.md
   - 状态流转 → self_improve_status.md
5) **汇报原则**
   - 有阶段性进展即告知
   - 日结中控制条数（提升≤10、未执行≤10）

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
- 修改 todo/status/quality 结构后，优先跑一次校验

## 7. 变更规则
- 任何规则变更都需同步到 MEMORY.md 与 HEARTBEAT.md
- 重要变更记录到 .learnings/LEARNINGS.md
