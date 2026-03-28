# Codex CLI Command Map

Detected from local binary: `codex-cli 0.116.0`

Use `SKILL.md` for workflow and `execution-policy.md` before executing any Codex command.

## Top-Level Routing

- `codex exec` — Run Codex non-interactively
- `codex review` — Run a code review non-interactively
- `codex login` — Manage login
- `codex logout` — Remove stored authentication credentials
- `codex mcp` — Manage external MCP servers for Codex
- `codex mcp-server` — Start Codex as an MCP server (stdio)
- `codex app-server` — [experimental] Run the app server or related tooling
- `codex completion` — Generate shell completion scripts
- `codex sandbox` — Run commands within a Codex-provided sandbox
- `codex debug` — Debugging tools
- `codex apply` — Apply the latest diff produced by Codex agent as a `git apply` to your local working tree
- `codex resume` — Resume a previous interactive session (picker by default; use --last to continue the most recent)
- `codex fork` — Fork a previous interactive session (picker by default; use --last to fork the most recent)
- `codex cloud` — [EXPERIMENTAL] Browse tasks from Codex Cloud and apply changes locally
- `codex features` — Inspect feature flags

## Public Command Tree

### `codex`

Codex CLI

If no subcommand is specified, options will be forwarded to the interactive CLI.

**Usage**

```text
Usage: codex [OPTIONS] [PROMPT]
       codex [OPTIONS] <COMMAND> [ARGS]
```

**Subcommands**

- `codex exec` (aliases: e) — Run Codex non-interactively
- `codex review` — Run a code review non-interactively
- `codex login` — Manage login
- `codex logout` — Remove stored authentication credentials
- `codex mcp` — Manage external MCP servers for Codex
- `codex mcp-server` — Start Codex as an MCP server (stdio)
- `codex app-server` — [experimental] Run the app server or related tooling
- `codex completion` — Generate shell completion scripts
- `codex sandbox` — Run commands within a Codex-provided sandbox
- `codex debug` — Debugging tools
- `codex apply` (aliases: a) — Apply the latest diff produced by Codex agent as a `git apply` to your local working tree
- `codex resume` — Resume a previous interactive session (picker by default; use --last to continue the most recent)
- `codex fork` — Fork a previous interactive session (picker by default; use --last to fork the most recent)
- `codex cloud` — [EXPERIMENTAL] Browse tasks from Codex Cloud and apply changes locally
- `codex features` — Inspect feature flags

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `--remote <ADDR>` — Connect the app-server-backed TUI to a remote app server websocket endpoint. Accepted forms: `ws://host:port` or `wss://host:port`.
- `-i, --image <FILE>...` — Optional image(s) to attach to the initial prompt
- `-m, --model <MODEL>` — Model the agent should use
- `--oss` — Convenience flag to select the local open source model provider. Equivalent to -c model_provider=oss; verifies a local LM Studio or Ollama server is running
- `--local-provider <OSS_PROVIDER>` — Specify which local provider to use (lmstudio or ollama). If not specified with --oss, will use config default or show selection
- `-p, --profile <CONFIG_PROFILE>` — Configuration profile from config.toml to specify default options
- `-s, --sandbox <SANDBOX_MODE>` — Select the sandbox policy to use when executing model-generated shell commands [possible values: read-only, workspace-write, danger-full-access]
- `-a, --ask-for-approval <APPROVAL_POLICY>` — Configure when the model requires human approval before executing a command Possible values: - untrusted:  Only run "trusted" commands (e.g. ls, cat, sed) without asking for user approval. Will escalate to the user if the model proposes a command that is not in the "trusted" set - on-failure: DEPRECATED: Run all commands without asking for user approval. Only asks for approval if a command fails to execute, in which case it will escalate to the user to ask for un-sandboxed execution. Prefer `on-request` for interactive runs or `never` for non-interactive runs - on-request: The model decides when to ask the user for approval - never:      Never ask for user approval Execution failures are immediately returned to the model
- `--full-auto` — Convenience alias for low-friction sandboxed automatic execution (-a on-request, --sandbox workspace-write)
- `--dangerously-bypass-approvals-and-sandbox` — Skip all confirmation prompts and execute commands without sandboxing. EXTREMELY DANGEROUS. Intended solely for running in environments that are externally sandboxed
- `-C, --cd <DIR>` — Tell the agent to use the specified directory as its working root
- `--search` — Enable live web search. When enabled, the native Responses `web_search` tool is available to the model (no per‑call approval)
- `--add-dir <DIR>` — Additional directories that should be writable alongside the primary workspace
- `--no-alt-screen` — Disable alternate screen mode Runs the TUI in inline mode, preserving terminal scrollback history. This is useful in terminal multiplexers like Zellij that follow the xterm spec strictly and disable scrollback in alternate screen buffers.
- `-h, --help` — Print help (see a summary with '-h')
- `-V, --version` — Print version

**Help Snapshot:** [`help/codex.md`](help/codex.md)

### `codex app-server`

[experimental] Run the app server or related tooling

**Usage**

```text
Usage: codex app-server [OPTIONS] [COMMAND]
```

**Subcommands**

- `codex app-server generate-ts` — [experimental] Generate TypeScript bindings for the app server protocol
- `codex app-server generate-json-schema` — [experimental] Generate JSON Schema for the app server protocol

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `--listen <URL>` — Transport endpoint URL. Supported values: `stdio://` (default), `ws://IP:PORT` [default: stdio://]
- `--session-source <SOURCE>` — Session source stamped into new threads started by this app-server. Known values such as `vscode`, `cli`, `exec`, and `mcp` map to built-in sources. Any other non-empty value is recorded as a custom source. [default: vscode]
- `--analytics-default-enabled` — Controls whether analytics are enabled by default. Analytics are disabled by default for app-server. Users have to explicitly opt in via the `analytics` section in the config.toml file. However, for first-party use cases like the VSCode IDE extension, we default analytics to be enabled by default by setting this flag. Users can still opt out by setting this in their config.toml: ```toml [analytics] enabled = false ``` See https://developers.openai.com/codex/config-advanced/#metrics for more details.
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/app-server.md`](help/app-server.md)

### `codex app-server generate-json-schema`

[experimental] Generate JSON Schema for the app server protocol

**Usage**

```text
Usage: codex app-server generate-json-schema [OPTIONS] --out <DIR>
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `-o, --out <DIR>` — Output directory where the schema bundle will be written
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--experimental` — Include experimental methods and fields in the generated output
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/app-server/generate-json-schema.md`](help/app-server/generate-json-schema.md)

### `codex app-server generate-ts`

[experimental] Generate TypeScript bindings for the app server protocol

**Usage**

```text
Usage: codex app-server generate-ts [OPTIONS] --out <DIR>
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `-o, --out <DIR>` — Output directory where .ts files will be written
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `-p, --prettier <PRETTIER_BIN>` — Optional path to the Prettier executable to format generated files
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `--experimental` — Include experimental methods and fields in the generated output
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/app-server/generate-ts.md`](help/app-server/generate-ts.md)

### `codex apply`

Apply the latest diff produced by Codex agent as a `git apply` to your local working tree

**Usage**

```text
Usage: codex apply [OPTIONS] <TASK_ID>
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/apply.md`](help/apply.md)

### `codex cloud`

[EXPERIMENTAL] Browse tasks from Codex Cloud and apply changes locally

**Usage**

```text
Usage: codex cloud [OPTIONS] [COMMAND]
```

**Subcommands**

- `codex cloud exec` — Submit a new Codex Cloud task without launching the TUI
- `codex cloud status` — Show the status of a Codex Cloud task
- `codex cloud list` — List Codex Cloud tasks
- `codex cloud apply` — Apply the diff for a Codex Cloud task locally
- `codex cloud diff` — Show the unified diff for a Codex Cloud task

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')
- `-V, --version` — Print version

**Help Snapshot:** [`help/cloud.md`](help/cloud.md)

### `codex cloud apply`

Apply the diff for a Codex Cloud task locally

**Usage**

```text
Usage: codex cloud apply [OPTIONS] <TASK_ID>
```

**Options**

- `--attempt <N>` — Attempt number to apply (1-based)
- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/cloud/apply.md`](help/cloud/apply.md)

### `codex cloud diff`

Show the unified diff for a Codex Cloud task

**Usage**

```text
Usage: codex cloud diff [OPTIONS] <TASK_ID>
```

**Options**

- `--attempt <N>` — Attempt number to display (1-based)
- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/cloud/diff.md`](help/cloud/diff.md)

### `codex cloud exec`

Submit a new Codex Cloud task without launching the TUI

**Usage**

```text
Usage: codex cloud exec [OPTIONS] --env <ENV_ID> [QUERY]
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--env <ENV_ID>` — Target environment identifier (see `codex cloud` to browse)
- `--attempts <ATTEMPTS>` — Number of assistant attempts (best-of-N) [default: 1]
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--branch <BRANCH>` — Git branch to run in Codex Cloud (defaults to current branch)
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/cloud/exec.md`](help/cloud/exec.md)

### `codex cloud list`

List Codex Cloud tasks

**Usage**

```text
Usage: codex cloud list [OPTIONS]
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--env <ENV_ID>` — Filter tasks by environment identifier
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--limit <N>` — Maximum number of tasks to return (1-20) [default: 20]
- `--cursor <CURSOR>` — Pagination cursor returned by a previous call
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `--json` — Emit JSON instead of plain text
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/cloud/list.md`](help/cloud/list.md)

### `codex cloud status`

Show the status of a Codex Cloud task

**Usage**

```text
Usage: codex cloud status [OPTIONS] <TASK_ID>
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/cloud/status.md`](help/cloud/status.md)

### `codex completion`

Generate shell completion scripts

**Usage**

```text
Usage: codex completion [OPTIONS] [SHELL]
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/completion.md`](help/completion.md)

### `codex debug`

Debugging tools

**Usage**

```text
Usage: codex debug [OPTIONS] <COMMAND>
```

**Subcommands**

- `codex debug app-server` — Tooling: helps debug the app server

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/debug.md`](help/debug.md)

### `codex debug app-server`

Tooling: helps debug the app server

**Usage**

```text
Usage: codex debug app-server [OPTIONS] <COMMAND>
```

**Subcommands**

- `codex debug app-server send-message-v2` — No description available.

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/debug/app-server.md`](help/debug/app-server.md)

### `codex debug app-server send-message-v2`

**Usage**

```text
Usage: codex debug app-server send-message-v2 [OPTIONS] <USER_MESSAGE>
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/debug/app-server/send-message-v2.md`](help/debug/app-server/send-message-v2.md)

### `codex exec`

Run Codex non-interactively

**Usage**

```text
Usage: codex exec [OPTIONS] [PROMPT] [COMMAND]
```

**Subcommands**

- `codex exec resume` — Resume a previous session by id or pick the most recent with --last
- `codex exec review` — Run a code review against the current repository

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-i, --image <FILE>...` — Optional image(s) to attach to the initial prompt
- `-m, --model <MODEL>` — Model the agent should use
- `--oss` — Use open-source provider
- `--local-provider <OSS_PROVIDER>` — Specify which local provider to use (lmstudio or ollama). If not specified with --oss, will use config default or show selection
- `-s, --sandbox <SANDBOX_MODE>` — Select the sandbox policy to use when executing model-generated shell commands [possible values: read-only, workspace-write, danger-full-access]
- `-p, --profile <CONFIG_PROFILE>` — Configuration profile from config.toml to specify default options
- `--full-auto` — Convenience alias for low-friction sandboxed automatic execution (-a on-request, --sandbox workspace-write)
- `--dangerously-bypass-approvals-and-sandbox` — Skip all confirmation prompts and execute commands without sandboxing. EXTREMELY DANGEROUS. Intended solely for running in environments that are externally sandboxed
- `-C, --cd <DIR>` — Tell the agent to use the specified directory as its working root
- `--skip-git-repo-check` — Allow running Codex outside a Git repository
- `--add-dir <DIR>` — Additional directories that should be writable alongside the primary workspace
- `--ephemeral` — Run without persisting session files to disk
- `--output-schema <FILE>` — Path to a JSON Schema file describing the model's final response shape
- `--color <COLOR>` — Specifies color settings for use in the output [default: auto] [possible values: always, never, auto]
- `--progress-cursor` — Force cursor-based progress updates in exec mode
- `--json` — Print events to stdout as JSONL
- `-o, --output-last-message <FILE>` — Specifies file where the last message from the agent should be written
- `-h, --help` — Print help (see a summary with '-h')
- `-V, --version` — Print version

**Help Snapshot:** [`help/exec.md`](help/exec.md)

### `codex exec resume`

Resume a previous session by id or pick the most recent with --last

**Usage**

```text
Usage: codex exec resume [OPTIONS] [SESSION_ID] [PROMPT]
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--last` — Resume the most recent recorded session (newest) without specifying an id
- `--all` — Show all sessions (disables cwd filtering)
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-i, --image <FILE>` — Optional image(s) to attach to the prompt sent after resuming
- `-m, --model <MODEL>` — Model the agent should use
- `--full-auto` — Convenience alias for low-friction sandboxed automatic execution (-a on-request, --sandbox workspace-write)
- `--dangerously-bypass-approvals-and-sandbox` — Skip all confirmation prompts and execute commands without sandboxing. EXTREMELY DANGEROUS. Intended solely for running in environments that are externally sandboxed
- `--skip-git-repo-check` — Allow running Codex outside a Git repository
- `--ephemeral` — Run without persisting session files to disk
- `--json` — Print events to stdout as JSONL
- `-o, --output-last-message <FILE>` — Specifies file where the last message from the agent should be written
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/exec/resume.md`](help/exec/resume.md)

### `codex exec review`

Run a code review against the current repository

**Usage**

```text
Usage: codex exec review [OPTIONS] [PROMPT]
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--uncommitted` — Review staged, unstaged, and untracked changes
- `--base <BRANCH>` — Review changes against the given base branch
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--commit <SHA>` — Review the changes introduced by a commit
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-m, --model <MODEL>` — Model the agent should use
- `--title <TITLE>` — Optional commit title to display in the review summary
- `--full-auto` — Convenience alias for low-friction sandboxed automatic execution (-a on-request, --sandbox workspace-write)
- `--dangerously-bypass-approvals-and-sandbox` — Skip all confirmation prompts and execute commands without sandboxing. EXTREMELY DANGEROUS. Intended solely for running in environments that are externally sandboxed
- `--skip-git-repo-check` — Allow running Codex outside a Git repository
- `--ephemeral` — Run without persisting session files to disk
- `--json` — Print events to stdout as JSONL
- `-o, --output-last-message <FILE>` — Specifies file where the last message from the agent should be written
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/exec/review.md`](help/exec/review.md)

### `codex features`

Inspect feature flags

**Usage**

```text
Usage: codex features [OPTIONS] <COMMAND>
```

**Subcommands**

- `codex features list` — List known features with their stage and effective state
- `codex features enable` — Enable a feature in config.toml
- `codex features disable` — Disable a feature in config.toml

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/features.md`](help/features.md)

### `codex features disable`

Disable a feature in config.toml

**Usage**

```text
Usage: codex features disable [OPTIONS] <FEATURE>
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/features/disable.md`](help/features/disable.md)

### `codex features enable`

Enable a feature in config.toml

**Usage**

```text
Usage: codex features enable [OPTIONS] <FEATURE>
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/features/enable.md`](help/features/enable.md)

### `codex features list`

List known features with their stage and effective state

**Usage**

```text
Usage: codex features list [OPTIONS]
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/features/list.md`](help/features/list.md)

### `codex fork`

Fork a previous interactive session (picker by default; use --last to fork the most recent)

**Usage**

```text
Usage: codex fork [OPTIONS] [SESSION_ID] [PROMPT]
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--last` — Fork the most recent session without showing the picker
- `--all` — Show all sessions (disables cwd filtering and shows CWD column)
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `--remote <ADDR>` — Connect the app-server-backed TUI to a remote app server websocket endpoint. Accepted forms: `ws://host:port` or `wss://host:port`.
- `-i, --image <FILE>...` — Optional image(s) to attach to the initial prompt
- `-m, --model <MODEL>` — Model the agent should use
- `--oss` — Convenience flag to select the local open source model provider. Equivalent to -c model_provider=oss; verifies a local LM Studio or Ollama server is running
- `--local-provider <OSS_PROVIDER>` — Specify which local provider to use (lmstudio or ollama). If not specified with --oss, will use config default or show selection
- `-p, --profile <CONFIG_PROFILE>` — Configuration profile from config.toml to specify default options
- `-s, --sandbox <SANDBOX_MODE>` — Select the sandbox policy to use when executing model-generated shell commands [possible values: read-only, workspace-write, danger-full-access]
- `-a, --ask-for-approval <APPROVAL_POLICY>` — Configure when the model requires human approval before executing a command Possible values: - untrusted:  Only run "trusted" commands (e.g. ls, cat, sed) without asking for user approval. Will escalate to the user if the model proposes a command that is not in the "trusted" set - on-failure: DEPRECATED: Run all commands without asking for user approval. Only asks for approval if a command fails to execute, in which case it will escalate to the user to ask for un-sandboxed execution. Prefer `on-request` for interactive runs or `never` for non-interactive runs - on-request: The model decides when to ask the user for approval - never:      Never ask for user approval Execution failures are immediately returned to the model
- `--full-auto` — Convenience alias for low-friction sandboxed automatic execution (-a on-request, --sandbox workspace-write)
- `--dangerously-bypass-approvals-and-sandbox` — Skip all confirmation prompts and execute commands without sandboxing. EXTREMELY DANGEROUS. Intended solely for running in environments that are externally sandboxed
- `-C, --cd <DIR>` — Tell the agent to use the specified directory as its working root
- `--search` — Enable live web search. When enabled, the native Responses `web_search` tool is available to the model (no per‑call approval)
- `--add-dir <DIR>` — Additional directories that should be writable alongside the primary workspace
- `--no-alt-screen` — Disable alternate screen mode Runs the TUI in inline mode, preserving terminal scrollback history. This is useful in terminal multiplexers like Zellij that follow the xterm spec strictly and disable scrollback in alternate screen buffers.
- `-h, --help` — Print help (see a summary with '-h')
- `-V, --version` — Print version

**Help Snapshot:** [`help/fork.md`](help/fork.md)

### `codex login`

Manage login

**Usage**

```text
Usage: codex login [OPTIONS] [COMMAND]
```

**Subcommands**

- `codex login status` — Show login status

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--with-api-key` — Read the API key from stdin (e.g. `printenv OPENAI_API_KEY | codex login --with-api-key`)
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--device-auth`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/login.md`](help/login.md)

### `codex login status`

Show login status

**Usage**

```text
Usage: codex login status [OPTIONS]
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/login/status.md`](help/login/status.md)

### `codex logout`

Remove stored authentication credentials

**Usage**

```text
Usage: codex logout [OPTIONS]
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/logout.md`](help/logout.md)

### `codex mcp`

Manage external MCP servers for Codex

**Usage**

```text
Usage: codex mcp [OPTIONS] <COMMAND>
```

**Subcommands**

- `codex mcp list` — No description available.
- `codex mcp get` — No description available.
- `codex mcp add` — No description available.
- `codex mcp remove` — No description available.
- `codex mcp login` — No description available.
- `codex mcp logout` — No description available.

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/mcp.md`](help/mcp.md)

### `codex mcp add`

**Usage**

```text
Usage: codex mcp add [OPTIONS] <NAME> (--url <URL> | -- <COMMAND>...)
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--env <KEY=VALUE>` — Environment variables to set when launching the server. Only valid with stdio servers
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--url <URL>` — URL for a streamable HTTP MCP server
- `--bearer-token-env-var <ENV_VAR>` — Optional environment variable to read for a bearer token. Only valid with streamable HTTP servers
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/mcp/add.md`](help/mcp/add.md)

### `codex mcp get`

**Usage**

```text
Usage: codex mcp get [OPTIONS] <NAME>
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--json` — Output the server configuration as JSON
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/mcp/get.md`](help/mcp/get.md)

### `codex mcp list`

**Usage**

```text
Usage: codex mcp list [OPTIONS]
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--json` — Output the configured servers as JSON
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/mcp/list.md`](help/mcp/list.md)

### `codex mcp login`

**Usage**

```text
Usage: codex mcp login [OPTIONS] <NAME>
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--scopes <SCOPE,SCOPE>` — Comma-separated list of OAuth scopes to request
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/mcp/login.md`](help/mcp/login.md)

### `codex mcp logout`

**Usage**

```text
Usage: codex mcp logout [OPTIONS] <NAME>
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/mcp/logout.md`](help/mcp/logout.md)

### `codex mcp remove`

**Usage**

```text
Usage: codex mcp remove [OPTIONS] <NAME>
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/mcp/remove.md`](help/mcp/remove.md)

### `codex mcp-server`

Start Codex as an MCP server (stdio)

**Usage**

```text
Usage: codex mcp-server [OPTIONS]
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/mcp-server.md`](help/mcp-server.md)

### `codex resume`

Resume a previous interactive session (picker by default; use --last to continue the most recent)

**Usage**

```text
Usage: codex resume [OPTIONS] [SESSION_ID] [PROMPT]
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--last` — Continue the most recent session without showing the picker
- `--all` — Show all sessions (disables cwd filtering and shows CWD column)
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `--remote <ADDR>` — Connect the app-server-backed TUI to a remote app server websocket endpoint. Accepted forms: `ws://host:port` or `wss://host:port`.
- `-i, --image <FILE>...` — Optional image(s) to attach to the initial prompt
- `-m, --model <MODEL>` — Model the agent should use
- `--oss` — Convenience flag to select the local open source model provider. Equivalent to -c model_provider=oss; verifies a local LM Studio or Ollama server is running
- `--local-provider <OSS_PROVIDER>` — Specify which local provider to use (lmstudio or ollama). If not specified with --oss, will use config default or show selection
- `-p, --profile <CONFIG_PROFILE>` — Configuration profile from config.toml to specify default options
- `-s, --sandbox <SANDBOX_MODE>` — Select the sandbox policy to use when executing model-generated shell commands [possible values: read-only, workspace-write, danger-full-access]
- `-a, --ask-for-approval <APPROVAL_POLICY>` — Configure when the model requires human approval before executing a command Possible values: - untrusted:  Only run "trusted" commands (e.g. ls, cat, sed) without asking for user approval. Will escalate to the user if the model proposes a command that is not in the "trusted" set - on-failure: DEPRECATED: Run all commands without asking for user approval. Only asks for approval if a command fails to execute, in which case it will escalate to the user to ask for un-sandboxed execution. Prefer `on-request` for interactive runs or `never` for non-interactive runs - on-request: The model decides when to ask the user for approval - never:      Never ask for user approval Execution failures are immediately returned to the model
- `--full-auto` — Convenience alias for low-friction sandboxed automatic execution (-a on-request, --sandbox workspace-write)
- `--dangerously-bypass-approvals-and-sandbox` — Skip all confirmation prompts and execute commands without sandboxing. EXTREMELY DANGEROUS. Intended solely for running in environments that are externally sandboxed
- `-C, --cd <DIR>` — Tell the agent to use the specified directory as its working root
- `--search` — Enable live web search. When enabled, the native Responses `web_search` tool is available to the model (no per‑call approval)
- `--add-dir <DIR>` — Additional directories that should be writable alongside the primary workspace
- `--no-alt-screen` — Disable alternate screen mode Runs the TUI in inline mode, preserving terminal scrollback history. This is useful in terminal multiplexers like Zellij that follow the xterm spec strictly and disable scrollback in alternate screen buffers.
- `-h, --help` — Print help (see a summary with '-h')
- `-V, --version` — Print version

**Help Snapshot:** [`help/resume.md`](help/resume.md)

### `codex review`

Run a code review non-interactively

**Usage**

```text
Usage: codex review [OPTIONS] [PROMPT]
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--uncommitted` — Review staged, unstaged, and untracked changes
- `--base <BRANCH>` — Review changes against the given base branch
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--commit <SHA>` — Review the changes introduced by a commit
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `--title <TITLE>` — Optional commit title to display in the review summary
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/review.md`](help/review.md)

### `codex sandbox`

Run commands within a Codex-provided sandbox

**Usage**

```text
Usage: codex sandbox [OPTIONS] <COMMAND>
```

**Subcommands**

- `codex sandbox macos` (aliases: seatbelt) — Run a command under Seatbelt (macOS only)
- `codex sandbox linux` (aliases: landlock) — Run a command under the Linux sandbox (bubblewrap by default)
- `codex sandbox windows` — Run a command under Windows restricted token (Windows only)

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/sandbox.md`](help/sandbox.md)

### `codex sandbox linux`

Run a command under the Linux sandbox (bubblewrap by default)

**Usage**

```text
Usage: codex sandbox linux [OPTIONS] [COMMAND]...
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--full-auto` — Convenience alias for low-friction sandboxed automatic execution (network-disabled sandbox that can write to cwd and TMPDIR)
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/sandbox/linux.md`](help/sandbox/linux.md)

### `codex sandbox macos`

Run a command under Seatbelt (macOS only)

**Usage**

```text
Usage: codex sandbox macos [OPTIONS] [COMMAND]...
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--full-auto` — Convenience alias for low-friction sandboxed automatic execution (network-disabled sandbox that can write to cwd and TMPDIR)
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--log-denials` — While the command runs, capture macOS sandbox denials via `log stream` and print them after exit
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/sandbox/macos.md`](help/sandbox/macos.md)

### `codex sandbox windows`

Run a command under Windows restricted token (Windows only)

**Usage**

```text
Usage: codex sandbox windows [OPTIONS] [COMMAND]...
```

**Options**

- `-c, --config <key=value>` — Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`. Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed as TOML. If it fails to parse as TOML, the raw string is used as a literal. Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c shell_environment_policy.inherit=all`
- `--full-auto` — Convenience alias for low-friction sandboxed automatic execution (network-disabled sandbox that can write to cwd and TMPDIR)
- `--enable <FEATURE>` — Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
- `--disable <FEATURE>` — Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
- `-h, --help` — Print help (see a summary with '-h')

**Help Snapshot:** [`help/sandbox/windows.md`](help/sandbox/windows.md)
