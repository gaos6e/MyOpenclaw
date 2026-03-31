# LEARNINGS.md

> 经验池（可复用的做法/原则）。
> 记录格式建议：
> - YYYY-MM-DD | 主题 | 结论/原则 | 适用场景 | 具体做法/检查清单

## 记录
- 2026-03-28 | NotebookLM 产物生成 | 含大量参考文献的 notebook，首次生成 report/mind_map 需优先限制到“核心 source_ids”，避免产物被参考文献主题带偏 | NotebookLM studio/report/mind_map | 先在 notebook_get/source_list 中挑主文档/背景/日志/结果等核心 source_ids；首次生成 artifact 时带上 source_ids；若效果偏，再逐步扩展范围
- 2026-03-28 | 新闻多渠道核实 | 多渠道核实要标注证据强度：全文来源 vs 摘要交叉验证 vs 待判决书确认 | 政治/司法新闻 | 输出结论时显式分层标注；不能把摘要当成同等强度证据
