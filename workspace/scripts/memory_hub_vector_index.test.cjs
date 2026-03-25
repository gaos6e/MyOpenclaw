const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repoRoot = path.resolve(__dirname, "..", "..");
const moduleUrl = pathToFileURL(
  path.join(repoRoot, "extensions", "openclaw-memory-hub", "src", "aux-vector.js"),
).href;

async function withTempMemoryGraph(fn) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "memory-hub-vector-"));
  try {
    const workspaceDir = path.join(tempRoot, "workspace");
    const memoryDir = path.join(workspaceDir, "memory");
    const inboxDir = path.join(memoryDir, "inbox");
    const learningsDir = path.join(workspaceDir, ".learnings");
    const sessionsDir = path.join(tempRoot, "agents", "main", "sessions");
    fs.mkdirSync(inboxDir, { recursive: true });
    fs.mkdirSync(learningsDir, { recursive: true });
    fs.mkdirSync(sessionsDir, { recursive: true });

    fs.writeFileSync(
      path.join(memoryDir, "2026-03-25.md"),
      "# 2026-03-25\n\n## Facts\n- cron 任务今天因为 timeout 失败。\n\n## Preferences\n- 临时文件放到 D:\\桌面\\openclaw\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(learningsDir, "LEARNINGS.md"),
      "# LEARNINGS\n\n- 2026-03-25 | cron timeout | 遇到模型超时先看 openclaw cron runs --id <job-id>\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(inboxDir, "2026-03-25.jsonl"),
      `${JSON.stringify({
        id: "cand-1",
        normalized: "Use QQ for communication",
        text: "以后直接用QQ联系我",
        reviewed: false,
      })}\n`,
      "utf8",
    );
    fs.writeFileSync(
      path.join(sessionsDir, "sessions.json"),
      JSON.stringify(
        {
          "agent:main:qqbot:direct:abc": { sessionId: "11111111-1111-1111-1111-111111111111" },
          "agent:main:discord:channel:shared": { sessionId: "22222222-2222-2222-2222-222222222222" },
        },
        null,
        2,
      ),
      "utf8",
    );
    fs.writeFileSync(
      path.join(sessionsDir, "11111111-1111-1111-1111-111111111111.jsonl"),
      [
        JSON.stringify({ type: "message", message: { role: "user", content: "以后直接用QQ联系我" } }),
        JSON.stringify({ type: "message", message: { role: "assistant", content: "收到" } }),
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      path.join(sessionsDir, "22222222-2222-2222-2222-222222222222.jsonl"),
      [
        JSON.stringify({ type: "message", message: { role: "user", content: "这是共享频道里的内容" } }),
      ].join("\n"),
      "utf8",
    );

    return await fn({ tempRoot, workspaceDir, sessionsDir });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function mockEmbedMany(texts) {
  return texts.map((text) => {
    if (/cron|timeout|job-id/i.test(text)) {
      return [1, 0, 0];
    }
    if (/qq/i.test(text)) {
      return [0, 1, 0];
    }
    return [0, 0, 1];
  });
}

test("aux vector collector includes daily, learnings, inbox, and only private sessions", async () =>
  withTempMemoryGraph(async ({ tempRoot, workspaceDir }) => {
    const { collectAuxVectorDocuments } = await import(moduleUrl);

    const docs = await collectAuxVectorDocuments({
      workspaceDir,
      stateDir: tempRoot,
      agentId: "main",
      maxSessionFiles: 10,
      maxSessionMessagesPerFile: 10,
    });

    assert.equal(docs.some((item) => item.namespace === "daily"), true);
    assert.equal(docs.some((item) => item.namespace === "learning"), true);
    assert.equal(docs.some((item) => item.namespace === "candidate"), true);
    assert.equal(docs.some((item) => item.namespace === "session"), true);
    assert.equal(docs.some((item) => String(item.path).includes("22222222-2222-2222-2222-222222222222")), false);
  }));

test("aux vector collector reads array-based user text content from session transcripts", async () =>
  withTempMemoryGraph(async ({ tempRoot, workspaceDir }) => {
    const sessionsDir = path.join(tempRoot, "agents", "main", "sessions");
    fs.writeFileSync(
      path.join(sessionsDir, "11111111-1111-1111-1111-111111111111.jsonl"),
      JSON.stringify({
        type: "message",
        message: {
          role: "user",
          content: [{ type: "text", text: "以后直接用QQ联系我" }],
        },
      }),
      "utf8",
    );

    const { collectAuxVectorDocuments } = await import(moduleUrl);
    const docs = await collectAuxVectorDocuments({
      workspaceDir,
      stateDir: tempRoot,
      agentId: "main",
      maxSessionFiles: 10,
      maxSessionMessagesPerFile: 10,
    });

    assert.equal(docs.some((item) => item.namespace === "session" && /QQ/.test(item.text)), true);
  }));

test("aux vector index supports semantic search across auxiliary memory sources", async () =>
  withTempMemoryGraph(async ({ tempRoot, workspaceDir }) => {
    const { buildAuxVectorIndex, searchAuxVectorIndex } = await import(moduleUrl);
    const indexPath = path.join(tempRoot, "memory", "aux-vector-index.json");

    const buildResult = await buildAuxVectorIndex({
      workspaceDir,
      stateDir: tempRoot,
      agentId: "main",
      indexPath,
      embedMany: mockEmbedMany,
      maxSessionFiles: 10,
      maxSessionMessagesPerFile: 10,
    });

    assert.equal(buildResult.items > 0, true);

    const results = await searchAuxVectorIndex({
      indexPath,
      query: "cron timeout 怎么排查",
      embedMany: mockEmbedMany,
      maxResults: 3,
    });

    assert.equal(results.length > 0, true);
    assert.equal(results[0].namespace === "learning" || results[0].namespace === "daily", true);
    assert.equal(results.some((item) => item.namespace === "learning"), true);
  }));

test("remote embed adapter falls back to one request per text", async () => {
  const { createRemoteEmbedMany } = await import(moduleUrl);
  const calls = [];
  const fetchImpl = async (_url, options) => {
    const body = JSON.parse(options.body);
    calls.push(body);
    return {
      ok: true,
      async json() {
        return {
          data: [
            {
              embedding: [String(body.input).length, 1],
            },
          ],
        };
      },
    };
  };

  process.env.TEST_QWEN = "token";
  const embedMany = createRemoteEmbedMany(
    {
      model: "text-embedding-v4",
      remote: {
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        apiKey: { source: "env", id: "TEST_QWEN" },
      },
    },
    fetchImpl,
  );

  const vectors = await embedMany(["hello", "cron timeout"]);

  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((item) => item.input), ["hello", "cron timeout"]);
  assert.deepEqual(vectors, [
    [5, 1],
    [12, 1],
  ]);
});

test("remote embed adapter retries transient failures", async () => {
  const { createRemoteEmbedMany } = await import(moduleUrl);
  let attempts = 0;
  const fetchImpl = async (_url, options) => {
    attempts += 1;
    const body = JSON.parse(options.body);
    if (attempts === 1) {
      throw new Error("fetch failed");
    }
    return {
      ok: true,
      async json() {
        return {
          data: [
            {
              embedding: [String(body.input).length],
            },
          ],
        };
      },
    };
  };

  process.env.TEST_QWEN_RETRY = "token";
  const embedMany = createRemoteEmbedMany(
    {
      model: "text-embedding-v4",
      remote: {
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        apiKey: { source: "env", id: "TEST_QWEN_RETRY" },
      },
    },
    fetchImpl,
  );

  const vectors = await embedMany(["hello"]);

  assert.equal(attempts, 2);
  assert.deepEqual(vectors, [[5]]);
});
