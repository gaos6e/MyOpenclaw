const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repoRoot = path.resolve(__dirname, "..", "..");
const moduleUrl = pathToFileURL(
  path.join(repoRoot, "extensions", "openclaw-memory-hub", "src", "indexer.js"),
).href;

async function withTempWorkspace(fn) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "memory-hub-"));
  try {
    const workspaceDir = path.join(tempRoot, "workspace");
    const memoryDir = path.join(workspaceDir, "memory");
    const ontologyDir = path.join(memoryDir, "ontology");
    fs.mkdirSync(ontologyDir, { recursive: true });
    fs.writeFileSync(
      path.join(workspaceDir, "MEMORY.md"),
      [
        "# MEMORY.md",
        "",
        "## Preferences & setup",
        "- Hobbies: 航拍、摄影、PC装机",
        "- Long-term workspace: C:\\Users\\20961\\.openclaw\\workspace",
        "",
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(path.join(memoryDir, "2026-03-20.md"), "# 2026-03-20\n\n## Facts\n- Use QQ for communication\n", "utf8");
    fs.writeFileSync(path.join(memoryDir, "README.md"), "# Memory Governance\n\n## Facts\n## Decisions\n## Preferences\n", "utf8");
    fs.writeFileSync(path.join(memoryDir, "TEMPLATE.md"), "# YYYY-MM-DD\n\n## Facts\n## Decisions\n## Preferences\n", "utf8");
    fs.writeFileSync(path.join(memoryDir, "2026-03-17-plan-a.md"), "# draft plan\n\n## Preferences\n", "utf8");
    fs.writeFileSync(
      path.join(ontologyDir, "graph.jsonl"),
      JSON.stringify({
        kind: "entity",
        id: "pref:hobby:1",
        type: "Preference",
        name: "hobby",
        summary: "用户爱好包括航拍和摄影",
        source_ref: "MEMORY.md#hobbies",
        valid_from: "2026-03-20T00:00:00.000Z",
        confidence: 0.9,
      }) + "\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(memoryDir, "index-manifest.json"),
      JSON.stringify(
        {
          include: ["MEMORY.md", "memory/YYYY-MM-DD.md", "memory/ontology/graph.jsonl"],
          exclude: ["memory/README.md", "memory/TEMPLATE.md", "memory/**/*plan*.md", "memory/inbox/**"],
        },
        null,
        2,
      ),
      "utf8",
    );
    return await fn({ tempRoot, workspaceDir });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test("v2 index excludes governance files from memory_search results", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const { MemoryHubIndexer } = await import(moduleUrl);
    const indexer = new MemoryHubIndexer({
      workspaceDir,
      dbPath: path.join(workspaceDir, "..", "memory", "main.v2.sqlite"),
    });
    try {
      await indexer.reindex({ force: true });
      const results = await indexer.search("Facts Decisions Preferences Actions Follow-ups", { maxResults: 5 });
      const paths = results.map((item) => item.path);

      assert.equal(paths.includes("memory/README.md"), false);
      assert.equal(paths.includes("memory/TEMPLATE.md"), false);
      assert.equal(paths.includes("memory/2026-03-17-plan-a.md"), false);
    } finally {
      indexer.close();
    }
  }));

test("v2 index prioritizes durable memory over governance text", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const { MemoryHubIndexer } = await import(moduleUrl);
    const indexer = new MemoryHubIndexer({
      workspaceDir,
      dbPath: path.join(workspaceDir, "..", "memory", "main.v2.sqlite"),
    });
    try {
      await indexer.reindex({ force: true });
      const results = await indexer.search("航拍 爱好", { maxResults: 3 });

      assert.equal(results.length > 0, true);
      assert.equal(results[0].path, "MEMORY.md");
    } finally {
      indexer.close();
    }
  }));

test("v2 search uses indexed content until reindex is requested", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const { MemoryHubIndexer } = await import(moduleUrl);
    const indexer = new MemoryHubIndexer({
      workspaceDir,
      dbPath: path.join(workspaceDir, "..", "memory", "main.v2.sqlite"),
    });
    try {
      await indexer.reindex({ force: true });
      fs.writeFileSync(
        path.join(workspaceDir, "MEMORY.md"),
        [
          "# MEMORY.md",
          "",
          "## Preferences & setup",
          "- Completely different preference text",
          "",
        ].join("\n"),
        "utf8",
      );

      const results = await indexer.search("different preference", { maxResults: 3 });

      assert.equal(results.some((item) => /different preference/i.test(item.snippet)), false);
    } finally {
      indexer.close();
    }
  }));
