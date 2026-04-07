# 治理资产

本页记录 `workspace/` 中支撑本地个性化能力层的治理资产。它们并不一定直接执行能力，但定义了能力如何被维护、验证、约束和重建。

## 治理资产分层

### 1. 全局治理文档

这些文件定义“系统如何被维护”：

- `workspace/AGENTS.md`
- `workspace/ARCHITECTURE.md`
- `workspace/hindsight_guide.md`
- `workspace/HEARTBEAT.md`
- `workspace/TOOLS.md`
- `workspace/VENDOR.md`

角色：

- `AGENTS.md`：bootstrap 与运行规则
- `ARCHITECTURE.md`：分层、真源/派生态、能力关系
- `hindsight_guide.md`：当前 Hindsight durable memory 部署形态、模型拆分和运维入口
- `HEARTBEAT.md`：心跳执行清单
- `TOOLS.md`：本地工具与操作侧知识
- `VENDOR.md`：mixed ownership / vendor 内容治理

## 2. 记忆治理面

这些文件定义“长期事实如何记录、抽取、提升和检索”：

- `workspace/MEMORY.md`
- `workspace/memory/README.md`
- `workspace/memory/TEMPLATE.md`
- `workspace/memory/*.md`
- `workspace/memory/ontology/schema.yaml`

角色：

- `MEMORY.md`：长期沉淀的人类可读真源
- `memory/*.md`：按日记录原始事实
- `README.md` / `TEMPLATE.md`：格式、promotion、indexing 规则
- `ontology/schema.yaml`：ontology 真源 schema

边界：

- `workspace/memory/history.jsonl`、`workspace/memory/inbox/*.jsonl`、`workspace/memory/ontology/graph.jsonl` 是派生态，不是人工主编辑面
- 根 `memory/*.sqlite` 是检索层，不是事实真源

## 3. 自我提升治理面

这些文件定义“自我提升如何执行、记录与校验”：

- `workspace/self_improve_process.md`
- `workspace/self_improve_todo.md`
- `workspace/self_improve_status.md`
- `workspace/self_improve_quality.md`

角色：

- `self_improve_process.md`：唯一 SOP
- `self_improve_todo.md`：待办池
- `self_improve_status.md`：进行中或状态流转
- `self_improve_quality.md`：质量结论、经验和验证结果

与 hook 的关系：

- `hooks/self-improvement` 只负责提醒
- 实际治理和校验由这些文档与 `workspace/scripts/validate-self-improve.cjs` 承担

## 4. 工作流 Playbook

`workspace/workflows/` 是轻量工作流说明区，不是事实真源区。

当前关键条目：

- `clawvard-response-contract.md`
- `self-improve-loop.md`
- `skills-governance.md`
- `automation-templates.md`
- `document-automation.md`
- `moltbook-routine.md`
- `search-scrape-stack.md`
- `temp-files-policy.md`

角色：

- 定义协作约束、执行套路、自动化模板和治理 playbook
- 给扩展、hook、脚本和人工维护提供统一参考

维护边界：

- 工作流文件是操作性说明，不替代 `ARCHITECTURE.md`、`MEMORY.md` 或 `self_improve_process.md`
- 如果某条 workflow 已经变成正式机制，应在 canonical 文档中补入口，而不是只留在 playbook

## 5. 治理脚本

`workspace/scripts/` 是 first-party 治理脚本与测试脚本集中区。

### 核心家族

#### Memory Hub / Recall / Vector

- `memory_hub_*.test.cjs`
- `memory_hub_vector.cjs`
- `memory_hub_log_summary.cjs`

作用：

- 为 memory hub 提供回归测试、辅助索引操作和日志汇总

#### Context / Checkpoint / Governor / Guardrails

- `openclaw_context_engine.test.cjs`
- `checkpoint_guardian.test.cjs`
- `clawvard_eval.cjs`
- `clawvard_eval.test.cjs`
- `clawvard_governor.test.cjs`
- `tooling_guardrails.cjs`
- `tooling_guardrails.test.cjs`

作用：

- 约束上下文装配、Checkpoint 提醒、Clawvard 评测与本地工具 fallback 行为

#### Self-improve / Hygiene / Config Sync

- `validate-self-improve.cjs`
- `openclaw_hygiene_audit.cjs`
- `rebaseline_config_health.cjs`
- `sync_qwen_config.cjs`

作用：

- 校验自我提升治理文件
- 审计仓库卫生和安全归档
- 修复配置健康基线
- 把 `openclaw.json` 中的 Qwen 配置同步到派生配置面

#### Control UI / QQ 通道补丁

- `sync_control_ui_local.cjs`
- `patch_control_ui_slash_enter.cjs`
- `patch_control_ui_compact_command.cjs`
- `patch_qq_compact_urgent.cjs`

作用：

- 重建本地 patched control UI
- 修复 slash-enter、`/compact` 和 QQ 紧急命令回归

#### Moltbook / 其他本地自动化

- `moltbook_automation.cjs`
- `moltbook_automation.test.cjs`

作用：

- 维护 Moltbook / Moltcn 自动化例行任务

### 脚本区的维护规则

- 新脚本优先放这里，不要散落到根目录
- 会改变治理规则的脚本，必须在对应 canonical 文档里留入口
- `*.test.cjs` 是能力层的重要回归面，不要把测试逻辑藏进运行态目录

## 6. 本地评测资产

`workspace/clawvard-eval/` 是 Clawvard 风格 8 维本地评测 harness。

核心内容：

- `cases.json`
- `responses.template.json`
- `README.md`

角色：

- 为本地响应契约、提示调优、工具行为和工作流优化提供可比较基线
- 与 `openclaw-clawvard-governor` 和 `workspace/workflows/clawvard-response-contract.md` 相互校准

维护边界：

- 它是评测资产，不是运行态缓存
- baseline / post-change 响应文件属于对比材料，但不替代 contract 本身

## 7. 本地 Control UI 副本

`workspace/control-ui-local/` 是本地 patched UI root。

角色：

- 承载对 control UI 的本地补丁结果
- 被 `openclaw.json.gateway.controlUi.root` 引用
- 由 `sync_control_ui_local.cjs` 和 patch 脚本维护

维护边界：

- 它是本地副本和交付面，不是最上游源码真源
- 改动时优先走同步脚本和 patch 脚本，不建议手工长期维护生成资产

## 资产关系图

```text
workspace/AGENTS.md
        │
        ├─ 约束 context engine / governor / task-ack
        ├─ 指向 MEMORY.md / self_improve_*.md / workflows
        │
workspace/ARCHITECTURE.md
        ├─ 定义分层与真源边界
        └─ 约束扩展、hook、脚本如何落位

workspace/MEMORY.md + workspace/memory/*
        └─ 由 memory hub 读取并派生检索层

workspace/self_improve_*.md
        └─ 由 self-improvement hook 提醒、由治理脚本校验

workspace/workflows/*
        └─ 为 governor、automation、临时文件规则和技能治理提供 playbook

workspace/scripts/*
        ├─ 校验扩展与治理面
        ├─ 修补 control UI / QQ 行为
        └─ 维护本地自动化与卫生
```

## 维护建议

- 如果某项功能属于“规则和治理”，优先归入 `workspace/`。
- 如果某项内容已经只剩运行产物，不要继续把它写进治理文档主体。
- 更新扩展逻辑时，先看对应 canonical 文档是否需要同步更新，再补测试或脚本说明。
