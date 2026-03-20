# Findings & Decisions

## Requirements
- 对 openclaw 做全面架构审计，不局限于代码实现。
- 重点检查机制设计是否合理、是否标准、是否易维护。
- 重点覆盖记忆系统、自我提示机制、整体架构，以及其他机制。
- 同时检查各类 `md` 和其他文档内容是否规范、是否需要优化。
- 最终输出要逐项、详细、可执行。

## Research Findings
- 仓库顶层呈现明显的“本地智能体运行时/数据目录”形态，而不是单一应用源码仓库；包含 `agents`、`memory`、`identity`、`cron`、`hooks`、`extensions`、`workspace`、`delivery-queue`、`browser` 等运行态目录。
- 根目录 `README.md` 极短，极可能无法承担系统入口文档职责。
- 仓库中存在大量运行时状态、备份、浏览器用户数据、session 日志、node_modules，这意味着审计时必须区分“源代码/配置”和“运行产物”。
- `openclaw.json` 承担了大量系统级职责：模型提供商、代理默认参数、记忆检索、上下文裁剪、压缩、心跳、工具权限、网关、渠道、技能环境、插件安装元数据都集中在单文件里。
- `openclaw.json` 中直接出现真实 `apiKey`，说明敏感配置与普通运行配置尚未有效分层。
- 目录 `workspace` 同时包含人格/身份文档、长期记忆文档、技能、项目副本、node_modules、临时资源和外部项目，表明“代理知识工作区”和“用户项目工作区”未完全解耦。
- `agents/main/agent/models.json` 复制了模型提供商配置，与根 `openclaw.json` 形成并行配置面。
- `agents/main/agent/auth-profiles.json` 包含完整 OAuth access token、refresh token 与账号信息。
- `identity/device.json` 包含设备私钥，`identity/device-auth.json` 包含 operator token；这些敏感内容与普通运行目录同级存放。
- `hooks/self-improvement` 的作用仅是 bootstrap 注入一段提醒文本，本身不执行“学习/归档/校验”动作，属于“提示型 hook”而非“机制型 hook”。
- `workspace` 下的 `AGENTS.md`、`SOUL.md`、`MEMORY.md`、`HEARTBEAT.md`、`IDENTITY.md`、`self_improve_*` 文档共同形成“自我提示与行为治理层”，但目前主要靠文本约定驱动。
- `workspace/package.json` 声明 `type: commonjs`，但 `workspace/scripts/mem0_capture.js` 与 `mem0_bridge.js` 使用 ESM `import` + top-level `await`；实测 Node 24 直接报 `Cannot use import statement outside a module`，说明 Mem0 桥接当前不可执行。
- Memory SQLite 中确有混合索引：`files` 表显示 `memory=7`、`sessions=2`，`chunks` 表显示 `memory=19`、`sessions=327`；说明 session 记忆已接入，但文件覆盖范围与当前 39 个 session 文件数量不成比例，索引覆盖策略不透明。
- `workspace/memory/*.md` 的实际写法不稳定：有的带标题，有的不带；有的出现字面量 `\\n`；粒度和格式不一致，不利于后续索引、人工审阅和长期维护。
- `workspace` 下大量关键治理文件和脚本（`MEMORY.md`、`.learnings/*`、`memory/*`、`scripts/*`、`self_improve_*`、`workflows/*`、`skills/*` 等）当前均为未纳入版本控制状态。
- QQBot 插件的代码层结构总体较清晰，`config.ts`、`gateway.ts`、`api.ts`、`session-store.ts`、`ref-index-store.ts` 分层明显；这是仓库中相对标准的一块。
- QQBot README 写明支持环境变量 `QQBOT_APPID` / `QQBOT_SECRET`，但实现实际读取的是 `QQBOT_APP_ID` / `QQBOT_CLIENT_SECRET`，存在直接的文档-实现偏差。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 把仓库视作“系统运行目录”来评估 | 顶层目录包含大量状态与运行数据，而非单纯源码 |
| 先做结构分层，再深入机制 | 没有先建立系统边界就评价机制，结论会失真 |
| 将安全与边界问题单列为高优先级 | 已发现明文密钥、token、私钥，不应与一般可维护性问题混为一谈 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| 全量递归文件列表过大且包含大量依赖与浏览器数据 | 后续改为按目录分批读取，并过滤明显的运行产物 |
| 审计对象同时包含核心系统和工作区内容，边界较混杂 | 后续在结论中区分“运行时核心问题”和“工作区治理问题” |
| SQLite 中 `vec0` 虚拟表无法在当前 Python sqlite 环境直接读取 | 退而改用普通表与元数据交叉验证索引结构 |

## Resources
- `C:\Users\20961\.openclaw\openclaw.json`
- `C:\Users\20961\.openclaw\README.md`
- `C:\Users\20961\.openclaw\agents`
- `C:\Users\20961\.openclaw\memory`
- `C:\Users\20961\.openclaw\identity`
- `C:\Users\20961\.openclaw\hooks`
- `C:\Users\20961\.openclaw\extensions`

## Visual/Browser Findings
- 暂无。
