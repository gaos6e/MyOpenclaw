# 本地个性化能力层文档索引

本目录是 OpenClaw 本地个性化能力层的 canonical 文档区。

它服务于两个目标：

- 把“上游 OpenClaw + 本地个性化能力层”的结构讲清楚
- 给后续维护提供稳定索引，避免能力分散在扩展、hook、脚本、工作流和配置之间却无人能快速定位

## 适用范围

这里记录的是本仓 first-party 本地能力层，不是整个仓库的所有内容。

纳入：

- 本地扩展：`extensions/openclaw-*`
- 本地 hook：`hooks/self-improvement`、`hooks/task-ack`
- 治理真源：`workspace/*.md`、`workspace/workflows/`、`workspace/scripts/`
- 支撑资产：`workspace/clawvard-eval/`、`workspace/control-ui-local/`
- 装配入口：`openclaw.json`、根目录与 `scripts/` 下的主机级入口脚本

排除：

- 根 `skills/`、`workspace/skills/`
- `mcp.servers` 与第三方技能/插件安装产物
- `node_modules/`、`dist/`、备份目录、临时目录
- `agents/`、`memory/`、`cron/`、`qqbot/`、`identity/` 等运行态/派生态目录内部实现

## 设计原则

### 1. 治理层和运行态分离

- 长期规则、SOP、可复用脚本与说明文档优先落在 `workspace/`
- 根目录运行态目录默认只作为状态层和依赖层，不作为能力真源

### 2. 扩展优先，hook 轻量

- 正式能力优先进入 `extensions/`
- `hooks/` 只做触发、提醒、bootstrap 注入，不承载复杂主流程

### 3. 配置入口清晰

- `openclaw.json` 是本地运行装配的总入口
- `agents/*/agent/*` 和其他派生态配置不单独视为第一真源

### 4. 人类可读真源优先

- 记忆、自我提升、工作流与治理规则要有 Markdown 真源
- SQLite、JSONL、缓存索引与下载目录默认只做派生层

## 真源与派生态边界

### 典型真源

- `workspace/ARCHITECTURE.md`
- `workspace/hindsight_guide.md`
- `workspace/MEMORY.md`
- `workspace/memory/*.md`
- `workspace/self_improve_process.md`
- `workspace/self_improve_todo.md`
- `workspace/self_improve_status.md`
- `workspace/self_improve_quality.md`
- `workspace/workflows/*.md`
- `workspace/scripts/*.cjs|*.ps1|*.js`
- `extensions/*/src/*`
- `extensions/*/openclaw.plugin.json`
- `hooks/*/handler.ts`
- `hooks/*/HOOK.md`
- `openclaw.json`

### 典型派生态

- `memory/main.sqlite`
- `memory/main.v2.sqlite`
- `memory/aux-vector-index.json`
- `workspace/memory/history.jsonl`
- `workspace/memory/inbox/*.jsonl`
- `workspace/memory/ontology/graph.jsonl`
- `agents/*/sessions/*`
- `qqbot/` 下下载、缓存、索引和投递状态

## 如何使用本目录

- 看模块职责：读 [`extensions-and-hooks.md`](./extensions-and-hooks.md)
- 看治理资产关系：读 [`governance-assets.md`](./governance-assets.md)
- 看配置装配和入口：读 [`config-topology-and-entrypoints.md`](./config-topology-and-entrypoints.md)
- 快速定位模块路径、真源、验证方式：读 [`inventory.md`](./inventory.md)

## 文档维护规则

- 新增本地能力时，优先决定它属于扩展、hook、治理文档、治理脚本还是主机级入口。
- 如果改动影响以下任一方面，必须同步更新本目录对应文档：本地扩展职责、hook 行为、治理资产关系、`openclaw.json` 装配拓扑、根级或 `scripts/` 下的主机级入口脚本。
- 如果改动改变了能力层范围、目录导航、推荐阅读顺序或读者入口，还要同步更新根目录 `LOCAL_CUSTOMIZATION_LAYER.md`。
- 记录时不要把实现细节埋进运行态目录说明；如果模块依赖运行态，只写依赖关系和重建路径。
- 记录敏感文件时，只写职责、路径和边界，不写具体密钥、令牌或个人数据。
- 如果某项能力将来迁移到官方支持的 skills / MCP / vendor 插件，应在本目录中把它改记为“外部依赖”，不再当作 first-party 能力真源。
