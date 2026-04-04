const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repoRoot = path.resolve(__dirname, "..", "..");
const moduleUrl = pathToFileURL(
  path.join(repoRoot, "extensions", "openclaw-checkpoint-guardian", "src", "plugin.js"),
).href;

async function withTempWorkspace(fn) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "checkpoint-guardian-"));
  try {
    const workspaceDir = path.join(tempRoot, "workspace");
    fs.mkdirSync(workspaceDir, { recursive: true });
    return await fn({ workspaceDir });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

async function loadRegisteredHooks(workspaceDir) {
  const { default: plugin } = await import(moduleUrl);
  const hooks = new Map();
  plugin.register({
    config: {},
    pluginConfig: {},
    logger: { info() {}, warn() {}, error() {} },
    on(name, handler) {
      hooks.set(name, handler);
    },
  });
  return hooks;
}

test("checkpoint guardian reminds after repeated exploration without checkpoint", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const hooks = await loadRegisteredHooks(workspaceDir);
    const afterToolCall = hooks.get("after_tool_call");
    const beforePromptBuild = hooks.get("before_prompt_build");

    for (let i = 0; i < 6; i += 1) {
      await afterToolCall(
        { toolName: "read", params: { path: `file-${i}.md` }, result: { ok: true } },
        { sessionKey: "agent:main:main", sessionId: "sess-1", workspaceDir },
      );
    }

    const result = await beforePromptBuild(
      { prompt: "继续排查", messages: [] },
      { sessionKey: "agent:main:main", sessionId: "sess-1", workspaceDir },
    );

    assert.match(result.appendSystemContext ?? "", /Checkpoint Guardian/);
    assert.match(result.appendSystemContext ?? "", /6/);
  }));

test("checkpoint guardian clears counters after a durable checkpoint write", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const hooks = await loadRegisteredHooks(workspaceDir);
    const afterToolCall = hooks.get("after_tool_call");
    const beforePromptBuild = hooks.get("before_prompt_build");

    for (let i = 0; i < 6; i += 1) {
      await afterToolCall(
        { toolName: "read", params: { path: `file-${i}.md` }, result: { ok: true } },
        { sessionKey: "agent:main:main", sessionId: "sess-2", workspaceDir },
      );
    }

    await afterToolCall(
      {
        toolName: "edit",
        params: { path: path.join(workspaceDir, "MEMORY.md") },
        result: { ok: true },
      },
      { sessionKey: "agent:main:main", sessionId: "sess-2", workspaceDir },
    );

    const result = await beforePromptBuild(
      { prompt: "继续排查", messages: [] },
      { sessionKey: "agent:main:main", sessionId: "sess-2", workspaceDir },
    );

    assert.equal(result, undefined);
  }));

test("checkpoint guardian also clears counters after an explicit mem0 memory store", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const hooks = await loadRegisteredHooks(workspaceDir);
    const afterToolCall = hooks.get("after_tool_call");
    const beforePromptBuild = hooks.get("before_prompt_build");

    for (let i = 0; i < 6; i += 1) {
      await afterToolCall(
        { toolName: "read", params: { path: `file-${i}.md` }, result: { ok: true } },
        { sessionKey: "agent:main:main", sessionId: "sess-mem0", workspaceDir },
      );
    }

    await afterToolCall(
      {
        toolName: "memory_store",
        params: { text: "Use QQ for communication" },
        result: { ok: true },
      },
      { sessionKey: "agent:main:main", sessionId: "sess-mem0", workspaceDir },
    );

    const result = await beforePromptBuild(
      { prompt: "继续排查", messages: [] },
      { sessionKey: "agent:main:main", sessionId: "sess-mem0", workspaceDir },
    );

    assert.equal(result, undefined);
  }));

test("checkpoint guardian records reset audit for unresolved exploration streaks", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const hooks = await loadRegisteredHooks(workspaceDir);
    const afterToolCall = hooks.get("after_tool_call");
    const beforeReset = hooks.get("before_reset");

    for (let i = 0; i < 3; i += 1) {
      await afterToolCall(
        { toolName: "read", params: { path: `file-${i}.md` }, result: { ok: true } },
        { sessionKey: "agent:main:main", sessionId: "sess-3", workspaceDir },
      );
    }

    await beforeReset(
      { reason: "manual-reset", sessionFile: "session.jsonl" },
      { sessionKey: "agent:main:main", sessionId: "sess-3", workspaceDir },
    );

    const auditPath = path.join(workspaceDir, ".openclaw", "checkpoint-guardian", "resets.jsonl");
    const auditText = fs.readFileSync(auditPath, "utf8");

    assert.match(auditText, /manual-reset/);
    assert.match(auditText, /explorationSinceCheckpoint/);
  }));
