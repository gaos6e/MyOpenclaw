const fs = require("node:fs");
const path = require("node:path");

const DIMENSIONS = [
  "Understanding",
  "Execution",
  "Retrieval",
  "Reasoning",
  "Reflection",
  "Tooling",
  "EQ",
  "Memory",
];

const IMPROVEMENT_GUIDE = {
  Understanding: "优先优化任务复述和约束识别。开工前先说清楚你理解了什么、先查什么、范围是什么。",
  Execution: "优先优化端到端完成率。减少半截交付，补验证命令、结果说明和失败时的真实状态。",
  Retrieval: "优先优化证据链。官方源优先，必要时再补权威媒体，并明确来源和时间窗口。",
  Reasoning: "优先优化取舍说明。给出明确优先级、理由和为什么不是别的方案。",
  Reflection: "优先优化自检与诚实表达。区分已知和推断，先验证再下完成结论。",
  Tooling: "优先优化工具选择与降级路径。高频动作加测试，工具失败时有稳定 fallback。",
  EQ: "优先优化协作语气。支持但不盲从，风险高时再问，其余情况主动推进。",
  Memory: "优先优化记忆边界。长期事实进 MEMORY.md，流程规则去 AGENTS/TOOLS，项目上下文先看本地入口文件。",
};

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function loadCaseBank(filePath) {
  return loadJson(filePath);
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function isNegatedMatch(text, startIndex) {
  const prefix = text.slice(Math.max(0, startIndex - 8), startIndex);
  return /(不|没|無|无|别|避免|不会|不要|不是)\s*$/.test(prefix);
}

function matchedPatterns(answer, patterns, options = {}) {
  const text = normalizeText(answer);
  const ignoreNegated = options.ignoreNegated === true;
  return patterns.filter((pattern) => {
    const index = text.indexOf(pattern);
    if (index === -1) {
      return false;
    }
    if (ignoreNegated && isNegatedMatch(text, index)) {
      return false;
    }
    return true;
  });
}

function roundScore(value) {
  return Math.round(value * 10000) / 10000;
}

function computeCaseScore({ answer, rubric }) {
  const required = rubric.required ?? [];
  const bonus = rubric.bonus ?? [];
  const forbidden = rubric.forbidden ?? [];

  const matchedRequired = matchedPatterns(answer, required);
  const matchedBonus = matchedPatterns(answer, bonus);
  const matchedForbidden = matchedPatterns(answer, forbidden, { ignoreNegated: true });

  const requiredRatio = required.length === 0 ? 1 : matchedRequired.length / required.length;
  const bonusRatio = bonus.length === 0 ? 0 : matchedBonus.length / bonus.length;
  const forbiddenPenalty = forbidden.length === 0 ? 0 : matchedForbidden.length / forbidden.length;

  const score = roundScore(
    Math.max(0, Math.min(1, 0.75 * requiredRatio + 0.2 * bonusRatio + 0.05 - 0.35 * forbiddenPenalty)),
  );

  return {
    score,
    matchedRequired,
    matchedBonus,
    matchedForbidden,
  };
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function classifyGrade(score) {
  if (score >= 0.92) return "S";
  if (score >= 0.86) return "A+";
  if (score >= 0.8) return "A";
  if (score >= 0.74) return "A-";
  if (score >= 0.68) return "B+";
  if (score >= 0.62) return "B";
  if (score >= 0.56) return "B-";
  if (score >= 0.5) return "C+";
  if (score >= 0.44) return "C";
  return "C-";
}

function buildImprovementPlan(dimensionBreakdown) {
  return [...dimensionBreakdown]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((item) => ({
      dimension: item.dimension,
      score: item.score,
      advice: IMPROVEMENT_GUIDE[item.dimension] ?? "优先补测试、补约束、补验证。",
    }));
}

function compareSummaries({ before, after }) {
  const dimensionSet = new Set([
    ...(before.dimensionBreakdown ?? []).map((item) => item.dimension),
    ...(after.dimensionBreakdown ?? []).map((item) => item.dimension),
  ]);

  const dimensionDeltas = [...dimensionSet]
    .map((dimension) => {
      const beforeScore = before.dimensionBreakdown?.find((item) => item.dimension === dimension)?.score ?? 0;
      const afterScore = after.dimensionBreakdown?.find((item) => item.dimension === dimension)?.score ?? 0;
      return {
        dimension,
        before: beforeScore,
        after: afterScore,
        delta: roundScore(afterScore - beforeScore),
      };
    })
    .sort((a, b) => b.delta - a.delta);

  return {
    overallDelta: {
      before: before.overallScore ?? 0,
      after: after.overallScore ?? 0,
      delta: roundScore((after.overallScore ?? 0) - (before.overallScore ?? 0)),
    },
    gradeDelta: {
      from: before.grade ?? "N/A",
      to: after.grade ?? "N/A",
    },
    dimensionDeltas,
  };
}

function scoreResponses({ caseBank, responses }) {
  const caseResults = caseBank.map((item) => {
    const answer = normalizeText(responses[item.id]);
    const result = computeCaseScore({
      answer,
      rubric: item.rubric ?? {},
    });
    return {
      id: item.id,
      dimension: item.dimension,
      title: item.title,
      answer,
      ...result,
    };
  });

  const dimensionBreakdown = DIMENSIONS
    .filter((dimension) => caseResults.some((item) => item.dimension === dimension))
    .map((dimension) => {
      const rows = caseResults.filter((item) => item.dimension === dimension);
      return {
        dimension,
        score: roundScore(average(rows.map((item) => item.score))),
        caseCount: rows.length,
      };
    });

  const overallScore = roundScore(average(dimensionBreakdown.map((item) => item.score)));
  const grade = classifyGrade(overallScore);
  const improvementPlan = buildImprovementPlan(dimensionBreakdown);

  return {
    overallScore,
    grade,
    dimensionBreakdown,
    caseResults,
    improvementPlan,
  };
}

function formatPercent(score) {
  return `${Math.round(score * 100)}%`;
}

function renderMarkdownReport(summary) {
  const lines = [
    "# Clawvard Local Eval Report",
    "",
    `- Overall score: ${formatPercent(summary.overallScore)}`,
    `- Grade: ${summary.grade}`,
    "",
    "## Dimension Breakdown",
  ];

  for (const item of summary.dimensionBreakdown) {
    lines.push(`- ${item.dimension}: ${formatPercent(item.score)}`);
  }

  lines.push("", "## Improvement Priorities");
  for (const item of summary.improvementPlan) {
    lines.push(`- ${item.dimension}: ${formatPercent(item.score)} — ${item.advice}`);
  }

  lines.push("", "## Case Results");
  for (const item of summary.caseResults) {
    lines.push(`- ${item.id} (${item.dimension}): ${formatPercent(item.score)}`);
  }

  lines.push("");
  return lines.join("\n");
}

function renderComparisonReport(comparison) {
  const lines = [
    "# Clawvard Local Eval Comparison",
    "",
    `- Overall: ${formatPercent(comparison.overallDelta.before)} -> ${formatPercent(comparison.overallDelta.after)} (${comparison.overallDelta.delta >= 0 ? "+" : ""}${Math.round(comparison.overallDelta.delta * 100)} pts)`,
    `- Grade: ${comparison.gradeDelta.from} -> ${comparison.gradeDelta.to}`,
    "",
    "## Dimension Deltas",
  ];

  for (const item of comparison.dimensionDeltas) {
    lines.push(
      `- ${item.dimension}: ${formatPercent(item.before)} -> ${formatPercent(item.after)} (${item.delta >= 0 ? "+" : ""}${Math.round(item.delta * 100)} pts)`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

function parseArgValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return args[index + 1] ?? null;
}

function initTemplate(repoRoot) {
  const templatePath = path.join(repoRoot, "workspace", "clawvard-eval", "responses.template.json");
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }
  return templatePath;
}

function main(argv = process.argv.slice(2)) {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const workspaceRoot = path.join(repoRoot, "workspace");
  const caseBankPath = path.join(workspaceRoot, "clawvard-eval", "cases.json");
  const command = argv[0];

  if (!command || command === "help" || command === "--help") {
    console.log([
      "Usage:",
      "  node scripts\\clawvard_eval.cjs init",
      "  node scripts\\clawvard_eval.cjs score --responses <file> [--json] [--report <file>]",
    ].join("\n"));
    return;
  }

  if (command === "init") {
    console.log(initTemplate(repoRoot));
    return;
  }

  if (command === "score") {
    const responsesArg = parseArgValue(argv, "--responses");
    if (!responsesArg) {
      throw new Error("Missing required --responses <file>");
    }
    const responsesPath = path.resolve(process.cwd(), responsesArg);
    const responses = loadJson(responsesPath);
    const caseBank = loadCaseBank(caseBankPath);
    const summary = scoreResponses({ caseBank, responses });
    const reportPath = parseArgValue(argv, "--report");
    const wantsJson = argv.includes("--json");

    if (reportPath) {
      writeText(path.resolve(process.cwd(), reportPath), renderMarkdownReport(summary));
    }

    if (wantsJson) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    console.log(renderMarkdownReport(summary));
    return;
  }

  if (command === "compare") {
    const beforeArg = parseArgValue(argv, "--before");
    const afterArg = parseArgValue(argv, "--after");
    if (!beforeArg || !afterArg) {
      throw new Error("compare requires --before <file> and --after <file>");
    }
    const caseBank = loadCaseBank(caseBankPath);
    const before = scoreResponses({
      caseBank,
      responses: loadJson(path.resolve(process.cwd(), beforeArg)),
    });
    const after = scoreResponses({
      caseBank,
      responses: loadJson(path.resolve(process.cwd(), afterArg)),
    });
    const comparison = compareSummaries({ before, after });
    const reportPath = parseArgValue(argv, "--report");
    const wantsJson = argv.includes("--json");

    if (reportPath) {
      writeText(path.resolve(process.cwd(), reportPath), renderComparisonReport(comparison));
    }
    if (wantsJson) {
      console.log(JSON.stringify(comparison, null, 2));
      return;
    }
    console.log(renderComparisonReport(comparison));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  DIMENSIONS,
  computeCaseScore,
  scoreResponses,
  classifyGrade,
  buildImprovementPlan,
  compareSummaries,
  loadCaseBank,
  renderMarkdownReport,
  renderComparisonReport,
  main,
};
