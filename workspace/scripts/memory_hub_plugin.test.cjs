const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repoRoot = path.resolve(__dirname, "..", "..");
const moduleUrl = pathToFileURL(
  path.join(repoRoot, "extensions", "openclaw-memory-hub", "src", "plugin.js"),
).href;

test("memory-hub plugin does not auto-capture candidates on heartbeat end", async () => {
  const { default: plugin } = await import(moduleUrl);
  const events = [];
  const api = {
    config: {},
    pluginConfig: {},
    logger: { info() {} },
    registerTool() {},
    registerCli() {},
    on(eventName, handler) {
      events.push({ eventName, handler });
    },
  };

  plugin.register(api);

  assert.equal(events.some((entry) => entry.eventName === "agent_end"), false);
});
