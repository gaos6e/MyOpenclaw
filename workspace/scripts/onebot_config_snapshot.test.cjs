const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const configPath = path.join(repoRoot, "openclaw.json");

test("openclaw config includes a dedicated onebot agent and plugin entry", () => {
  const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));

  const allow = cfg.plugins?.allow ?? [];
  assert.ok(allow.includes("openclaw-onebot"));

  assert.equal(cfg.plugins?.entries?.["openclaw-onebot"]?.enabled, true);

  const agentIds = (cfg.agents?.list ?? []).map((agent) => agent.id);
  assert.ok(agentIds.includes("onebot-3437738143"));

  const binding = (cfg.bindings ?? []).find((entry) =>
    entry?.match?.channel === "onebot" && entry?.match?.accountId === "nap3437"
  );
  assert.ok(binding);
  assert.equal(binding.agentId, "onebot-3437738143");

  const onebotAccount = cfg.channels?.onebot?.accounts?.nap3437;
  assert.ok(onebotAccount);
  assert.equal(onebotAccount.selfId, "3437738143");
  assert.equal(onebotAccount.wsUrl, "ws://127.0.0.1:30011");
  assert.equal(onebotAccount.groupReplyPolicy, "@always-reply-plus-random-interject");
  assert.equal(onebotAccount.proactiveCooldownMs, 10000);
  assert.equal(onebotAccount.maxProactiveRepliesPerHour, 60);
  assert.equal(onebotAccount.proactiveInterjectChancePercent, 80);
  assert.deepEqual(onebotAccount.aliases, ["小龙虾", "龙虾", "虾总"]);

  const agent = (cfg.agents?.list ?? []).find((entry) => entry.id === "onebot-3437738143");
  assert.ok(agent);
  assert.equal(agent.tools?.profile, "messaging");
  assert.equal(agent.tools?.elevated?.enabled, false);
  assert.deepEqual(agent.skills, [
    "web-search",
    "tavily-search",
    "weather",
    "pdf",
    "docx",
    "pptx",
    "xlsx",
  ]);
});
