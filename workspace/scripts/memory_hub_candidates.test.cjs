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
      "以后直接用QQ联系我。",
    ],
  });

  assert.equal(candidates.length >= 2, true);
  assert.equal(candidates.some((item) => item.candidate_kind === "preference"), true);
  assert.equal(candidates.some((item) => item.schema_key === "communication_channel"), true);
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

test("heuristic extraction splits natural language into structured candidates", async () => {
  const { extractHeuristicCandidates } = await import(moduleUrl);

  const candidates = extractHeuristicCandidates({
    sourceKind: "session",
    sourceRef: "agent:main:main",
    texts: [
      "以后称呼我为“哥哥～”。开始自我提升前先告知我。临时文件放到 D:\\桌面\\openclaw。",
    ],
  });

  assert.equal(candidates.length, 2);
  assert.deepEqual(
    candidates.map((item) => item.normalized),
    [
      "希望以后称呼他为“哥哥～”",
      "进行自我提升前先告知用户",
    ],
  );
  assert.deepEqual(
    candidates.map((item) => item.schema_key),
    ["preferred_address", "notify_before_self_improve"],
  );
});

test("structured extraction ignores tooling and environment rules that do not belong in durable memory", async () => {
  const { extractHeuristicCandidates } = await import(moduleUrl);

  const candidates = extractHeuristicCandidates({
    sourceKind: "session",
    sourceRef: "agent:main:main",
    texts: [
      "模型思考模式默认开着，级别用 medium。",
      "重要/common 文件都在 C:\\Users\\20961\\.openclaw。",
      "所有 OpenClaw skills 都装到 C:\\Users\\20961\\.openclaw\\workspace\\skills。",
      "分析主流视频图片文本时先用 https://snapany.com/zh 下载再读。",
      "汇报 Moltbook 自动化结果时保留完整脚本报告，不要压缩成短摘要。",
      "cron 任务如果限流或者模型超时，先跑 openclaw cron runs --id <job-id> 看详细日志。",
    ],
  });

  assert.deepEqual(candidates, []);
});

test("structured extraction captures direct communication and codeword conventions", async () => {
  const { extractHeuristicCandidates } = await import(moduleUrl);

  const candidates = extractHeuristicCandidates({
    sourceKind: "session",
    sourceRef: "agent:main:main",
    texts: [
      "以后直接用QQ联系我。",
      "暗号约定一下：我说“你给了？”，你就回“他非要~”。",
    ],
  });

  assert.deepEqual(
    candidates.map((item) => item.schema_key),
    ["communication_channel", "call_and_response_codeword"],
  );
  assert.deepEqual(
    candidates.map((item) => item.normalized),
    [
      "Use QQ for communication",
      "暗号约定：用户说“你给了？”，助手回“他非要~”。",
    ],
  );
});
