const fs = require("node:fs");
const path = require("node:path");

const CANONICAL_SECTIONS = ["About the user", "Preferences & setup", "Stable facts"];
const IGNORE_PATTERNS = [
  /skills\s*目录/i,
  /workspace[\\/]+skills/i,
  /目录是否存在为准/i,
  /snapany/i,
  /cron runs --id/i,
  /api key saved locally/i,
  /credentials\.json/i,
  /gitignored/i,
];

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function parseMemorySections(memoryText) {
  const sections = new Map();
  let currentSection = null;
  for (const line of String(memoryText ?? "").split(/\r?\n/)) {
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
  const match = String(bullet ?? "").match(/^([^:：]+)\s*[:：]\s+(.*)$/);
  if (!match) {
    return null;
  }
  return {
    key: normalizeText(match[1]),
    value: normalizeText(match[2]),
  };
}

function inferEntryKind(sectionTitle) {
  if (sectionTitle === "Preferences & setup") {
    return "preference";
  }
  return "fact";
}

function shouldIgnoreMemory(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return true;
  }
  return IGNORE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function makeEntry(memory, extra = {}) {
  return {
    memory,
    ...extra,
  };
}

function collectEntriesFromMemory(memoryText) {
  const sections = parseMemorySections(memoryText);
  const entries = [];

  for (const sectionTitle of CANONICAL_SECTIONS) {
    const bullets = collectTopLevelBullets(sections.get(sectionTitle));
    for (const bullet of bullets) {
      if (sectionTitle === "About the user") {
        const keyValue = parseKeyValueBullet(bullet);
        if (!keyValue?.value) {
          continue;
        }
        const memory = `${keyValue.key}: ${keyValue.value}`;
        if (shouldIgnoreMemory(memory)) {
          continue;
        }
        entries.push(
          makeEntry(memory, {
            kind: inferEntryKind(sectionTitle),
            source: "MEMORY.md",
            section: sectionTitle,
            metadata: {
              migrated_from: "MEMORY.md",
              section: sectionTitle,
            },
          }),
        );
        continue;
      }

      if (/[:：]$/.test(bullet)) {
        continue;
      }
      const keyValue = parseKeyValueBullet(bullet);
      const memory = keyValue ? `${keyValue.key}: ${keyValue.value}` : bullet;
      if (shouldIgnoreMemory(memory)) {
        continue;
      }
      entries.push(
        makeEntry(memory, {
          kind: inferEntryKind(sectionTitle),
          source: "MEMORY.md",
          section: sectionTitle,
          metadata: {
            migrated_from: "MEMORY.md",
            section: sectionTitle,
          },
        }),
      );
    }
  }

  return entries;
}

function collectEntriesFromHistory(historyEntries) {
  return (historyEntries ?? [])
    .filter((entry) => entry?.action === "promote" && typeof entry?.value === "string")
    .filter((entry) => !String(entry?.source_ref ?? "").includes(":cron:"))
    .map((entry) =>
      makeEntry(normalizeText(entry.value), {
        kind: normalizeText(entry.kind) || "fact",
        source: entry.source_ref ?? "history.jsonl",
        section: "history",
        metadata: {
          migrated_from: "history.jsonl",
          source_ref: entry.source_ref ?? null,
          kind: normalizeText(entry.kind) || "fact",
          recorded_at: entry.recorded_at ?? null,
        },
      }),
    )
    .filter((entry) => !shouldIgnoreMemory(entry.memory));
}

function dedupeEntries(entries) {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    const key = normalizeText(entry.memory).toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(entry);
  }
  return result;
}

function collectMem0MigrationEntries({ memoryText, historyEntries, includeHistory = false }) {
  return dedupeEntries([
    ...collectEntriesFromMemory(memoryText),
    ...(includeHistory ? collectEntriesFromHistory(historyEntries) : []),
  ]);
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

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    repoRoot: path.resolve(__dirname, "..", ".."),
    userId: null,
    apply: false,
    json: false,
    apiKeyEnv: "MEM0_API_KEY",
    includeHistory: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--repo-root") {
      options.repoRoot = path.resolve(args[index + 1]);
      index += 1;
    } else if (arg === "--user-id") {
      options.userId = args[index + 1];
      index += 1;
    } else if (arg === "--apply") {
      options.apply = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--api-key-env") {
      options.apiKeyEnv = args[index + 1];
      index += 1;
    } else if (arg === "--include-history") {
      options.includeHistory = true;
    }
  }
  return options;
}

function resolveConfiguredUserId(repoRoot) {
  const configPath = path.join(repoRoot, "openclaw.json");
  if (!fs.existsSync(configPath)) {
    return "local-owner";
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return config?.plugins?.entries?.["openclaw-mem0"]?.config?.userId ?? "local-owner";
}

async function importEntriesToMem0(entries, { apiKey, userId }) {
  const { MemoryClient } = await import("mem0ai");
  const client = new MemoryClient({ apiKey });
  const existing = await client.getAll({ user_id: userId, page_size: 1000, source: "OPENCLAW" });
  const existingSet = new Set(
    (existing ?? [])
      .map((item) => normalizeText(item?.memory ?? item?.data?.memory))
      .filter(Boolean)
      .map((item) => item.toLowerCase()),
  );

  const imported = [];
  const skipped = [];
  for (const entry of entries) {
    const key = normalizeText(entry.memory).toLowerCase();
    if (existingSet.has(key)) {
      skipped.push({ ...entry, reason: "duplicate" });
      continue;
    }
    const result = await client.add(
      [{ role: "user", content: entry.memory }],
      {
        user_id: userId,
        source: "OPENCLAW",
        metadata: entry.metadata,
      },
    );
    imported.push({
      ...entry,
      resultCount: Array.isArray(result) ? result.length : 0,
    });
    existingSet.add(key);
  }

  return {
    imported,
    skipped,
  };
}

async function main() {
  const options = parseArgs(process.argv);
  const workspaceDir = path.join(options.repoRoot, "workspace");
  const memoryText = fs.readFileSync(path.join(workspaceDir, "MEMORY.md"), "utf8");
  const historyEntries = readJsonl(path.join(workspaceDir, "memory", "history.jsonl"));
  const entries = collectMem0MigrationEntries({
    memoryText,
    historyEntries,
    includeHistory: options.includeHistory,
  });
  const userId = options.userId ?? resolveConfiguredUserId(options.repoRoot);

  const summary = {
    userId,
    includeHistory: options.includeHistory,
    entries,
    entryCount: entries.length,
    applied: false,
  };

  if (options.apply) {
    const apiKey = String(process.env[options.apiKeyEnv] ?? "").trim();
    if (!apiKey) {
      throw new Error(`${options.apiKeyEnv} not set`);
    }
    const result = await importEntriesToMem0(entries, { apiKey, userId });
    summary.applied = true;
    summary.importedCount = result.imported.length;
    summary.skippedCount = result.skipped.length;
    summary.imported = result.imported;
    summary.skipped = result.skipped;
  }

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`userId: ${summary.userId}`);
  console.log(`entries: ${summary.entryCount}`);
  if (summary.applied) {
    console.log(`imported: ${summary.importedCount}`);
    console.log(`skipped: ${summary.skippedCount}`);
  }
}

module.exports = {
  collectMem0MigrationEntries,
  normalizeText,
  shouldIgnoreMemory,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
