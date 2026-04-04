# OpenClaw Hygiene Zones

## 目标

把 `.openclaw` 中“可自动清”“只能归档”“需要人工确认”“绝不能碰”的边界写死，减少临时判断和误清。

## Zones

### 1. `auto-clean`

特点：
- 文件名模式稳定
- 删除或迁移后可回放
- 不承载唯一状态

当前代表：
- `openclaw.json.bak*`
- `openclaw.json.clobbered.*`
- `debug.jsonl`
- `workspace/clawvard_batch_*.ps1`
- `workspace/tmp_*`
- 低价值 update logs

动作：
- 由 `openclaw_hygiene_audit.cjs --apply-safe` 自动迁到仓库外归档区

### 2. `archive-only`

特点：
- 本质上是备份，不该继续留在热区
- 不适合直接删除

当前代表：
- `backup/` 根下松散 `.bak` 文件

动作：
- 由 `openclaw_hygiene_maintain.cjs` 搬到仓库外 `backup_flat_files/`

### 3. `manual-review`

特点：
- 看起来像临时区，但可能混有项目内容或用户资产

当前代表：
- `workspace/_tmp_*`
- `qqbot/downloads/`
- 未列入 allowlist 的新顶层目录或文件

动作：
- 默认只出现在审计报告里，不自动处理

### 4. `protected-runtime`

特点：
- 属于 runtime / state layer
- 自动清理容易破坏会话、索引、任务编排或通道状态

当前代表：
- `agents/`
- `cron/`
- `delivery-queue/`
- `devices/`
- `identity/`
- `memory/`
- `qqbot/`
- `subagents/`
- `tasks/`

动作：
- 日常清理绝不自动碰
- 只有恢复、迁移、压缩归档、专项审计任务才允许处理

## 扩展规则

- 新模式先分区，再落规则，不要直接往 `safeActions` 塞
- 如果一个路径需要额外语义判断，它就不属于 `auto-clean`
- 如果一个目录兼有 runtime 和缓存属性，先按 `protected-runtime` 处理，再考虑是否拆分目录结构
