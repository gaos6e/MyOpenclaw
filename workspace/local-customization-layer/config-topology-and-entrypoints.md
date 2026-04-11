# 配置拓扑与入口

本页记录本地个性化能力层如何被 `openclaw.json` 和主机级入口脚本装配起来。

## 1. `openclaw.json` 的角色

`openclaw.json` 是本地 runtime config 入口，不只是普通配置文件。

它承载了几类关键能力装配：

- 默认模型、image model、memorySearch、compaction、heartbeat
- 主 agent 与多 workspace 拓扑
- 工具能力和媒体能力
- hook 开关
- channel 绑定
- gateway / control UI 配置
- plugin allowlist、slot 绑定与本地 path install

当前默认主模型为 `teamplus/gpt-5.4`，视觉模型使用 `qwen/qwen3-vl-plus`；`memorySearch` 与本机 Hindsight 的主配置仍优先走 DashScope（`qwen3.5-plus` + `text-embedding-v4`），但 `ensure_hindsight_local.ps1` 现在带有启动时降级：当 DashScope 侧 embeddings / LLM 校验导致 Hindsight API 起不来时，会自动退回到本地 embeddings + `LLM provider=none` 的 chunk-store 模式，优先保证 gateway 可用。

## 2. 本地插件装配

### allowlist 和 slot

- `plugins.allow` 启用本地能力层里 4 个 `openclaw-*` 扩展
- `plugins.slots.memory = hindsight-openclaw`
- `plugins.slots.contextEngine = openclaw-context-engine`

这意味着 context engine 由本地 first-party 扩展接管，而 memory 主链已经切到 Hindsight；`openclaw-memory-hub` 保留为本地辅助层。

### plugin entries

- `openclaw-checkpoint-guardian`
  - 负责探索提醒和冷却
- `openclaw-clawvard-governor`
  - 通过 `contractPath` 指向 `workspace/workflows/clawvard-response-contract.md`
- `openclaw-context-engine`
  - 通过 `maxChars` 控制装配预算
- `openclaw-memory-hub`
  - 当前启用，承担本地辅助 recall / archive / ontology 层
- `hindsight-openclaw`
  - 当前启用，承担主 memory slot，并通过本机 `Hindsight API` 接入本地 PostgreSQL
- `qqbot`
  - 作为通道插件启用

### installs

`plugins.installs` 把本地扩展目录显式登记为 path install：

- `extensions/openclaw-memory-hub`
- `extensions/openclaw-context-engine`
- `extensions/openclaw-checkpoint-guardian`
- `extensions/openclaw-clawvard-governor`

这部分配置很关键，因为它说明这些扩展不是“运行时临时发现”，而是显式安装的本地 first-party 模块。

## 3. Hook 装配

`hooks.internal.entries` 当前启用了：

- `self-improvement`
- `task-ack`

含义：

- 自我提升提醒已经进入 bootstrap 流程
- 任务接收确认已经进入消息接收链路

这两项属于本地交互体验和治理闭环的一部分，而不是临时提示词。

## 4. Agent / Workspace 拓扑

### 主工作区

- `agents.defaults.workspace = C:\\Users\\20961\\.openclaw\\workspace`
- `list.main.workspace = C:\\Users\\20961\\.openclaw\\workspace`
- `list.qq.workspace = C:\\Users\\20961\\.openclaw\\workspace`

这说明主治理面集中在 `workspace/`，QQ agent 也复用该治理层。

### 历史多 workspace 拓扑

此前这里曾通过 `openclaw.json` 显式登记一组基于 Edict / 三省六部的 agent 与 `workspace-*` 对应关系。

这组历史拓扑已于 2026-04-03 本地卸载，不再属于当前有效装配面。当前仍有效的 workspace 拓扑只包括：

- `agents.defaults.workspace = C:\\Users\\20961\\.openclaw\\workspace`
- `list.main.workspace = C:\\Users\\20961\\.openclaw\\workspace`
- `list.qq.workspace = C:\\Users\\20961\\.openclaw\\workspace`

如果后续重新引入多 workspace 编排，应以当时的 `openclaw.json` 实际内容为准，再回填本节。

## 5. 工具与媒体装配

### Memory Search

- `agents.defaults.memorySearch.enabled = true`
- source 包含 `memory` 与 `sessions`
- 开启 `experimental.sessionMemory`

这说明 memory hub 并不是孤立插件，而是与默认 memorySearch 侧的召回能力共同工作。

### 音频转写

`tools.media.audio.models` 当前走 CLI 模式，入口是：

- `scripts/qwen_asr_cli.mjs`

角色：

- 作为 Qwen ASR 的本地桥接脚本
- 由 `openclaw.json` 的音频配置直接调用
- 支撑 QQ 通道和其他媒体输入场景的语音转写

## 6. Channel 与绑定

### QQ 通道

- `channels.qqbot` 提供 QQ 通道配置
- `bindings` 把 `agentId = qq` 绑定到 `channel = qqbot`

这说明 QQ 不是单纯插件存在，而是已经被接到正式 agent/workspace 拓扑中。

### 安全边界

- 凭据和 `allowFrom` 等具体值属于敏感配置
- 文档应记录“有这层配置”和“由谁消费”，不应复制实际 secret

## 7. Gateway 与 Control UI

### Gateway

根目录相关入口：

- `gateway.cmd`
- `gateway-hidden.ps1`
- `gateway-hidden.vbs`

角色：

- 提供 Windows 本机下的 gateway 启动入口
- 负责注入本地环境变量、端口、`CODEX_HOME` 或隐藏窗口启动行为
- `gateway.cmd` 现在会先调用 `workspace/scripts/ensure_hindsight_local.ps1`，确保本地 `PostgreSQL + Hindsight API` 就绪，再启动 OpenClaw gateway
- `workspace/scripts/ensure_hindsight_local.ps1` 当前采用“双 profile 启动”：
  - 优先尝试 DashScope Qwen + `text-embedding-v4`
  - 若远端 provider 不可用，则自动切到本地 1024 维 embeddings（优先匹配现有库维度）+ `LLM provider=none`，以避免远端账单/鉴权问题阻塞整个 gateway

维护边界：

- 这些文件是主机级入口，不是业务规则真源
- 它们通常包含本地敏感配置，只记录职责和路径，不在文档里抄录值
- Windows 登录自启动的 canonical 入口应是 `gateway-hidden.vbs`，由它以隐藏窗口方式启动 `gateway.cmd`；不要把计划任务重新绑回可见的 `gateway.cmd`
- `gateway-hidden.ps1` 只保留为与 `gateway-hidden.vbs` 对齐的辅助启动器，不应再单独硬编码 `dist/index.js` 或 `dist/entry.js`
- `gateway.cmd` 中如果要调整本地 Hindsight 启动逻辑，应优先改 `workspace/scripts/ensure_hindsight_local.ps1`，不要把整套 PostgreSQL / Hindsight 启动流程重新硬编码回根目录入口
- 如果执行 `openclaw gateway install --force`、升级重装或其他 daemon reinstall 覆盖了 `OpenClaw Gateway` 任务动作，应重跑 `workspace/scripts/set_hidden_gateway_task.ps1` 恢复隐藏启动

### Watchdog

- `scripts/openclaw_watchdog.ps1`

角色：

- 监测 gateway 端口与健康状态
- 在异常时尝试冷重启

### Control UI

`openclaw.json.gateway.controlUi.root` 指向：

- `workspace/control-ui-local`

角色：

- 让本地 patched control UI 成为 gateway 的可视入口
- 配合 `workspace/scripts/sync_control_ui_local.cjs` 和 patch 脚本维护

## 8. 明确排除的配置面

虽然 `openclaw.json` 中还存在以下区块，但它们不纳入本地个性化能力层代码真源：

- `mcp.servers`
- `skills.entries`
- 第三方或官方支持技能的启用配置

原因：

- 它们描述的是安装产物或外部依赖装配，不是本仓 first-party 能力代码
- 这些内容需要在边界上记录，但不应抢占本地扩展、hook 和治理脚本的主体位置

## 9. 维护建议

- 新增本地能力时，优先考虑它是否需要进入 `plugins.installs`、`plugins.entries`、`hooks.internal.entries` 或多 workspace 拓扑。
- 如果一个入口脚本只负责主机环境启动，不要把业务规则写进去。
- 如果某项能力已迁移到官方支持的 MCP / skills 体系，应把 `openclaw.json` 中的对应配置改记为“外部依赖”，并从本地能力主体里降级。
