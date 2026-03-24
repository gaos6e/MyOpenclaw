import { complete } from "../openclaw-qqbot/node_modules/@mariozechner/pi-ai/dist/index.js";
import {
  extractAssistantText,
  findNormalizedProviderKey,
  getApiKeyForModel,
  normalizeProviderId,
  requireApiKey,
} from "../openclaw-qqbot/node_modules/openclaw/dist/plugin-sdk/agent-runtime.js";
import { p as normalizeModelCompat } from "../openclaw-qqbot/node_modules/openclaw/dist/provider-model-minimax-XdwKeUOE.js";

const MEDIA_PROVIDER_ID = "qwen-portal";
const DEFAULT_PROMPT = "Describe the image.";
const DEFAULT_MAX_TOKENS = 512;

export function resolveUnderlyingProviderId(cfg, provider) {
  const providers = cfg?.models?.providers ?? {};
  const matchedKey = findNormalizedProviderKey(providers, provider);

  if (matchedKey) {
    return matchedKey;
  }

  if (normalizeProviderId(provider ?? "") === MEDIA_PROVIDER_ID && "qwen" in providers) {
    return "qwen";
  }

  return provider;
}

export function resolveConfiguredImageModel(cfg, provider, modelId) {
  const providerId = resolveUnderlyingProviderId(cfg, provider);
  const providerConfig = cfg?.models?.providers?.[providerId];
  const configuredModel = providerConfig?.models?.find((entry) => entry?.id === modelId);

  if (!providerConfig || !configuredModel) {
    throw new Error(`Unknown model: ${provider}/${modelId}`);
  }

  return normalizeModelCompat({
    ...configuredModel,
    provider: providerId,
    api: configuredModel.api ?? providerConfig.api,
    baseUrl: configuredModel.baseUrl ?? providerConfig.baseUrl,
    headers: configuredModel.headers ?? providerConfig.headers,
  });
}

function buildImageContent(prompt, images) {
  return [
    {
      type: "text",
      text: prompt?.trim() || DEFAULT_PROMPT,
    },
    ...images.map((image) => ({
      type: "image",
      data: image.buffer.toString("base64"),
      mimeType: image.mime ?? "image/jpeg",
    })),
  ];
}

function coerceImageText(message, provider, model) {
  const stopReason = message?.stopReason;
  const errorMessage = typeof message?.errorMessage === "string" ? message.errorMessage.trim() : "";

  if (stopReason === "error" || stopReason === "aborted") {
    throw new Error(
      errorMessage
        ? `Image model failed (${provider}/${model}): ${errorMessage}`
        : `Image model failed (${provider}/${model})`,
    );
  }

  if (errorMessage) {
    throw new Error(`Image model failed (${provider}/${model}): ${errorMessage}`);
  }

  const text = extractAssistantText(message).trim();
  if (!text) {
    throw new Error(`Image model returned no text (${provider}/${model}).`);
  }

  return text;
}

async function runQwenImageCompletion(params) {
  const model = resolveConfiguredImageModel(params.cfg, params.provider, params.model);
  const apiKey = requireApiKey(
    await getApiKeyForModel({
      model,
      cfg: params.cfg,
      agentDir: params.agentDir,
      profileId: params.profile,
      preferredProfile: params.preferredProfile,
    }),
    model.provider,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 30000);

  try {
    const message = await complete(
      model,
      {
        messages: [
          {
            role: "user",
            content: buildImageContent(params.prompt, params.images),
            timestamp: Date.now(),
          },
        ],
      },
      {
        apiKey,
        maxTokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
        signal: controller.signal,
      },
    );

    return {
      text: coerceImageText(message, model.provider, model.id),
      model: model.id,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function describeQwenImage(params) {
  return runQwenImageCompletion({
    ...params,
    images: [
      {
        buffer: params.buffer,
        mime: params.mime,
      },
    ],
  });
}

async function describeQwenImages(params) {
  return runQwenImageCompletion({
    ...params,
    images: params.images.map((image) => ({
      buffer: image.buffer,
      mime: image.mime,
    })),
  });
}

const plugin = {
  id: "openclaw-qwen-media-understanding",
  name: "OpenClaw Qwen Media Understanding",
  description: "Registers image understanding for DashScope/OpenAI-compatible Qwen vision models.",
  register(api) {
    api.registerMediaUnderstandingProvider({
      id: MEDIA_PROVIDER_ID,
      capabilities: ["image"],
      describeImage: describeQwenImage,
      describeImages: describeQwenImages,
    });
  },
};

export default plugin;
