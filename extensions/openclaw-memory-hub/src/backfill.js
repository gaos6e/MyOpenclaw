import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { extractHeuristicCandidates } from "./candidates.js";

function sessionsDirFor(stateDir, agentId = "main") {
  return path.join(stateDir, "agents", agentId, "sessions");
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function extractUserTexts(filePath) {
  return readJsonl(filePath)
    .map((entry) => entry.message ?? entry)
    .filter((message) => message?.role === "user" && typeof message?.content === "string")
    .map((message) => message.content);
}

export async function snapshotMemorySources(params) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const targetDir = path.join(params.snapshotDir, stamp);
  fs.mkdirSync(targetDir, { recursive: true });
  const copyTargets = [
    path.join(params.workspaceDir, "MEMORY.md"),
    path.join(params.workspaceDir, "memory"),
    path.join(params.stateDir, "agents", params.agentId ?? "main", "sessions"),
    path.join(params.stateDir, "memory", "main.sqlite"),
    path.join(params.stateDir, "cron", "jobs.json"),
  ];
  for (const source of copyTargets) {
    if (!fs.existsSync(source)) {
      continue;
    }
    const dest = path.join(targetDir, path.basename(source));
    const stat = fs.statSync(source);
    if (stat.isDirectory()) {
      fs.cpSync(source, dest, { recursive: true, force: true });
    } else {
      fs.copyFileSync(source, dest);
    }
  }
  return { snapshotDir: targetDir };
}

export async function backfillTranscriptCandidates(params) {
  const sessionsDir = sessionsDirFor(params.stateDir, params.agentId);
  const inboxFile = path.join(params.inboxDir, `session-backfill-${new Date().toISOString().slice(0, 10)}.jsonl`);
  const existingLines = fs.existsSync(inboxFile)
    ? (await fsPromises.readFile(inboxFile, "utf8")).split(/\r?\n/).filter(Boolean)
    : [];
  const existingIds = new Set(existingLines.map((line) => JSON.parse(line).id));
  const files = fs
    .readdirSync(sessionsDir)
    .filter((name) => name.endsWith(".jsonl") && !name.includes(".deleted.") && !name.includes(".reset."));
  let appended = 0;
  for (const name of files.slice(0, params.limit)) {
    const filePath = path.join(sessionsDir, name);
    const candidates = extractHeuristicCandidates({
      sourceKind: "session-backfill",
      sourceRef: `sessions/${name}`,
      texts: extractUserTexts(filePath),
    }).filter((candidate) => !existingIds.has(candidate.id));
    if (candidates.length === 0) {
      continue;
    }
    const lines = candidates.map((candidate) => JSON.stringify(candidate));
    fs.mkdirSync(params.inboxDir, { recursive: true });
    fs.appendFileSync(inboxFile, `${lines.join("\n")}\n`, "utf8");
    for (const candidate of candidates) {
      existingIds.add(candidate.id);
      appended += 1;
    }
  }
  return { path: inboxFile, appended };
}
