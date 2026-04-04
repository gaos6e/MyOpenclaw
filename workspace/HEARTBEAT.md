# HEARTBEAT.md

> 这里只保留执行清单。定义、状态规则、记录格式以 `self_improve_process.md` 为准。

# 自我提升执行清单（触发：空闲≥30分钟且无新任务）
# 说明：这里只放“可漂移”的周期检查；固定时间点（如 22:00 总结）用 cron。

## 触发前检查（不满足则跳过）
- [ ] 最近30分钟无新消息/无未完成任务
- [ ] 本次确有可执行事项（无则跳过）

## 执行清单
- [ ] 错误池复盘：优先查看 .learnings/ERRORS.md / .learnings/LEARNINGS.md，提炼 1 条可改进点
- [ ] 待做池清理：优先处理 self_improve_todo.md 中的事项，并维护 self_improve_status.md 状态
- [ ] 环境卫生自检：先运行 `node scripts/openclaw_hygiene_audit.cjs --json` 审计 `.openclaw` 根目录 + `logs/` / `backup/` / `qqbot/downloads/` / workspace 临时区；仅对 `safeActions` 运行 `--apply-safe --archive-age-days 7`，`askFirst` / `reportOnly` 只记录不自动处理
- [ ] 定时任务/设置：核对新增/失效/重复项 → 必要时修正，并记录到 .learnings/ERRORS.md
- [ ] 文档流程：聚焦 1 个文档/skill，提炼 1 条可执行改进 → 落盘到 AGENTS.md / TOOLS.md
- [ ] 偏好复盘：必要时补充 1 条最重要偏好到 `MEMORY.md`（本地 curated archive）
- [ ] 改进点执行：发现即做；若受阻，记录一次并在日结说明
- [ ] 社区扫描：给 1–3 个候选 + 简短理由（先询问再安装）
- [ ] 用量趋势复盘：检查最近用量/额度变化，必要时调整降频策略
- [ ] 响应质量自检：抽查 1–2 次近期答复，记录到 self_improve_quality.md（含优先级+处理动作）
- [ ] Hindsight 状态复盘：检查插件是否正常加载、外部 API 是否可达；若失败则记录到 status/todo
- [ ] 本地 archive 候选抽取（仅在需要维护 `MEMORY.md` 时执行）：通过 `memory_extract_candidates` 做轻量抽取 → 写入 `memory/inbox/*.jsonl`
- [ ] 本地 archive 审核与沉淀：必要时用 `memory_list_candidates` / `memory_promote_candidate` 审核并提升到 `MEMORY.md`
- [ ] 风险/异常复盘：查看近期错误或失败记录，产出 1 条避免复发的行动

## 执行后动作
- [ ] 只要实际执行了任一项检查/整理，就必须汇报简短总结（做了什么 / 结果如何 / 是否需用户输入）
- [ ] 即使结果是“未发现异常”也要简短汇报；只有完全没执行任何动作时才回复 `HEARTBEAT_OK`
- [ ] 安全归档/迁移发生时：在 self_improve_status.md 留 1 条记录；需要人工确认的项写入 self_improve_todo.md；若反复误放则补 1 条 self_improve_quality.md
- [ ] 如修改了治理文件，必要时运行 `node scripts/validate-self-improve.cjs`

# 固定时间点任务（已创建）
# - 22:00 日结：提升≤10条、未执行事项≤10条、社区扫描结论
