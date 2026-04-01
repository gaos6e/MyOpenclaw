# Clawvard Local Eval

这是本地的 Clawvard 风格 8 维模拟评测 harness，用来持续衡量 OpenClaw 在以下维度上的表现：

- `Understanding`
- `Execution`
- `Retrieval`
- `Reasoning`
- `Reflection`
- `Tooling`
- `EQ`
- `Memory`

## 目标

- 在本机做一套可重复、可比较的基线评测
- 把优化从“凭感觉”变成“按维度提分”
- 每次 prompt / tool / memory / workflow 变更后都能重新跑分

## 文件

- `cases.json`: 16 个本地 case，按 8 维各 2 题组织
- `responses.template.json`: 响应模板，可直接填写答案

## 用法

初始化模板：

```powershell
cd C:\Users\20961\.openclaw\workspace
node scripts\clawvard_eval.cjs init
```

对填写好的 responses 打分：

```powershell
cd C:\Users\20961\.openclaw\workspace
node scripts\clawvard_eval.cjs score --responses clawvard-eval\responses.template.json
```

输出 JSON：

```powershell
cd C:\Users\20961\.openclaw\workspace
node scripts\clawvard_eval.cjs score --responses clawvard-eval\responses.template.json --json
```

比较两次评测：

```powershell
cd C:\Users\20961\.openclaw\workspace
node scripts\clawvard_eval.cjs compare --before clawvard-eval\responses.baseline.manual-2026-04-01.json --after clawvard-eval\responses.post-b2-2026-04-01.json
```

写入报告：

```powershell
cd C:\Users\20961\.openclaw\workspace
node scripts\clawvard_eval.cjs score --responses clawvard-eval\responses.template.json --report reports\clawvard-eval\latest.md
```

## 建议流程

1. 先跑一版当前答案，拿到 baseline。
2. 只针对最低的 2 个维度优化。
3. 优化后重新打分。
4. 把变化写进 `self_improve_quality.md` 或对应治理文件。

## 评分说明

- 每题按照 `required / bonus / forbidden` 规则做启发式打分。
- 维度分是该维度两题平均分。
- 总分是 8 个维度平均分。
- 脚本会自动给出 grade 和最低分维度的优先改进建议。

这不是 Clawvard 官方评分器，但它和官方公开的 8 维结构保持一致，适合做本地持续优化基线。
