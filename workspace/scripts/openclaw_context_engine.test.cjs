const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repoRoot = path.resolve(__dirname, "..", "..");
const moduleUrl = pathToFileURL(
  path.join(repoRoot, "extensions", "openclaw-context-engine", "src", "context-engine.js"),
).href;

async function withTempWorkspace(fn) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-context-engine-"));
  try {
    const workspaceDir = path.join(tempRoot, "workspace");
    fs.mkdirSync(path.join(workspaceDir, ".openclaw"), { recursive: true });
    fs.writeFileSync(
      path.join(workspaceDir, "MEMORY.md"),
      [
        "# MEMORY.md",
        "",
        "## About the user",
        "- Name: ",
        "- What to call them: Xiao Gao",
        "- Timezone: Asia/Shanghai",
        "- Hobbies: 摄影、航拍",
        "",
        "## Preferences & setup",
        "- Use QQ for communication",
        "- Long-term workspace: C:\\Users\\20961\\.openclaw\\workspace",
        "",
        "## Stable facts",
        "- User lives in Guangzhou",
        "",
        "## Ongoing context",
        "- This section is human-readable only",
        "",
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      path.join(workspaceDir, "self_improve_todo.md"),
      [
        "# TODO",
        "",
        "## 待做",
        "- [高] 完成 checkpoint 守卫 -> 提升自我提升可靠性",
        "- [中] 审查上下文机制 -> 降低跨 session 漂移",
        "",
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      path.join(workspaceDir, "self_improve_status.md"),
      [
        "# Status",
        "",
        "## 事项列表",
        "- doing | 上下文引擎落地 | 2026-03-21 | in progress",
        "- done | memory-hub 主线切换 | 2026-03-21",
        "",
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      path.join(workspaceDir, "self_improve_quality.md"),
      [
        "# Quality",
        "",
        "## 记录",
        "- 2026-03-21 | 自我提升 | 未及时 checkpoint | 影响持续性 | 中 | 增加 checkpoint guardian",
        "",
      ].join("\n"),
      "utf8",
    );
    return await fn({ workspaceDir });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test("context engine assembles private session snapshot with memory and self-improve state", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const { OpenClawWorkspaceContextEngine } = await import(moduleUrl);
    const engine = new OpenClawWorkspaceContextEngine({
      workspaceDir,
      createLegacyEngine: async () => ({
        compact: async () => ({ ok: true, compacted: false, reason: "legacy-stub" }),
      }),
    });

    const result = await engine.assemble({
      sessionId: "sess-1",
      sessionKey: "agent:main:qqbot:direct:abc",
      messages: [{ role: "user", content: "请继续工作" }],
      tokenBudget: 2000,
    });

    assert.equal(result.messages.length, 1);
    assert.match(result.systemPromptAddition ?? "", /Context Snapshot/);
    assert.match(result.systemPromptAddition ?? "", /What to call them: Xiao Gao/);
    assert.match(result.systemPromptAddition ?? "", /Use QQ for communication/);
    assert.match(result.systemPromptAddition ?? "", /完成 checkpoint 守卫/);
    assert.doesNotMatch(result.systemPromptAddition ?? "", /This section is human-readable only/);
  }));

test("context engine omits private durable memory in shared sessions", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const { OpenClawWorkspaceContextEngine } = await import(moduleUrl);
    const engine = new OpenClawWorkspaceContextEngine({
      workspaceDir,
      createLegacyEngine: async () => ({
        compact: async () => ({ ok: true, compacted: false, reason: "legacy-stub" }),
      }),
    });

    const result = await engine.assemble({
      sessionId: "sess-2",
      sessionKey: "agent:main:discord:channel:123",
      messages: [{ role: "user", content: "群里继续讨论" }],
      tokenBudget: 2000,
    });

    assert.match(result.systemPromptAddition ?? "", /Context Snapshot/);
    assert.match(result.systemPromptAddition ?? "", /checkpoint/i);
    assert.doesNotMatch(result.systemPromptAddition ?? "", /Xiao Gao/);
    assert.doesNotMatch(result.systemPromptAddition ?? "", /User lives in Guangzhou/);
  }));

test("context engine delegates compaction to legacy engine", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const { OpenClawWorkspaceContextEngine } = await import(moduleUrl);
    let compactCalled = false;
    const engine = new OpenClawWorkspaceContextEngine({
      workspaceDir,
      createLegacyEngine: async () => ({
        compact: async () => {
          compactCalled = true;
          return { ok: true, compacted: true, reason: "legacy-delegate" };
        },
      }),
    });

    const result = await engine.compact({
      sessionId: "sess-3",
      sessionKey: "agent:main:main",
      sessionFile: "session.jsonl",
      tokenBudget: 2000,
    });

    assert.equal(compactCalled, true);
    assert.equal(result.compacted, true);
    assert.equal(result.reason, "legacy-delegate");
  }));
