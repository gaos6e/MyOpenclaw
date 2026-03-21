import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
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

function writeJsonl(filePath, entries) {
  ensureDir(path.dirname(filePath));
  const content = entries.map((entry) => JSON.stringify(entry)).join("\n");
  fs.writeFileSync(filePath, content ? `${content}\n` : "", "utf8");
}

export function appendCandidates(params) {
  const filePath = path.join(params.inboxDir, `${params.fileStem}.jsonl`);
  const existing = readJsonl(filePath);
  const byId = new Map(existing.map((entry) => [entry.id, entry]));
  for (const candidate of params.candidates ?? []) {
    byId.set(candidate.id, candidate);
  }
  writeJsonl(filePath, [...byId.values()]);
  return {
    path: filePath,
    count: params.candidates?.length ?? 0,
  };
}

export function listInboxCandidates(params) {
  const inboxDir = path.join(params.workspaceDir, "memory", "inbox");
  if (!fs.existsSync(inboxDir)) {
    return [];
  }
  return fs
    .readdirSync(inboxDir)
    .filter((name) => name.endsWith(".jsonl"))
    .flatMap((name) => readJsonl(path.join(inboxDir, name)));
}

function findInboxFile(workspaceDir, candidateId) {
  const inboxDir = path.join(workspaceDir, "memory", "inbox");
  if (!fs.existsSync(inboxDir)) {
    throw new Error("candidate inbox does not exist");
  }
  for (const entry of fs.readdirSync(inboxDir)) {
    const filePath = path.join(inboxDir, entry);
    if (!entry.endsWith(".jsonl")) {
      continue;
    }
    const records = readJsonl(filePath);
    if (records.some((record) => record.id === candidateId)) {
      return { filePath, records };
    }
  }
  throw new Error(`candidate not found: ${candidateId}`);
}

function ensureSection(content, sectionTitle) {
  if (content.includes(`## ${sectionTitle}`)) {
    return content;
  }
  const suffix = content.endsWith("\n") ? "" : "\n";
  return `${content}${suffix}\n## ${sectionTitle}\n`;
}

function appendBulletToSection(content, sectionTitle, bullet) {
  const ensured = ensureSection(content, sectionTitle);
  const sectionHeader = `## ${sectionTitle}`;
  const start = ensured.indexOf(sectionHeader);
  const nextHeaderIndex = ensured.indexOf("\n## ", start + sectionHeader.length);
  const sectionEnd = nextHeaderIndex === -1 ? ensured.length : nextHeaderIndex;
  const before = ensured.slice(0, sectionEnd).trimEnd();
  const after = ensured.slice(sectionEnd);
  if (before.includes(bullet)) {
    return ensured;
  }
  return `${before}\n- ${bullet}\n${after.startsWith("\n") ? after : `\n${after}`}`.trimEnd() + "\n";
}

function historyRecord(params) {
  return {
    id: crypto.randomUUID(),
    action: "promote",
    target: params.target,
    kind: params.kind ?? null,
    value: params.value,
    source_ref: params.sourceRef,
    recorded_at: new Date().toISOString(),
    valid_from: params.validFrom ?? new Date().toISOString(),
    valid_to: null,
  };
}

function sectionForCandidate(candidate) {
  return candidate?.candidate_kind === "preference" ? "Preferences & setup" : "Stable facts";
}

export async function promoteCandidate(params) {
  const { filePath, records } = findInboxFile(params.workspaceDir, params.candidateId);
  const candidate = records.find((record) => record.id === params.candidateId);
  if (!candidate) {
    throw new Error(`candidate not found: ${params.candidateId}`);
  }
  const memoryPath = path.join(params.workspaceDir, "MEMORY.md");
  const historyPath = path.join(params.workspaceDir, "memory", "history.jsonl");
  const originalMemory = await fsPromises.readFile(memoryPath, "utf8");
  const targetSection = sectionForCandidate(candidate);
  const nextMemory = appendBulletToSection(
    originalMemory,
    targetSection,
    candidate.normalized,
  );
  await fsPromises.writeFile(memoryPath, nextMemory, "utf8");

  const nextRecords = records.map((record) =>
    record.id === params.candidateId
      ? { ...record, reviewed: true, promoted_to: params.target }
      : record,
  );
  writeJsonl(filePath, nextRecords);

  const historyEntries = readJsonl(historyPath);
  historyEntries.push(
    historyRecord({
      target: params.target,
      kind: candidate.candidate_kind ?? null,
      value: candidate.normalized,
      sourceRef: candidate.source_ref,
    }),
  );
  writeJsonl(historyPath, historyEntries);

  return {
    candidateId: params.candidateId,
    target: params.target,
  };
}
