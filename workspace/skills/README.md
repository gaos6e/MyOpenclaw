# Skills Directory Governance

`workspace/skills/` 是混合目录，不默认等同于“全部都由本仓维护”。

## Ownership heuristic

- 目录名带版本号：优先视为 imported/vendor copy
- 存在 `.clawhub/origin.json`：优先视为外部来源管理内容
- 明确围绕 openclaw 本地运行治理的目录：可按 local-first 处理

## Local-first skills

- `codex-cli` — source: local `codex` binary; version/risk tracked in `skills/codex-cli/_meta.json`
- `ai-daily-brief`
- `openclaw-backup`
- `openclaw-tavily-search`
- `self-improving-agent`
- `self-evolving-skill`

## Change policy

- 先补索引、包装层、治理文档，再考虑深改 vendor skill 本体
- 新引入 skill 先记录来源、版本、风险等级
- 运行级检查结果优先落到 `self_improve_status.md`
