#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function parseArgs(argv) {
  const args = argv.slice(2);
  const defaults = {
    repoRoot: path.resolve(__dirname, "..", ".."),
    archiveRoot: null,
    json: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--repo-root" && args[index + 1]) {
      defaults.repoRoot = path.resolve(args[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--archive-root" && args[index + 1]) {
      defaults.archiveRoot = path.resolve(args[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--json") {
      defaults.json = true;
    }
  }

  return defaults;
}

function resolveDefaultArchiveRoot() {
  const baseRoot = process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, "Desktop", "openclaw-hygiene-archive", "scheduled")
    : path.join(process.env.TEMP || process.cwd(), "openclaw-hygiene-archive", "scheduled");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(baseRoot, stamp);
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function resolveUniquePath(targetPath) {
  if (!fs.existsSync(targetPath)) return targetPath;

  const parsed = path.parse(targetPath);
  let index = 1;
  while (true) {
    const candidate = path.join(parsed.dir, `${parsed.name}.${index}${parsed.ext}`);
    if (!fs.existsSync(candidate)) return candidate;
    index += 1;
  }
}

function runNodeScript(scriptPath, args, cwd) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Script failed: ${scriptPath}`);
  }

  return JSON.parse(result.stdout);
}

function moveIfExists(sourcePath, targetPath, summaryBucket) {
  if (!fs.existsSync(sourcePath)) return null;
  ensureDir(path.dirname(targetPath));
  const destinationPath = resolveUniquePath(targetPath);
  fs.renameSync(sourcePath, destinationPath);
  summaryBucket.push({
    source: sourcePath,
    destination: destinationPath,
  });
  return destinationPath;
}

function moveWorkspaceTempDir(repoRoot, archiveRoot, summary) {
  const sourcePath = path.join(repoRoot, "workspace", "_tmp_cli_anything");
  const targetPath = path.join(archiveRoot, "workspace_tmp", "_tmp_cli_anything");
  moveIfExists(sourcePath, targetPath, summary.workspaceTempDirs);
}

function moveBackupRootClutter(repoRoot, archiveRoot, summary) {
  const backupRoot = path.join(repoRoot, "backup");
  if (!fs.existsSync(backupRoot)) return;

  for (const entry of fs.readdirSync(backupRoot, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!/\.bak(?:\.\d+)?$/i.test(entry.name)) continue;
    const sourcePath = path.join(backupRoot, entry.name);
    const targetPath = path.join(archiveRoot, "backup_flat_files", entry.name);
    moveIfExists(sourcePath, targetPath, summary.backupRootFiles);
  }
}

function main() {
  const options = parseArgs(process.argv);
  const repoRoot = options.repoRoot;
  const archiveRoot = options.archiveRoot || resolveDefaultArchiveRoot();
  ensureDir(archiveRoot);

  const auditScript = path.join(__dirname, "openclaw_hygiene_audit.cjs");
  const rebaselineScript = path.join(__dirname, "rebaseline_config_health.cjs");

  const summary = {
    repoRoot,
    archiveRoot,
    audit: null,
    workspaceTempDirs: [],
    backupRootFiles: [],
    rebaseline: null,
  };

  summary.audit = runNodeScript(
    auditScript,
    ["--root", repoRoot, "--temp-root", archiveRoot, "--apply-safe", "--json"],
    repoRoot,
  );

  moveWorkspaceTempDir(repoRoot, archiveRoot, summary);
  moveBackupRootClutter(repoRoot, archiveRoot, summary);

  summary.rebaseline = runNodeScript(
    rebaselineScript,
    ["--repo-root", repoRoot, "--json"],
    repoRoot,
  );

  if (options.json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    [
      `Repo root: ${repoRoot}`,
      `Archive root: ${archiveRoot}`,
      `Safe actions applied: ${summary.audit.safeActions.filter((entry) => entry.applied).length}`,
      `Protected runtime roots seen: ${summary.audit.protectedRoots.length}`,
      `Workspace temp dirs moved: ${summary.workspaceTempDirs.length}`,
      `Backup root files moved: ${summary.backupRootFiles.length}`,
      `Config health baseline: ${summary.rebaseline.previousBytes ?? "n/a"} -> ${summary.rebaseline.nextBytes}`,
    ].join("\n") + "\n",
  );
}

main();
