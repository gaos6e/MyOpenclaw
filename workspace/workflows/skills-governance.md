# Skills 治理流程（入场/更新）

## 适用范围
- 新安装或更新的 skills（来源：ClawHub、zip、npx 等）
- 目录统一：`C:\Users\20961\.openclaw\workspace\skills`

## 流程（最短路径）
1. **清单入库**：记录 skill 名称/版本/来源/日期
2. **静态检查**（优先）：
   - 读取 `SKILL.md`（依赖 bins/env/config）
   - 若存在安装脚本/可执行文件，确认路径
3. **风险标注**：
   - 高/中/低：是否含外部网络、写盘、系统命令
4. **依赖核对**：
   - bins/env/config 是否满足
5. **运行级自检**（空闲时）：
   - 仅跑官方提供的最小命令或 demo
6. **结论记录**：
   - 结果写入 `self_improve_status.md`（done/blocked）

## 产物
- `self_improve_status.md`：记录执行状态与结论
- `self_improve_todo.md`：无法当下执行的事项

## 风险评级示例
- 高：含外部网络/写盘/系统命令
- 中：依赖外部 API 或多依赖
- 低：纯文档/只读

## 记录字段（建议）
- 名称/版本/来源（ClawHub slug 或 zip 文件名）
- 检查日期/结论

## 频率建议
- 新增/更新即检查
- 每周复查一次高风险技能
