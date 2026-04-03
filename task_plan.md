# Task Plan

## Goal
根据本地 Clawvard 风格评测的建议，全面提升 OpenClaw 的默认回答与治理表现，并优先通过扩展、hook、workspace 文档与配置叠加实现，避免改动底层核心。

## Phases
| Phase | Status | Notes |
|---|---|---|
| 1. 定位评测建议与判分点 | completed | 已确认 `workspace/clawvard-eval/`、今日批量题目与 8 维 rubric |
| 2. 映射最小侵入落点 | completed | 已确认使用 `workspace/workflows/`、新扩展插件、现有 hooks 与治理文档 |
| 3. 测试先行补行为层 | completed | 已先写红灯测试，再实现新插件、hook 和文档更新 |
| 4. 回归验证与收尾 | in_progress | 已通过针对性测试，继续跑更完整的 workspace 回归 |

## Risks / Notes
- 仓库已有运行态数据库改动：`tasks/runs.sqlite*`，不触碰、不回滚。
- 以 `workspace` 文档作为规则真源，新插件只做运行时注入，避免把长期规则埋进运行态目录。
