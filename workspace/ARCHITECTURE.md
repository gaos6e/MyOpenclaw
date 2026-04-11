# openclaw Architecture

## Layering

### 1. Runtime / State Layer

位于仓库根目录，面向框架运行和本地状态持久化：

- `agents/`: agent session/runtime state
- `identity/`: device identity and local auth state
- `memory/`: 检索索引、本地 Hindsight PostgreSQL 数据目录、Hindsight API runtime 日志与 pid
- `cron/`: 本地任务定义和运行记录
- `devices/`: 配对与待处理设备状态
- `qqbot/`: QQBot runtime data

这些目录不搬家，但默认按 local runtime/state 处理。

### 1.5 Runtime config vs derived agent state

- `openclaw.json` 视为本地 runtime config 入口。
- `agents/main/agent/*` 视为 agent-local 派生态或状态面，不单独当成第二套人工维护配置。
- 当两者出现概念重叠时，以 runtime config 的设计意图为先，再决定是否需要同步或清理派生态。

### 2. Governance / Workspace Layer

位于 `workspace/`，面向长期维护：

- bootstrap 入口: `AGENTS.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`, `MEMORY.md`
- 自我提升治理: `self_improve_process.md`, `self_improve_todo.md`, `self_improve_status.md`, `self_improve_quality.md`
- 工作流与脚本: `workflows/`, `scripts/`
- skills 与 vendor 索引: `skills/`, `VENDOR.md`
- 本地个性化能力层索引: `local-customization-layer/`

## Memory Model

### Human-readable memory

- `workspace/memory/*.md`: 日记式原始事实
- `workspace/MEMORY.md`: 本地可读的 curated archive / audit backup / migration seed
- `workspace/.learnings/*`: 错误/教训/需求池，本地运行态记录

### Runtime durable memory

- `hindsight-openclaw`: 主 runtime durable memory backend，负责 auto-recall / auto-retain
- `workspace/scripts/ensure_hindsight_local.ps1`: 本机 Hindsight runtime 启动入口，负责确保本地 PostgreSQL、pgvector 和 Hindsight API 就绪
- `memory/hindsight-pg/data`: 本机 Hindsight 的主持久化数据库目录
- `memory/hindsight-api-runtime/logs/*`: 本机 Hindsight API 运行日志
- `workspace/MEMORY.md` 与 `workspace/memory/*.md`: 保留为本地可读归档与治理入口，不直接等价于 Hindsight 在线状态

### Retrieval-only memory

- `memory/main.sqlite`: 旧检索索引（保留）
- `memory/main.v2.sqlite`: memory hub v2 本地辅助检索索引
- `workspace/memory/ontology/schema.yaml`: ontology schema
- `workspace/memory/ontology/graph.jsonl`: curated archive / reviewed history 派生出的 ontology graph
- `workspace/memory/history.jsonl`: 本地 archive promotion history
- `workspace/memory/inbox/*.jsonl`: local archive candidate inbox（抽取结果待审核）
- `workspace/memory/index-manifest.json`: memory v2 index 白名单/黑名单

原则：
- Hindsight 是主 runtime recall backend；`MEMORY.md` / daily memory 是本地治理与审计面
- Hindsight 的 durable store 当前是本地 PostgreSQL；主 profile 下 LLM / embeddings 优先通过 DashScope Qwen 远程调用，但 `workspace/scripts/ensure_hindsight_local.ps1` 现在提供启动时自动降级：若远端 provider 让 Hindsight API 无法健康启动，则退回到本地 embeddings + `LLM provider=none` 的 chunk-store 模式，优先保证 gateway 可启动
- `memory/main*.sqlite` 都是可重建辅助检索层，不是人工编辑事实源
- `workspace/memory/ontology/graph.jsonl` 是派生视图，不是原始真源

## Self-improvement Model

- Hook 只负责 bootstrap 提示，不负责复杂执行。
- `contextEngine` 负责为 direct/cron/subagent 组装 session-aware 上下文快照，shared session 默认走安全裁剪。
- `checkpoint-guardian` 负责在长探索链路后注入 checkpoint 提醒，并在 reset 前记录未落盘探索审计。
- `HEARTBEAT.md` 负责可漂移检查清单。
- `self_improve_process.md` 是唯一 SOP。
- `self_improve_todo.md`, `self_improve_status.md`, `self_improve_quality.md` 是结构化治理面。
- cron 负责定时执行和总结，不承载重复规则定义。

## Vendor / Imported Content

- `workspace/skills/` 是 mixed ownership 目录，不默认视为全部 first-party。
- `workspace/_tmp_*` 属于 vendor/archive 类内容，优先本地保存和隔离治理。
