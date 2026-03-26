# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Tool gotchas
- image 工具应直接读取 `C:\Users\20961\.openclaw\qqbot\downloads` 下的绝对路径；不要为了识图再复制到 `C:\Users\20961\.openclaw\workspace`
- 使用 `package_skill.py` 打包时需要 Python 依赖 `pyyaml`（缺失会报 ModuleNotFoundError: yaml）。
- PowerShell exec 命令中的 `$` 变量需用反引号转义：`` `$variable``，或使用脚本文件避免变量被剥离。
- Open-Meteo Air Quality API 的 current 字段名：`nitrogen_dioxide`/`ozone`/`sulphur_dioxide`/`carbon_monoxide`（不要用 no2/o3/so2/co）。

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

<!-- clawx:begin -->
## ClawX Tool Notes

### uv (Python)

- `uv` is bundled with ClawX and on PATH. Do NOT use bare `python` or `pip`.
- Run scripts: `uv run python <script>` | Install packages: `uv pip install <package>`

### Browser

- `browser` tool provides full automation (scraping, form filling, testing) via an isolated managed browser.
- Flow: `action="start"` → `action="snapshot"` (see page + get element refs like `e12`) → `action="act"` (click/type using refs).
- Open new tabs: `action="open"` with `targetUrl`.
- To just open a URL for the user to view, use `shell:openExternal` instead.
<!-- clawx:end -->
