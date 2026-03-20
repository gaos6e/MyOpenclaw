const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const handler = require(path.resolve(__dirname, "handler.js"));

test("self-improvement hook injects reminder for main sessions", async () => {
  const event = {
    type: "agent",
    action: "bootstrap",
    sessionKey: "agent:main:session",
    context: { bootstrapFiles: [] },
  };

  await handler(event);

  assert.equal(event.context.bootstrapFiles.length, 1);
  assert.equal(event.context.bootstrapFiles[0].path, "SELF_IMPROVEMENT_REMINDER.md");
});

test("self-improvement hook skips sub-agent sessions", async () => {
  const event = {
    type: "agent",
    action: "bootstrap",
    sessionKey: "agent:main:subagent:worker",
    context: { bootstrapFiles: [] },
  };

  await handler(event);

  assert.equal(event.context.bootstrapFiles.length, 0);
});
