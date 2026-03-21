const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repoRoot = path.resolve(__dirname, "..", "..");
const moduleUrl = pathToFileURL(
  path.join(repoRoot, "extensions", "openclaw-memory-hub", "src", "session-recall.js"),
).href;

async function withTempState(fn) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "session-recall-"));
  try {
    const sessionsDir = path.join(tempRoot, "agents", "main", "sessions");
    fs.mkdirSync(sessionsDir, { recursive: true });
    const currentSessionId = "11111111-1111-1111-1111-111111111111";
    const otherSessionId = "22222222-2222-2222-2222-222222222222";
    fs.writeFileSync(
      path.join(sessionsDir, "sessions.json"),
      JSON.stringify(
        {
          "agent:main:qqbot:direct:current": { sessionId: currentSessionId },
          "agent:main:qqbot:direct:other": { sessionId: otherSessionId },
        },
        null,
        2,
      ),
      "utf8",
    );
    fs.writeFileSync(
      path.join(sessionsDir, `${currentSessionId}.jsonl`),
      [
        JSON.stringify({ type: "session", id: currentSessionId }),
        JSON.stringify({ type: "message", message: { role: "user", content: "我喜欢航拍和摄影" } }),
        JSON.stringify({ type: "message", message: { role: "assistant", content: "已记录" } }),
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      path.join(sessionsDir, `${otherSessionId}.jsonl`),
      [
        JSON.stringify({ type: "session", id: otherSessionId }),
        JSON.stringify({ type: "message", message: { role: "user", content: "我住在广州黄埔区" } }),
      ].join("\n"),
      "utf8",
    );
    return await fn({ tempRoot });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test("session recall only reads the current session transcript", async () =>
  withTempState(async ({ tempRoot }) => {
    const { searchSessionTranscript } = await import(moduleUrl);

    const results = await searchSessionTranscript({
      stateDir: tempRoot,
      agentId: "main",
      sessionKey: "agent:main:qqbot:direct:current",
      query: "航拍 摄影",
      maxResults: 3,
    });

    assert.equal(results.length > 0, true);
    assert.equal(results.every((item) => item.path.includes("11111111-1111-1111-1111-111111111111")), true);
  }));

