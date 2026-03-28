---
name: codex-cli
description: Understand, choose, explain, and safely run local Codex CLI commands. Use when the user mentions `codex`, Codex CLI subcommands or flags, or asks OpenClaw to inspect, debug, or execute flows such as `exec`, `review`, `apply`, `mcp`, `cloud`, `sandbox`, `resume`, `fork`, `features`, or `completion`.
---

# Codex CLI

Use this skill whenever the task involves the local `codex` binary.

The local binary is the source of truth. Prefer the generated references in this skill, and fall back to live `codex ... --help` only when the user asks about a path that appears out of date.

## Execution Workflow

1. Identify whether the user wants explanation, command selection, or direct execution.

2. Route through `references/command-map.md`.
Use it to find the correct command family, supported subcommands, aliases, and option signatures.

3. Check `references/execution-policy.md` before running anything.
The policy decides whether a command is `auto`, `confirm`, or `manual-only`.

4. Prefer machine-readable or low-risk inspection first.
Use `codex --help`, `codex --version`, `codex features`, and other read-only flows before mutation or long-running actions.

5. When version drift is suspected, refresh references.
Run `npm run sync:codex-cli-skill` from `workspace/`, or inspect the exact live help path with `codex ... --help`.

## Safety Rules

- Do not invent undocumented Codex flags or subcommands.
- Treat `--help` and `--version` as safer than the underlying base command.
- Require explicit user confirmation before commands marked `confirm`.
- Do not run commands marked `manual-only` unless the user explicitly asks for that exact behavior and the operational impact is clear.
- For repo-affecting commands such as `exec`, `review`, and `apply`, confirm the working directory and consequences before execution.
- For auth or config flows such as `login`, `logout`, `mcp add`, or `mcp login`, state what local state will change.

## Resources

- `references/command-map.md`: Generated command routing and command tree summary.
- `references/execution-policy.md`: Hand-maintained execution safety matrix.
- `references/generated-manifest.json`: Generated manifest with detected Codex version and command inventory.
- `references/help/`: Raw help snapshots for every public command path.
