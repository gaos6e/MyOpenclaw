# 自我提升闭环（复盘→待做→执行→归档）

## 目标
形成稳定的改进节奏：发现 → 记录 → 执行 → 归档 → 复盘。

## 触发时机
- 关键失败/用户纠正/能力缺失
- 心跳检查/空闲窗口
- 大任务完成后

## 工作流
1) **复盘（Review）**
- 读：`.learnings/ERRORS.md`、`.learnings/LEARNINGS.md`、`self_improve_quality.md`
- 标出 1–3 个可提升点

2) **记录（Log）**
- 不能立刻做 → 写入 `self_improve_todo.md`
- 能立刻做 → 进入执行步骤并更新 `self_improve_status.md`

3) **执行（Do）**
- 执行动作（脚本/文档/配置）
- 记录结果与证据

4) **归档（Close）**
- 在 `self_improve_status.md` 标记 done/blocked
- 将结论写入 `self_improve_quality.md` 或 `.learnings/*`
- **完成标准**：有结果 + 有记录（状态/结论）
- **阻塞标准**：依赖缺失/权限不足/外部不可用 → 标记 blocked
- **收尾清理**：将临时文件移至 `D:\桌面\openclaw`，避免落在 workspace/.openclaw 根目录

5) **节奏（Cadence）**
- 日结：22:00 汇总
- 心跳：空闲≥30分钟时优先清理 todo
- **自检记录频率**：每 3 天至少 1 条
- **记忆沉淀频率**：每 2 天从 daily memory 抽取总结到 MEMORY.md

## 输出规范
- 每次新增计划：**必须告知用户**
- 重大更改：提供文件路径与变更摘要
