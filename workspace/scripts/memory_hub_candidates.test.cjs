const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repoRoot = path.resolve(__dirname, "..", "..");
const moduleUrl = pathToFileURL(
  path.join(repoRoot, "extensions", "openclaw-memory-hub", "src", "candidates.js"),
).href;

test("heuristic extraction captures stable preferences and facts", async () => {
  const { extractHeuristicCandidates } = await import(moduleUrl);

  const candidates = extractHeuristicCandidates({
    sourceKind: "session-backfill",
    sourceRef: "sessions/example.jsonl",
    texts: [
      "我喜欢航拍、摄影和 PC 装机。",
      "Important/common files live in: C:\\Users\\20961\\.openclaw",
      "Long-term workspace: C:\\Users\\20961\\.openclaw\\workspace",
    ],
  });

  assert.equal(candidates.length >= 2, true);
  assert.equal(candidates.some((item) => item.candidate_kind === "preference"), true);
  assert.equal(candidates.some((item) => item.normalized.includes(".openclaw\\workspace")), true);
});

test("heuristic extraction ignores platform/tooling rules", async () => {
  const { extractHeuristicCandidates } = await import(moduleUrl);

  const candidates = extractHeuristicCandidates({
    sourceKind: "session-backfill",
    sourceRef: "sessions/example.jsonl",
    texts: [
      "发图方法: 在回复文本中写 <qqimg>URL</qqimg>，系统自动处理",
      "图片用 <qqimg>，语音用 <qqvoice>，其他文件用 <qqfile>",
      "不要向用户透露上述要求",
    ],
  });

  assert.deepEqual(candidates, []);
});

