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
const sourcePath = path.join(repoRoot, "extensions", "openclaw-qqbot", "src", "slash-commands.ts");

async function importSlashCommandsModule() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-qqbot-slash-"));
  const homeDir = path.join(tempRoot, "home");
  fs.mkdirSync(homeDir, { recursive: true });

  const transpile = (inputPath, outputPath, replacer) => {
    const source = fs.readFileSync(inputPath, "utf8");
    let transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: inputPath,
    }).outputText;
    if (typeof replacer === "function") {
      transpiled = replacer(transpiled);
    }
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, transpiled, "utf8");
  };

  fs.writeFileSync(
    path.join(tempRoot, "package.json"),
    JSON.stringify({ version: "1.6.4" }, null, 2),
    "utf8",
  );
  fs.mkdirSync(path.join(tempRoot, "src"), { recursive: true });

  fs.mkdirSync(path.join(homeDir, ".openclaw", "logs"), { recursive: true });
  fs.writeFileSync(
    path.join(homeDir, ".openclaw", "logs", "gateway.log"),
    "hello\nworld\n",
    "utf8",
  );

  fs.writeFileSync(
    path.join(tempRoot, "src", "update-checker.mjs"),
    [
      "export async function getUpdateInfo() {",
      "  return { checkedAt: 1, error: null, hasUpdate: false, latest: null, stable: null, alpha: null };",
      "}",
      "export async function checkVersionExists() {",
      "  return true;",
      "}",
    ].join("\n"),
    "utf8",
  );

  fs.mkdirSync(path.join(tempRoot, "src", "utils"), { recursive: true });
  fs.writeFileSync(
    path.join(tempRoot, "src", "utils", "platform.mjs"),
    [
      "import fs from 'node:fs';",
      "import path from 'node:path';",
      `const HOME_DIR = ${JSON.stringify(homeDir)};`,
      "export function getHomeDir() { return HOME_DIR; }",
      "export function getQQBotDataDir(segment = '') {",
      "  const target = path.join(HOME_DIR, '.qqbot', segment);",
      "  fs.mkdirSync(target, { recursive: true });",
      "  return target;",
      "}",
      "export function isWindows() { return false; }",
    ].join("\n"),
    "utf8",
  );

  fs.writeFileSync(
    path.join(tempRoot, "src", "credential-backup.mjs"),
    [
      "export function saveCredentialBackup() {}",
    ].join("\n"),
    "utf8",
  );

  const tempFile = path.join(tempRoot, "src", "slash-commands.mjs");
  transpile(
    sourcePath,
    tempFile,
    (code) => code
      .replace("./update-checker.js", "./update-checker.mjs")
      .replace("./utils/platform.js", "./utils/platform.mjs")
      .replace("./credential-backup.js", "./credential-backup.mjs"),
  );

  try {
    const mod = await import(pathToFileURL(tempFile).href);
    return { mod, cleanup: () => fs.rmSync(tempRoot, { recursive: true, force: true }) };
  } catch (error) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

function makeContext(overrides = {}) {
  return {
    type: "c2c",
    senderId: "USER_OPENID",
    senderName: "tester",
    messageId: "msg-1",
    eventTimestamp: new Date().toISOString(),
    receivedAt: Date.now(),
    rawContent: "/bot-help",
    args: "",
    accountId: "publicbot",
    appId: "1903000000",
    accountConfig: {
      slashCommandProfile: "public-safe",
      adminOpenIds: ["ADMIN_OPENID"],
    },
    queueSnapshot: {
      totalPending: 0,
      activeUsers: 0,
      maxConcurrentUsers: 1,
      senderPending: 0,
    },
    ...overrides,
  };
}

test("public-safe command policy keeps help public and restricts high-risk commands to admins", async () => {
  const { mod, cleanup } = await importSlashCommandsModule();
  try {
    assert.equal(
      mod.getQQBotCommandAccess(makeContext(), "bot-help").allowed,
      true,
    );
    assert.equal(
      mod.getQQBotCommandAccess(makeContext(), "bot-logs").allowed,
      false,
    );
    assert.equal(
      mod.getQQBotCommandAccess(makeContext({ senderId: "ADMIN_OPENID" }), "bot-logs").allowed,
      true,
    );
    assert.equal(
      mod.getQQBotCommandAccess(makeContext(), "stop", { native: true }).allowed,
      false,
    );
    assert.equal(
      mod.getQQBotCommandAccess(makeContext({ senderId: "ADMIN_OPENID" }), "stop", { native: true }).allowed,
      true,
    );
  } finally {
    cleanup();
  }
});

test("matchSlashCommand rejects restricted plugin commands for non-admin public-safe users", async () => {
  const { mod, cleanup } = await importSlashCommandsModule();
  try {
    const denied = await mod.matchSlashCommand(makeContext({ rawContent: "/bot-logs" }));
    assert.match(String(denied), /仅管理员可用/);

    const allowed = await mod.matchSlashCommand(makeContext({ rawContent: "/bot-help" }));
    assert.match(String(allowed), /QQBot插件内置调试指令/);

    const adminResult = await mod.matchSlashCommand(
      makeContext({
        senderId: "ADMIN_OPENID",
        rawContent: "/bot-logs",
      }),
    );
    assert.equal(typeof adminResult, "object");
    assert.ok(adminResult.filePath);
  } finally {
    cleanup();
  }
});
