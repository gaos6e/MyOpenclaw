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
- Primary repo root: `C:\Users\20961\.openclaw`
- Long-term workspace: `C:\Users\20961\.openclaw\workspace`
- OpenClaw skill install path: `C:\Users\20961\.openclaw\workspace\skills`
- Temporary file / backup staging root: `D:\桌面\openclaw`
- image 工具应直接读取 `C:\Users\20961\.openclaw\qqbot\downloads` 下的绝对路径；不要为了识图再复制到 `C:\Users\20961\.openclaw\workspace`
- 使用 `package_skill.py` 打包时需要 Python 依赖 `pyyaml`（缺失会报 ModuleNotFoundError: yaml）。
- If `rg` is unavailable, fall back to `Select-String` with `Get-ChildItem -Recurse` instead of stopping the search flow.
- PowerShell exec 命令中的 `$` 变量需用反引号转义：`` `$variable``，或使用脚本文件避免变量被剥离。
- Windows PowerShell 不支持 `&&` 作为命令分隔符；在 exec 中应使用 `;`。Complex PowerShell should prefer a `.ps1` script file when quoting, pipes, or conditionals start getting long.
- 完成实现后先跑 fresh verification，再说“已完成”；不要用 “should work” / “should pass” 当作完成态结论。
- 抓取抖音热榜这类强前端渲染页面时，优先用 `browser` 渲染并从 DOM 提取；`web_fetch` 往往只能拿到原始 HTML/JS。
- 分析主流视频/图片/文本内容时，若需要先下载再读，优先用 `https://snapany.com/zh`。
- 对政治/司法新闻做“多渠道核实”时，要显式区分：可读取全文来源 vs 仅搜索摘要交叉验证；不要把摘要当成同等强度证据。
- 含大量参考文献的 NotebookLM notebook 首次生成 report/mind_map 时，优先限制到核心 source_ids（主文档/背景/日志/结果），避免产物被参考文献主题带偏。
- NotebookLM `notebook_query` 连续 2 次超时后，默认切换到 `source_get_content` + 本地结构化抽取，不要继续死磕大范围聚合查询。
- pre-compaction memory flush 等文本落盘场景，优先用 `write/edit` 或脚本文件，不要在 PowerShell `-Command` 中直接拼含 `$` / 反引号的大段文本。
- qqbot-remind 在当前环境更适合作为“提醒参数生成器”；若会话无显式 `cron` 工具，实际注册任务用 `openclaw cron add --json`，再把 job_id 回写配置。
- cron 任务若遇到限流或模型超时，先看 `openclaw cron runs --id <job-id>` 的详细日志，再决定是否调重试或换模型。
- 解析抖音热榜等榜单时，若页面未稳定暴露 rank 字段，优先表述为“按页面顺序 TopN”，不要强行声称精确排名。
- Open-Meteo Air Quality API 的 current 字段名：`nitrogen_dioxide`/`ozone`/`sulphur_dioxide`/`carbon_monoxide`（不要用 no2/o3/so2/co）。
- Open-Meteo Air Quality API 的 AQI 字段名：`us_aqi`/`european_aqi`（不要用 eu_aqi）。
- wttr.in 对“Guangzhou Huangpu/广州黄埔”这类位置解析可能返回错误的 nearest_area；黄埔天气优先用 Open-Meteo + 明确坐标。

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

## OpenClaw Desktop Tool Notes

### uv (Python)

- `uv` is bundled with the desktop environment and on PATH. Do NOT use bare `python` or `pip`.
- Run scripts: `uv run python <script>` | Install packages: `uv pip install <package>`

### Browser

- `browser` tool provides full automation (scraping, form filling, testing) via an isolated managed browser.
- Flow: `action="start"` → `action="snapshot"` (see page + get element refs like `e12`) → `action="act"` (click/type using refs).
- Open new tabs: `action="open"` with `targetUrl`.
- To just open a URL for the user to view, use `shell:openExternal` instead.
