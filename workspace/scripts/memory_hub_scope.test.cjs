const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repoRoot = path.resolve(__dirname, "..", "..");
const moduleUrl = pathToFileURL(
  path.join(repoRoot, "extensions", "openclaw-memory-hub", "src", "session-scope.js"),
).href;

test("private and direct sessions can access durable memory", async () => {
  const { canAccessDurableMemory } = await import(moduleUrl);

  assert.equal(canAccessDurableMemory("agent:main:main"), true);
  assert.equal(canAccessDurableMemory("agent:main:qqbot:direct:abc123"), true);
});

test("shared sessions cannot access durable memory", async () => {
  const { canAccessDurableMemory, inferSessionScope } = await import(moduleUrl);

  assert.equal(canAccessDurableMemory("agent:main:discord:channel:123"), false);
  assert.equal(canAccessDurableMemory("agent:main:telegram:group:456"), false);
  assert.equal(canAccessDurableMemory("agent:main:slack:room:789"), false);
  assert.equal(inferSessionScope("agent:main:discord:channel:123").chatType, "shared");
});

