# PD 同步流程（NotebookLM → workspace/PD）

## 触发
- 手动：你说“同步PD”
- 自动（待你确认频率）：每日/每周定时检查（只做差异摘要，避免打扰）

## 同步步骤（标准）
1) `notebook_get` 拉取 notebook 元信息 + sources 列表
2) 与 `sources.json` 对比：新增/删除/标题变化
3) 对“项目核心 sources”优先抽取：
   - PD项目主文档、项目背景、工作日志、结果（genetic/chemical/compare）、去年项目文档
4) 更新落盘：
   - `sources.json`（始终覆盖为最新列表）
   - `project_brief.md`（只在内容确实变化时更新，保持结构稳定）
   - `changelog.md`（追加记录）
   - `open_questions.md`（追加/关闭问题）

## 输出规范（长期可维护）
- `project_brief.md` 结构固定：
  1. 一句话定义
  2. 背景/动机
  3. 目标与成功指标
  4. 技术方案（数据/模型/训练/评估/可解释性）
  5. 进展（已做/在做/待做）
  6. 关键决策与理由
  7. 风险与应对
  8. 下一步 2-4 周计划
- 每条关键结论尽量标注来源（source 标题）。
