# Workspace Scripts

这些脚本是 `workspace/` 的 first-party runtime helpers。

## Governance

- `validate-self-improve.cjs`: 校验 `self_improve_todo.md`, `self_improve_status.md`, `self_improve_quality.md` 的最小结构
- `mem0_capture.js`: 手动触发 Mem0 抽取
- `mem0_bridge.js`: 将 Mem0 结果写入 daily memory

## Star Office

- `star-office-state.ps1`: 同步 Star Office 看板状态
- `start-star-office.ps1`, `stop-star-office.ps1`
- `launch-star-office.cmd`, `autostart-star-office.cmd`, `register-star-office-autostart.ps1`

## Maintenance

- `backup_openclaw.ps1`: 本地备份入口

## Rule

- 新增脚本优先放这里，而不是散落到根目录。
- 任何会影响治理规则的脚本，都要在对应文档中留入口。
