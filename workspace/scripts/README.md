# Workspace Scripts

这些脚本是 `workspace/` 的 first-party runtime helpers。

## Governance

- `validate-self-improve.cjs`: 校验 `self_improve_todo.md`, `self_improve_status.md`, `self_improve_quality.md` 的最小结构
- `openclaw_hygiene_audit.cjs`: 审计 `.openclaw` 根目录与热点区的目录卫生；支持 `--json` 审计输出与 `--apply-safe` 安全归档
- `rebaseline_config_health.cjs`: 将 `logs/config-health.json` 的 `lastKnownGood` 重置为当前 `openclaw.json`，用于修复 stale baseline 导致的 `openclaw.json.clobbered.*` 连续生成
- `mem0_capture.js`: 手动/实验性触发 Mem0 抽取；不属于默认自我提升闭环
- `mem0_bridge.js`: 已弃用的实验脚本；默认流程请改用 `openclaw memory-hub extract|candidates|promote`
- `memory_hub_log_summary.cjs`: 汇总 `logs/memory-hub.jsonl` 中的每日抽取命中率、schema 命中和常见未命中类型
- `memory_hub_vector.cjs`: 直连辅助向量层的本地入口，支持 `index` / `search`，用于绕过当前旧 `openclaw` wrapper 的不稳定 embedding 调用
- `moltbook_automation.cjs`: Moltbook / Moltcn 例行自动化入口；默认跑 `moltbook`，可用 `--site moltbook|moltcn` 切站，分别落盘到 `moltbook/` 或 `moltcn/`；站点凭据优先读取根目录 `.env` 中的 `MOLTBOOK_*` / `MOLTCN_*` 变量，运行目录 `credentials.json` 仅作兜底
- `sync_qwen_config.cjs`: 以 `openclaw.json` 中的 `custom.qwen` 为单一真源，同步派生视觉 provider、memorySearch embedding、以及音频 ASR CLI 配置
- `clawvard_eval.cjs`: 本地 Clawvard 风格 8 维模拟评测入口；读取 `workspace/clawvard-eval/cases.json` 与响应文件，输出总分、维度分和提分建议
- `tooling_guardrails.cjs`: 工具稳定性小工具；支持 repo 文本搜索 fallback、只读存在文件、PowerShell 是否应脚本化的判断
- `patch_control_ui_slash_enter.cjs`: 修复本地 Control UI 中 slash 命令第一次回车只“选中不执行”的回归；升级后若再次出现 `/compact`、`/status` 等命令无响应，可重跑该脚本
- `patch_control_ui_compact_command.cjs`: 修复本地 Control UI 中 `/compact` 被错误映射到 `sessions.compact` 的回归；让它改走真正的聊天 slash-command 语义
- `sync_control_ui_local.cjs`: 从安装目录复制一份 Control UI 到 `workspace/control-ui-local`，并自动套用 slash-enter 与 `/compact` 两个补丁；适合升级后重建本地 patched UI root
- `patch_qq_compact_urgent.cjs`: 修复 QQ 通道中 `/compact` 容易排队无响应的问题；将其提升为像 `/stop` 一样的即时命令，升级后若回归可重跑该脚本

## Star Office

- `star-office-state.ps1`: 同步 Star Office 看板状态
- `start-star-office.ps1`, `stop-star-office.ps1`
- `launch-star-office.cmd`, `autostart-star-office.cmd`, `register-star-office-autostart.ps1`

## Maintenance

- `backup_openclaw.ps1`: 本地备份入口

## Rule

- 新增脚本优先放这里，而不是散落到根目录。
- 任何会影响治理规则的脚本，都要在对应文档中留入口。
