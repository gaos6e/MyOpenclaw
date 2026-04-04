# 扩展与 Hook

本页记录本仓本地个性化能力层里最核心的执行模块：5 个扩展和 2 个 hook。

统一记录模板：

- `作用`
- `代码/配置入口`
- `运行时依赖或派生态`
- `真源文件`
- `验证方式或现有测试`
- `维护注意事项`

## 一览表

| 模块 | 类型 | 核心职责 | 主要入口 |
| --- | --- | --- | --- |
| `openclaw-memory-hub` | extension | scoped durable memory、session recall、candidate extraction、ontology lookup | `extensions/openclaw-memory-hub/src/plugin.js` |
| `openclaw-context-engine` | extension | session-aware 上下文装配 | `extensions/openclaw-context-engine/src/context-engine.js` |
| `openclaw-checkpoint-guardian` | extension | 长探索提醒与 reset 审计 | `extensions/openclaw-checkpoint-guardian/src/plugin.js` |
| `openclaw-clawvard-governor` | extension | 注入本地 Clawvard 响应契约 | `extensions/openclaw-clawvard-governor/src/plugin.js` |
| `openclaw-qqbot` | extension | QQ 通道、消息、媒体、主动消息、cron 对接 | `extensions/openclaw-qqbot/src/*.ts` |
| `self-improvement` | hook | bootstrap 时注入自我提升提醒 | `hooks/self-improvement/handler.ts` |
| `task-ack` | hook | 收到任务时即时回执 | `hooks/task-ack/handler.ts` |

## `openclaw-memory-hub`

### 作用

- 承载本地 durable memory 的正式插件实现。
- 负责 session recall、candidate extraction、reviewed history、ontology lookup 和辅助向量召回。
- 把人类可读记忆与检索层连接起来，但不把 SQLite / JSONL 派生态当作唯一事实源。

### 代码/配置入口

- 代码入口：
  - `extensions/openclaw-memory-hub/index.ts`
  - `extensions/openclaw-memory-hub/src/plugin.js`
  - `extensions/openclaw-memory-hub/src/session-recall.js`
  - `extensions/openclaw-memory-hub/src/candidates.js`
  - `extensions/openclaw-memory-hub/src/ontology.js`
  - `extensions/openclaw-memory-hub/src/backfill.js`
  - `extensions/openclaw-memory-hub/src/aux-vector.js`
- 元数据：
  - `extensions/openclaw-memory-hub/openclaw.plugin.json`
  - `extensions/openclaw-memory-hub/package.json`
- 配置装配：
  - `openclaw.json` 的 `plugins.allow`、`plugins.slots.memory`、`plugins.entries.openclaw-memory-hub`

### 运行时依赖或派生态

- 根目录：
  - `memory/main.v2.sqlite`
  - `memory/aux-vector-index.json`
- `workspace/memory/`：
  - `history.jsonl`
  - `inbox/*.jsonl`
  - `ontology/graph.jsonl`
- 会话面：
  - `agents/*/sessions/*`
- 日志面：
  - `logs/` 中的 memory hub 运行日志和统计输入

### 真源文件

- `workspace/MEMORY.md`
- `workspace/memory/*.md`
- `workspace/memory/README.md`
- `workspace/memory/TEMPLATE.md`
- `workspace/memory/ontology/schema.yaml`

### 验证方式或现有测试

- `workspace/scripts/memory_hub_plugin.test.cjs`
- `workspace/scripts/memory_hub_scope.test.cjs`
- `workspace/scripts/memory_hub_candidates.test.cjs`
- `workspace/scripts/memory_hub_promotion.test.cjs`
- `workspace/scripts/memory_hub_session_recall.test.cjs`
- `workspace/scripts/memory_hub_ontology.test.cjs`
- `workspace/scripts/memory_hub_index.test.cjs`
- `workspace/scripts/memory_hub_vector_cli.test.cjs`
- `workspace/scripts/memory_hub_vector_index.test.cjs`

### 维护注意事项

- 变更 schema、promotion 规则或 recall 行为时，不能只改插件代码，必须同步检查 `workspace/memory/README.md`、ontology schema 和测试。
- `graph.jsonl`、`history.jsonl`、SQLite 都是派生态；优先改生成逻辑，不要把它们当成手工主编辑面。
- 与 `MEMORY.md` 相关的能力设计，应继续维护“人类可读真源优先”的边界。

## `openclaw-context-engine`

### 作用

- 负责按 session 场景装配上下文。
- 处理 workspace 治理文档、可读记忆和会话上下文之间的拼装顺序。
- 作为 context engine slot 的正式实现，承接旧 compaction 体系的兼容装配。

### 代码/配置入口

- 代码入口：
  - `extensions/openclaw-context-engine/index.ts`
  - `extensions/openclaw-context-engine/src/context-engine.js`
  - `extensions/openclaw-context-engine/src/plugin.js`
- 元数据：
  - `extensions/openclaw-context-engine/openclaw.plugin.json`
  - `extensions/openclaw-context-engine/package.json`
- 配置装配：
  - `openclaw.json` 的 `plugins.slots.contextEngine`
  - `openclaw.json` 的 `plugins.entries.openclaw-context-engine`

### 运行时依赖或派生态

- 读取 `workspace/` 下治理文档、记忆和工作流说明
- 依赖当前 session、channel 和 agent 作用域
- 与 memory hub 的 recall 结果、shared session 安全裁剪策略耦合

### 真源文件

- `workspace/AGENTS.md`
- `workspace/ARCHITECTURE.md`
- `workspace/MEMORY.md`
- `workspace/workflows/clawvard-response-contract.md`

### 验证方式或现有测试

- `workspace/scripts/openclaw_context_engine.test.cjs`
- `workspace/scripts/openclaw_custom_governance.test.cjs`

### 维护注意事项

- 不要把临时脚本逻辑塞进 context engine；它应只负责装配规则和裁剪策略。
- 共享会话、私聊主会话、cron/subagent 的上下文边界要保持可审计。
- 如果改动影响 AGENTS / MEMORY 注入顺序，需要同时检查 `workspace/AGENTS.md` 和相关治理文档描述是否还准确。

## `openclaw-checkpoint-guardian`

### 作用

- 在长探索链路后注入 checkpoint 提醒。
- 在 reset 相关场景记录未落盘探索审计。
- 约束“探索太久但未沉淀”的风险。

### 代码/配置入口

- 代码入口：
  - `extensions/openclaw-checkpoint-guardian/index.ts`
  - `extensions/openclaw-checkpoint-guardian/src/plugin.js`
- 元数据：
  - `extensions/openclaw-checkpoint-guardian/openclaw.plugin.json`
  - `extensions/openclaw-checkpoint-guardian/package.json`
- 配置装配：
  - `openclaw.json` 的 `plugins.entries.openclaw-checkpoint-guardian`

### 运行时依赖或派生态

- 依赖会话中的探索计数、提醒冷却和 reset 相关信号
- 审计产物可能进入日志或治理面，但不应把核心规则散落到运行态目录

### 真源文件

- `workspace/ARCHITECTURE.md`
- `workspace/HEARTBEAT.md`
- `workspace/self_improve_process.md`

### 验证方式或现有测试

- `workspace/scripts/checkpoint_guardian.test.cjs`

### 维护注意事项

- 提醒阈值和 cooldown 逻辑应保持可配置，不要硬编码到其他通道插件或临时脚本。
- reset 审计如果新增落盘面，应优先补治理说明，再决定是否扩展运行态输出。

## `openclaw-clawvard-governor`

### 作用

- 注入本地 Clawvard 响应契约。
- 将本地评测导向的行为约束接到实际会话输出前。
- 作为“治理规则到运行时行为”的轻量桥接层。

### 代码/配置入口

- 代码入口：
  - `extensions/openclaw-clawvard-governor/index.ts`
  - `extensions/openclaw-clawvard-governor/src/plugin.js`
- 元数据：
  - `extensions/openclaw-clawvard-governor/openclaw.plugin.json`
  - `extensions/openclaw-clawvard-governor/package.json`
- 配置装配：
  - `openclaw.json` 的 `plugins.entries.openclaw-clawvard-governor`
  - `openclaw.json` 的 `contractPath`

### 运行时依赖或派生态

- 读取 `workspace/workflows/clawvard-response-contract.md`
- 与 `workspace/clawvard-eval/` 的评测目标相互校准

### 真源文件

- `workspace/workflows/clawvard-response-contract.md`
- `workspace/clawvard-eval/README.md`
- `workspace/AGENTS.md`

### 验证方式或现有测试

- `workspace/scripts/clawvard_governor.test.cjs`
- `workspace/scripts/clawvard_eval.test.cjs`

### 维护注意事项

- 这个扩展不应变成“第二份 AGENTS 规则”；它负责注入契约，不负责维护所有治理文本。
- 如果评测维度变化，优先更新 `workspace/clawvard-eval/` 和 contract 文档，再同步 governor 逻辑。

## `openclaw-qqbot`

### 作用

- 提供 QQ 通道接入层。
- 处理 inbound/outbound 消息、引用上下文、媒体、语音、主动消息、slash commands、会话存储和投递保护。
- 把 OpenClaw 能力暴露到 QQ，但不把 QQ 业务规则泄漏到全局治理层。

### 代码/配置入口

- 代码入口：
  - `extensions/openclaw-qqbot/index.ts`
  - `extensions/openclaw-qqbot/src/channel.ts`
  - `extensions/openclaw-qqbot/src/gateway.ts`
  - `extensions/openclaw-qqbot/src/proactive.ts`
  - `extensions/openclaw-qqbot/src/slash-commands.ts`
  - `extensions/openclaw-qqbot/src/stt.ts`
  - `extensions/openclaw-qqbot/src/context-hints.ts`
  - `extensions/openclaw-qqbot/src/ref-index-store.ts`
  - `extensions/openclaw-qqbot/src/tools/channel.ts`
  - `extensions/openclaw-qqbot/src/tools/remind.ts`
- 元数据：
  - `extensions/openclaw-qqbot/openclaw.plugin.json`
  - `extensions/openclaw-qqbot/clawdbot.plugin.json`
  - `extensions/openclaw-qqbot/moltbot.plugin.json`
  - `extensions/openclaw-qqbot/package.json`
- 配置装配：
  - `openclaw.json` 的 `channels.qqbot`
  - `openclaw.json` 的 `bindings`
  - `openclaw.json` 的 `plugins.entries.qqbot`
  - `openclaw.json` 的音频 CLI 配置

### 运行时依赖或派生态

- `qqbot/` 下载、缓存、session、ref-index 等运行态目录
- `delivery-queue/`、`media/` 等消息和附件相关运行态目录
- QQ 平台凭据、gateway、主动消息和 cron 能力
- 语音识别依赖根 `scripts/qwen_asr_cli.mjs`

### 真源文件

- `extensions/openclaw-qqbot/src/*.ts`
- `extensions/openclaw-qqbot/README.md`
- `extensions/openclaw-qqbot/README.zh.md`
- `extensions/openclaw-qqbot/openclaw.plugin.json`

### 验证方式或现有测试

- `workspace/scripts/qqbot_context_hints.test.cjs`
- `workspace/scripts/qqbot_internal_messages.test.cjs`
- `workspace/scripts/qqbot_outbound_guardrails.test.cjs`
- `cd extensions/openclaw-qqbot && npm run build`

### 维护注意事项

- `dist/` 和 `node_modules/` 不作为主编辑面；优先改 `src/` 再构建。
- QQ 凭据、下载缓存、附件和用户数据默认按敏感运行态处理。
- 变更消息、提醒、媒体或主动消息行为时，应同时检查通道边界、投递保护和运行态兼容。

## `self-improvement`

### 作用

- 在 agent bootstrap 时注入“自我提升”提醒。
- 把学习、纠错、复盘引回 canonical 治理文件。

### 代码/配置入口

- `hooks/self-improvement/handler.ts`
- `hooks/self-improvement/handler.js`
- `hooks/self-improvement/HOOK.md`
- `openclaw.json` 的 `hooks.internal.entries.self-improvement`

### 运行时依赖或派生态

- 依赖 bootstrap 事件
- 依赖 `workspace/self_improve_*.md`

### 真源文件

- `workspace/self_improve_process.md`
- `workspace/self_improve_todo.md`
- `workspace/self_improve_status.md`
- `workspace/self_improve_quality.md`

### 验证方式或现有测试

- `hooks/self-improvement/handler.test.cjs`
- `workspace/scripts/validate-self-improve.cjs`
- `workspace/scripts/validate-self-improve.test.cjs`

### 维护注意事项

- hook 只负责提醒和注入，不要把复杂执行迁回这里。
- 自我提升流程唯一 SOP 仍是 `workspace/self_improve_process.md`。

## `task-ack`

### 作用

- 收到像任务的消息时，先发简短接收确认。
- 满足本地“开始做 X 了”的交互偏好。

### 代码/配置入口

- `hooks/task-ack/handler.ts`
- `hooks/task-ack/handler.js`
- `hooks/task-ack/HOOK.md`
- `openclaw.json` 的 `hooks.internal.entries.task-ack`

### 运行时依赖或派生态

- 依赖 `message:received` 事件
- 主要作用于 direct chat 和任务型消息

### 真源文件

- `workspace/MEMORY.md`
- `workspace/AGENTS.md`
- `hooks/task-ack/HOOK.md`

### 验证方式或现有测试

- `hooks/task-ack/handler.test.cjs`

### 维护注意事项

- 保持消息短、事实化，不要把真正执行逻辑塞进回执 hook。
- 如果任务判断启发式需要调整，应优先维持“减少噪音”而不是“全量命中”。
