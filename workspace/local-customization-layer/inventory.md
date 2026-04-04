# 本地个性化能力层登记册

这个登记册用于快速查找，不替代正文。

字段说明：

- `模块`：登记对象或家族
- `路径`：主入口路径
- `类型`：extension / hook / governance doc / workflow / script / config / entrypoint
- `职责`：一句话说明
- `真源`：该模块依赖或指向的主要真源
- `关键依赖`：运行态、配置面或其他模块
- `验证入口`：现有测试、构建或检查方式
- `运行态`：`否` 表示主要是治理/代码真源，`是` 表示主要是运行入口或运行面

| 模块 | 路径 | 类型 | 职责 | 真源 | 关键依赖 | 验证入口 | 运行态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Memory Hub | `extensions/openclaw-memory-hub/` | extension | durable memory、session recall、ontology、candidate extraction | `workspace/MEMORY.md`、`workspace/memory/*`、`workspace/memory/ontology/schema.yaml` | `memory/main.v2.sqlite`、`workspace/memory/history.jsonl`、`agents/*/sessions/*` | `workspace/scripts/memory_hub_*.test.cjs` | 否 |
| Context Engine | `extensions/openclaw-context-engine/` | extension | session-aware 上下文装配 | `workspace/AGENTS.md`、`workspace/ARCHITECTURE.md` | memory hub recall、session scope | `workspace/scripts/openclaw_context_engine.test.cjs` | 否 |
| Checkpoint Guardian | `extensions/openclaw-checkpoint-guardian/` | extension | 长探索提醒与 reset 审计 | `workspace/ARCHITECTURE.md`、`workspace/HEARTBEAT.md` | exploration threshold、cooldown | `workspace/scripts/checkpoint_guardian.test.cjs` | 否 |
| Clawvard Governor | `extensions/openclaw-clawvard-governor/` | extension | 注入本地 Clawvard 响应契约 | `workspace/workflows/clawvard-response-contract.md` | `workspace/clawvard-eval/`、`openclaw.json.plugins.entries` | `workspace/scripts/clawvard_governor.test.cjs`、`workspace/scripts/clawvard_eval.test.cjs` | 否 |
| QQBot Plugin | `extensions/openclaw-qqbot/` | extension | QQ 通道、媒体、主动消息、slash commands | `extensions/openclaw-qqbot/src/*`、`README.zh.md` | `qqbot/`、`delivery-queue/`、`scripts/qwen_asr_cli.mjs` | `cd extensions/openclaw-qqbot && npm run build`、`workspace/scripts/qqbot_*.test.cjs` | 否 |
| Self-improvement Hook | `hooks/self-improvement/` | hook | bootstrap 提醒自我提升 | `workspace/self_improve_process.md` | `workspace/self_improve_*.md` | `hooks/self-improvement/handler.test.cjs`、`workspace/scripts/validate-self-improve.cjs` | 否 |
| Task-ack Hook | `hooks/task-ack/` | hook | 任务即时回执 | `workspace/AGENTS.md`、`workspace/MEMORY.md` | `message:received` 事件 | `hooks/task-ack/handler.test.cjs` | 否 |
| Architecture | `workspace/ARCHITECTURE.md` | governance doc | 定义分层与边界 | 文档自身 | 扩展、hook、workspace 治理面 | 人工审阅 + 相关测试对齐 | 否 |
| Durable Memory | `workspace/MEMORY.md` | governance doc | 长期沉淀的人类可读记忆 | 文档自身 | memory hub、context engine | `workspace/scripts/memory_hub_*.test.cjs` | 否 |
| Daily Memory | `workspace/memory/` | governance doc | 记录每日事实与 promotion 入口 | `workspace/memory/README.md`、`TEMPLATE.md` | memory hub、ontology schema | `workspace/scripts/memory_hub_*.test.cjs` | 否 |
| Self-improve Canonical Docs | `workspace/self_improve_*.md` | governance doc | 管理自我提升 SOP、状态、质量 | `workspace/self_improve_process.md` | self-improvement hook、validate script | `workspace/scripts/validate-self-improve.cjs` | 否 |
| HEARTBEAT | `workspace/HEARTBEAT.md` | governance doc | 运行时心跳执行清单 | 文档自身 | `openclaw.json.agents.defaults.heartbeat` | 人工审阅 | 否 |
| Workflow Playbooks | `workspace/workflows/` | workflow | 承载本地 playbook 和协作契约 | 目录内各 Markdown | governor、automation、skills governance | 人工审阅 | 否 |
| Scripts: Memory / Context / Governor Tests | `workspace/scripts/` | script | 回归测试与辅助工具 | 脚本自身 + 对应模块真源 | 扩展、治理文档 | `cd workspace && npm test` | 否 |
| Scripts: Hygiene / Config / Self-improve | `workspace/scripts/openclaw_hygiene_audit.cjs` 等 | script | 卫生审计、配置同步、治理校验 | 脚本自身 + `openclaw.json` / `self_improve_*.md` | 根目录运行态、logs | 对应 `*.test.cjs` | 否 |
| Scripts: Control UI Patches | `workspace/scripts/sync_control_ui_local.cjs` 等 | script | 重建并补丁本地 control UI | 脚本自身 | `workspace/control-ui-local/`、gateway control UI root | 对应 `*.test.cjs` 或人工验证 | 否 |
| Clawvard Eval Harness | `workspace/clawvard-eval/` | governance asset | 本地 8 维评测基线 | `cases.json`、`README.md` | governor、workflow contract | `node workspace/scripts/clawvard_eval.cjs ...` | 否 |
| Control UI Local | `workspace/control-ui-local/` | governance asset | 本地 patched UI root | patch 脚本与上游同步流程 | `openclaw.json.gateway.controlUi.root` | `sync_control_ui_local.cjs` 后人工验证 | 否 |
| Runtime Config | `openclaw.json` | config | 本地运行装配、插件/hook/agent/workspace 拓扑 | 文件自身 | 扩展、hook、gateway、channels | 相关测试 + 人工审阅 | 否 |
| Gateway Launchers | `gateway.cmd`、`gateway-hidden.ps1`、`gateway-hidden.vbs` | entrypoint | Windows 本机 gateway 启动入口 | `openclaw.json` + 本机环境 | Node、OpenClaw 安装、敏感 env | 人工启动验证 | 是 |
| Watchdog | `scripts/openclaw_watchdog.ps1` | entrypoint | 监测 gateway 健康并尝试冷重启 | 脚本自身 | gateway 端口、计划任务、日志 | 人工运行验证 | 是 |
| Qwen ASR CLI | `scripts/qwen_asr_cli.mjs` | entrypoint | 音频转写 CLI 桥接 | 脚本自身 | `openclaw.json.tools.media.audio`、Qwen API | `workspace/scripts/qwen_asr_cli.test.cjs` | 是 |

## 不纳入登记主体但必须知道的边界

| 路径 | 原因 |
| --- | --- |
| `skills/` | 根目录 skills 不是本文档的 first-party 能力层主体 |
| `workspace/skills/` | mixed ownership，含 vendor copy 和安装产物 |
| `mcp` 配置与 server 二进制 | 属于外部依赖装配，不是本仓 first-party 代码 |
| `node_modules/` / `dist/` | 生成或 vendor 产物，不是主编辑面 |
| `agents/`、`memory/`、`cron/`、`qqbot/` 等运行态目录 | 只作为状态层和依赖层说明，不展开内部实现 |
