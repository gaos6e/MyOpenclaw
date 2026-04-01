const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  DIMENSIONS,
  computeCaseScore,
  scoreResponses,
  classifyGrade,
  buildImprovementPlan,
  loadCaseBank,
  compareSummaries,
} = require("./clawvard_eval.cjs");

test("case bank covers 16 cases across the 8 Clawvard dimensions", () => {
  const caseBank = loadCaseBank(path.resolve(__dirname, "..", "clawvard-eval", "cases.json"));
  assert.equal(caseBank.length, 16);

  const counts = new Map();
  for (const item of caseBank) {
    counts.set(item.dimension, (counts.get(item.dimension) ?? 0) + 1);
  }

  assert.deepEqual(
    DIMENSIONS.map((dimension) => [dimension, counts.get(dimension) ?? 0]),
    DIMENSIONS.map((dimension) => [dimension, 2]),
  );
});

test("computeCaseScore rewards required and bonus signals while penalizing forbidden patterns", () => {
  const rubric = {
    required: ["先复述目标", "给出验证命令"],
    bonus: ["说明风险"],
    forbidden: ["应该可以", "大概"],
  };

  const strong = computeCaseScore({
    answer: "先复述目标，再给出验证命令，并说明风险。",
    rubric,
  });
  const weak = computeCaseScore({
    answer: "应该可以，先复述目标。",
    rubric,
  });

  assert.ok(strong.score > weak.score);
  assert.equal(strong.matchedRequired.length, 2);
  assert.equal(weak.matchedForbidden.length, 1);
});

test("computeCaseScore does not penalize forbidden phrases when they are explicitly negated", () => {
  const rubric = {
    required: ["先写失败测试"],
    bonus: ["再验证通过"],
    forbidden: ["先改代码再补测试"],
  };

  const result = computeCaseScore({
    answer: "我会先写失败测试，再验证通过，不会先改代码再补测试。",
    rubric,
  });

  assert.equal(result.matchedForbidden.length, 0);
  assert.ok(result.score > 0.8);
});

test("scoreResponses returns dimension breakdown, overall score, grade, and improvement plan", () => {
  const caseBank = [
    {
      id: "u1",
      dimension: "Understanding",
      prompt: "理解需求",
      rubric: { required: ["复述"], bonus: [], forbidden: ["误解"] },
    },
    {
      id: "u2",
      dimension: "Understanding",
      prompt: "确认约束",
      rubric: { required: ["约束"], bonus: ["目标"], forbidden: [] },
    },
    {
      id: "e1",
      dimension: "Execution",
      prompt: "执行任务",
      rubric: { required: ["完成"], bonus: ["验证"], forbidden: ["未做"] },
    },
    {
      id: "e2",
      dimension: "Execution",
      prompt: "交付结果",
      rubric: { required: ["结果"], bonus: [], forbidden: [] },
    },
  ];

  const responses = {
    u1: "先复述需求，避免误解。",
    u2: "列出约束和目标。",
    e1: "完成实现并验证。",
    e2: "返回结果。",
  };

  const summary = scoreResponses({ caseBank, responses });

  assert.equal(summary.caseResults.length, 4);
  assert.equal(summary.dimensionBreakdown.length, 2);
  assert.ok(summary.overallScore > 0.7);
  assert.equal(summary.grade, classifyGrade(summary.overallScore));
  assert.ok(summary.improvementPlan.length >= 1);
});

test("buildImprovementPlan prioritizes the lowest-scoring dimensions", () => {
  const plan = buildImprovementPlan([
    { dimension: "Execution", score: 0.34 },
    { dimension: "Memory", score: 0.61 },
    { dimension: "Understanding", score: 0.82 },
  ]);

  assert.equal(plan[0].dimension, "Execution");
  assert.match(plan[0].advice, /工具|验证|回归/);
});

test("compareSummaries reports overall and per-dimension deltas", () => {
  const before = {
    overallScore: 0.6,
    grade: "B-",
    dimensionBreakdown: [
      { dimension: "Tooling", score: 0.3 },
      { dimension: "Execution", score: 0.5 },
    ],
  };
  const after = {
    overallScore: 0.8,
    grade: "A",
    dimensionBreakdown: [
      { dimension: "Tooling", score: 0.7 },
      { dimension: "Execution", score: 0.6 },
    ],
  };

  const comparison = compareSummaries({ before, after });

  assert.equal(comparison.gradeDelta.from, "B-");
  assert.equal(comparison.gradeDelta.to, "A");
  assert.ok(Math.abs(comparison.overallDelta.delta - 0.2) < 1e-9);
  assert.deepEqual(comparison.dimensionDeltas[0], {
    dimension: "Tooling",
    before: 0.3,
    after: 0.7,
    delta: 0.4,
  });
});
