const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repoRoot = path.resolve(__dirname, "..", "..");
const moduleUrl = pathToFileURL(
  path.join(repoRoot, "extensions", "openclaw-memory-hub", "src", "stores.js"),
).href;

async function withTempWorkspace(fn) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "memory-promote-"));
  try {
    const workspaceDir = path.join(tempRoot, "workspace");
    const inboxDir = path.join(workspaceDir, "memory", "inbox");
    fs.mkdirSync(inboxDir, { recursive: true });
    fs.writeFileSync(
      path.join(workspaceDir, "MEMORY.md"),
      "# MEMORY.md\n\n## Preferences & setup\n\n## Stable facts\n",
      "utf8",
    );
    fs.writeFileSync(path.join(workspaceDir, "memory", "history.jsonl"), "", "utf8");
    fs.writeFileSync(
      path.join(inboxDir, "2026-03-21.jsonl"),
      [
        JSON.stringify({
          id: "cand-1",
          captured_at: "2026-03-21T00:00:00.000Z",
          source_kind: "session-backfill",
          source_ref: "sessions/example.jsonl",
          candidate_kind: "preference",
          text: "用户爱好包括航拍和摄影",
          normalized: "用户爱好包括航拍和摄影",
          confidence: 0.9,
          reviewed: false,
          promoted_to: null,
        }),
        JSON.stringify({
          id: "cand-2",
          captured_at: "2026-03-21T00:00:00.000Z",
          source_kind: "session-backfill",
          source_ref: "sessions/example.jsonl",
          candidate_kind: "fact",
          text: "Use QQ for communication",
          normalized: "Use QQ for communication",
          confidence: 0.76,
          reviewed: false,
          promoted_to: null,
        }),
      ].join("\n") + "\n",
      "utf8",
    );
    return await fn({ workspaceDir });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test("promoting a candidate updates MEMORY.md and history.jsonl", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const { promoteCandidate } = await import(moduleUrl);

    await promoteCandidate({
      workspaceDir,
      candidateId: "cand-1",
      target: "durable",
    });

    const memoryText = fs.readFileSync(path.join(workspaceDir, "MEMORY.md"), "utf8");
    const historyText = fs.readFileSync(path.join(workspaceDir, "memory", "history.jsonl"), "utf8");
    const inboxText = fs.readFileSync(path.join(workspaceDir, "memory", "inbox", "2026-03-21.jsonl"), "utf8");

    assert.match(memoryText, /航拍和摄影/);
    assert.match(memoryText, /## Preferences & setup[\s\S]*航拍和摄影/);
    assert.match(historyText, /"action":"promote"/);
    assert.match(inboxText, /"reviewed":true/);
    assert.match(inboxText, /"promoted_to":"durable"/);
  }));

test("promoting a fact candidate writes it into Stable facts", async () =>
  withTempWorkspace(async ({ workspaceDir }) => {
    const { promoteCandidate } = await import(moduleUrl);

    await promoteCandidate({
      workspaceDir,
      candidateId: "cand-2",
      target: "durable",
    });

    const memoryText = fs.readFileSync(path.join(workspaceDir, "MEMORY.md"), "utf8");

    assert.match(memoryText, /## Stable facts[\s\S]*Use QQ for communication/);
  }));
