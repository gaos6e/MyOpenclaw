# Codex CLI Execution Policy

This matrix classifies direct command execution for the local `codex` CLI.

- `auto`: OpenClaw may run it without an extra confirmation step when the user intent is clear.
- `confirm`: OpenClaw should explain impact and require explicit confirmation before running it.
- `manual-only`: OpenClaw should explain or prepare it, but only run it when the user explicitly requests that exact behavior.

`--help` and `--version` are treated as safer inspection flows even when the underlying base command is more restrictive.

| Command Path | Class | Notes |
| --- | --- | --- |
| `codex` | manual-only | Bare `codex` opens the interactive CLI. Explain rather than launch by default. |
| `codex exec` | confirm | Non-interactive agent execution can edit repos or run commands. |
| `codex exec resume` | confirm | Resumes a prior execution session. |
| `codex exec review` | confirm | Review flow still operates on a repository context. |
| `codex review` | confirm | Code review against repo state. |
| `codex login` | confirm | Changes local authentication state. |
| `codex logout` | confirm | Removes local authentication credentials. |
| `codex mcp` | auto | Base family prints help and routes to subcommands. |
| `codex mcp list` | auto | Read-only inspection of configured MCP servers. |
| `codex mcp get` | auto | Read-only inspection of one MCP server config. |
| `codex mcp add` | confirm | Writes MCP server config. |
| `codex mcp remove` | confirm | Removes MCP server config. |
| `codex mcp login` | confirm | Changes MCP auth state. |
| `codex mcp logout` | confirm | Removes MCP auth state. |
| `codex mcp-server` | manual-only | Starts a long-running stdio server. |
| `codex app-server` | manual-only | Starts long-running app-server tooling. |
| `codex app-server generate-json-schema` | confirm | Generates schema artifacts and may write files depending on flags. |
| `codex app-server generate-ts` | confirm | Generates TypeScript artifacts and may write files depending on flags. |
| `codex completion` | auto | Generates shell completion output only. |
| `codex sandbox` | auto | Base family prints help and routes to subcommands. |
| `codex sandbox macos` | manual-only | Launches a sandboxed command runner. |
| `codex sandbox linux` | manual-only | Launches a sandboxed command runner. |
| `codex sandbox windows` | manual-only | Launches a sandboxed command runner. |
| `codex debug` | auto | Base family prints help and routes to subcommands. |
| `codex debug app-server` | manual-only | Specialized app-server debugging flow. |
| `codex debug app-server send-message-v2` | manual-only | Explicit debug transport action; do not run implicitly. |
| `codex apply` | confirm | Applies patch output to the local working tree. |
| `codex resume` | confirm | Opens or resumes an interactive session. |
| `codex fork` | confirm | Forks an interactive session. |
| `codex cloud` | auto | Base family prints help and routes to subcommands. |
| `codex cloud exec` | confirm | Submits a Codex Cloud task. |
| `codex cloud status` | auto | Read-only task inspection. |
| `codex cloud list` | auto | Read-only task inspection. |
| `codex cloud apply` | confirm | Applies a cloud diff to the local working tree. |
| `codex cloud diff` | auto | Read-only diff inspection. |
| `codex features` | auto | Read-only feature flag inspection. |
| `codex features list` | auto | Read-only feature flag inspection. |
| `codex features enable` | confirm | Writes feature toggles to config. |
| `codex features disable` | confirm | Writes feature toggles to config. |
| `codex login status` | auto | Read-only login inspection. |
