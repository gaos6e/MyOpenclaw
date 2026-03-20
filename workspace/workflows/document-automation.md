# 文档/表格自动化流程（document-pro + office-automation）

## 目标
统一文档/表格处理链：提取 → 结构化 → 汇总 → 输出。

## 适用类型
- PDF / DOCX / PPTX / XLSX

## 流程
1) **输入准备**
- 原始文件放到 `D:\桌面\openclaw`（临时）
- 需要处理时复制到 workspace

2) **解析/提取**（document-pro）
- 提取结构化文本
- 识别标题/段落/表格

3) **表格处理**（office-automation）
- 统一字段
- 清洗/去重
- 汇总指标

4) **输出**
- 输出到 `workspace/outputs/`（如 report_YYYYMMDD.md / report_YYYYMMDD.xlsx）
- 若目录不存在，先创建
- 重要结论写入日志

## 注意
- 若来源文件较大，优先分批
- 含敏感信息的输出需用户确认
