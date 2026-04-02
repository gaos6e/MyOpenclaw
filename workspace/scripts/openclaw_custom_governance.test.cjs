const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const configPath = path.join(repoRoot, "openclaw.json");
const approvalsPath = path.join(repoRoot, "exec-approvals.json");
const memoryPath = path.join(repoRoot, "workspace", "MEMORY.md");
const workspaceAgentsPath = path.join(repoRoot, "workspace", "AGENTS.md");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readSection(text, title) {
  const start = text.indexOf(`## ${title}`);
  if (start === -1) {
    return "";
  }
  const next = text.indexOf("\n## ", start + 1);
  return text.slice(start, next === -1 ? undefined : next);
}

test("config uses memory-hub as the sole active custom memory backend", () => {
  const config = readJson(configPath);

  assert.equal(config?.plugins?.slots?.memory, "openclaw-memory-hub");
  assert.equal(config?.plugins?.entries?.["openclaw-memory-hub"]?.enabled, true);
  assert.ok(!config?.plugins?.entries?.["memory-lancedb"]);
});

test("config hardens runtime approvals and pins plugin install specs", () => {
  const config = readJson(configPath);
  const approvals = readJson(approvalsPath);

  assert.equal(config?.tools?.elevated?.enabled, false);
  assert.equal(config?.tools?.profile, "coding");
  assert.equal(config?.tools?.fs?.workspaceOnly, true);
  assert.equal(config?.agents?.list?.every((entry) => entry?.tools?.profile === "coding"), true);
  assert.notDeepEqual(config?.channels?.qqbot?.allowFrom, ["*"]);
  assert.equal(config?.gateway?.controlUi?.enabled, true);
  assert.match(config?.gateway?.controlUi?.root ?? "", /workspace[\\/]control-ui-local/i);
  assert.ok(!config?.plugins?.allow?.includes("openclaw-qqbot"));
  assert.ok(!config?.plugins?.entries?.["openclaw-qqbot"]);
  assert.ok(!config?.plugins?.installs?.["openclaw-qqbot"]);
  assert.equal(approvals?.defaults?.autoAllowSkills, false);
});

test("durable memory sections stay focused on user memory rather than tooling rules", () => {
  const text = fs.readFileSync(memoryPath, "utf8");
  const preferencesSection = readSection(text, "Preferences & setup");
  const stableFactsSection = readSection(text, "Stable facts");

  assert.doesNotMatch(preferencesSection, /snapany|cron runs --id|Moltbook automation results|skills should be installed/i);
  assert.doesNotMatch(preferencesSection, /Backups\/temporary files live in|Important\/common files live in/i);
  assert.doesNotMatch(stableFactsSection, /skills 目录|workspace\\\\skills/i);
});

test("workspace startup guidance keeps shared-channel sessions off brittle daily-memory and durable-memory writes", () => {
  const text = fs.readFileSync(workspaceAgentsPath, "utf8");

  assert.match(text, /Read `memory\/YYYY-MM-DD\.md` \(today \+ yesterday\) if the files exist/i);
  assert.match(text, /ONLY load in main session/i);
  assert.match(text, /shared.*do not edit durable memory or governance files unless the user explicitly asks/i);
});

test("workspace guidance requires fresh verification before claiming completion", () => {
  const text = fs.readFileSync(workspaceAgentsPath, "utf8");

  assert.match(text, /do not claim completion without fresh verification/i);
  assert.match(text, /avoid \"should work\"\/\"should pass\" style completion claims/i);
});

test("tooling notes document ripgrep fallback and safer PowerShell execution patterns", () => {
  const text = fs.readFileSync(path.join(repoRoot, "workspace", "TOOLS.md"), "utf8");

  assert.match(text, /if `rg` is unavailable, fall back to `Select-String`/i);
  assert.match(text, /complex PowerShell should prefer a `\.ps1` script file/i);
});

test("qq agent is converged to a narrower medium-thinking third-party skill surface", () => {
  const config = readJson(configPath);
  const qqAgent = config?.agents?.list?.find((entry) => entry?.id === "qq");
  const mainAgent = config?.agents?.list?.find((entry) => entry?.id === "main");

  assert.equal(config?.agents?.defaults?.thinkingDefault, "medium");
  assert.equal(config?.agents?.defaults?.model?.primary, "teamplus/gpt-5.2");
  assert.deepEqual(config?.agents?.defaults?.model?.fallbacks, []);
  assert.equal(config?.models?.providers?.teamplus?.baseUrl, "https://codexapi.space/v1");
  assert.equal(mainAgent?.model, "teamplus/gpt-5.2");
  assert.equal(qqAgent?.model, "teamplus/gpt-5.2");
  assert.equal(qqAgent?.thinkingDefault, "medium");
  assert.deepEqual(
    qqAgent?.skills,
    [
      "qqbot-channel",
      "qqbot-remind",
      "qqbot-media",
      "openclaw-cli",
      "web-search",
      "tavily-search",
      "weather",
      "github",
      "docx",
      "pdf",
      "pptx",
      "xlsx",
    ],
  );
});

test("qq channel config is native-compatible and does not keep custom plugin-only fields", () => {
  const config = readJson(configPath);
  const qqConfig = config?.channels?.qqbot ?? {};

  assert.equal(qqConfig.enabled, true);
  assert.equal(typeof qqConfig.appId, "string");
  assert.equal(typeof qqConfig.clientSecret, "string");
  assert.ok(!Object.prototype.hasOwnProperty.call(qqConfig, "updateCheckOnStartup"));
  assert.ok(!Object.prototype.hasOwnProperty.call(qqConfig, "logImageServerDisabled"));
  assert.ok(!Object.prototype.hasOwnProperty.call(qqConfig, "healthMonitor"));
});
