# openclaw Workspace

`workspace/` 是这个仓库里长期维护的主工作区。根目录偏向 runtime/state，这里偏向文档、治理规则、脚本和可复用配置。

## Start Here

- [`AGENTS.md`](./AGENTS.md): bootstrap 入口和高层运行规则
- [`SOUL.md`](./SOUL.md): 助手的人格与协作风格
- [`USER.md`](./USER.md): 用户偏好和沟通方式
- [`MEMORY.md`](./MEMORY.md): 长期沉淀记忆
- [`HEARTBEAT.md`](./HEARTBEAT.md): 心跳执行清单
- [`self_improve_process.md`](./self_improve_process.md): 自我提升唯一 SOP

## Architecture

- [`ARCHITECTURE.md`](./ARCHITECTURE.md): 系统分层、状态边界、机制关系
- [`VENDOR.md`](./VENDOR.md): vendor/imported 内容治理规则

## Working Sets

- [`memory/README.md`](./memory/README.md): daily memory 规范、模板、沉淀规则
- [`scripts/README.md`](./scripts/README.md): first-party runtime helper 脚本说明
- [`workflows/README.md`](./workflows/README.md): 本地工作流清单
- [`skills/README.md`](./skills/README.md): skills 目录治理与所有权规则

## Boundary

- 根目录的 `agents/`, `identity/`, `memory/`, `cron/`, `devices/`, `qqbot/` 视为 local runtime/state 区。
- `workspace/` 里的治理文档、脚本、模板和可复用配置优先纳入版本控制。
- daily memory、`.learnings`、workspace state、临时文件和 vendor app 维持本地状态，不作为长期代码面维护。
