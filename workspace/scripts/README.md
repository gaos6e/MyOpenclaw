# Workspace Scripts

这些脚本是 `workspace/` 的 first-party runtime helpers。

## Governance

- `validate-self-improve.cjs`: 校验 `self_improve_todo.md`, `self_improve_status.md`, `self_improve_quality.md` 的最小结构
- `openclaw_hygiene_audit.cjs`: 审计 `.openclaw` 根目录与热点区的目录卫生；输出 `auto-clean` / `archive-only` / `manual-review` / `protected-runtime` 分区，支持 `--json` 审计输出与 `--apply-safe` 安全归档
- `rebaseline_config_health.cjs`: 将 `logs/config-health.json` 的 `lastKnownGood` 重置为当前 `openclaw.json`，用于修复 stale baseline 导致的 `openclaw.json.clobbered.*` 连续生成
- `openclaw_hygiene_maintain.cjs`: 每次运行执行一轮完整卫生维护：应用安全清理、外置归档 `workspace/_tmp_cli_anything` 与 `backup/` 中松散 `.bak`，并刷新 config-health baseline
- `run_openclaw_hygiene.ps1`: Windows 计划任务入口，落日志到 `logs/openclaw-hygiene-task.log`
- `register_openclaw_hygiene_task.ps1`: 注册每天定时运行的 Windows 计划任务，默认任务名 `OpenClaw Daily Hygiene`、时间 `03:30`
- `set_hidden_gateway_task.ps1`: 把 `OpenClaw Gateway` 登录任务重注册为 `wscript.exe -> gateway-hidden.vbs` 的隐藏启动链；若 `openclaw gateway install --force`、升级重装或其他 service reinstall 覆盖了任务动作，需要重跑此脚本恢复无窗口常驻
- `ensure_hindsight_local.ps1`: 启动并健康检查本地 `PostgreSQL + pgvector + Hindsight API` 运行链；当前固定使用 `qwen3.5-plus` 作为 Hindsight LLM、`text-embedding-v4` 作为 embeddings，供 `gateway.cmd` 在启动 OpenClaw 前调用
- `stop_hindsight_local.ps1`: 停止本地 Hindsight API 进程并关闭本地 PostgreSQL 实例
- `mem0_capture.js`: 历史遗留的低层 Mem0 SDK 调试 helper；当前不属于默认运行闭环
- `mem0_bridge.js`: 已弃用的历史实验脚本；仅保留作兼容/排查用途
- `mem0_migration.cjs`: 历史迁移脚本；当前主线已切到 Hindsight，不作为默认流程
- `memory_hub_log_summary.cjs`: 汇总 `logs/memory-hub.jsonl` 中的每日抽取命中率、schema 命中和常见未命中类型
- `memory_hub_vector.cjs`: 直连本地辅助向量层的入口，支持 `index` / `search`，用于 local archive / session hints
- `hindsight_local_launcher.test.cjs`: 检查本地 Hindsight 启动脚本与 `gateway.cmd` 的关键装配约束，防止 gateway 回退到未启动 memory backend 的状态
- `moltbook_automation.cjs`: Moltbook / Moltcn 例行自动化入口；默认跑 `moltbook`，可用 `--site moltbook|moltcn` 切站，分别落盘到 `moltbook/` 或 `moltcn/`；站点凭据优先读取根目录 `.env` 中的 `MOLTBOOK_*` / `MOLTCN_*` 变量，运行目录 `credentials.json` 仅作兜底
- `sync_qwen_config.cjs`: 以 `openclaw.json` 中的 `custom.qwen` 为单一真源，同步派生视觉 provider、memorySearch embedding、以及音频 ASR CLI 配置
- `clawvard_eval.cjs`: 本地 Clawvard 风格 8 维模拟评测入口；读取 `workspace/clawvard-eval/cases.json` 与响应文件，输出总分、维度分和提分建议
- `tooling_guardrails.cjs`: 工具稳定性小工具；支持 repo 文本搜索 fallback、只读存在文件、PowerShell 是否应脚本化的判断
- `patch_control_ui_slash_enter.cjs`: 修复本地 Control UI 中 slash 命令第一次回车只“选中不执行”的回归；升级后若再次出现 `/compact`、`/status` 等命令无响应，可重跑该脚本
- `patch_control_ui_compact_command.cjs`: 修复本地 Control UI 中 `/compact` 被错误映射到 `sessions.compact` 的回归；让它改走真正的聊天 slash-command 语义
- `sync_control_ui_local.cjs`: 从安装目录复制一份 Control UI 到 `workspace/control-ui-local`，并自动套用 slash-enter 与 `/compact` 两个补丁；适合升级后重建本地 patched UI root
- `patch_qq_compact_urgent.cjs`: 修复 QQ 通道中 `/compact` 容易排队无响应的问题；将其提升为像 `/stop` 一样的即时命令，升级后若回归可重跑该脚本

## Maintenance

- `backup_openclaw.ps1`: 本地备份入口

## Rule

- 新增脚本优先放这里，而不是散落到根目录。
- 任何会影响治理规则的脚本，都要在对应文档中留入口。
