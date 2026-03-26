# PD 项目（workspace 维护区）

目标：把 NotebookLM 里的 PD 项目信息做成**可长期维护**的“项目记忆 + 同步机制”，便于后续随项目演进持续更新。

## 目录
- `pd.notebook.json`：NotebookLM notebook 元信息（notebook_id 等）
- `sources.json`：source 清单（id + title）
- `sync.md`：同步流程（怎么增量同步、怎么记录变更）
- `project_brief.md`：项目画像（我从 sources 中抽取并重建的结构化理解）
- `open_questions.md`：当前需要你确认/补充的点
- `changelog.md`：每次同步/理解更新的变更记录

## 约定
- 以后你说“同步PD” → 我会：刷新 sources 列表 → 检查新增/删除/标题变化 → 重新抽取关键变更 → 更新 `project_brief.md` 与 `changelog.md`。
- 任何不确定的地方，会先在 `open_questions.md` 记录并先问你确认再做大改。
