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
const sourcePath = path.join(repoRoot, "extensions", "openclaw-qqbot", "src", "utils", "text-parsing.ts");

async function importTextParsingModule() {
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
    `openclaw-qqbot-text-parsing-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`,
  );
  fs.writeFileSync(tempFile, transpiled, "utf8");
  try {
    return await import(pathToFileURL(tempFile).href);
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
}

test("detects exec approval follow-up mirrors and keeps normal exec discussion", async () => {
  const { isSuppressedInternalQQMessage } = await importTextParsingModule();

  const mirroredApprovalText = [
    "Exec denied (gateway id=e9270724-7e4c-4d7c-a71f-fad09716c307, approval-timeout (obfuscation-detected)): $a1 = @'",
    "A) It prints:",
    "[1]",
    "",
    "$payload = @{",
    "Invoke-WebRequest -Method Post -Uri 'https://clawvard.school/api/exam/batch-answer'",
  ].join("\n");

  assert.equal(isSuppressedInternalQQMessage(mirroredApprovalText), true);
  assert.equal(isSuppressedInternalQQMessage("这次 exec 被 allowlist 拦了，我换条路继续处理。"), false);
});
