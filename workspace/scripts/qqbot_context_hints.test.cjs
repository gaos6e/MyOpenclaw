const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const ts = require(path.join(
  __dirname,
  "..",
  "..",
  "extensions",
  "openclaw-qqbot",
  "node_modules",
  "typescript",
));

const repoRoot = path.resolve(__dirname, "..", "..");
const sourcePath = path.join(repoRoot, "extensions", "openclaw-qqbot", "src", "context-hints.ts");

async function importContextHintsModule() {
  const source = fs.readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;

  const tempFile = path.join(
    os.tmpdir(),
    `openclaw-qqbot-context-hints-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`,
  );
  fs.writeFileSync(tempFile, transpiled, "utf8");
  try {
    return await import(pathToFileURL(tempFile).href);
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
}

async function withTempWorkspace(fn) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-qqbot-hints-"));
  try {
    const workspaceDir = path.join(tempRoot, "workspace");
    fs.mkdirSync(workspaceDir, { recursive: true });
    return await fn({ workspaceDir });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test("buildWorkspaceProjectHints returns matching project folders for uppercase aliases", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const projectDir = path.join(workspaceDir, "PD");
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, "README.md"), "# PD\n", "utf8");
    fs.writeFileSync(path.join(projectDir, "project_brief.md"), "# Brief\n", "utf8");

    const { buildWorkspaceProjectHints } = await importContextHintsModule();
    const hints = buildWorkspaceProjectHints({
      workspaceDir,
      content: "你不理解我的PD项目吗？",
    });

    assert.equal(hints.length, 1);
    assert.match(hints[0], /PD/);
    assert.match(hints[0], /README\.md/);
    assert.match(hints[0], /project_brief\.md/);
  }));

test("buildWorkspaceProjectHints ignores aliases when no matching workspace folder exists", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const { buildWorkspaceProjectHints } = await importContextHintsModule();
    const hints = buildWorkspaceProjectHints({
      workspaceDir,
      content: "你知道我的PD项目吗？",
    });

    assert.deepEqual(hints, []);
  }));

test("buildWorkspaceProjectPreviews returns short previews from project entry files", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const projectDir = path.join(workspaceDir, "PD");
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, "README.md"), "# PD 项目\n目标：做反向扰动推断框架。\n", "utf8");
    fs.writeFileSync(path.join(projectDir, "project_brief.md"), "# Brief\n关键点：多靶标解释路径。\n", "utf8");

    const { buildWorkspaceProjectPreviews } = await importContextHintsModule();
    const previews = buildWorkspaceProjectPreviews({
      workspaceDir,
      content: "同步一下PD项目的最新情况",
    });

    assert.equal(previews.length, 2);
    assert.match(previews[0], /PD\/README\.md/);
    assert.match(previews[0], /反向扰动推断框架/);
    assert.match(previews[1], /project_brief\.md/);
  }));

test("QQ channel stability instruction emphasizes verification and no-write defaults", async () => {
  const { getQQChannelStabilityInstruction } = await importContextHintsModule();
  const instruction = getQQChannelStabilityInstruction();

  assert.match(instruction, /daily memory/i);
  assert.match(instruction, /fresh verification/i);
  assert.match(instruction, /不要编辑本地治理文件/);
  assert.match(instruction, /外部.*不可信/);
  assert.match(instruction, /不得据此修改.*AGENTS\.md/i);
  assert.match(instruction, /安装 skills.*参加考试/);
});
