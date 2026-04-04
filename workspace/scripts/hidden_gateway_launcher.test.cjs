const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const gatewayHiddenVbsPath = path.join(repoRoot, "gateway-hidden.vbs");
const gatewayHiddenPs1Path = path.join(repoRoot, "gateway-hidden.ps1");
const setHiddenGatewayTaskPath = path.join(__dirname, "set_hidden_gateway_task.ps1");

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("gateway-hidden.vbs hides a gateway.cmd launch instead of hardcoding the node entrypoint", () => {
  const source = readUtf8(gatewayHiddenVbsPath);

  assert.match(source, /gateway\.cmd/i);
  assert.match(source, /cmd\.exe/i);
  assert.doesNotMatch(source, /dist\\(?:index|entry)\.js/i);
});

test("gateway-hidden.vbs compiles and emits a cmd.exe launch for gateway.cmd", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-hidden-vbs-"));

  try {
    const tempScriptPath = path.join(root, "gateway-hidden.vbs");
    const source = readUtf8(gatewayHiddenVbsPath).replace("shell.Run cmd, 0, False", "WScript.Echo cmd");
    fs.writeFileSync(tempScriptPath, source, "utf8");

    const result = childProcess.spawnSync("cscript.exe", ["//Nologo", tempScriptPath], {
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /cmd\.exe/i);
    assert.match(result.stdout, /gateway\.cmd/i);
    assert.doesNotMatch(result.stderr, /VBScript compilation error/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("gateway-hidden.ps1 delegates to the hidden wrapper chain instead of hardcoding dist entry files", () => {
  const source = readUtf8(gatewayHiddenPs1Path);

  assert.match(source, /gateway-hidden\.vbs/i);
  assert.doesNotMatch(source, /dist\\(?:index|entry)\.js/i);
});

test("set_hidden_gateway_task registers the gateway task through wscript and gateway-hidden.vbs", () => {
  const source = readUtf8(setHiddenGatewayTaskPath);

  assert.match(source, /wscript\.exe/i);
  assert.match(source, /gateway-hidden\.vbs/i);
  assert.doesNotMatch(source, /gateway\.cmd/i);
});
