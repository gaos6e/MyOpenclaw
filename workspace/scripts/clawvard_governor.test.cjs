const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repoRoot = path.resolve(__dirname, "..", "..");
const moduleUrl = pathToFileURL(
  path.join(repoRoot, "extensions", "openclaw-clawvard-governor", "src", "plugin.js"),
).href;

async function withTempWorkspace(fn) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-clawvard-governor-"));
  try {
    const workspaceDir = path.join(tempRoot, "workspace");
    fs.mkdirSync(path.join(workspaceDir, "workflows"), { recursive: true });
    return await fn({ workspaceDir });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

async function loadPromptHook(workspaceDir, pluginConfig = {}) {
  const { default: plugin } = await import(moduleUrl);
  const hooks = new Map();
  plugin.register({
    config: { agents: { defaults: { workspace: workspaceDir } } },
    pluginConfig,
    logger: { info() {}, warn() {}, error() {} },
    on(name, handler) {
      hooks.set(name, handler);
    },
  });
  return hooks.get("before_prompt_build");
}

test("clawvard governor appends the response contract from workspace workflows", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    fs.writeFileSync(
      path.join(workspaceDir, "workflows", "clawvard-response-contract.md"),
      [
        "# Clawvard Response Contract",
        "",
        "- 先说明你理解的任务",
        "- 说明第一步会检查什么",
        "- 官方源优先",
        "- 先写失败测试",
        "- 运行测试或验证命令",
      ].join("\n"),
      "utf8",
    );

    const beforePromptBuild = await loadPromptHook(workspaceDir);
    const result = await beforePromptBuild(
      { prompt: "继续", messages: [] },
      { sessionKey: "agent:main:qqbot:direct:abc", sessionId: "sess-1", workspaceDir },
    );

    assert.match(result.appendSystemContext ?? "", /Clawvard Response Contract/);
    assert.match(result.appendSystemContext ?? "", /先说明你理解的任务/);
    assert.match(result.appendSystemContext ?? "", /说明第一步会检查什么/);
    assert.match(result.appendSystemContext ?? "", /官方源优先/);
    assert.match(result.appendSystemContext ?? "", /先写失败测试/);
    assert.match(result.appendSystemContext ?? "", /运行测试或验证命令/);
  }));

test("clawvard governor falls back to built-in contract when workspace file is missing", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const beforePromptBuild = await loadPromptHook(workspaceDir);
    const result = await beforePromptBuild(
      { prompt: "继续", messages: [] },
      { sessionKey: "agent:main:discord:channel:123", sessionId: "sess-2", workspaceDir },
    );

    assert.match(result.appendSystemContext ?? "", /Clawvard Response Contract/);
    assert.match(result.appendSystemContext ?? "", /先说明你理解的任务/);
    assert.match(result.appendSystemContext ?? "", /先写失败测试/);
    assert.match(result.appendSystemContext ?? "", /官方源优先/);
  }));
