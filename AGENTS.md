# Repository Guidelines

## Project Structure & Module Organization
`workspace/` is the maintained source of truth for docs, reusable scripts, and the shared Node test suite. Put new first-party helpers in `workspace/scripts/`, not the repo root. `extensions/` holds first-party plugins; `hooks/` holds runtime hooks. Root folders such as `agents/`, `identity/`, `cron/`, `devices/`, `qqbot/`, `logs/`, and `media/` are local runtime/state and are usually not review targets. `workspace/skills/` is mixed ownership; versioned folders are often vendor copies.

## Build, Test, and Development Commands
- `cd workspace && npm test` runs the shared `node:test` suite for scripts, plugins, and the self-improvement hook.
- `cd workspace && npm run validate:self-improve` validates the required structure of the self-improvement governance files.
- `cd extensions/openclaw-qqbot && npm run build` compiles the QQBot extension with `tsc`.
- `cd extensions/openclaw-qqbot && npm run dev` starts TypeScript watch mode for QQBot changes.
- `git config core.hooksPath .githooks` enables the repo hook that blocks accidental submodules/gitlinks before commit.

## Coding Style & Naming Conventions
Use 2-space indentation, semicolons, and double quotes in JS/TS to match the existing codebase. Keep ESM modules in `extensions/` and `hooks/`; keep CommonJS `.cjs` files in `workspace/scripts/` and tests. Name helpers and tests after the feature they cover, for example `memory_hub_scope.test.cjs` or `openclaw_context_engine.test.cjs`. Avoid editing generated assets in `control-ui/assets/` unless regeneration is not possible.

## Testing Guidelines
This repo uses the built-in Node test runner (`node --test`). Add or update targeted `*.test.cjs` files whenever behavior changes in `workspace/scripts/`, `hooks/`, or plugin `src/` modules. No numeric coverage gate is configured, so each behavior change should ship with a focused regression test.

## Commit & Pull Request Guidelines
Recent history is dominated by maintenance snapshots such as `backup 2026-03-23 23:00:02` and `daily auto push 2026-03-20`. Keep manual commits easy to scan: use short imperative subjects, with an area prefix when useful, for example `memory-hub: handle empty promotion set`. Pull requests should summarize affected areas, list commands run, link related work, and include screenshots for `control-ui/` changes. Do not introduce git submodules; the pre-commit hook rejects gitlinks.

## Upgrade Compatibility
Prefer additive integrations in `extensions/`, `hooks/`, and `workspace/` over direct changes to OpenClaw core internals. Treat upgradeability as a requirement: improvements should not block a normal OpenClaw update, and after upgrading, both upstream features and this repository's custom workflows should continue to work with minimal repair. If a core change is unavoidable, isolate it, document the reason, and note the post-upgrade checks required.

## Security & Configuration Tips
Never commit secrets or machine-specific state. `.env`, `openclaw.json`, runtime folders, caches, and derived state are intentionally ignored. Treat launcher scripts and local config as host-specific; scrub credentials before sharing.
