# 临时文件管理策略

## 统一规则
- 所有临时文件一律落在：`D:\桌面\openclaw`
- 禁止在 `workspace/` 与 `C:\Users\20961\.openclaw` 根目录留存临时文件
- `.openclaw` 目录卫生默认巡检范围：根目录 + `logs/` + `backup/` + `qqbot/downloads/` + workspace 临时区

## 允许范围
- 仅配置/文档/脚本常驻于 workspace
- 临时脚本/图片/下载文件必须清理或移动
- `qqbot/downloads/` 与语义不明确的 `_tmp_*` 目录默认只列清单，不自动迁移

## 执行点
- 每次任务结束：检查并移动 `workspace/` 与 `.openclaw` 根目录中的临时文件
- 自我提升时：先运行 `node scripts/openclaw_hygiene_audit.cjs --json`
- 仅当结果属于 `safeActions` 时，再运行 `node scripts/openclaw_hygiene_audit.cjs --apply-safe --archive-age-days 7`
- 根目录备份类产物 → `backup/root-backups-<timestamp>/`
- 7 天以上低价值更新日志 → `backup/hygiene-archive-<timestamp>/logs/`
- 发现新增临时文件：立即移动到 `D:\桌面\openclaw`

## 备注
- 若工具限制必须先落盘到 workspace，完成后立刻迁移并清理
- 清理前先列清单；`askFirst` / `reportOnly` 项不得自动处理
