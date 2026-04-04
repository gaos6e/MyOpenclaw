# OpenClaw Repository Guide

本文件面向在 `C:\Users\20961\.openclaw` 中工作的 Claude/Codex 类代码代理，不是通用 README。这个仓库不是“尽量贴近上游、少做本地化”的纯净副本，而是以 OpenClaw 为底座，长期承载个性化设计、治理规则、记忆系统、自我提升闭环、上下文装配能力和额外插件集成的本地工作区。后续实现应以“可持续定制、可审计、可升级、可回退”为目标，而不是把能力零散塞进运行态目录。

## 仓库定位
- 这是一个“上游 OpenClaw + 本地个性化能力层”的仓库；记忆系统、自我提升系统、上下文工程、checkpoint 提醒、QQBot 与企业协同插件都属于正式能力面，不是临时脚本。
- 个性化定制是本仓库的一等需求，但实现方式必须保持边界清晰，避免把长期逻辑埋进 `agents/`、`memory/`、`cron/` 之类运行态目录。
- 设计优先级固定为：升级兼容 > 明确边界 > 可恢复 > 可测试 > 可观察 > 局部便利。
- 若用户提出的做法看起来合理，也不要直接照做；先核对仓库现状、已有机制和更稳的替代实现，确认没有明显更优方案后再沿用。

## 实现优先路径
针对 OpenClaw 的个性化能力，默认按以下优先顺序落地：

1. `extensions/`：新增正式能力、通道、上下文能力、记忆能力、工具能力。
2. `hooks/`：只做轻量触发、提醒、bootstrap 注入，不承载复杂主流程。
3. `workspace/scripts/`：first-party 治理脚本、维护脚本、审计脚本、适配脚本。
4. `workspace/*.md` 与 `workspace/workflows/`：规则、SOP、治理状态、长期说明。
5. 根目录运行态目录：仅在任务明确要求修复、迁移、恢复或审计时触碰。

如果某项能力既可以写成“直接改 session/state 文件”，也可以写成“插件、脚本或治理文档驱动的增量实现”，优先后者。

## 目录分层与边界

### 1. Runtime / State Layer
以下目录位于仓库根目录，默认视为本地运行态、缓存、会话或派生状态，不作为长期代码主编辑面：

- `agents/`：agent runtime、profiles、sessions、派生配置
- `identity/`：设备身份与本地认证状态
- `memory/`：检索索引、SQLite、向量缓存
- `cron/`：本地定时任务定义与运行记录
- `devices/`：设备配对与待处理状态
- `qqbot/`：QQBot 下载、缓存、运行数据
- `logs/`、`media/`、`delivery-queue/`：运行输出与本地状态

约束：
- 这些目录默认“读多写少”；除非任务明确要求，不要把新规则、新业务逻辑或长期配置沉淀到这里。
- 修复运行态问题时优先采用可回放、可重建、可备份的方案，不要把人工编辑运行态文件当成默认实现路径。
- 任何涉及 `agents/*/sessions/*.jsonl`、`memory/*.sqlite`、`qqbot/downloads`、`identity/*` 的修改，都要先判断是否属于恢复/迁移类任务；若不是，通常不应直接写入。

### 2. Governance / Workspace Layer
`workspace/` 是长期维护的主工作区和治理层，优先承载以下内容：

- 文档真源：`AGENTS.md`、`ARCHITECTURE.md`、`MEMORY.md`、`self_improve_*.md`、`HEARTBEAT.md`
- first-party 脚本：`workspace/scripts/`
- 规则与工作流：`workspace/workflows/`
- 人类可读记忆：`workspace/memory/`
- 技能与混合所有权目录说明：`workspace/skills/`、`VENDOR.md`

约束：
- 新的治理脚本优先放到 `workspace/scripts/`，不要散落到仓库根目录。
- 新规则若会影响日常运行、记忆、自我提升、临时文件管理或技能治理，必须在 `workspace/` 的对应文档留入口说明。
- 若改动会影响本地 first-party 个性化能力层的结构、职责、装配入口、治理关系或主机级入口脚本，必须同步更新 `workspace/local-customization-layer/` 下对应文档；若影响总览范围或阅读导航，再同步更新根目录 `LOCAL_CUSTOMIZATION_LAYER.md`。
- `workspace/` 中的 Markdown 文档不是装饰物；它们是个性化能力层的正式治理面。

### 3. Extension / Hook Layer
以下目录是 OpenClaw 个性化能力的正式扩展层：

- `extensions/hindsight-openclaw`：主 runtime durable memory backend（Hindsight）
- `extensions/openclaw-memory-hub`：本地辅助层（local archive candidates、ontology、session recall、aux vector）
- `extensions/openclaw-context-engine`：session-aware 上下文装配
- `extensions/openclaw-checkpoint-guardian`：长探索链路提醒与 reset 审计
- `extensions/openclaw-qqbot`：QQBot 通道、技能、主动消息、cron 能力
- 其他通道与组织集成：`extensions/wecom`、`extensions/dingtalk`、`extensions/openclaw-weixin` 等
- `hooks/self-improvement`、`hooks/task-ack`：轻量 bootstrap / ack hook

约束：
- 新能力优先做成独立扩展，而不是把不相关逻辑继续堆进已有插件。
- 一个扩展只负责一个清晰能力边界；不要做“万能插件”。
- Hook 只做轻量注入、提醒、信号转发；复杂业务逻辑下沉到扩展或 `workspace/scripts/`。
- 若一个需求需要“规则 + 逻辑 + 状态”，推荐拆成：扩展负责执行，workspace 文档负责规则，运行态目录负责派生状态。

### 4. Vendor / Archive / Mixed Ownership
以下内容默认不作为 first-party 主编辑面：

- `workspace/skills/`：mixed ownership，很多目录是 vendor copy 或安装产物
- `workspace/_tmp*`、根目录 `backup/`、`backups/`
- `extensions/.openclaw-install-backups/`、`extensions/_quarantine_*`
- 各类 `node_modules/`、生成目录 `dist/`

约束：
- 修改这些目录前先确认是否真的需要；能通过源文件、重新生成或隔离修复解决，就不要直接改产物。
- 默认不要在 `dist/`、`node_modules/`、备份目录中做人工长期维护。

## 真源与派生态

### 人工维护真源
以下内容是人工可读、可维护、应优先更新的事实真源：

- `workspace/MEMORY.md`
- `workspace/memory/YYYY-MM-DD.md`
- `workspace/self_improve_process.md`
- `workspace/self_improve_todo.md`
- `workspace/self_improve_status.md`
- `workspace/self_improve_quality.md`
- `workspace/ARCHITECTURE.md`
- 根目录 `openclaw.json` 作为本地 runtime config 入口

### 派生 / 可重建状态
以下内容默认视为派生态、缓存、索引或运行时快照：

- `memory/main.sqlite`
- `memory/main.v2.sqlite` 及其 `-wal` / `-shm`
- `memory/aux-vector-index.json`
- `workspace/memory/ontology/graph.jsonl`
- `workspace/memory/history.jsonl`
- `workspace/memory/inbox/*.jsonl`
- `workspace/memory/index-manifest.json`
- `agents/*/sessions/*`
- `agents/*/agent/*`

约束：
- 不要把派生态文件当成主要人工编辑面。
- 记忆系统相关修改优先调整扩展逻辑、schema、治理文档和生成流程，再重建或回填派生态。
- 当 `openclaw.json` 与 `agents/main/agent/*` 出现重叠概念时，以 runtime config 的设计意图为先，谨慎处理派生态同步。

## 个性化能力实现约束

### 记忆系统
- 记忆层分为“人类可读记忆”和“检索/索引记忆”；两者职责不能混淆。
- 人类可读事实默认写入 `workspace/memory/*.md` 或 `workspace/MEMORY.md`；不要把长期事实只写进 SQLite / JSONL / 云端派生层。
- `hindsight-openclaw` 负责主 runtime durable memory；`openclaw-memory-hub` 负责本地辅助 recall / ontology / candidate extraction，避免把两者职责混写。
- 修改记忆 schema、promotion 规则、session scope、回填或索引行为时，要同步考虑 `workspace/memory/README.md`、ontology schema、索引清单与测试。

### 自我提升系统
- `hooks/self-improvement` 只负责 bootstrap 提醒，不负责复杂执行。
- 自我提升的唯一 SOP 在 `workspace/self_improve_process.md`；不要再创建第二套并行流程文档。
- 待做、状态、质量结论分别落到 `self_improve_todo.md`、`self_improve_status.md`、`self_improve_quality.md`，不要混写。
- 如果实现改变了复盘节奏、状态流转、治理校验或心跳协作方式，必须同步更新文档与校验脚本。

### 上下文与探索保护
- `openclaw-context-engine` 负责 session-aware 上下文装配；shared session 默认遵守安全裁剪。
- `openclaw-checkpoint-guardian` 负责长探索链路后的提醒与 reset 审计。
- 这类能力优先通过扩展组合实现，不要把上下文拼装、提醒阈值或 checkpoint 规则硬编码进某个临时脚本或单一通道插件。

### 通道与外部协同插件
- QQ、微信、企微、钉钉等通道能力应保持通道边界清晰，避免把某个通道的业务规则泄漏到全局治理层。
- 外部协同插件要显式声明配置、技能、依赖与能力边界；若需要技能目录、脚本或额外文档，保持结构自洽。
- 新增通道或工具插件时，优先复用仓库已有插件模式：`package.json` + `openclaw.plugin.json` + `src/` + 必要时的 `skills/`。

## 插件与 Hook 开发规范
- 扩展目录应保持清晰结构：入口文件、`openclaw.plugin.json`、`src/`、必要时的 `skills/`、`scripts/`。
- `openclaw.plugin.json` 中的 `id`、`kind`、`name`、`description` 与 `configSchema` 应稳定、明确，避免模糊命名。
- TypeScript / JavaScript 源文件以 `src/` 为主，生成产物若存在于 `dist/`，优先通过构建产出，不要手改生成文件。
- 同一扩展内的新增实现应延续已有模块边界，例如 memory hub 下继续按 `candidates`、`ontology`、`session-recall`、`runtime-paths` 等职责拆分。
- Hook 不应复制插件逻辑，也不应把治理规则硬编码成大量条件分支。
- 修改插件行为时，如会影响使用方式、配置或治理流程，需补充 README、工作流文档或相关说明。

## 脚本、配置与文件放置规则
- first-party 可复用脚本一律优先放在 `workspace/scripts/`。
- 根目录 `scripts/` 更偏向主机级、启动级或本地运维脚本；除非是明确的本机运行入口，否则不要继续往根目录散落新脚本。
- 会影响治理的脚本必须在对应文档中留入口，例如记忆、自我提升、卫生审计、配置同步。
- 临时文件不要长期留在仓库热区；遵循现有工作流约定进行隔离清理。
- 避免把个人路径、机器特定值、一次性实验参数硬编码进源码或共享文档。

## 代码风格与命名
- JS/TS 保持现有风格：2 空格缩进、分号、双引号。
- `extensions/`、`hooks/` 中保持 ESM 风格；`workspace/scripts/` 与测试延续 CommonJS `.cjs` 约定。
- 测试命名沿用现有模式，例如 `memory_hub_scope.test.cjs`、`openclaw_context_engine.test.cjs`、`checkpoint_guardian.test.cjs`。
- 修改生成资产前先确认是否能从源文件重建；尤其不要把 `dist/` 当作主编辑面。

## 测试与验证
常用验证命令：

- `cd workspace && npm test`
- `cd workspace && npm run validate:self-improve`
- `cd extensions/openclaw-qqbot && npm run build`
- `git config core.hooksPath .githooks`

约束：
- 修改 `workspace/scripts/`、`hooks/`、memory hub/context engine/checkpoint guardian 等共享能力时，必须补充或更新对应 `*.test.cjs` 回归测试。
- 修改 QQBot 插件时，至少确保构建通过；若改动涉及消息、附件、提醒、主动发送或运行态兼容，补充针对性验证。
- 不要声称“已验证”却没有实际执行命令；交付时应说明跑了哪些命令、哪些未跑以及原因。

## 升级兼容
- 优先采用 additive integration：在 `extensions/`、`hooks/`、`workspace/` 叠加能力，而不是直接改 OpenClaw 核心内部。
- 个性化设计必须服务于“上游可继续升级”，不能把仓库锁死在一次性的核心补丁上。
- 若核心改动不可避免，必须做到：
  - 隔离改动位置
  - 说明原因与替代方案为何不可行
  - 记录升级后需要复查的项目
  - 尽量提供回滚或重建路径
- 涉及 `openclaw.json`、agent 派生态配置、cron、memory schema、通道插件依赖时，要额外评估升级后的兼容性。

## 安全与本地状态
- 不要提交 secrets、tokens、账号数据、设备身份信息或机器专属状态。
- `.env`、`openclaw.json`、运行态目录、缓存、下载附件、索引数据库默认按敏感或本地状态处理。
- 需要分享或记录配置示例时，先去标识化、去凭据、去个人路径。
- 对 `qqbot/` 下载缓存、`identity/`、`agents/*/sessions/*` 的处理要格外谨慎，除非任务明确要求，否则不要移动、清空或公开内容。

## 提交与评审约定
- 手工提交建议使用短而明确的祈使句，可加 area prefix，例如 `memory-hub: tighten session scope`、`docs: clarify runtime boundaries`。
- PR 或交付说明应包含变更范围、原因、验证命令和必要截图或示例。
- 禁止引入 git submodule；仓库已通过 hook 阻止 gitlink 误提交。

## 非目标
- 不要把本仓库重写成与当前运行环境脱节的“理想化新项目骨架”。
- 不要把个性化能力重新降级为散装脚本。
- 不要为了短期方便，破坏记忆、自我提升、上下文治理和升级兼容之间已经形成的边界。
