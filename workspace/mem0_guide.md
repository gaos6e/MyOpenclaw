# Mem0 集成说明（轻量版）

## 作用
- 自动抽取对话中的偏好/事实/决策
- 作为“自动抽取层”补充到现有记忆体系

## 依赖
- 环境变量：`MEM0_API_KEY`
- 已安装：`mem0ai`（npm 包）

## 使用方式
### 手动触发（最小可用）
```bash
node scripts/mem0_capture.js "用户偏好深色模式" --user xiaogao
```

### 自动落盘（建议）
```bash
node scripts/mem0_bridge.js "本次对话摘要" --user xiaogao
```

### 推荐组织方式
- **Mem0 只负责抽取**
- 结果先写入当日 `memory/YYYY-MM-DD.md`
- 再人工挑选沉淀到 `MEMORY.md`

## 注意
- Mem0 可能误抽，建议先人工筛选再落盘
- 自动化写入可后续再启用（避免噪音）
