---
name: self-improvement
description: "Injects self-improvement reminder during agent bootstrap"
metadata: {"openclaw":{"emoji":"🧠","events":["agent:bootstrap"]}}
---

# Self-Improvement Hook

Injects a reminder to evaluate learnings during agent bootstrap and route them back to the canonical `workspace/` governance files.

This hook is intentionally lightweight. It only injects bootstrap guidance and
skips delegated sub-agent sessions. Validation and status transitions live in
workspace governance scripts and docs.

## What It Does

- Fires on `agent:bootstrap` (before workspace files are injected)
- Adds a reminder block pointing to `workspace/self_improve_*.md`
- Prompts the agent to log corrections, errors, and discoveries in the canonical governance files
- Skips sub-agent bootstrap flows to avoid duplicate reminders

## Configuration

No configuration needed. Enable with:

```bash
openclaw hooks enable self-improvement
```
