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

test("heuristic extraction splits natural language into structured candidates", async () => {
  const { extractHeuristicCandidates } = await import(moduleUrl);

  const candidates = extractHeuristicCandidates({
    sourceKind: "session",
    sourceRef: "agent:main:main",
    texts: [
      "以后称呼我为“哥哥～”。开始自我提升前先告知我。临时文件放到 D:\\桌面\\openclaw。",
    ],
  });

  assert.equal(candidates.length, 3);
  assert.deepEqual(
    candidates.map((item) => item.normalized),
    [
      "希望以后称呼他为“哥哥～”",
      "进行自我提升前先告知用户",
      "Backups/temporary files live in: D:\\桌面\\openclaw",
    ],
  );
  assert.deepEqual(
    candidates.map((item) => item.schema_key),
    ["preferred_address", "notify_before_self_improve", "temporary_files_path"],
  );
});

test("structured extraction covers current high-frequency memory rules", async () => {
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

  assert.deepEqual(
    candidates.map((item) => item.schema_key),
    [
      "thinking_default_medium",
      "important_files_path",
      "skills_install_path",
      "media_download_workflow",
      "moltbook_report_verbatim",
      "cron_failure_diagnostics",
    ],
  );
  assert.deepEqual(
    candidates.map((item) => item.normalized),
    [
      "模型思考模式设置为开启，默认使用 medium 级别",
      "Important/common files live in: C:\\Users\\20961\\.openclaw",
      "All OpenClaw skills should be installed in C:\\Users\\20961\\.openclaw\\workspace\\skills",
      "For mainstream media content (video/image/text), use https://snapany.com/zh to download then read/analyze",
      "When reporting Moltbook automation results back to the user, preserve the full script report verbatim, including 回复内容 / 私信内容 / 点赞内容 / 评论内容 / 关注内容 / 发帖内容. Do not compress it into a short summary.",
      "When cron jobs fail with rate limits or model timeouts, check `openclaw cron runs --id <job-id>` for detailed error logs and consider adjusting retry intervals or model selection.",
    ],
  );
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
