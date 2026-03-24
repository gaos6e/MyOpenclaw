const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const workspaceRoot = path.join(repoRoot, "workspace");
const skillRoot = path.join(workspaceRoot, "skills", "codex-cli");
const referencesRoot = path.join(skillRoot, "references");
const manifestPath = path.join(referencesRoot, "generated-manifest.json");
const policyPath = path.join(referencesRoot, "execution-policy.md");
const syncScript = path.join(__dirname, "sync_codex_cli_skill.cjs");

function loadSyncModule() {
  return require(syncScript);
}

function runNode(args, cwd = repoRoot) {
  return spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
  });
}

test("sync script discovers expected public codex command families", () => {
  const sync = loadSyncModule();
  const version = sync.getCodexVersion();
  const tree = sync.collectCommandTree();
  const commandPaths = new Set(tree.commands.map((entry) => entry.path));

  assert.match(version, /^codex-cli\s+\S+/);
  assert(commandPaths.has("codex exec"));
  assert(commandPaths.has("codex mcp"));
  assert(commandPaths.has("codex sandbox"));
  assert(commandPaths.has("codex debug"));
  assert(commandPaths.has("codex cloud"));
  assert.equal(commandPaths.has("codex help"), false);
});

test("sync script generates references into a temporary repo root", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-codex-cli-"));
  const result = runNode([syncScript, "--repo-root", tempRoot]);

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const tempManifestPath = path.join(
    tempRoot,
    "workspace",
    "skills",
    "codex-cli",
    "references",
    "generated-manifest.json",
  );
  const tempCommandMapPath = path.join(
    tempRoot,
    "workspace",
    "skills",
    "codex-cli",
    "references",
    "command-map.md",
  );
  const tempHelpPath = path.join(
    tempRoot,
    "workspace",
    "skills",
    "codex-cli",
    "references",
    "help",
    "codex.md",
  );

  assert.equal(fs.existsSync(tempManifestPath), true);
  assert.equal(fs.existsSync(tempCommandMapPath), true);
  assert.equal(fs.existsSync(tempHelpPath), true);
});

test("sync script check mode validates committed codex skill artifacts", () => {
  const result = runNode([syncScript, "--check", "--repo-root", repoRoot]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.existsSync(manifestPath), true);
});

test("execution policy classifies every public command path", () => {
  const sync = loadSyncModule();
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const policyText = fs.readFileSync(policyPath, "utf8");
  const policyEntries = sync.parseExecutionPolicy(policyText);
  const allowed = new Set(["auto", "confirm", "manual-only"]);

  for (const entry of manifest.commands) {
    const classification = sync.classifyCommand(policyEntries, entry.path);
    assert(allowed.has(classification), `missing policy classification for ${entry.path}`);
  }

  assert.equal(sync.classifyCommand(policyEntries, "codex cloud list"), "auto");
  assert.equal(sync.classifyCommand(policyEntries, "codex apply"), "confirm");
  assert.equal(sync.classifyCommand(policyEntries, "codex sandbox windows"), "manual-only");
});
