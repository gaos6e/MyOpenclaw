const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const maintainScript = path.join(__dirname, "openclaw_hygiene_maintain.cjs");

function mkdirp(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function writeFile(targetPath, content = "") {
  mkdirp(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content, "utf8");
}

test("openclaw_hygiene_maintain archives root clutter, workspace temp dir, backup clutter, and rebaselines config health", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-maintain-"));
  const archiveRoot = path.join(tempRoot, "archive");
  const configPath = path.join(tempRoot, "openclaw.json");
  const backupFilePath = path.join(tempRoot, "backup", "openclaw.json.bak");
  const clobberedPath = path.join(tempRoot, "openclaw.json.clobbered.2026-04-01T12-08-27-051Z");
  const debugPath = path.join(tempRoot, "debug.jsonl");
  const workspaceTempDir = path.join(tempRoot, "workspace", "_tmp_cli_anything");
  const healthPath = path.join(tempRoot, "logs", "config-health.json");

  try {
    writeFile(
      configPath,
      `${JSON.stringify({ meta: { lastTouchedVersion: "2026.4.4" }, gateway: { mode: "local" } }, null, 2)}\n`,
    );
    writeFile(backupFilePath, "{}\n");
    writeFile(clobberedPath, "{}\n");
    writeFile(debugPath, "{\"id\":\"debug-session\"}\n");
    writeFile(path.join(workspaceTempDir, "README.md"), "# temp\n");
    writeFile(
      healthPath,
      `${JSON.stringify(
        {
          entries: {
            [configPath]: {
              lastKnownGood: {
                hash: "stale",
                bytes: 40087,
                mtimeMs: 1,
                ctimeMs: 1,
                dev: "1",
                ino: "1",
                mode: 438,
                nlink: 1,
                uid: 0,
                gid: 0,
                hasMeta: true,
                gatewayMode: "local",
                observedAt: "2026-03-29T02:53:17.230Z",
              },
              lastObservedSuspiciousSignature: "stale:size-drop-vs-last-good:40087->16552",
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = spawnSync(
      process.execPath,
      [maintainScript, "--repo-root", tempRoot, "--archive-root", archiveRoot, "--json"],
      {
        encoding: "utf8",
      },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const payload = JSON.parse(result.stdout);
    const nextHealth = JSON.parse(fs.readFileSync(healthPath, "utf8"));

    assert.equal(fs.existsSync(debugPath), false);
    assert.equal(fs.existsSync(clobberedPath), false);
    assert.equal(fs.existsSync(backupFilePath), false);
    assert.equal(fs.existsSync(workspaceTempDir), false);

    assert.equal(fs.existsSync(path.join(archiveRoot, "debug.jsonl")), true);
    assert.equal(
      fs.existsSync(path.join(archiveRoot, "openclaw.json.clobbered.2026-04-01T12-08-27-051Z")),
      true,
    );
    assert.equal(fs.existsSync(path.join(archiveRoot, "backup_flat_files", "openclaw.json.bak")), true);
    assert.equal(
      fs.existsSync(path.join(archiveRoot, "workspace_tmp", "_tmp_cli_anything", "README.md")),
      true,
    );

    assert.equal(payload.workspaceTempDirs.length, 1);
    assert.equal(payload.backupRootFiles.length, 1);
    assert.equal(nextHealth.entries[configPath].lastObservedSuspiciousSignature, null);
    assert.notEqual(nextHealth.entries[configPath].lastKnownGood.bytes, 40087);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
