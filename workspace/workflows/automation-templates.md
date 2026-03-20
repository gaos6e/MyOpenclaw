# 自动化工作流模板（n8n + automation-workflows）

## 目标
将高频流程模板化：可重复、可追踪、可审计。

## 推荐模板
### 1) Skills 入场/更新检查
- 触发：新增/更新 skill
- 步骤：读取 SKILL.md → 依赖检查 → 风险标注 → 记录
- 输出：self_improve_status.md / self_improve_todo.md

### 2) 运行级自检
- 触发：空闲窗口/每日低峰
- 步骤：读取每个 skill 的最小命令 → 执行 → 记录
- 输出：自检报告 + status 更新

### 3) 周度质量回顾
- 触发：每周
- 步骤：聚合 self_improve_quality.md → 选 Top3 问题
- 输出：周度总结

## 连接方式（建议）
- 使用 n8n-workflow-automation 生成 n8n JSON
- 用 automation-workflows 保持模板结构统一
- n8n JSON 保存到 `workspace/workflows/n8n/`

## 触发频率建议
- Skills 入场/更新检查：随更新触发
- 运行级自检：每日低峰
- 周度质量回顾：每周固定一天

## 注意
- 先记录再执行，避免遗漏
- 任何新增计划必须告知用户
