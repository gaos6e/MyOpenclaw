#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureObject(target, key) {
  if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
    target[key] = {};
  }
  return target[key];
}

function requireString(value, fieldName) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`custom.qwen.${fieldName} is required`);
  }
  return text;
}

function requireEnvApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== "object" || Array.isArray(apiKey)) {
    throw new Error("custom.qwen.remote.apiKey must be an object");
  }
  if (apiKey.source !== "env" || !String(apiKey.id ?? "").trim()) {
    throw new Error("custom.qwen.remote.apiKey must use { source: \"env\", id: \"...\" }");
  }
  return {
    ...apiKey,
    id: String(apiKey.id).trim(),
  };
}

function buildVisionModel(vision) {
  const id = requireString(vision?.id, "vision.id");
  return {
    id,
    name: requireString(vision?.name ?? id, "vision.name"),
    reasoning: false,
    input: ["text", "image"],
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
    },
    contextWindow: Number(vision?.contextWindow ?? 131072),
    maxTokens: Number(vision?.maxTokens ?? 8192),
  };
}

function mergeVisionModel(existingModels, visionModel) {
  const models = Array.isArray(existingModels) ? existingModels.filter(Boolean) : [];
  const idx = models.findIndex((model) => model?.id === visionModel.id);
  if (idx >= 0) {
    const next = models.slice();
    next[idx] = {
      ...next[idx],
      ...visionModel,
    };
    return next;
  }
  return [...models, visionModel];
}

function buildAudioToolModel(profile, repoRoot) {
  const baseUrl = requireString(profile?.remote?.baseUrl, "remote.baseUrl");
  const apiKey = requireEnvApiKey(profile?.remote?.apiKey);
  const audioModel = requireString(profile?.audio?.id, "audio.id");
  return {
    type: "cli",
    command: "node",
    args: [
      path.join(repoRoot, "scripts", "qwen_asr_cli.mjs"),
      "--file",
      "{{MediaPath}}",
      "--base-url",
      baseUrl,
      "--api-key-env",
      apiKey.id,
      "--model",
      audioModel,
    ],
  };
}

function buildMemorySearch(profile, existing = {}) {
  const baseUrl = requireString(profile?.remote?.baseUrl, "remote.baseUrl");
  const apiKey = requireEnvApiKey(profile?.remote?.apiKey);
  const model = requireString(profile?.embedding?.id, "embedding.id");
  return {
    ...existing,
    provider: String(profile?.embedding?.provider ?? existing.provider ?? "openai"),
    remote: {
      baseUrl,
      apiKey,
    },
    model,
  };
}

function getQwenProfile(config) {
  const profile = config?.custom?.qwen;
  if (profile && typeof profile === "object" && !Array.isArray(profile)) {
    return profile;
  }

  const qwenProvider = config?.models?.providers?.qwen;
  const visionModel = Array.isArray(qwenProvider?.models)
    ? qwenProvider.models.find((model) => Array.isArray(model?.input) && model.input.includes("image"))
    : undefined;
  const memorySearch = config?.agents?.defaults?.memorySearch;
  const audioArgs = config?.tools?.media?.audio?.models?.[0]?.args;
  const modelArgIndex = Array.isArray(audioArgs) ? audioArgs.indexOf("--model") : -1;
  const audioModel = modelArgIndex >= 0 ? audioArgs[modelArgIndex + 1] : undefined;

  if (!qwenProvider || !visionModel || !memorySearch || !audioModel) {
    throw new Error("custom.qwen profile is missing and existing qwen config is incomplete");
  }

  return {
    remote: {
      baseUrl: qwenProvider.baseUrl,
      apiKey: qwenProvider.apiKey,
    },
    vision: {
      id: visionModel.id,
      name: visionModel.name ?? visionModel.id,
      contextWindow: visionModel.contextWindow,
      maxTokens: visionModel.maxTokens,
    },
    embedding: {
      id: memorySearch.model,
      provider: memorySearch.provider,
    },
    audio: {
      id: audioModel,
    },
  };
}

function syncQwenConfig(config, options = {}) {
  const repoRoot = path.resolve(options.repoRoot ?? path.join(__dirname, "..", ".."));
  const next = cloneJson(config);
  const profile = getQwenProfile(next);
  const models = ensureObject(next, "models");
  const providers = ensureObject(models, "providers");
  const qwenProvider = {
    ...providers.qwen,
    baseUrl: requireString(profile?.remote?.baseUrl, "remote.baseUrl"),
    apiKey: requireEnvApiKey(profile?.remote?.apiKey),
    api: "openai-completions",
  };
  qwenProvider.models = mergeVisionModel(providers.qwen?.models, buildVisionModel(profile.vision));
  providers.qwen = qwenProvider;

  const agents = ensureObject(next, "agents");
  const defaults = ensureObject(agents, "defaults");
  const currentImagePrimary = String(defaults.imageModel?.primary ?? "").trim();
  defaults.imageModel = {
    ...defaults.imageModel,
    primary: currentImagePrimary && !currentImagePrimary.startsWith("qwen/")
      ? currentImagePrimary
      : `qwen/${qwenProvider.models[0].id}`,
  };
  defaults.memorySearch = buildMemorySearch(profile, defaults.memorySearch);

  const tools = ensureObject(next, "tools");
  const media = ensureObject(tools, "media");
  const audio = ensureObject(media, "audio");
  audio.models = [buildAudioToolModel(profile, repoRoot)];

  return next;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    check: args.includes("--check"),
    configPath:
      args.includes("--config") && args[args.indexOf("--config") + 1]
        ? path.resolve(args[args.indexOf("--config") + 1])
        : path.resolve(__dirname, "..", "..", "openclaw.json"),
    repoRoot:
      args.includes("--repo-root") && args[args.indexOf("--repo-root") + 1]
        ? path.resolve(args[args.indexOf("--repo-root") + 1])
        : path.resolve(__dirname, "..", ".."),
  };
}

function main() {
  const args = parseArgs(process.argv);
  const current = loadJson(args.configPath);
  const next = syncQwenConfig(current, { repoRoot: args.repoRoot });
  const changed = JSON.stringify(current) !== JSON.stringify(next);
  if (args.check) {
    if (changed) {
      throw new Error(`Qwen config is out of sync: ${args.configPath}`);
    }
    process.stdout.write(`Qwen config is in sync: ${args.configPath}\n`);
    return;
  }
  saveJson(args.configPath, next);
  process.stdout.write(`${changed ? "Updated" : "Already in sync"} ${args.configPath}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  buildAudioToolModel,
  buildMemorySearch,
  buildVisionModel,
  syncQwenConfig,
};
