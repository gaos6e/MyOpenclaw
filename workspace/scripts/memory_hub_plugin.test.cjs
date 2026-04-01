const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repoRoot = path.resolve(__dirname, "..", "..");
const moduleUrl = pathToFileURL(
  path.join(repoRoot, "extensions", "openclaw-memory-hub", "src", "plugin.js"),
).href;

test("memory-hub plugin does not auto-capture candidates on heartbeat end", async () => {
  const { default: plugin } = await import(moduleUrl);
  const events = [];
  let runtime = null;
  const api = {
    config: {},
    pluginConfig: {},
    logger: { info() {} },
    registerTool() {},
    registerCli() {},
    registerMemoryRuntime(value) {
      runtime = value;
    },
    on(eventName, handler) {
      events.push({ eventName, handler });
    },
  };

  plugin.register(api);

  assert.equal(events.some((entry) => entry.eventName === "agent_end"), false);
  assert.equal(typeof runtime?.getMemorySearchManager, "function");
});

test("memory_extract_candidates writes an operation log", async () => {
  const { default: plugin } = await import(moduleUrl);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "memory-hub-plugin-"));
  const workspaceDir = path.join(tempRoot, "workspace");
  const logPath = path.join(tempRoot, "logs", "memory-hub.jsonl");
  fs.mkdirSync(workspaceDir, { recursive: true });
  fs.writeFileSync(path.join(workspaceDir, "MEMORY.md"), "# MEMORY\n\n## Preferences & setup\n", "utf8");

  let toolFactory = null;
  const api = {
    config: { agents: { defaults: { workspace: workspaceDir } } },
    pluginConfig: { logPath },
    logger: { info() {} },
    registerTool(factory) {
      toolFactory = factory;
    },
    registerCli() {},
    on() {},
  };

  plugin.register(api);
  const tools = toolFactory({});
  const extract = tools.find((entry) => entry.name === "memory_extract_candidates");
  const result = await extract.execute(null, {
    sourceText: "以后称呼我为“哥哥～”。开始自我提升前先告知我。",
  });

  assert.equal(result.details.count, 2);
  assert.equal(fs.existsSync(logPath), true);
  const lines = fs
    .readFileSync(logPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(lines.length >= 1, true);
  assert.equal(lines.at(-1).event, "memory_extract_candidates");
  assert.equal(lines.at(-1).candidateCount, 2);
  assert.deepEqual(lines.at(-1).schemaKeys, ["notify_before_self_improve", "preferred_address"]);
});

test("memory-hub runtime reports an available manager for the selected workspace", async () => {
  const { default: plugin } = await import(moduleUrl);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "memory-hub-runtime-"));
  const workspaceDir = path.join(tempRoot, "workspace");
  fs.mkdirSync(path.join(workspaceDir, "memory", "ontology"), { recursive: true });
  fs.writeFileSync(
    path.join(workspaceDir, "MEMORY.md"),
    "# MEMORY.md\n\n## Preferences & setup\n- Use QQ for communication\n\n## Stable facts\n",
    "utf8",
  );
  fs.writeFileSync(path.join(workspaceDir, "memory", "history.jsonl"), "", "utf8");
  fs.writeFileSync(path.join(workspaceDir, "memory", "ontology", "graph.jsonl"), "", "utf8");

  let runtime = null;
  const api = {
    config: { agents: { defaults: { workspace: workspaceDir } } },
    pluginConfig: {},
    logger: { info() {} },
    registerTool() {},
    registerCli() {},
    registerMemoryRuntime(value) {
      runtime = value;
    },
    on() {},
  };

  plugin.register(api);

  const resolved = await runtime.getMemorySearchManager({
    cfg: { agents: { defaults: { workspace: workspaceDir } } },
    agentId: "main",
    purpose: "status",
  });

  assert.equal(resolved.error, undefined);
  assert.equal(typeof resolved.manager?.status, "function");
  assert.equal(typeof resolved.manager?.search, "function");
  assert.equal(resolved.manager.status().provider, "openclaw-memory-hub");
});

test("memory_vector_search builds auxiliary vector index and logs semantic recall", async () => {
  const { default: plugin } = await import(moduleUrl);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "memory-hub-vector-plugin-"));
  const workspaceDir = path.join(tempRoot, "workspace");
  const memoryDir = path.join(workspaceDir, "memory");
  const learningsDir = path.join(workspaceDir, ".learnings");
  const sessionsDir = path.join(tempRoot, "agents", "main", "sessions");
  const logPath = path.join(tempRoot, "logs", "memory-hub.jsonl");
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.mkdirSync(learningsDir, { recursive: true });
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(path.join(workspaceDir, "MEMORY.md"), "# MEMORY\n\n## Preferences & setup\n", "utf8");
  fs.writeFileSync(
    path.join(memoryDir, "2026-03-25.md"),
    "# 2026-03-25\n\n## Facts\n- cron 任务因为 timeout 失败\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(learningsDir, "LEARNINGS.md"),
    "# LEARNINGS\n\n- 2026-03-25 | cron timeout | 遇到模型超时先看 openclaw cron runs --id <job-id>\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(sessionsDir, "sessions.json"),
    JSON.stringify({ "agent:main:qqbot:direct:abc": { sessionId: "11111111-1111-1111-1111-111111111111" } }, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(sessionsDir, "11111111-1111-1111-1111-111111111111.jsonl"),
    JSON.stringify({ type: "message", message: { role: "user", content: "以后直接用QQ联系我" } }),
    "utf8",
  );

  const mockEmbedMany = (texts) =>
    texts.map((text) => {
      if (/cron|timeout|job-id/i.test(text)) {
        return [1, 0];
      }
      if (/qq/i.test(text)) {
        return [0, 1];
      }
      return [0, 0.1];
    });

  let toolFactory = null;
  const api = {
    config: {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: { enabled: true },
        },
      },
    },
    pluginConfig: { logPath, embedMany: mockEmbedMany },
    logger: { info() {} },
    registerTool(factory) {
      toolFactory = factory;
    },
    registerCli() {},
    on() {},
  };

  plugin.register(api);
  const tools = toolFactory({ sessionKey: "agent:main:qqbot:direct:abc", agentId: "main" });
  const search = tools.find((entry) => entry.name === "memory_vector_search");
  const result = await search.execute(null, {
    query: "cron timeout 怎么排查",
    maxResults: 3,
  });

  assert.equal(result.details.backend, "memory-hub-aux-vector");
  assert.equal(result.details.results.length > 0, true);
  assert.equal(result.details.results.some((item) => item.namespace === "learning"), true);
  const lines = fs
    .readFileSync(logPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(lines.some((entry) => entry.event === "memory_vector_search"), true);
});
