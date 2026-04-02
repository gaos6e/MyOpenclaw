#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function parseArgs(argv) {
  const args = argv.slice(2);
  const defaults = {
    repoRoot: path.resolve(__dirname, "..", ".."),
    json: false,
    dryRun: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--repo-root" && args[index + 1]) {
      defaults.repoRoot = path.resolve(args[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--json") {
      defaults.json = true;
      continue;
    }
    if (arg === "--dry-run") {
      defaults.dryRun = true;
    }
  }

  return defaults;
}

function hashRaw(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function buildFingerprint(configPath, raw, stat, parsed) {
  return {
    hash: hashRaw(raw),
    bytes: Buffer.byteLength(raw, "utf8"),
    mtimeMs: stat.mtimeMs,
    ctimeMs: stat.ctimeMs,
    dev: String(stat.dev),
    ino: String(stat.ino),
    mode: stat.mode,
    nlink: stat.nlink,
    uid: stat.uid,
    gid: stat.gid,
    hasMeta: parsed?.meta && typeof parsed.meta === "object",
    gatewayMode: typeof parsed?.gateway?.mode === "string" ? parsed.gateway.mode : null,
    observedAt: new Date(stat.mtimeMs).toISOString(),
    path: configPath,
  };
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function main() {
  const options = parseArgs(process.argv);
  const configPath = path.join(options.repoRoot, "openclaw.json");
  const healthPath = path.join(options.repoRoot, "logs", "config-health.json");

  const raw = fs.readFileSync(configPath, "utf8");
  const stat = fs.statSync(configPath);
  const parsed = JSON.parse(raw);

  const fingerprint = buildFingerprint(configPath, raw, stat, parsed);
  const healthState = readJson(healthPath, { entries: {} });
  const previousEntry = healthState?.entries?.[configPath] ?? null;

  const nextState = {
    entries: {
      ...(healthState.entries || {}),
      [configPath]: {
        lastKnownGood: {
          hash: fingerprint.hash,
          bytes: fingerprint.bytes,
          mtimeMs: fingerprint.mtimeMs,
          ctimeMs: fingerprint.ctimeMs,
          dev: fingerprint.dev,
          ino: fingerprint.ino,
          mode: fingerprint.mode,
          nlink: fingerprint.nlink,
          uid: fingerprint.uid,
          gid: fingerprint.gid,
          hasMeta: fingerprint.hasMeta,
          gatewayMode: fingerprint.gatewayMode,
          observedAt: new Date().toISOString(),
        },
        lastObservedSuspiciousSignature: null,
      },
    },
  };

  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(healthPath), { recursive: true });
    fs.writeFileSync(healthPath, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
  }

  const payload = {
    configPath,
    healthPath,
    dryRun: options.dryRun,
    previousBytes: previousEntry?.lastKnownGood?.bytes ?? null,
    nextBytes: fingerprint.bytes,
    previousHash: previousEntry?.lastKnownGood?.hash ?? null,
    nextHash: fingerprint.hash,
    clearedSuspiciousSignature:
      previousEntry?.lastObservedSuspiciousSignature !== undefined &&
      previousEntry?.lastObservedSuspiciousSignature !== null,
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    [
      `Config: ${configPath}`,
      `Health: ${healthPath}`,
      `Dry run: ${options.dryRun}`,
      `Baseline bytes: ${payload.previousBytes ?? "n/a"} -> ${payload.nextBytes}`,
      `Suspicious signature cleared: ${payload.clearedSuspiciousSignature}`,
    ].join("\n") + "\n",
  );
}

main();
