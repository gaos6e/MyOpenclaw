const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repoRoot = path.resolve(__dirname, "..", "..");
const moduleUrl = pathToFileURL(
  path.join(repoRoot, "workspace", "scripts", "mem0_migration.cjs"),
).href;

test("mem0 migration extracts durable memory from canonical sections and skips ongoing context", async () => {
  const { collectMem0MigrationEntries } = await import(moduleUrl);

  const entries = collectMem0MigrationEntries({
    memoryText: [
      "# MEMORY.md",
      "",
      "## About the user",
      "- What to call them: 哥哥～",
      "- Timezone: Asia/Shanghai",
      "",
      "## Preferences & setup",
      "- Use QQ for communication",
      "- 进行自我提升前先告知用户",
      "",
      "## Stable facts",
      "- 暗号约定：用户说“你给了？”，助手回“他非要~”。",
      "",
      "## Ongoing context",
      "- PD 项目：本地目录 C:\\Users\\20961\\.openclaw\\workspace\\PD\\",
      "- 自我提升机制：canonical candidate flow",
      "",
    ].join("\n"),
    historyEntries: [],
  });

  assert.deepEqual(
    entries.map((entry) => entry.memory),
    [
      "What to call them: 哥哥～",
      "Timezone: Asia/Shanghai",
      "Use QQ for communication",
      "进行自我提升前先告知用户",
      "暗号约定：用户说“你给了？”，助手回“他非要~”。",
    ],
  );
});

test("mem0 migration ignores history by default and only migrates curated durable memory", async () => {
  const { collectMem0MigrationEntries } = await import(moduleUrl);

  const entries = collectMem0MigrationEntries({
    memoryText: [
      "# MEMORY.md",
      "",
      "## Preferences & setup",
      "- Use QQ for communication",
      "",
    ].join("\n"),
    historyEntries: [
      {
        action: "promote",
        kind: "preference",
        value: "User wants Moltbook community access.",
      },
    ],
  });

  assert.deepEqual(
    entries.map((entry) => entry.memory),
    ["Use QQ for communication"],
  );
});

test("mem0 migration filters unsafe history records and deduplicates against durable memory when history import is enabled", async () => {
  const { collectMem0MigrationEntries } = await import(moduleUrl);

  const entries = collectMem0MigrationEntries({
    memoryText: [
      "# MEMORY.md",
      "",
      "## Preferences & setup",
      "- Use QQ for communication",
      "",
      "## Stable facts",
      "- 允许将关键 source 的抽取文本/结构化摘要落地到 workspace/PD 以便检索",
      "",
    ].join("\n"),
    historyEntries: [
      {
        action: "promote",
        kind: "fact",
        value: "允许将关键 source 的抽取文本/结构化摘要落地到 workspace/PD 以便检索",
      },
      {
        action: "promote",
        kind: "fact",
        value: "本机应以 C:\\Users\\20961\\.openclaw\\skills 与 C:\\Users\\20961\\.openclaw\\workspace\\skills 目录是否存在为准",
      },
      {
        action: "promote",
        kind: "preference",
        value: "User wants Moltbook community access.",
      },
      {
        action: "promote",
        kind: "preference",
        value: "wttr.in location resolution failed for Guangzhou Huangpu, prefer Open-Meteo with explicit coordinates.",
        source_ref: "agent:main:cron:job-123",
      },
      {
        action: "promote",
        kind: "fact",
        value: "API key saved locally in C:\\Users\\20961\\.openclaw\\moltbook\\credentials.json and gitignored.",
      },
    ],
    includeHistory: true,
  });

  assert.deepEqual(
    entries.map((entry) => entry.memory),
    [
      "Use QQ for communication",
      "允许将关键 source 的抽取文本/结构化摘要落地到 workspace/PD 以便检索",
      "User wants Moltbook community access.",
    ],
  );
});
