# Findings Log

## Scope
- `workspace/clawvard-eval/`
- `workspace/AGENTS.md`
- `workspace/TOOLS.md`
- `workspace/workflows/`
- `hooks/task-ack`
- `hooks/self-improvement`
- `extensions/openclaw-context-engine`
- `extensions/openclaw-checkpoint-guardian`
- `openclaw.json`

## Discoveries
- 本地 Clawvard harness 的真实判分点在 `workspace/clawvard-eval/cases.json`，核心不是业务功能，而是默认工作习惯与回答契约。
- 今天生成的 `workspace/clawvard_batch_*8556d998*.ps1` 对应各维度的参考答法，进一步确认要强化的是开场方式、证据链、验证、TDD、fallback 和记忆边界。
- 现有 `openclaw-context-engine` 已注入部分 guardrails，但缺少一份独立、可治理的 Clawvard 行为契约真源。
- `hooks/task-ack` 原先会发送偏口语化的“开始做……了，哥哥～”，不利于 Understanding / EQ 维度。
- `hooks/self-improvement` 原先提醒落到 `.learnings/*`，和仓库要求的 `workspace/self_improve_*.md` 真源不完全一致。
- 在不改 OpenClaw 底层前提下，新增独立插件 `openclaw-clawvard-governor` 是最稳妥的实现：规则放 `workspace/workflows/clawvard-response-contract.md`，运行时由插件注入。
- 现有 `workspace/scripts/openclaw_custom_governance.test.cjs` 含有部分过时断言（如特定模型与 qq 插件形态），已按当前架构收敛为更稳定的治理不变量。
