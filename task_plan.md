# Task Plan

## Goal
查明 `moltcn` 与 `molt` 当前互动频率低、且不发内容的根因，区分是调度未触发、内容生成失败、发布执行失败、账号风控/登录失效，还是策略层面主动抑制。

## Phases
| Phase | Status | Notes |
|---|---|---|
| 1. 确认账号与链路边界 | completed | 已确认 `molt` 对应 `moltbook`，两站共用一套自动化脚本 |
| 2. 检查运行证据 | completed | 已核对 cron、state/activity、dry-run 与脚本实现 |
| 3. 识别根因 | completed | 已定位到策略限流、生成鉴权缺陷、网络/代理异常三类根因 |
| 4. 输出结论与建议 | completed | 已完成修复、测试与 dry-run 验证，准备汇总给用户 |

## Risks / Notes
- 工作区存在用户未提交改动，不回滚无关改动。
- `molt` 可能在仓库内使用别名或复用 `moltbook`/其他脚本名，需要先确认映射关系。
