const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const ensureScriptPath = path.join(__dirname, "ensure_hindsight_local.ps1");
const stopScriptPath = path.join(__dirname, "stop_hindsight_local.ps1");
const gatewayCmdPath = path.join(repoRoot, "gateway.cmd");

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("ensure_hindsight_local wires PostgreSQL and Hindsight to local Qwen-backed runtime", () => {
  const source = readUtf8(ensureScriptPath);

  assert.match(source, /openclaw-hindsight-pg/i);
  assert.match(source, /hindsight-api-venv/i);
  assert.match(source, /postgresql:\/\/hindsight@127\.0\.0\.1:55432\/hindsight/i);
  assert.match(source, /qwen3\.5-plus/i);
  assert.match(source, /text-embedding-v4/i);
  assert.match(source, /HINDSIGHT_API_RERANKER_PROVIDER/i);
  assert.match(source, /rrf/i);
});

test("stop_hindsight_local stops both API and PostgreSQL runtime", () => {
  const source = readUtf8(stopScriptPath);

  assert.match(source, /hindsight-api\.pid/i);
  assert.match(source, /pg_ctl\.exe/i);
});

test("gateway.cmd ensures the local Hindsight runtime before starting gateway", () => {
  const source = readUtf8(gatewayCmdPath);

  assert.match(source, /ensure_hindsight_local\.ps1/i);
  assert.match(source, /HINDSIGHT_EMBED_API_URL=/i);
  assert.match(source, /HINDSIGHT_EMBED_API_TOKEN=/i);
});
