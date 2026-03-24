const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const auditScript = path.resolve(__dirname, "openclaw_hygiene_audit.cjs");

function mkdirp(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function writeFile(targetPath, content = "") {
  mkdirp(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content, "utf8");
}

function collectPaths(actions) {
  return new Set(actions.map((entry) => entry.path));
}

test("hygiene audit classifies safe root backups and protected hotspots", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-hygiene-audit-"));
  const tempDesktop = path.join(tempRoot, "desktop-temp");

  try {
    mkdirp(path.join(tempRoot, "backup"));
    mkdirp(path.join(tempRoot, "logs"));
    mkdirp(path.join(tempRoot, "qqbot", "downloads"));
    mkdirp(path.join(tempRoot, "workspace", "_tmp_cli_anything"));

    writeFile(path.join(tempRoot, "openclaw.json"), "{}\n");
    writeFile(path.join(tempRoot, "openclaw.json.bak"), "{}\n");
    writeFile(path.join(tempRoot, "qqbot", "downloads", "image.png"), "binary");
    writeFile(path.join(tempRoot, "workspace", "_tmp_cli_anything", "README.md"), "# keep\n");

    mkdirp(path.join(tempRoot, "env-backup-20260324-140437"));

    const result = spawnSync(
      process.execPath,
      [auditScript, "--root", tempRoot, "--temp-root", tempDesktop, "--json"],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const payload = JSON.parse(result.stdout);
    const safePaths = collectPaths(payload.safeActions);
    const askFirstPaths = collectPaths(payload.askFirst);

    assert.ok(safePaths.has("openclaw.json.bak"));
    assert.ok(safePaths.has("env-backup-20260324-140437"));
    assert.ok(askFirstPaths.has(path.join("qqbot", "downloads")));
    assert.ok(askFirstPaths.has(path.join("workspace", "_tmp_cli_anything")));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("hygiene audit applies safe moves without touching protected hotspots", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-hygiene-apply-"));
  const tempDesktop = path.join(tempRoot, "desktop-temp");

  try {
    mkdirp(path.join(tempRoot, "backup"));
    mkdirp(path.join(tempRoot, "qqbot", "downloads"));
    mkdirp(path.join(tempRoot, "workspace", "_tmp_cli_anything"));

    writeFile(path.join(tempRoot, "openclaw.json"), "{}\n");
    writeFile(path.join(tempRoot, "openclaw.json.bak"), "{}\n");
    writeFile(path.join(tempRoot, "tmp_root_capture.png"), "root image");
    writeFile(path.join(tempRoot, "workspace", "tmp_capture.png"), "image");
    writeFile(path.join(tempRoot, "qqbot", "downloads", "image.png"), "binary");
    writeFile(path.join(tempRoot, "workspace", "_tmp_cli_anything", "README.md"), "# keep\n");

    const beforeResult = spawnSync(
      process.execPath,
      [auditScript, "--root", tempRoot, "--temp-root", tempDesktop, "--json"],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );
    assert.equal(beforeResult.status, 0, beforeResult.stderr || beforeResult.stdout);

    const applyResult = spawnSync(
      process.execPath,
      [auditScript, "--root", tempRoot, "--temp-root", tempDesktop, "--apply-safe", "--json"],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

    const backupEntries = fs.readdirSync(path.join(tempRoot, "backup"));
    assert.equal(fs.existsSync(path.join(tempRoot, "openclaw.json.bak")), false);
    assert.ok(backupEntries.some((entry) => /^root-backups-/.test(entry)));

    assert.equal(fs.existsSync(path.join(tempRoot, "tmp_root_capture.png")), false);
    assert.equal(fs.existsSync(path.join(tempDesktop, "tmp_root_capture.png")), true);

    assert.equal(fs.existsSync(path.join(tempRoot, "workspace", "tmp_capture.png")), false);
    assert.equal(fs.existsSync(path.join(tempDesktop, "tmp_capture.png")), true);

    assert.equal(fs.existsSync(path.join(tempRoot, "qqbot", "downloads", "image.png")), true);
    assert.equal(
      fs.existsSync(path.join(tempRoot, "workspace", "_tmp_cli_anything", "README.md")),
      true,
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("hygiene audit archives stale low-value update logs after threshold", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-hygiene-logs-"));
  const tempDesktop = path.join(tempRoot, "desktop-temp");
  const staleDate = new Date("2026-03-01T00:00:00.000Z");

  try {
    mkdirp(path.join(tempRoot, "backup"));
    mkdirp(path.join(tempRoot, "logs"));

    const staleLogPath = path.join(tempRoot, "logs", "openclaw-update-stdout.log");
    const recentLogPath = path.join(tempRoot, "logs", "watchdog.log");

    writeFile(staleLogPath, "");
    writeFile(recentLogPath, "watchdog");

    fs.utimesSync(staleLogPath, staleDate, staleDate);

    const beforeResult = spawnSync(
      process.execPath,
      [auditScript, "--root", tempRoot, "--temp-root", tempDesktop, "--json"],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );
    assert.equal(beforeResult.status, 0, beforeResult.stderr || beforeResult.stdout);

    const beforePayload = JSON.parse(beforeResult.stdout);
    const safePaths = collectPaths(beforePayload.safeActions);
    assert.ok(safePaths.has(path.join("logs", "openclaw-update-stdout.log")));
    assert.equal(safePaths.has(path.join("logs", "watchdog.log")), false);

    const applyResult = spawnSync(
      process.execPath,
      [auditScript, "--root", tempRoot, "--temp-root", tempDesktop, "--apply-safe", "--json"],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );
    assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

    const hygieneArchives = fs
      .readdirSync(path.join(tempRoot, "backup"))
      .filter((entry) => /^hygiene-archive-/.test(entry));

    assert.equal(fs.existsSync(staleLogPath), false);
    assert.equal(fs.existsSync(recentLogPath), true);
    assert.equal(hygieneArchives.length, 1);
    assert.equal(
      fs.existsSync(
        path.join(tempRoot, "backup", hygieneArchives[0], "logs", "openclaw-update-stdout.log"),
      ),
      true,
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("hygiene audit reports flat backup files already stored under backup root", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-hygiene-report-"));
  const tempDesktop = path.join(tempRoot, "desktop-temp");

  try {
    mkdirp(path.join(tempRoot, "backup"));
    writeFile(path.join(tempRoot, "backup", "openclaw.json.bak"), "{}\n");

    const result = spawnSync(
      process.execPath,
      [auditScript, "--root", tempRoot, "--temp-root", tempDesktop, "--json"],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const payload = JSON.parse(result.stdout);
    const reportPaths = collectPaths(payload.reportOnly);
    assert.ok(reportPaths.has(path.join("backup", "openclaw.json.bak")));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
