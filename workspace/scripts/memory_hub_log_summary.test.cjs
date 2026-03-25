const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const scriptPath = path.join(repoRoot, "workspace", "scripts", "memory_hub_log_summary.cjs");

test("memory hub log summary aggregates daily hit rate and miss types", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "memory-hub-summary-"));
  const logPath = path.join(tempRoot, "memory-hub.jsonl");
  const lines = [
    {
      ts: "2026-03-25T02:00:00.000Z",
      event: "memory_extract_candidates",
      candidateCount: 2,
      schemaKeys: ["preferred_address", "notify_before_self_improve"],
      stats: {
        textsTotal: 1,
        segmentsTotal: 4,
        candidatesTotal: 2,
        droppedTooShort: 0,
        droppedTooLong: 0,
        droppedTooling: 1,
        droppedUnmatched: 1,
        droppedDuplicate: 0,
        schemaHits: 2,
        heuristicHits: 0,
        missBuckets: {
          reporting_rule: 1,
        },
      },
    },
    {
      ts: "2026-03-25T08:00:00.000Z",
      event: "memory_extract_candidates",
      candidateCount: 1,
      schemaKeys: ["important_files_path"],
      stats: {
        textsTotal: 2,
        segmentsTotal: 5,
        candidatesTotal: 1,
        droppedTooShort: 0,
        droppedTooLong: 1,
        droppedTooling: 0,
        droppedUnmatched: 3,
        droppedDuplicate: 0,
        schemaHits: 1,
        heuristicHits: 0,
        missBuckets: {
          model_setting: 2,
          path_rule: 1,
        },
      },
    },
  ];
  fs.writeFileSync(logPath, `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`, "utf8");

  const result = spawnSync(process.execPath, [scriptPath, "--log", logPath, "--date", "2026-03-25", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.date, "2026-03-25");
  assert.equal(summary.totals.runs, 2);
  assert.equal(summary.totals.candidates, 3);
  assert.equal(summary.totals.eligibleSegments, 7);
  assert.equal(summary.totals.hitRate, 3 / 7);
  assert.deepEqual(summary.commonMissTypes.slice(0, 3), [
    { type: "model_setting", count: 2 },
    { type: "path_rule", count: 1 },
    { type: "reporting_rule", count: 1 },
  ]);
  assert.deepEqual(summary.schemaHits, [
    { key: "important_files_path", count: 1 },
    { key: "notify_before_self_improve", count: 1 },
    { key: "preferred_address", count: 1 },
  ]);
  assert.deepEqual(summary.recommendations, [
    "Top miss bucket `model_setting` suggests adding or refining canonical extractors for this rule family.",
    "Hit rate is below 0.5; review unmatched segments before expanding schema coverage further.",
  ]);
});
