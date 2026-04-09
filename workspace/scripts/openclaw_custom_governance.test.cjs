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

test("config uses hindsight as the active memory backend and keeps memory-hub in auxiliary mode", () => {
  const config = readJson(configPath);

  assert.equal(config?.plugins?.slots?.memory, "hindsight-openclaw");
  assert.equal(config?.plugins?.entries?.["hindsight-openclaw"]?.enabled, true);
  assert.equal(config?.plugins?.entries?.["hindsight-openclaw"]?.config?.hindsightApiUrl, "http://127.0.0.1:18890");
  assert.ok(!Object.prototype.hasOwnProperty.call(config?.plugins?.entries?.["hindsight-openclaw"]?.config ?? {}, "hindsightApiToken"));
  assert.equal(config?.plugins?.entries?.["openclaw-memory-hub"]?.enabled, true);
  assert.equal(config?.plugins?.entries?.["openclaw-memory-hub"]?.config?.mode, "auxiliary");
  assert.equal(config?.plugins?.entries?.["memory-lancedb"]?.enabled, false);
  assert.ok(!config?.plugins?.entries?.["openclaw-mem0"]);
});

test("config hardens runtime approvals and pins plugin install specs", () => {
  const config = readJson(configPath);
  const approvals = readJson(approvalsPath);
  const agentProfiles = new Map(config?.agents?.list?.map((entry) => [entry?.id, entry?.tools?.profile]) ?? []);
  const agentModels = new Map(config?.agents?.list?.map((entry) => [entry?.id, entry?.model]) ?? []);

  assert.equal(config?.tools?.profile, "coding");
  assert.equal(config?.tools?.fs?.workspaceOnly, true);
  assert.equal(config?.agents?.defaults?.model?.primary, "teamplus/gpt-5.2");
  assert.equal(agentProfiles.get("main"), "coding");
  assert.equal(agentProfiles.get("qq"), "coding");
  assert.equal(agentProfiles.get("qq-public"), "messaging");
  assert.equal(agentProfiles.get("qq-timekeeper"), "messaging");
  assert.equal(agentModels.get("main"), "teamplus/gpt-5.2");
  assert.equal(agentModels.get("qq"), "teamplus/gpt-5.2");
  assert.equal(agentModels.get("qq-public"), "teamplus/gpt-5.2");
  assert.equal(agentModels.get("qq-timekeeper"), "teamplus/gpt-5.2");
  assert.notDeepEqual(config?.channels?.qqbot?.allowFrom, ["*"]);
  assert.equal(config?.gateway?.controlUi?.enabled, true);
  assert.match(config?.gateway?.controlUi?.root ?? "", /workspace[\\/]control-ui-local/i);
  assert.equal(config?.plugins?.installs?.["hindsight-openclaw"]?.source, "npm");
  assert.equal(config?.plugins?.installs?.["openclaw-memory-hub"]?.source, "path");
  assert.equal(config?.plugins?.installs?.["openclaw-context-engine"]?.source, "path");
  assert.equal(config?.plugins?.installs?.["openclaw-checkpoint-guardian"]?.source, "path");
  assert.equal(approvals?.defaults?.autoAllowSkills, false);
});

test("config enables the additive clawvard governor and lightweight self-improvement hook", () => {
  const config = readJson(configPath);

  assert.equal(config?.hooks?.internal?.entries?.["self-improvement"]?.enabled, true);
  assert.equal(config?.hooks?.internal?.entries?.["task-ack"]?.enabled, true);
  assert.ok(config?.plugins?.allow?.includes("openclaw-clawvard-governor"));
  assert.equal(config?.plugins?.entries?.["openclaw-clawvard-governor"]?.enabled, true);
  assert.match(
    config?.plugins?.entries?.["openclaw-clawvard-governor"]?.config?.contractPath ?? "",
    /workspace[\\/]workflows[\\/]clawvard-response-contract\.md/i,
  );
  assert.equal(config?.plugins?.installs?.["openclaw-clawvard-governor"]?.source, "path");
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

test("workspace startup guidance encodes the clawvard task-opening contract", () => {
  const text = fs.readFileSync(workspaceAgentsPath, "utf8");

  assert.match(text, /先说明你理解的任务/i);
  assert.match(text, /说明第一步会检查什么/i);
  assert.match(text, /说明范围/i);
  assert.match(text, /会基于证据判断/i);
  assert.match(text, /官方源优先/i);
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
  assert.match(text, /先写失败测试/i);
  assert.match(text, /再实现最小修复/i);
  assert.match(text, /再验证通过/i);
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

test("timekeeper public qq account is isolated behind a dedicated agent and secret file", () => {
  const config = readJson(configPath);
  const accounts = config?.channels?.qqbot?.accounts ?? {};
  const timekeeper = accounts.timekeeper;
  const binding = (config?.bindings ?? []).find((entry) =>
    entry?.match?.channel === "qqbot" && entry?.match?.accountId === "timekeeper");
  const agent = (config?.agents?.list ?? []).find((entry) => entry?.id === "qq-timekeeper");

  assert.equal(timekeeper?.enabled, true);
  assert.equal(timekeeper?.name, "时光管家");
  assert.equal(timekeeper?.appId, "1903782033");
  assert.equal(timekeeper?.dmPolicy, "open");
  assert.deepEqual(timekeeper?.allowFrom, ["__TIMEKEEPER_COMMANDS_DISABLED__"]);
  assert.equal(typeof timekeeper?.clientSecretFile, "string");
  assert.ok(!Object.prototype.hasOwnProperty.call(timekeeper ?? {}, "clientSecret"));
  assert.deepEqual(timekeeper?.adminOpenIds, ["9A053C1350854286F832A03D38E111FD"]);
  assert.equal(timekeeper?.slashCommandProfile, "public-safe");
  assert.match(timekeeper?.systemPrompt ?? "", /不能操作当前电脑/);
  assert.match(timekeeper?.systemPrompt ?? "", /文档理解|表格|PPT|图片|语音/);

  assert.equal(binding?.agentId, "qq-timekeeper");
  assert.equal(agent?.tools?.profile, "messaging");
  assert.equal(agent?.tools?.elevated?.enabled, false);
  assert.deepEqual(agent?.skills, [
    "web-search",
    "tavily-search",
    "weather",
    "pdf",
    "docx",
    "pptx",
    "xlsx",
  ]);
});
