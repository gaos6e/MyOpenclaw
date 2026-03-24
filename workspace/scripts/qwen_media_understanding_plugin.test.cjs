const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repoRoot = path.resolve(__dirname, "..", "..");
const pluginId = "openclaw-qwen-media-understanding";
const pluginEntryPath = path.join(repoRoot, "extensions", pluginId, "index.js");
const configPath = path.join(repoRoot, "openclaw.json");

async function importPluginModule() {
  return import(pathToFileURL(pluginEntryPath).href);
}

test("qwen media understanding plugin resolves qwen-portal to configured qwen provider", async () => {
  const pluginModule = await importPluginModule();
  const cfg = {
    models: {
      providers: {
        qwen: {
          api: "openai-completions",
        },
      },
    },
  };

  assert.equal(
    pluginModule.resolveUnderlyingProviderId(cfg, "qwen-portal"),
    "qwen",
  );
});

test("qwen media understanding plugin resolves configured image model under qwen provider", async () => {
  const pluginModule = await importPluginModule();
  const cfg = {
    models: {
      providers: {
        qwen: {
          api: "openai-completions",
          baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
          models: [
            {
              id: "qwen3-vl-plus",
              name: "Qwen3 VL Plus",
              input: ["text", "image"],
              reasoning: false,
              contextWindow: 131072,
              maxTokens: 8192,
              cost: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0,
              },
            },
          ],
        },
      },
    },
  };

  const model = pluginModule.resolveConfiguredImageModel(cfg, "qwen-portal", "qwen3-vl-plus");

  assert.equal(model.provider, "qwen");
  assert.equal(model.id, "qwen3-vl-plus");
  assert.equal(model.api, "openai-completions");
  assert.equal(model.baseUrl, "https://dashscope.aliyuncs.com/compatible-mode/v1");
});

test("qwen media understanding plugin registers a qwen-portal image provider", async () => {
  const pluginModule = await importPluginModule();
  const registrations = [];

  pluginModule.default.register({
    registerMediaUnderstandingProvider(provider) {
      registrations.push(provider);
    },
  });

  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].id, "qwen-portal");
  assert.deepEqual(registrations[0].capabilities, ["image"]);
  assert.equal(typeof registrations[0].describeImage, "function");
  assert.equal(typeof registrations[0].describeImages, "function");
});

test("openclaw config enables the qwen media understanding plugin", () => {
  const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));

  assert(cfg.plugins.allow.includes(pluginId));
  assert.equal(cfg.plugins.entries[pluginId]?.enabled, true);
});
