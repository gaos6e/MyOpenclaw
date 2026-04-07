# Hindsight 集成说明

## 当前角色

- `hindsight-openclaw` 是主 runtime durable memory backend
- `workspace/MEMORY.md` 保留为本地可读 curated archive / audit backup / migration seed
- `openclaw-memory-hub` 降为本地辅助层：session recall、ontology、本地 archive 候选与向量检索

## 当前部署形态

- OpenClaw 当前接入的是本机 Hindsight API：`http://127.0.0.1:18890`
- Hindsight API 由 `workspace/scripts/ensure_hindsight_local.ps1` 负责启动和健康检查
- Hindsight 的 durable store 是本地 PostgreSQL + `pgvector`
- PostgreSQL 数据目录位于 `memory/hindsight-pg/data`
- Hindsight API 运行日志位于 `memory/hindsight-api-runtime/logs/`

## 模型与后端拆分

- OpenClaw 主模型当前维持 `teamplus/gpt-5.2`
- Hindsight 自己的 LLM 后端单独使用 DashScope Qwen：`qwen3.5-plus`
- Hindsight embeddings 单独使用 DashScope：`text-embedding-v4`
- 这意味着 durable memory 服务和数据库是本地的，但 Hindsight 的抽取、整合和 embedding 计算仍依赖远程模型接口

## 依赖

- 官方插件：`@vectorize-io/hindsight-openclaw`
- 本地启动脚本：`workspace/scripts/ensure_hindsight_local.ps1`
- 本地停止脚本：`workspace/scripts/stop_hindsight_local.ps1`
- 本地数据库：`memory/hindsight-pg/`
- 本地 API runtime：`memory/hindsight-api-runtime/`
- 远程模型接口：DashScope Qwen

## 常用命令

```bash
openclaw plugins list
openclaw doctor
powershell -NoProfile -ExecutionPolicy Bypass -File workspace/scripts/ensure_hindsight_local.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File workspace/scripts/stop_hindsight_local.ps1
```

## 组织方式

- Hindsight 负责跨 session 的 runtime recall / retain
- `MEMORY.md` 负责本地可读、可审计、可备份的 curated archive
- `memory/inbox/*.jsonl` 与 `memory-hub` candidate flow 只在需要维护本地 archive 时使用
- daily memory 结构以 `workspace/memory/README.md` 和 `workspace/memory/TEMPLATE.md` 为准

## 注意

- 不要把 secrets、token、临时路径治理、cron/job 经验直接送进 Hindsight
- Hindsight 当前不再使用官方云端 memory API；持久化存储在本机 PostgreSQL
- 如果 DashScope/Qwen 不可用，本地数据库仍在，但新的 retain / consolidation / recall 可能受影响
- `mem0_capture.js` / `mem0_bridge.js` 仅保留作历史兼容脚本，不属于当前主线
