#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const SAFE_BACKUP_PATTERNS = [
  /^openclaw\.json\.bak(?:\.\d+)?$/i,
  /^openclaw\.json\.clobbered\./i,
  /^env-backup-/i,
];
const SAFE_TEMP_PATTERNS = [/^debug\.jsonl$/i];
const STALE_LOG_PATTERNS = [
  /^openclaw-update-(stdout|stderr)\.log$/i,
  /^npm-openclaw(?:-[\w.-]+)?-(stdout|stderr)\.log$/i,
];
const WORKSPACE_PROTECTED_DIR_PATTERNS = [/^_tmp_/];
const WORKSPACE_SAFE_TEMP_FILE_PATTERNS = [
  /^tmp_/i,
  /^temp_/i,
  /^page-\d+/i,
  /^screenshot-/i,
  /^clawvard_batch_.*\.ps1$/i,
];
const ROOT_ALLOWLIST = new Set([
  ".env",
  ".git",
  ".githooks",
  ".gitignore",
  ".learnings",
  "AGENTS.md",
  "agents",
  "backup",
  "backups",
  "browser",
  "canvas",
  "completions",
  "cron",
  "delivery-queue",
  "devices",
  "exec-approvals.json",
  "extensions",
  "findings.md",
  "gateway-hidden.ps1",
  "gateway-hidden.vbs",
  "gateway.cmd",
  "hooks",
  "identity",
  "logs",
  "media",
  "memory",
  "moltbook",
  "moltcn",
  "openclaw-common-commands.md",
  "openclaw.json",
  "package.json",
  "progress.md",
  "qqbot",
  "README.md",
  "scripts",
  "skills",
  "subagents",
  "task_plan.md",
  "tasks",
  "update-check.json",
  "workspace",
]);
const ROOT_ALLOWLIST_PATTERNS = [/^workspace-[\w]+$/i];

function resolveDefaultTempRoot() {
  const desktopRoot = process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, "Desktop", "openclaw-hygiene-archive")
    : null;
  if (desktopRoot && fs.existsSync(path.dirname(desktopRoot))) {
    return desktopRoot;
  }
  return path.join(process.env.TEMP || process.cwd(), "openclaw-hygiene-archive");
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const parsed = {
    root: path.resolve(__dirname, "..", ".."),
    tempRoot: resolveDefaultTempRoot(),
    json: false,
    applySafe: false,
    archiveAgeDays: 7,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--root" && args[index + 1]) {
      parsed.root = path.resolve(args[index + 1]);
      index += 1;
    } else if (arg === "--temp-root" && args[index + 1]) {
      parsed.tempRoot = path.resolve(args[index + 1]);
      index += 1;
    } else if (arg === "--archive-age-days" && args[index + 1]) {
      parsed.archiveAgeDays = Number.parseInt(args[index + 1], 10) || parsed.archiveAgeDays;
      index += 1;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--apply-safe") {
      parsed.applySafe = true;
    }
  }

  return parsed;
}

function isSafeBackupEntry(name) {
  return SAFE_BACKUP_PATTERNS.some((pattern) => pattern.test(name));
}

function isSafeRootTempEntry(name) {
  return SAFE_TEMP_PATTERNS.some((pattern) => pattern.test(name));
}

function makeEntry(kind, relativePath, reason, extra = {}) {
  return {
    kind,
    path: relativePath,
    reason,
    ...extra,
  };
}

function hasChildren(targetPath) {
  try {
    return fs.readdirSync(targetPath).length > 0;
  } catch {
    return false;
  }
}

function isSafeTempFile(name) {
  return WORKSPACE_SAFE_TEMP_FILE_PATTERNS.some((pattern) => pattern.test(name));
}

function isAllowedRootEntry(name) {
  return ROOT_ALLOWLIST.has(name) || ROOT_ALLOWLIST_PATTERNS.some((pattern) => pattern.test(name));
}

function isStaleLowValueLog(name, stat, archiveAgeDays) {
  if (!STALE_LOG_PATTERNS.some((pattern) => pattern.test(name))) return false;
  const ageMs = Date.now() - stat.mtimeMs;
  const thresholdMs = archiveAgeDays * 24 * 60 * 60 * 1000;
  if (ageMs < thresholdMs) return false;
  return stat.size === 0 || /update/i.test(name);
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

function scanRoot(rootPath, bucket) {
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const relativePath = entry.name;
    const fullPath = path.join(rootPath, entry.name);

    if (isSafeBackupEntry(entry.name)) {
      bucket.safeActions.push(
        makeEntry("move_to_temp_root", relativePath, "Explicit root-level backup artifact", {
          destinationKind: "tempRoot",
        }),
      );
      continue;
    }

    if (entry.isFile() && (isSafeTempFile(entry.name) || isSafeRootTempEntry(entry.name))) {
      bucket.safeActions.push(
        makeEntry("move_to_temp_root", relativePath, "Unambiguous root-level temporary file", {
          destinationKind: "tempRoot",
        }),
      );
      continue;
    }

    if (!isAllowedRootEntry(entry.name)) {
      bucket.askFirst.push(
        makeEntry("review_root_entry", relativePath, "Unknown top-level entry; requires human review"),
      );
      continue;
    }

    if (entry.name === "qqbot") {
      const downloadsPath = path.join(fullPath, "downloads");
      if (fs.existsSync(downloadsPath) && hasChildren(downloadsPath)) {
        bucket.askFirst.push(
          makeEntry(
            "review_download_cache",
            path.join("qqbot", "downloads"),
            "QQBot downloads require confirmation before cleanup or relocation",
          ),
        );
      }
      continue;
    }

    if (entry.name === "workspace") {
      for (const child of fs.readdirSync(fullPath, { withFileTypes: true })) {
        const childRelativePath = path.join("workspace", child.name);
        if (child.isFile() && isSafeTempFile(child.name)) {
          bucket.safeActions.push(
            makeEntry(
              "move_to_temp_root",
              childRelativePath,
              "Unambiguous workspace temporary file",
              { destinationKind: "tempRoot" },
            ),
          );
          continue;
        }

        if (child.isDirectory() && WORKSPACE_PROTECTED_DIR_PATTERNS.some((pattern) => pattern.test(child.name))) {
          bucket.askFirst.push(
            makeEntry(
              "review_workspace_temp_dir",
              childRelativePath,
              "Workspace temporary-looking directories may contain project/vendor content",
            ),
          );
        }
      }
    }

    if (entry.name === "logs") {
      for (const child of fs.readdirSync(fullPath, { withFileTypes: true })) {
        if (!child.isFile()) continue;
        const childPath = path.join(fullPath, child.name);
        const stat = fs.statSync(childPath);
        if (!isStaleLowValueLog(child.name, stat, bucket.archiveAgeDays)) continue;
        bucket.safeActions.push(
          makeEntry(
            "archive_stale_log",
            path.join("logs", child.name),
            `Low-value update log older than ${bucket.archiveAgeDays} days`,
            { destinationKind: "logArchive" },
          ),
        );
      }
    }

    if (entry.name === "backup") {
      for (const child of fs.readdirSync(fullPath, { withFileTypes: true })) {
        if (!child.isFile()) continue;
        if (!/\.bak(?:\.\d+)?$/i.test(child.name)) continue;
        bucket.reportOnly.push(
          makeEntry(
            "backup_root_clutter",
            path.join("backup", child.name),
            "Backup file is already under backup/, but still flat in the backup root",
          ),
        );
      }
    }
  }
}

function collectAudit(rootPath, options) {
  const bucket = {
    root: rootPath,
    archiveAgeDays: options.archiveAgeDays,
    safeActions: [],
    askFirst: [],
    reportOnly: [],
  };

  scanRoot(rootPath, bucket);

  return bucket;
}

function renderHumanSummary(result, options) {
  const lines = [
    `Root: ${result.root}`,
    `Temp root: ${options.tempRoot}`,
    `Archive threshold (days): ${options.archiveAgeDays}`,
    "",
    `safeActions: ${result.safeActions.length}`,
    `askFirst: ${result.askFirst.length}`,
    `reportOnly: ${result.reportOnly.length}`,
  ];

  for (const sectionName of ["safeActions", "askFirst", "reportOnly"]) {
    const entries = result[sectionName];
    if (entries.length === 0) continue;
    lines.push("");
    lines.push(`${sectionName}:`);
    for (const entry of entries) {
      lines.push(`- ${entry.path} :: ${entry.reason}`);
    }
  }

  return lines.join("\n");
}

function applySafeActions(rootPath, options, result) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archiveRoot = path.join(rootPath, "backup", `hygiene-archive-${stamp}`);
  const tempRoot = options.tempRoot;

  for (const entry of result.safeActions) {
    const sourcePath = path.join(rootPath, entry.path);
    if (!fs.existsSync(sourcePath)) continue;

    if (entry.destinationKind === "tempRoot") {
      ensureDir(tempRoot);
      const destinationPath = resolveUniquePath(path.join(tempRoot, path.basename(entry.path)));
      fs.renameSync(sourcePath, destinationPath);
      entry.applied = true;
      entry.destination = destinationPath;
      continue;
    }

    if (entry.destinationKind === "logArchive") {
      const destinationPath = resolveUniquePath(path.join(archiveRoot, entry.path));
      ensureDir(path.dirname(destinationPath));
      fs.renameSync(sourcePath, destinationPath);
      entry.applied = true;
      entry.destination = path.relative(rootPath, destinationPath);
      continue;
    }

    entry.applied = false;
    entry.destination = path.join(archiveRoot, entry.path);
  }
}

function main() {
  const options = parseArgs(process.argv);
  const result = collectAudit(options.root, options);

  if (options.applySafe) {
    applySafeActions(options.root, options, result);
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${renderHumanSummary(result, options)}\n`);
}

main();
