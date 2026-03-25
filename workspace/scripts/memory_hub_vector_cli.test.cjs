const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const scriptPath = path.join(repoRoot, "workspace", "scripts", "memory_hub_vector.cjs");

test("memory_hub_vector.cjs can build and search with hash embed mode", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "memory-hub-vector-cli-"));
  const workspaceDir = path.join(tempRoot, "workspace");
  const memoryDir = path.join(workspaceDir, "memory");
  const learningsDir = path.join(workspaceDir, ".learnings");
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.mkdirSync(learningsDir, { recursive: true });
  fs.writeFileSync(path.join(workspaceDir, "MEMORY.md"), "# MEMORY\n", "utf8");
  fs.writeFileSync(
    path.join(memoryDir, "2026-03-25.md"),
    "# 2026-03-25\n\n## Facts\n- cron timeout 需要排查\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(learningsDir, "LEARNINGS.md"),
    "# LEARNINGS\n\n- 2026-03-25 | cron timeout | 先看 openclaw cron runs --id <job-id>\n",
    "utf8",
  );

  const indexResult = spawnSync(
    process.execPath,
    [
      scriptPath,
      "index",
      "--workspace",
      workspaceDir,
      "--state",
      tempRoot,
      "--index-path",
      path.join(tempRoot, "memory", "aux-vector-index.json"),
      "--embed-mode",
      "hash",
      "--json",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(indexResult.status, 0, indexResult.stderr);
  const indexPayload = JSON.parse(indexResult.stdout);
  assert.equal(indexPayload.items > 0, true);

  const searchResult = spawnSync(
    process.execPath,
    [
      scriptPath,
      "search",
      "--workspace",
      workspaceDir,
      "--state",
      tempRoot,
      "--index-path",
      path.join(tempRoot, "memory", "aux-vector-index.json"),
      "--embed-mode",
      "hash",
      "--query",
      "cron timeout 怎么排查",
      "--json",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(searchResult.status, 0, searchResult.stderr);
  const searchPayload = JSON.parse(searchResult.stdout);
  assert.equal(searchPayload.results.length > 0, true);
});
