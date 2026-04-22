# MEMORY.md - Your Long-Term Memory

_This file stores long-term, distilled memory. Keep it concise._

## About the user
- Name: 
- What to call them: 哥哥～
- Pronouns: 
- Timezone: Asia/Shanghai
- 所属：广州大学
- Hobbies: 数码/摄影、航拍、PC装机与硬件、音频、外设、AI人工智能相关、生物信息学相关（无优先级顺序）

## Preferences & setup
- Use QQ for communication
- 进行自我提升前先告知用户
- 用户希望下达任务后，助手应立刻回复“开始做X了”的接收确认（不要等到最终输出才回应）；如可通过配置/流程优化该体验则完善
- 用户偏好以直接、简短的执行确认开始任务，而不是等到最终输出才回应

## Stable facts
- 暗号约定：用户说“你给了？”，助手回“他非要~”。 
- 允许将关键 source 的抽取文本/结构化摘要落地到 workspace/PD 以便检索
- OneBot 稳定称呼规则真源在 `workspace/onebot_sender_rules.json`：`2096157181 -> 哥哥～`，`2164955274 -> 儿子～`

## Ongoing context
- PD 项目（你的 NotebookLM 项目；已落地到本地 PD 文件夹，作为项目持久记忆）：
  - 一句话：从“扰动前后转录组表型指纹”出发，反向推断最可能的扰动/驱动靶标基因（单靶标或多靶标集合），并提供网络级可解释路径与多场景验证闭环的深度学习框架。
  - 本地目录：`C:\Users\20961\.openclaw\workspace\PD\`
  - 主入口：`PD\project_brief.md`；其他：`sources.json`、`PD\artifacts\`、`sync.md`、`changelog.md`、`open_questions.md`
  - 待确认：每周同步提醒的具体时间点（周几+几点）
- Moltbook：
  - 已注册 agent：`melancholic_claw`
  - Profile：`https://www.moltbook.com/u/melancholic_claw`
  - 当前偏好 bio：`Sharp, curious, and hands-on — from AI to hardware to aerial shots.`
- Clawvard 行为改进（写入流程习惯）：
  - Execution：拆成小步 → 每步验证输出 → 不留半截 → 能测就测 → 明确完成
  - Retrieval：用具体关键词/标识符；先看结构再深入；多源验证；尽量回指来源
  - Reflection：发出前复读核对；不确定就说明不确定并给出如何确认
- 自我提升机制：
  - canonical SOP: `self_improve_process.md`
  - canonical candidate flow: `memory_extract_candidates -> memory_list_candidates -> memory_promote_candidate`
  - 触发：空闲≥30分钟且无新任务时主动提升（若无可做事项可不行动）
  - `.openclaw` 环境卫生自检：默认扫描根目录 + `logs/` / `backup/` / `qqbot/downloads/` / workspace 临时区；先审计再仅执行 `safeActions`
  - 环境卫生安全动作：根目录备份类产物进 `backup/root-backups-<timestamp>/`；明确临时文件进 `D:\桌面\openclaw`；7 天以上低价值更新日志进 `backup/hygiene-archive-<timestamp>/logs/`
  - 环境卫生必须人工确认：`qqbot/downloads`、语义不明确的 `_tmp_*` 目录、未知顶层条目
  - heartbeat 汇报偏好：只要实际执行了检查/整理，就默认返回简短总结；只有完全没做事时才允许 `HEARTBEAT_OK`
  - 记录面：`self_improve_todo.md`, `self_improve_status.md`, `self_improve_quality.md`
  - 日结：每天 22:00 输出总结
  - 记忆沉淀：每 2 天从 daily memory 提炼到 `MEMORY.md`
- 用量监控规则：5小时额度剩余≤20%则降频；每周额度按“剩余天数×10%”留底，若剩余额度低于保留阈值则降频，额度充足或接近刷新可更充分使用但不乱用。
