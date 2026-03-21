# Mem0 集成说明（轻量版）

## 作用
- 作为“手动/实验性候选抽取层”补充到现有记忆体系
- 默认目标是写入 `memory/inbox/*.jsonl`，而不是直接改 `MEMORY.md`

## 依赖
- 环境变量：`MEM0_API_KEY`
- 已安装：`mem0ai`（npm 包）

## 使用方式
### 手动触发（最小可用）
```bash
node scripts/mem0_capture.js "用户偏好深色模式" --user xiaogao
```

### 候选落盘（建议）
```bash
openclaw memory-hub extract --source "本次对话摘要"
```

### 推荐组织方式
- **默认正式闭环使用 memory-hub**
- **Mem0 只负责手动/实验性抽取**
- 结果先写入 `memory/inbox/*.jsonl`
- 再人工挑选沉淀到 `MEMORY.md`
- daily memory 结构以 `memory/README.md` 和 `memory/TEMPLATE.md` 为准

## 注意
- 抽取结果可能误判，建议先人工筛选再 promote
- 自动化抽取只进入 inbox，不直接写长期记忆
- `mem0_capture.js` 可直接在当前 workspace Node 环境执行
- `mem0_bridge.js` 仅保留作兼容/实验用途，已不属于默认自我提升流程
