# 本地个性化能力层总览

这个文档是根目录入口，不是唯一真源。

本仓库的长期治理面仍然优先放在 `workspace/`。这里的职责是把“本地个性化能力层”整体说明清楚，并把读者导向真正可维护的分拆文档。

## 这份总览覆盖什么

纳入范围的内容：

- `extensions/` 下的本地 first-party 扩展
- `hooks/` 下的本地 first-party hook
- `workspace/` 下与个性化能力层直接相关的治理文档、脚本、工作流、评测与本地 UI 副本
- [`openclaw.json`](./openclaw.json) 中承载本地能力装配、agent/workspace 拓扑、hook/plugin 开关的配置面
- 根目录和 [`scripts/`](./scripts/) 下少量主机级入口脚本

明确排除的内容：

- 根 `skills/` 与 `workspace/skills/`
- `mcp` / skills 的官方支持安装产物与第三方 vendor 内容
- `node_modules/`、`dist/`、备份目录、缓存目录
- `agents/`、`memory/`、`cron/`、`qqbot/`、`identity/` 等运行态/派生态目录中的实现细节

这些排除项仍然会在文档中作为“依赖面”或“边界面”被提到，但不会被登记为本地能力层代码真源。

## 能力层结构

```text
根目录入口
├─ openclaw.json                 本地运行装配与多 workspace 拓扑
├─ gateway*.{cmd,ps1,vbs}        主机级网关启动入口
├─ scripts/                      主机级辅助脚本
├─ extensions/                   正式扩展层
│  ├─ openclaw-memory-hub
│  ├─ openclaw-context-engine
│  ├─ openclaw-checkpoint-guardian
│  ├─ openclaw-clawvard-governor
│  └─ openclaw-qqbot
├─ hooks/                        轻量 hook 层
│  ├─ self-improvement
│  └─ task-ack
└─ workspace/                    治理真源层
   ├─ ARCHITECTURE.md
   ├─ hindsight_guide.md
   ├─ MEMORY.md / memory/
   ├─ self_improve_*.md
   ├─ workflows/
   ├─ scripts/                   包含本地 Hindsight runtime 启停脚本
   ├─ clawvard-eval/
   └─ control-ui-local/
```

## 推荐阅读顺序

1. [`workspace/local-customization-layer/README.md`](./workspace/local-customization-layer/README.md)
2. [`workspace/local-customization-layer/extensions-and-hooks.md`](./workspace/local-customization-layer/extensions-and-hooks.md)
3. [`workspace/local-customization-layer/governance-assets.md`](./workspace/local-customization-layer/governance-assets.md)
4. [`workspace/local-customization-layer/config-topology-and-entrypoints.md`](./workspace/local-customization-layer/config-topology-and-entrypoints.md)
5. [`workspace/local-customization-layer/inventory.md`](./workspace/local-customization-layer/inventory.md)

## 分拆文档说明

- [`workspace/local-customization-layer/README.md`](./workspace/local-customization-layer/README.md)
  - 范围、原则、真源/派生态边界、排除项与导航
- [`workspace/local-customization-layer/extensions-and-hooks.md`](./workspace/local-customization-layer/extensions-and-hooks.md)
  - 5 个本地扩展与 2 个 hook 的职责、入口、依赖、测试、维护注意点
- [`workspace/local-customization-layer/governance-assets.md`](./workspace/local-customization-layer/governance-assets.md)
  - `workspace/` 中治理文档、脚本、工作流、评测与本地 UI 副本的角色分工
- [`workspace/local-customization-layer/config-topology-and-entrypoints.md`](./workspace/local-customization-layer/config-topology-and-entrypoints.md)
  - `openclaw.json` 拓扑、plugin/hook 装配、多 agent / 多 workspace 映射，以及根级入口脚本
- [`workspace/local-customization-layer/inventory.md`](./workspace/local-customization-layer/inventory.md)
  - 快速检索用登记册
- [`workspace/hindsight_guide.md`](./workspace/hindsight_guide.md)
  - 当前 Hindsight durable memory 架构、数据库位置、本地 API 入口和模型拆分

## 使用方式

- 想理解“这套个性化能力整体是怎么拼起来的”，先读本页和 `workspace/local-customization-layer/README.md`。
- 想改插件或 hook，先读 `extensions-and-hooks.md`。
- 想改规则、记忆、自我提升、UI patch 或治理脚本，先读 `governance-assets.md`。
- 想找配置入口、agent/workspace 拓扑或主机级启动入口，先读 `config-topology-and-entrypoints.md`。
- 想快速定位模块路径、真源、验证入口，直接查 `inventory.md`。

## 维护约定

- 新增 first-party 个性化能力时，优先更新 `workspace/local-customization-layer/` 下对应真源文档，再看是否需要同步本入口页。
- 若实现已迁移到 vendor、MCP、skills 安装产物或纯运行态目录，应从这里的“能力真源”视角移除，只保留边界说明。
- 文档内涉及本地敏感配置时，只描述职责和路径，不抄录实际密钥、令牌或账号值。
