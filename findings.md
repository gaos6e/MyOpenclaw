# Findings Log

## Scope
- 根目录 runtime/state
- `workspace/` 内自我提升文档、脚本、memory、skills 与 workflow

## Discoveries
- 文档治理面清晰：`workspace/README.md`、`ARCHITECTURE.md`、`HEARTBEAT.md`、`self_improve_process.md` 分工明确。
- `hooks/self-improvement/handler.js` 仅做 bootstrap 提醒注入，行为边界清楚且测试通过。
- `workspace/scripts/validate-self-improve.cjs` 与对应测试可校验 todo/status/quality 三个治理文件的结构。
- `cron/jobs.json` 中 `daily-self-improve-summary` 任务连续成功，`cron/runs/759763ed-54a8-4911-b09f-14a091805442.jsonl` 有实际汇总产出。
- `extensions/openclaw-memory-hub` 具备独立插件、CLI、索引器、候选池、ontology 与会话召回测试，`npm test` 全部通过。
- 运行态存在严重告警：`logs/watchdog.log` 持续记录 `openclaw-memory-hub` provenance/trust 问题，并伴随 gateway health failure / cold restart。
- memory hub ontology 当前会把 `MEMORY.md` 中的空占位和操作性条目当作用户事实写入 `workspace/memory/ontology/graph.jsonl`。
- `stores.js` 的 candidate promote 逻辑无论 candidate 类型如何，都统一写入 `MEMORY.md` 的 `Preferences & setup`，存在语义漂移。
- `indexer.js` 虽然构建了 SQLite/FTS 索引，但 `search()` 实际重新扫描工作区文件，未使用已建索引，架构上重复。
- Mem0 与 memory-hub 两条候选抽取路径仍并存：`mem0_guide.md` 倡导 inbox 模式，但 `mem0_bridge.js` 仍直接写 daily memory；最近一次 heartbeat 会话也仍读取旧版 Mem0 清单。
