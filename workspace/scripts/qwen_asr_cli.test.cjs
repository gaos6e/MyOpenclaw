const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const scriptUrl = pathToFileURL(
  path.join(__dirname, "..", "..", "scripts", "qwen_asr_cli.mjs"),
).href;

test("resolveRuntimeConfig prefers explicit api-key-env over default env names", async () => {
  const module = await import(scriptUrl);
  const config = module.resolveRuntimeConfig(
    {
      "api-key-env": "ALT_QWEN_KEY",
      "base-url": "https://example.com/v1",
      model: "qwen3-asr-plus",
    },
    {
      ALT_QWEN_KEY: "alt-token",
      QWEN_API_KEY: "default-token",
    },
  );

  assert.equal(config.apiKey, "alt-token");
  assert.equal(config.baseUrl, "https://example.com/v1");
  assert.equal(config.model, "qwen3-asr-plus");
});
