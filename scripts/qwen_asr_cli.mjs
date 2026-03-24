#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DEFAULT_MODEL = "qwen3-asr-flash";
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_RETRIES = 3;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

function guessMimeType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".ogg":
      return "audio/ogg";
    case ".m4a":
      return "audio/mp4";
    case ".aac":
      return "audio/aac";
    case ".amr":
      return "audio/amr";
    case ".pcm":
      return "audio/pcm";
    case ".flac":
      return "audio/flac";
    default:
      return "application/octet-stream";
  }
}

function extractTranscript(payload) {
  const choices = Array.isArray(payload?.choices)
    ? payload.choices
    : Array.isArray(payload?.output?.choices)
      ? payload.output.choices
      : [];
  const message = choices[0]?.message;
  const content = message?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const text = content
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item?.text === "string") return item.text;
        return "";
      })
      .join("")
      .trim();
    if (text) return text;
  }
  return "";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const filePath = args.file;
  if (!filePath) {
    throw new Error("Missing required --file argument.");
  }

  const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("QWEN_API_KEY is not set.");
  }

  const baseUrl = String(args["base-url"] || process.env.QWEN_ASR_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = String(args.model || process.env.QWEN_ASR_MODEL || DEFAULT_MODEL);
  const language = typeof args.language === "string" ? args.language.trim() : "";
  const prompt = typeof args.prompt === "string" ? args.prompt.trim() : "";
  const bytes = await fs.readFile(filePath);
  if (bytes.byteLength > MAX_AUDIO_BYTES) {
    throw new Error(`Audio file exceeds ${MAX_AUDIO_BYTES} bytes; qwen3-asr-flash only supports files up to 10 MB.`);
  }

  const mimeType = guessMimeType(filePath);
  const dataUri = `data:${mimeType};base64,${bytes.toString("base64")}`;
  const body = {
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "input_audio",
            input_audio: {
              data: dataUri
            }
          }
        ]
      }
    ],
    stream: false,
    asr_options: {}
  };

  if (language) body.asr_options.language = language;
  if (args["enable-itn"] === true) body.asr_options.enable_itn = true;
  if (prompt) {
    body.messages.unshift({
      role: "system",
      content: [{ text: prompt }]
    });
  }
  if (Object.keys(body.asr_options).length === 0) {
    delete body.asr_options;
  }

  let response;
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      break;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  if (!response) {
    throw lastError instanceof Error ? lastError : new Error("DashScope ASR request failed before a response was returned.");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DashScope ASR request failed (${response.status}): ${text}`);
  }

  const payload = await response.json();
  const transcript = extractTranscript(payload);
  if (!transcript) {
    throw new Error(`DashScope ASR response missing transcript: ${JSON.stringify(payload)}`);
  }

  process.stdout.write(transcript);
}

main().catch((error) => {
  if (error instanceof Error) {
    const details = error.cause ? ` (${String(error.cause)})` : "";
    process.stderr.write(`${error.message}${details}\n`);
  } else {
    process.stderr.write(`${String(error)}\n`);
  }
  process.exitCode = 1;
});
