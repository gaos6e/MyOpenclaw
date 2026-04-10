const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const napcatHiddenVbsPath = path.join(repoRoot, "napcat-hidden.vbs");
const napcatHiddenPs1Path = path.join(repoRoot, "napcat-hidden.ps1");
const setHiddenNapCatTaskPath = path.join(__dirname, "set_hidden_napcat_task.ps1");

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("napcat-hidden.vbs hides a NapCatWinBootMain.exe launch", () => {
  const source = readUtf8(napcatHiddenVbsPath);

  assert.match(source, /NapCatWinBootMain\.exe/i);
  assert.doesNotMatch(source, /cmd\.exe/i);
});

test("napcat-hidden.vbs compiles and emits a NapCatWinBootMain.exe launch", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-napcat-hidden-vbs-"));

  try {
    const tempScriptPath = path.join(root, "napcat-hidden.vbs");
    const source = readUtf8(napcatHiddenVbsPath).replace("shell.Run cmd, 0, False", "WScript.Echo cmd");
    fs.writeFileSync(tempScriptPath, source, "utf8");

    const result = childProcess.spawnSync("cscript.exe", ["//Nologo", tempScriptPath], {
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /NapCatWinBootMain\.exe/i);
    assert.doesNotMatch(result.stderr, /VBScript compilation error/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("napcat-hidden.ps1 delegates to the hidden wrapper chain", () => {
  const source = readUtf8(napcatHiddenPs1Path);

  assert.match(source, /napcat-hidden\.vbs/i);
  assert.match(source, /wscript\.exe/i);
});

test("set_hidden_napcat_task registers a hidden logon task through wscript and napcat-hidden.vbs", () => {
  const source = readUtf8(setHiddenNapCatTaskPath);

  assert.match(source, /New-ScheduledTaskAction/i);
  assert.match(source, /wscript\.exe/i);
  assert.match(source, /napcat-hidden\.vbs/i);
  assert.match(source, /AtLogOn/i);
  assert.match(source, /RestartCount/i);
});
