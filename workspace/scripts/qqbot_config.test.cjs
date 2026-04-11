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
const sourcePath = path.join(repoRoot, "extensions", "openclaw-qqbot", "src", "config.ts");

async function importConfigModule() {
  const source = fs.readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;

  const tempFile = path.join(
    os.tmpdir(),
    `openclaw-qqbot-config-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`,
  );
  fs.writeFileSync(tempFile, transpiled, "utf8");
  try {
    return await import(pathToFileURL(tempFile).href);
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
}

test("resolveQQBotAccount reads named-account clientSecretFile and preserves public-safe metadata", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-qqbot-config-"));
  try {
    const secretPath = path.join(tempRoot, "publicbot.secret.txt");
    fs.writeFileSync(secretPath, "super-secret-value\n", "utf8");

    const cfg = {
      channels: {
        qqbot: {
          enabled: true,
          accounts: {
            publicbot: {
              enabled: true,
              name: "公共机器人",
              appId: "1903000000",
              clientSecretFile: secretPath,
              dmPolicy: "open",
              allowFrom: ["__PUBLICBOT_COMMANDS_DISABLED__"],
              adminOpenIds: ["9A053C1350854286F832A03D38E111FD"],
              slashCommandProfile: "public-safe",
              systemPrompt: "public assistant",
            },
          },
        },
      },
    };

    const { resolveQQBotAccount } = await importConfigModule();
    const account = resolveQQBotAccount(cfg, "publicbot");

    assert.equal(account.accountId, "publicbot");
    assert.equal(account.secretSource, "file");
    assert.equal(account.clientSecret, "super-secret-value");
    assert.equal(account.config.clientSecretFile, secretPath);
    assert.deepEqual(account.config.adminOpenIds, ["9A053C1350854286F832A03D38E111FD"]);
    assert.equal(account.config.slashCommandProfile, "public-safe");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
