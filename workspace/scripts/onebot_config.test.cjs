const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const ts = require(path.join(
  __dirname,
  "..",
  "..",
  "extensions",
  "openclaw-qqbot",
  "node_modules",
  "typescript",
));

const repoRoot = path.resolve(__dirname, "..", "..");
const sourcePath = path.join(repoRoot, "extensions", "openclaw-onebot", "src", "config.ts");

async function importConfigModule() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-onebot-config-"));
  fs.writeFileSync(path.join(tempRoot, "package.json"), JSON.stringify({ type: "module" }), "utf8");
  const transpile = (inputPath, outputPath) => {
    const source = fs.readFileSync(inputPath, "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: inputPath,
    }).outputText;
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, transpiled, "utf8");
  };

  const tempFile = path.join(tempRoot, "config.mjs");
  transpile(sourcePath, tempFile);
  transpile(path.join(repoRoot, "extensions", "openclaw-onebot", "src", "types.ts"), path.join(tempRoot, "types.js"));
  try {
    return await import(pathToFileURL(tempFile).href);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test("resolveOneBotAccount reads named-account token file and preserves reply policy metadata", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-onebot-config-"));
  try {
    const tokenPath = path.join(tempRoot, "napcat.token.txt");
    fs.writeFileSync(tokenPath, "onebot-secret-token\n", "utf8");

    const cfg = {
      channels: {
        onebot: {
          enabled: true,
          accounts: {
            nap3437: {
              enabled: true,
              selfId: "3437738143",
              wsUrl: "ws://127.0.0.1:30011",
              accessTokenFile: tokenPath,
              aliases: ["小龙虾", "龙虾"],
              groupReplyPolicy: "@always-reply-plus-contextual",
              proactiveCooldownMs: 30000,
              maxProactiveRepliesPerHour: 60,
              proactiveInterjectChancePercent: 50,
            },
          },
        },
      },
    };

    const { resolveOneBotAccount } = await importConfigModule();
    const account = resolveOneBotAccount(cfg, "nap3437");

    assert.equal(account.accountId, "nap3437");
    assert.equal(account.selfId, "3437738143");
    assert.equal(account.wsUrl, "ws://127.0.0.1:30011");
    assert.equal(account.accessToken, "onebot-secret-token");
    assert.equal(account.secretSource, "file");
    assert.deepEqual(account.config.aliases, ["小龙虾", "龙虾"]);
    assert.equal(account.config.groupReplyPolicy, "@always-reply-plus-contextual");
    assert.equal(account.config.proactiveCooldownMs, 30000);
    assert.equal(account.config.maxProactiveRepliesPerHour, 60);
    assert.equal(account.config.proactiveInterjectChancePercent, 50);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("resolveGroupReplyPolicy returns safe defaults for missing or invalid config", async () => {
  const { resolveGroupReplyPolicy } = await importConfigModule();

  const defaults = resolveGroupReplyPolicy({});
  assert.deepEqual(defaults, {
    mode: "@always-reply-plus-contextual",
    proactiveCooldownMs: 600000,
    maxProactiveRepliesPerHour: 3,
    proactiveInterjectChancePercent: 30,
  });

  const custom = resolveGroupReplyPolicy({
    groupReplyPolicy: "@always-reply-plus-random-interject",
    proactiveCooldownMs: 30000,
    maxProactiveRepliesPerHour: 60,
    proactiveInterjectChancePercent: 50,
  });
  assert.deepEqual(custom, {
    mode: "@always-reply-plus-random-interject",
    proactiveCooldownMs: 30000,
    maxProactiveRepliesPerHour: 60,
    proactiveInterjectChancePercent: 50,
  });
});
