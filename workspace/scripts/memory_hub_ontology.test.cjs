const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repoRoot = path.resolve(__dirname, "..", "..");
const moduleUrl = pathToFileURL(
  path.join(repoRoot, "extensions", "openclaw-memory-hub", "src", "ontology.js"),
).href;

async function withTempWorkspace(fn) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "memory-ontology-"));
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
        "## About the user",
        "- Name: ",
        "- What to call them: Xiao Gao",
        "- Pronouns:",
        "- Timezone: Asia/Shanghai",
        "",
        "## Preferences & setup",
        "- Use QQ for communication",
        "- Long-term workspace: C:\\Users\\20961\\.openclaw\\workspace",
        "",
        "## Stable facts",
        "- User lives in Guangzhou",
        "",
        "## Ongoing context",
        "- 自我提升机制：",
        "  - canonical SOP: `self_improve_process.md`",
        "  - 记录面：`self_improve_todo.md`, `self_improve_status.md`, `self_improve_quality.md`",
        "",
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(path.join(memoryDir, "history.jsonl"), "", "utf8");
    return await fn({ workspaceDir, ontologyPath: path.join(ontologyDir, "graph.jsonl"), historyPath: path.join(memoryDir, "history.jsonl") });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test("ontology rebuild ignores empty identity fields, grouping bullets, and ongoing context", async () =>
  withTempWorkspace(async ({ workspaceDir, ontologyPath, historyPath }) => {
    const { rebuildOntologyGraph } = await import(moduleUrl);

    await rebuildOntologyGraph({
      workspaceDir,
      historyPath,
      ontologyPath,
    });

    const graphText = fs.readFileSync(ontologyPath, "utf8");

    assert.doesNotMatch(graphText, /"summary":"Name:"/);
    assert.doesNotMatch(graphText, /"summary":"Pronouns:"/);
    assert.doesNotMatch(graphText, /"summary":"自我提升机制："/);
    assert.doesNotMatch(graphText, /canonical SOP/);
    assert.match(graphText, /"summary":"What to call them: Xiao Gao"/);
    assert.match(graphText, /"summary":"User lives in Guangzhou"/);
  }));
