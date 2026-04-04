# 临时文件与仓库卫生策略

## 原则

- `.openclaw` 采用保守清理，不做语义猜测，不用 LLM 判定“像不像垃圾”。
- 自动化只处理模式稳定、可回放、低风险的残留。
- 运行态目录与混合所有权目录默认不自动碰。

## 默认落盘

- 临时文件优先落到仓库外：`D:\桌面\openclaw`
- 定时卫生归档默认落到：`C:\Users\20961\Desktop\openclaw-hygiene-archive\scheduled\`
- 若工具必须先写到 `workspace/` 或根目录，任务结束后应由卫生脚本迁走

## 执行入口

- 手动审计：`node workspace/scripts/openclaw_hygiene_audit.cjs --root . --json`
- 手动维护：`node workspace/scripts/openclaw_hygiene_maintain.cjs --repo-root .`
- 定时任务：`OpenClaw Daily Hygiene`

## 分区规则

- `auto-clean`
  只包含明确的备份/临时模式，如 `openclaw.json.bak*`、`openclaw.json.clobbered.*`、`debug.jsonl`、`workspace/clawvard_batch_*.ps1`、`tmp_*`、旧 update log
- `archive-only`
  例如 `backup/` 下已经是备份、但摆放在热区的松散 `.bak` 文件；应搬到仓库外归档，不在仓库内继续堆积
- `manual-review`
  例如 `workspace/_tmp_*`、`qqbot/downloads/`、未知顶层条目；默认列清单，不自动处理
- `protected-runtime`
  例如 `agents/`、`memory/`、`tasks/`、`subagents/`、`qqbot/`、`devices/`、`cron/`；除恢复/迁移/审计任务外，不自动移动或删除

## 维护要求

- 发现新的垃圾模式后，先补 `openclaw_hygiene_audit.cjs` 规则，再交给定时任务处理
- 若某类残留频繁出现，优先修来源，让它直接写到仓库外归档区
- 文档、脚本和实际行为必须一致；路径或归档策略变化时同步更新本文件与 `workspace/scripts/README.md`
