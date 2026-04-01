const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const configPath = path.join(repoRoot, "openclaw.json");
const hygieneAuditPath = path.join(repoRoot, "workspace", "scripts", "openclaw_hygiene_audit.cjs");

test("legacy manager assets stay retired while local control UI remains available", () => {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const hygieneAuditSource = fs.readFileSync(hygieneAuditPath, "utf8");

  assert.equal(config?.gateway?.controlUi?.enabled, true);
  assert.equal(fs.existsSync(path.join(repoRoot, "control-ui")), false);
  assert.equal(fs.existsSync(path.join(repoRoot, "scripts", "control_ui_localization.cjs")), false);
  assert.equal(fs.existsSync(path.join(repoRoot, "scripts", "control_ui_localization.test.cjs")), false);
  assert.equal(hygieneAuditSource.includes('"control-ui"'), false);
});
