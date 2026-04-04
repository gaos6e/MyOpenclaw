# Hindsight 集成说明

## 当前角色
- `hindsight-openclaw` 是主 runtime durable memory backend
- `workspace/MEMORY.md` 保留为本地可读 curated archive / audit backup / migration seed
- `openclaw-memory-hub` 降为本地辅助层：session recall、ontology、本地 archive 候选与向量检索

## 依赖
- 环境变量：`HINDSIGHT_EMBED_API_URL`、`HINDSIGHT_EMBED_API_TOKEN`
- 官方插件：`@vectorize-io/hindsight-openclaw`
- 外部 API：`https://api.hindsight.vectorize.io`

## 常用命令
```bash
openclaw plugins list
openclaw memory-hub status --json
```

## 组织方式
- Hindsight 负责跨 session 的 runtime recall / retain
- `MEMORY.md` 负责本地可读、可审计、可备份的 curated archive
- `memory/inbox/*.jsonl` 与 `memory-hub` candidate flow 只在需要维护本地 archive 时使用
- daily memory 结构以 `memory/README.md` 和 `memory/TEMPLATE.md` 为准

## 注意
- 不要把 secrets、token、临时路径治理、cron/job 经验直接送进 Hindsight
- Hindsight 当前按外部 API 模式接入；若改回本地 daemon，再单独评估 `uvx hindsight-embed` 路线
- `mem0_capture.js` / `mem0_bridge.js` 仅保留作历史兼容脚本，不属于当前主线
