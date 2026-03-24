# OpenClaw 常用指令

用于保存我日常操作 OpenClaw 的高频命令。后续如果我要“发一下常用指令”，默认以这份文件为准。

最后一次核对：2026-03-24

## 终端执行

以下命令在系统终端里执行。

### 状态检查

- `status compact`
  我的习惯关键词；实际优先使用下面这条当前 CLI 明确支持的命令。

- `openclaw status`
  查看 OpenClaw 总体状态、网关、渠道、会话和基础安全摘要。

- `openclaw status --all`
  输出更完整、适合排查或转发的问题诊断信息。

- `openclaw status --deep`
  做更深入的渠道探测，适合排查消息链路或连接问题。

- `openclaw status --usage`
  查看模型提供商的使用量和配额快照。

### 模型与认证

- `openclaw models status`
  查看当前模型配置状态，包括默认模型和相关设置。

- `openclaw models list`
  列出当前可用或已配置的模型。

- `openclaw models auth login --provider openai-codex`
  启动 `openai-codex` 提供商的认证流程。

- `openclaw models auth login --provider openai-codex --set-default`
  登录 `openai-codex` 并按提供商默认建议更新默认模型。

### 日志与诊断

- `openclaw doctor`
  运行健康检查和常见问题快速修复入口。

- `openclaw logs --follow`
  持续跟随查看网关日志，适合实时排障。

### 常用入口

- `openclaw dashboard`
  打开 Control UI 仪表盘。

- `openclaw tui`
  打开终端界面的 OpenClaw 交互入口。

- `openclaw docs`
  搜索在线 OpenClaw 文档。

- `openclaw models --help`
  快速查看模型相关子命令和用法。

- `openclaw models auth --help`
  快速查看模型认证相关子命令和用法。

## OpenClaw 对话框执行

以下内容是在 OpenClaw 聊天框里输入的斜杠命令，不是在系统终端里执行。

注意：
- 这些命令依赖 OpenClaw 的聊天命令能力，通常要求 `commands.text` 或原生命令已启用。
- 发送者还需要满足授权规则；未授权时，命令可能被忽略或当作普通文本。

### 常用聊天命令

- `/compact [instructions]`
  对当前对话做压缩整理；如果你想用的是聊天里的 `compact`，应当用这条，不是 `status compact`。

- `/status`
  快速查看当前 OpenClaw 状态诊断；这是对话框里对应终端 `openclaw status` 的常用入口。

- `/help`
  查看可用聊天命令和相关帮助入口。

- `/commands`
  查看聊天命令列表。

- `/whoami`
  查看当前身份信息。

- `/id`
  `/whoami` 的简写。

- `/skill <name> [input]`
  通过聊天命令触发一个可被用户调用的 skill。
