import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";

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
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const content = entries.map((entry) => JSON.stringify(entry)).join("\n");
  fs.writeFileSync(filePath, content ? `${content}\n` : "", "utf8");
}

const MACHINE_READABLE_SECTIONS = new Set([
  "About the user",
  "Preferences & setup",
  "Stable facts",
]);

function buildRelation(type, summary, sourceRef, validFrom, confidence = 0.85) {
  return {
    kind: "relation",
    id: crypto.createHash("sha1").update(`${type}:${summary}:${sourceRef}`).digest("hex"),
    type,
    from: "person:user",
    to: crypto.createHash("sha1").update(summary).digest("hex"),
    summary,
    source_ref: sourceRef,
    valid_from: validFrom,
    valid_to: null,
    confidence,
    reviewed: true,
  };
}

function parseMemorySections(memoryText) {
  const sections = new Map();
  let currentSection = null;
  for (const line of memoryText.split(/\r?\n/)) {
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      if (!sections.has(currentSection)) {
        sections.set(currentSection, []);
      }
      continue;
    }
    if (!currentSection) {
      continue;
    }
    sections.get(currentSection).push(line);
  }
  return sections;
}

function collectTopLevelBullets(sectionLines) {
  return (sectionLines ?? [])
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function parseKeyValueBullet(bullet) {
  const match = bullet.match(/^([^:：]+)\s*[:：]\s+(.*)$/);
  if (!match) {
    return null;
  }
  return {
    key: match[1].trim(),
    value: match[2].trim(),
  };
}

function inferSummaryType(sectionTitle, summary) {
  if (sectionTitle === "About the user") {
    if (/hobbies?|爱好|prefer|喜欢/i.test(summary)) {
      return "preference";
    }
    if (/workspace|timezone|files live in/i.test(summary)) {
      return "constraint";
    }
    return "identity";
  }
  if (/workspace|timezone|files live in/i.test(summary)) {
    return "constraint";
  }
  return sectionTitle === "Preferences & setup" ? "preference" : "fact";
}

function deriveMemoryRelations(memoryText) {
  const relations = [];
  const sections = parseMemorySections(memoryText);
  for (const sectionTitle of MACHINE_READABLE_SECTIONS) {
    const bullets = collectTopLevelBullets(sections.get(sectionTitle));
    for (const bullet of bullets) {
      const keyValue = parseKeyValueBullet(bullet);
      if (sectionTitle === "About the user") {
        if (!keyValue || !keyValue.value) {
          continue;
        }
        const summary = `${keyValue.key}: ${keyValue.value}`;
        relations.push(
          buildRelation(
            inferSummaryType(sectionTitle, summary),
            summary,
            "MEMORY.md",
            new Date().toISOString(),
          ),
        );
        continue;
      }
      if (!keyValue && /[:：]$/.test(bullet)) {
        continue;
      }
      if (keyValue && !keyValue.value) {
        continue;
      }
      const summary = keyValue ? `${keyValue.key}: ${keyValue.value}` : bullet;
      relations.push(
        buildRelation(
          inferSummaryType(sectionTitle, summary),
          summary,
          "MEMORY.md",
          new Date().toISOString(),
        ),
      );
    }
  }
  return relations;
}

function deriveHistoryRelations(historyEntries) {
  return historyEntries
    .filter((entry) => entry?.action === "promote" && typeof entry?.value === "string")
    .map((entry) =>
      buildRelation(
        typeof entry?.kind === "string" && entry.kind.trim()
          ? entry.kind.trim()
          : /workspace|timezone|files live in/i.test(entry.value)
            ? "constraint"
            : /hobbies?|爱好|prefer|喜欢/i.test(entry.value)
              ? "preference"
              : "fact",
        entry.value,
        entry.source_ref ?? "history.jsonl",
        entry.valid_from ?? entry.recorded_at ?? new Date().toISOString(),
        0.9,
      ),
    );
}

export async function rebuildOntologyGraph(params) {
  const memoryPath = path.join(params.workspaceDir, "MEMORY.md");
  const memoryText = fs.existsSync(memoryPath) ? await fsPromises.readFile(memoryPath, "utf8") : "";
  const historyEntries = readJsonl(params.historyPath);
  const records = [
    {
      kind: "entity",
      id: "person:user",
      type: "Person",
      name: "user",
      summary: "Primary OpenClaw user",
      source_ref: "MEMORY.md",
      valid_from: new Date().toISOString(),
      valid_to: null,
      confidence: 1,
      reviewed: true,
    },
    ...deriveMemoryRelations(memoryText),
    ...deriveHistoryRelations(historyEntries),
  ];
  writeJsonl(params.ontologyPath, records);
  return {
    count: records.length,
    path: params.ontologyPath,
  };
}

export async function lookupOntology(params) {
  const tokens =
    String(params.query ?? "")
      .match(/[\p{L}\p{N}_./:-]+/gu)
      ?.map((item) => item.trim().toLowerCase())
      .filter(Boolean) ?? [];
  const records = readJsonl(params.ontologyPath);
  return records
    .map((record) => {
      const haystack = `${record.name ?? ""} ${record.summary ?? ""} ${record.type ?? ""}`.toLowerCase();
      const hits = tokens.filter((token) => haystack.includes(token)).length;
      return hits > 0
        ? {
            ...record,
            score: hits / Math.max(tokens.length, 1),
          }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, Number(params.limit ?? 5)));
}
