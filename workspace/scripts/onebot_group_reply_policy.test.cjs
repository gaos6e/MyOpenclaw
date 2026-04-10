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

async function importHelperModule() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-onebot-group-reply-"));
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

  transpile(
    path.join(repoRoot, "extensions", "openclaw-onebot", "src", "group-reply-policy.ts"),
    path.join(tempRoot, "group-reply-policy.mjs"),
  );

  try {
    return await import(pathToFileURL(path.join(tempRoot, "group-reply-policy.mjs")).href);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test("decideGroupReplyTrigger can proactively interject on any group message under the active random-interject policy", async () => {
  const { decideGroupReplyTrigger } = await importHelperModule();

  const decision = decideGroupReplyTrigger({
    messageId: 100,
    text: "今天天气不错",
    isAtMentioned: false,
    aliasMatched: false,
    keywordMatched: false,
    contextualMatched: false,
    policy: {
      mode: "@always-reply-plus-random-interject",
      proactiveCooldownMs: 30000,
      maxProactiveRepliesPerHour: 60,
      proactiveInterjectChancePercent: 100,
    },
    state: {
      lastBotReplyAt: 0,
      proactiveReplyTimestamps: [],
    },
    now: 1_000_000,
  });

  assert.deepEqual(decision, {
    shouldReply: true,
    reason: "proactive",
    proactive: true,
  });
});

test("decideGroupReplyTrigger ignores low-information filler messages for proactive interjections", async () => {
  const { decideGroupReplyTrigger } = await importHelperModule();

  const decision = decideGroupReplyTrigger({
    messageId: 100,
    text: "哈哈哈哈",
    isAtMentioned: false,
    aliasMatched: false,
    keywordMatched: false,
    contextualMatched: false,
    policy: {
      mode: "@always-reply-plus-random-interject",
      proactiveCooldownMs: 10000,
      maxProactiveRepliesPerHour: 60,
      proactiveInterjectChancePercent: 100,
    },
    state: {
      lastBotReplyAt: 0,
      proactiveReplyTimestamps: [],
    },
    now: 1_000_000,
  });

  assert.deepEqual(decision, {
    shouldReply: false,
    reason: "",
    proactive: false,
  });
});

test("decideGroupReplyTrigger still respects cooldown and hourly cap for proactive interjections", async () => {
  const { decideGroupReplyTrigger } = await importHelperModule();

  const decision = decideGroupReplyTrigger({
    messageId: 100,
    text: "有人吗",
    isAtMentioned: false,
    aliasMatched: false,
    keywordMatched: false,
    contextualMatched: false,
    policy: {
      mode: "@always-reply-plus-random-interject",
      proactiveCooldownMs: 30000,
      maxProactiveRepliesPerHour: 2,
      proactiveInterjectChancePercent: 100,
    },
    state: {
      lastBotReplyAt: 990_000,
      proactiveReplyTimestamps: [950_000, 980_000],
    },
    now: 1_000_000,
  });

  assert.deepEqual(decision, {
    shouldReply: false,
    reason: "",
    proactive: false,
  });
});
