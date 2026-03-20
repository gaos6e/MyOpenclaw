const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const captureScript = path.resolve(__dirname, "mem0_capture.js");
const bridgeScript = path.resolve(__dirname, "mem0_bridge.js");

test("mem0_capture.js loads and exits on missing MEM0_API_KEY instead of syntax error", () => {
  const result = spawnSync(process.execPath, [captureScript], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, MEM0_API_KEY: "" },
  });

  assert.notEqual(result.status, 0, "script should fail without MEM0_API_KEY");
  assert.match(result.stderr, /MEM0_API_KEY not set/, "script should reach runtime validation");
  assert.doesNotMatch(result.stderr, /SyntaxError|Cannot use import statement outside a module/);
});

test("mem0_bridge.js loads and exits on missing MEM0_API_KEY instead of syntax error", () => {
  const result = spawnSync(process.execPath, [bridgeScript, "test", "--user", "xiaogao"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, MEM0_API_KEY: "" },
  });

  assert.notEqual(result.status, 0, "script should fail without MEM0_API_KEY");
  assert.match(result.stderr, /MEM0_API_KEY not set/, "script should reach runtime validation");
  assert.doesNotMatch(result.stderr, /SyntaxError|Cannot use import statement outside a module/);
});
