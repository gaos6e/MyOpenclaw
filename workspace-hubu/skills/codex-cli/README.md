# Codex CLI Skill

A local-first OpenClaw skill for understanding and safely operating the Codex CLI installed on this machine.

## What It Provides

- Full public Codex command tree generated from the local `codex` binary.
- Raw help snapshots for every public command path.
- A command map that helps OpenClaw route user requests to the right Codex command family.
- A hand-maintained execution policy that separates safe inspection from state-changing flows.

## Sync Model

Generated references come from the installed local binary, not from stale online docs.

Refresh them with:

```bash
cd workspace
npm run sync:codex-cli-skill
```

Validate that committed references still match the local binary with:

```bash
cd workspace
npm run verify:codex-cli-skill
```

## Repository Structure

- `SKILL.md`: Trigger rules, workflow, and safety rules.
- `agents/openai.yaml`: Agent-facing prompt metadata.
- `references/command-map.md`: Generated routing summary.
- `references/generated-manifest.json`: Generated version and command inventory.
- `references/help/`: Generated raw help snapshots.
- `references/execution-policy.md`: Hand-maintained execution safety matrix.
- `_meta.json`: Local wrapper metadata with source, version, and risk.

## Notes

- Version tracking lives in `_meta.json` and `references/generated-manifest.json`.
- If the local Codex version changes, regenerate references before trusting command coverage.
