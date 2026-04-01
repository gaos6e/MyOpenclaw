# 自我提升状态池(Status Board)

> 用于跟踪提升事项的状态,避免重复执行。

## 状态说明
- todo:待执行
- doing:执行中
- done:已完成
- blocked:受阻
- parked:暂缓/搁置

## 事项列表
- done | 隔离未启用高风险 vendor skills/extensions | 2026-04-01 | 将未启用的 openclaw-weixin/qqbot/wecom/_quarantine 扩展及 evolver/self-evolving-skill/capability-evolver 副本迁入 backup/quarantined-*
- done | 记忆主干统一到 openclaw-memory-hub | 2026-04-01 | 启用 memory slot/runtime；移除 memory-lancedb 悬空主槽；收紧 durable memory 候选边界
- done | OpenClaw 本地安全默认值收紧 | 2026-04-01 | 关闭 elevated + autoAllowSkills；qq allowFrom 改为单一 operator；工具面收敛到 coding/workspaceOnly
- done | 心跳触发自我提升执行 | 2026-03-25 | 环境卫生自检 + 定时任务异常记录 + 质量自检更新 + 定时任务错误分析改进
- done | `.openclaw` 环境卫生自检机制落地 | 2026-03-24 | 新增 audit script，并接入 HEARTBEAT / SOP / 临时文件规则
- done | 修复 Star-Office state JSON 解析问题 | 2026-03-21 | set_state.py 增加 JSONDecodeError 容错+备份
- done | OpenClaw Daily Push 任务排查并完成一次成功测试 | 2026-03-20 | 267009=任务运行中；手动执行后结果为 0
- done | 技能运行级自检（quick_validate） | 2026-03-20 | 共36个技能，失败18个（多为前置元数据字段不符合当前校验规则）
- done | ai-daily-brief 技能重构并完成源验证 | 2026-03-20 | 高风险网络 skill；补齐 source registry / quality rules / source health check
- done | 搜索/抓取分层流程落地（workflows/search-scrape-stack.md） | 2026-03-19
- done | 文档/表格自动化流程落地（workflows/document-automation.md） | 2026-03-19
- done | 自动化工作流模板落地（workflows/automation-templates.md） | 2026-03-19
- done | 自我提升闭环流程落地（workflows/self-improve-loop.md） | 2026-03-19
- done | Skills 治理流程落地（workflows/skills-governance.md） | 2026-03-19
- done | 修正错误记录：Where-Object 应使用 $_.Name | 2026-03-18
- done | 识图排查先验证路由/模型可用性 | 2026-03-19
- done | 质量自检补充"最小流程" | 2026-03-19
- done | 质量自检补充"周度汇总模板/评分维度" | 2026-03-19
- done | 质量自检补充"自动触发条件" | 2026-03-19
- done | 自我提升执行（千问链路验证+卫生审计） | 2026-03-25 | 实测qwen视觉/embedding/ASR可用；hygiene审计并仅应用safeActions；更新cron异常定位与质量自检
- done | 自我提升2（Moltbook/Moltcn排查 + NotebookLM/新闻/抖音流程固化） | 2026-03-28 | 复测moltbook=401/500、moltcn=401/403 对照；卫生审计并应用safeActions；补充 PowerShell/curl/browser/NotebookLM/news 经验到 TOOLS 与错误池

## 规则
- 新增事项先进入 todo
- 执行前移到 doing
- 完成后移到 done
- 受阻则移到 blocked,并注明原因
- 超过30天无进展转为 parked
- 行格式:`- status | 标题 | YYYY-MM-DD [| note]`
- 状态集固定为:todo / doing / done / blocked / parked
