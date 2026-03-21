import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { canAccessSessionTranscript } from "./session-scope.js";

function sessionsDirFor(stateDir, agentId = "main") {
  return path.join(stateDir, "agents", agentId, "sessions");
}

function tokenizeQuery(query) {
  return String(query ?? "")
    .match(/[\p{L}\p{N}_./:-]+/gu)
    ?.map((item) => item.trim())
    .filter(Boolean) ?? [];
}

function parseTranscriptLines(text, transcriptPath) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }
    try {
      const parsed = JSON.parse(line);
      const message = parsed.message ?? parsed;
      const content = typeof message?.content === "string" ? message.content : null;
      if (!content) {
        continue;
      }
      entries.push({
        path: transcriptPath,
        startLine: index + 1,
        endLine: index + 1,
        snippet: content,
      });
    } catch {
      // Ignore malformed transcript lines.
    }
  }
  return entries;
}

export function collectUserTextsFromTranscript(rawText) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .map((entry) => entry?.message ?? entry)
    .filter((message) => message?.role === "user" && typeof message?.content === "string")
    .map((message) => message.content);
}

function scoreEntry(entry, tokens) {
  const haystack = entry.snippet.toLowerCase();
  const hits = tokens.filter((token) => haystack.includes(token.toLowerCase())).length;
  if (hits === 0) {
    return 0;
  }
  return hits / Math.max(tokens.length, 1);
}

export async function resolveCurrentTranscriptPath(params) {
  const sessionsDir = sessionsDirFor(params.stateDir, params.agentId);
  const storePath = path.join(sessionsDir, "sessions.json");
  const store = JSON.parse(await fsPromises.readFile(storePath, "utf8"));
  const entry = store[params.sessionKey];
  if (!entry?.sessionId) {
    throw new Error(`session not found: ${params.sessionKey}`);
  }
  return path.join(sessionsDir, `${entry.sessionId}.jsonl`);
}

export async function searchSessionTranscript(params) {
  const transcriptPath = await resolveCurrentTranscriptPath(params);
  const tokens = tokenizeQuery(params.query);
  const content = await fsPromises.readFile(transcriptPath, "utf8");
  const results = parseTranscriptLines(content, transcriptPath)
    .map((entry) => ({ ...entry, score: scoreEntry(entry, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, Number(params.maxResults ?? 5)));
  return results;
}

export async function readSessionTranscriptSnippet(params) {
  const transcriptPath = await resolveCurrentTranscriptPath(params);
  const requestedPath = path.resolve(params.path ?? transcriptPath);
  if (!canAccessSessionTranscript(transcriptPath, requestedPath)) {
    throw new Error("cross-session transcript access is not allowed");
  }
  if (!fs.existsSync(transcriptPath)) {
    return { path: transcriptPath, text: "" };
  }
  const content = await fsPromises.readFile(transcriptPath, "utf8");
  if (!params.from && !params.lines) {
    return { path: transcriptPath, text: content };
  }
  const lines = content.split(/\r?\n/);
  const from = Math.max(1, Number(params.from ?? 1));
  const count = Math.max(1, Number(params.lines ?? lines.length));
  return {
    path: transcriptPath,
    text: lines.slice(from - 1, from - 1 + count).join("\n"),
  };
}

export async function collectCurrentSessionUserTexts(params) {
  const transcriptPath = await resolveCurrentTranscriptPath(params);
  const content = await fsPromises.readFile(transcriptPath, "utf8");
  return collectUserTextsFromTranscript(content);
}
