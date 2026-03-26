const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  syncQwenConfig,
} = require("./sync_qwen_config.cjs");

test("syncQwenConfig expands custom qwen profile into vision, embedding, and audio config", () => {
  const repoRoot = path.join("C:", "repo", "openclaw");
  const config = {
    custom: {
      qwen: {
        remote: {
          baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
          apiKey: {
            source: "env",
            id: "ALT_QWEN_KEY",
          },
        },
        vision: {
          id: "qwen3-vl-plus",
          name: "Qwen3 VL Plus",
          contextWindow: 131072,
          maxTokens: 8192,
        },
        embedding: {
          id: "text-embedding-v4",
          provider: "openai",
        },
        audio: {
          id: "qwen3-asr-flash",
        },
      },
    },
    models: {
      providers: {},
    },
    agents: {
      defaults: {
        memorySearch: {
          enabled: true,
          sources: ["memory", "sessions"],
          experimental: {
            sessionMemory: true,
          },
        },
      },
    },
    tools: {
      media: {
        audio: {
          enabled: true,
          maxBytes: 10485760,
          timeoutSeconds: 90,
        },
      },
    },
  };

  const next = syncQwenConfig(config, { repoRoot });

  assert.equal(next.models.providers.qwen.baseUrl, "https://dashscope.aliyuncs.com/compatible-mode/v1");
  assert.deepEqual(next.models.providers.qwen.apiKey, {
    source: "env",
    id: "ALT_QWEN_KEY",
  });
  assert.equal(next.models.providers.qwen.models[0].id, "qwen3-vl-plus");
  assert.equal(next.agents.defaults.imageModel.primary, "qwen/qwen3-vl-plus");
  assert.equal(next.agents.defaults.memorySearch.enabled, true);
  assert.deepEqual(next.agents.defaults.memorySearch.sources, ["memory", "sessions"]);
  assert.equal(next.agents.defaults.memorySearch.provider, "openai");
  assert.equal(next.agents.defaults.memorySearch.model, "text-embedding-v4");
  assert.deepEqual(next.agents.defaults.memorySearch.remote, {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: {
      source: "env",
      id: "ALT_QWEN_KEY",
    },
  });
  assert.equal(next.tools.media.audio.models[0].type, "cli");
  assert.deepEqual(next.tools.media.audio.models[0].args, [
    path.join(repoRoot, "scripts", "qwen_asr_cli.mjs"),
    "--file",
    "{{MediaPath}}",
    "--base-url",
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "--api-key-env",
    "ALT_QWEN_KEY",
    "--model",
    "qwen3-asr-flash",
  ]);
});
