const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const scriptPath = path.join(__dirname, "rebaseline_config_health.cjs");

function mkdirp(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

test("rebaseline_config_health refreshes stale baseline and clears suspicious signature", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-config-health-"));

  try {
    mkdirp(path.join(tempRoot, "logs"));
    const configPath = path.join(tempRoot, "openclaw.json");
    const healthPath = path.join(tempRoot, "logs", "config-health.json");

    const config = {
      meta: { lastTouchedVersion: "2026.4.2" },
      gateway: { mode: "local" },
    };
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    fs.writeFileSync(
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
      [scriptPath, "--repo-root", tempRoot, "--json"],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const payload = JSON.parse(result.stdout);
    const nextState = JSON.parse(fs.readFileSync(healthPath, "utf8"));
    const nextEntry = nextState.entries[configPath];
    const currentBytes = Buffer.byteLength(fs.readFileSync(configPath, "utf8"), "utf8");

    assert.equal(payload.previousBytes, 40087);
    assert.equal(payload.nextBytes, currentBytes);
    assert.equal(nextEntry.lastKnownGood.bytes, currentBytes);
    assert.equal(nextEntry.lastObservedSuspiciousSignature, null);
    assert.equal(nextEntry.lastKnownGood.gatewayMode, "local");
    assert.equal(nextEntry.lastKnownGood.hasMeta, true);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
