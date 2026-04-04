# Vendor and Imported Content

## Local-only vendor directories

- `workspace/_tmp_cli_anything/`
  - 视为 archive/temp import。
  - 不参与长期治理；继续保持隔离。

## Skills directory

`workspace/skills/` 是 mixed ownership 目录：

- 带版本后缀的目录默认视为 imported/vendor copy。
- 带 `.clawhub/origin.json` 的目录默认视为外部来源管理内容。
- 无明确 owner 标注时，默认先按 vendor 处理，避免直接深改第三方内容。

## Local-first exceptions

以下目录更接近本地治理面，可优先按 first-party/local maintained 处理：

- `workspace/skills/openclaw-backup/`
- `workspace/skills/openclaw-tavily-search/`
- `workspace/skills/self-improving-agent/`
- `workspace/skills/self-evolving-skill/`

## Edit rule

- 改 vendor 内容前先确认是否真的需要改内部实现。
- 优先增加索引、包装层、治理文档和兼容说明。
- 能不搬目录就不搬，避免破坏现有脚本和路径依赖。
