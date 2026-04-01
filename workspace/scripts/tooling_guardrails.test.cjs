const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  findInFiles,
  readExistingFiles,
  shouldScriptifyPowerShell,
  validateEditPayload,
} = require("./tooling_guardrails.cjs");

function withTempDir(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-guardrails-"));
  try {
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("findInFiles falls back to JS search when rg is unavailable", () =>
  withTempDir((root) => {
    const filePath = path.join(root, "sample.txt");
    fs.writeFileSync(filePath, "alpha\nbeta needle\ncharlie\n", "utf8");

    const results = findInFiles({
      rootDir: root,
      pattern: "needle",
      runRg: () => {
        const error = new Error("rg missing");
        error.code = "ENOENT";
        throw error;
      },
    });

    assert.equal(results.backend, "js-fallback");
    assert.equal(results.matches.length, 1);
    assert.equal(results.matches[0].lineNumber, 2);
    assert.match(results.matches[0].lineText, /needle/);
  }));

test("readExistingFiles skips missing files and returns existing content", () =>
  withTempDir((root) => {
    const existing = path.join(root, "exists.md");
    const missing = path.join(root, "missing.md");
    fs.writeFileSync(existing, "# Hello\nworld\n", "utf8");

    const files = readExistingFiles([existing, missing]);

    assert.equal(files.length, 1);
    assert.equal(files[0].path, existing);
    assert.match(files[0].content, /Hello/);
  }));

test("shouldScriptifyPowerShell flags long or control-flow-heavy commands", () => {
  assert.equal(shouldScriptifyPowerShell("Get-ChildItem -Path C:\\Temp"), false);
  assert.equal(
    shouldScriptifyPowerShell("if (Test-Path 'C:\\Temp') { Get-ChildItem 'C:\\Temp' | Select-String -Pattern 'TODO' }"),
    true,
  );
  assert.equal(shouldScriptifyPowerShell("Write-Output '" + "x".repeat(260) + "'"), true);
});

test("validateEditPayload rejects mixed edit modes and accepts single-mode payloads", () => {
  const mixed = validateEditPayload({
    path: "C:\\demo.txt",
    oldText: "a",
    newText: "b",
    edits: [],
  });
  const single = validateEditPayload({
    path: "C:\\demo.txt",
    oldText: "a",
    newText: "b",
  });
  const batch = validateEditPayload({
    path: "C:\\demo.txt",
    edits: [{ oldText: "a", newText: "b" }],
  });

  assert.equal(mixed.ok, false);
  assert.match(mixed.error, /either edits or single replacement/i);
  assert.equal(single.ok, true);
  assert.equal(single.mode, "single");
  assert.equal(batch.ok, true);
  assert.equal(batch.mode, "batch");
});
