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
const sourcePath = path.join(repoRoot, "extensions", "openclaw-qqbot", "src", "outbound-guardrails.ts");
const textParsingPath = path.join(repoRoot, "extensions", "openclaw-qqbot", "src", "utils", "text-parsing.ts");

async function importOutboundGuardrailsModule() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-qqbot-outbound-guardrails-"));
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

  const tempFile = path.join(tempRoot, "src", "outbound-guardrails.mjs");
  transpile(sourcePath, tempFile, (code) => code.replace("./utils/text-parsing.js", "./utils/text-parsing.mjs"));
  transpile(textParsingPath, path.join(tempRoot, "src", "utils", "text-parsing.mjs"));
  try {
    return await import(pathToFileURL(tempFile).href);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test("sanitizeQQOutboundText trims internal runtime context from status output", async () => {
  const { sanitizeQQOutboundText } = await importOutboundGuardrailsModule();
  const raw = [
    "🦞 OpenClaw 2026.3.31 (213a704)",
    "🧠 Model: teamplus/gpt-5.2",
    "📌 Tasks: 0 active · 2 total · cli · [Thu 2026-04-02 00:39 GMT+8] OpenClaw runtime context (internal):",
    "This context is runtime-generated, not user-authored. Keep internal details private.",
    "",
    "[Internal task completion event]",
    "<<<BEGIN_UNTRUSTED_CHILD_RESULT>>>secret<<<END_UNTRUSTED_CHILD_RESULT>>>",
  ].join("\n");

  const decision = sanitizeQQOutboundText(raw);

  assert.equal(decision.action, "allow");
  assert.match(decision.text, /OpenClaw 2026\.3\.31/);
  assert.doesNotMatch(decision.text, /OpenClaw runtime context \(internal\)/);
  assert.doesNotMatch(decision.text, /BEGIN_UNTRUSTED_CHILD_RESULT/);
});

test("sanitizeQQOutboundText replaces internal scratchpad with a user-facing update", async () => {
  const { sanitizeQQOutboundText } = await importOutboundGuardrailsModule();
  const raw = [
    "**Assessing self-improvement steps**",
    "",
    "I need to perform self-improvement in line with the heartbeat checklist.",
    "First, I'll read self_improve_quality.md and daily memory, then compare AGENTS.md and TOOLS.md.",
    "I should also inspect cron jobs before editing ERRORS.md.",
  ].join("\n");

  const decision = sanitizeQQOutboundText(raw);

  assert.equal(decision.action, "replace");
  assert.equal(decision.reason, "internal-scratchpad");
  assert.match(decision.text, /我正在处理中/);
});

test("sanitizeQQOutboundText rewrites bare exec allowlist errors", async () => {
  const { sanitizeQQOutboundText } = await importOutboundGuardrailsModule();

  const plainDecision = sanitizeQQOutboundText("exec denied: allowlist miss");
  assert.equal(plainDecision.action, "replace");
  assert.equal(plainDecision.reason, "exec-policy-error");
  assert.match(plainDecision.text, /安全策略拦截/);

  const wrappedDecision = sanitizeQQOutboundText("exec 运行被拦截：`exec denied: allowlist miss`");
  assert.equal(wrappedDecision.action, "replace");
  assert.equal(wrappedDecision.reason, "exec-policy-error");
});

test("QQ interim progress coalescer suppresses superseded progress chatter", async () => {
  const { createQQInterimMessageCoalescer } = await importOutboundGuardrailsModule();
  const coalescer = createQQInterimMessageCoalescer(40);
  const sent = [];

  const first = coalescer.send(
    "qq:default:c2c:user",
    "开始做 Clawvard 入学考试了，哥哥～",
    { channel: "qqbot" },
    async () => {
      sent.push("progress");
      return { channel: "qqbot", messageId: "progress" };
    },
  );

  await new Promise((resolve) => setTimeout(resolve, 10));

  const second = coalescer.send(
    "qq:default:c2c:user",
    "已完成：Clawvard 入学考试",
    { channel: "qqbot" },
    async () => {
      sent.push("final");
      return { channel: "qqbot", messageId: "final" };
    },
  );

  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.deepEqual(sent, ["final"]);
  assert.equal(firstResult.messageId, undefined);
  assert.equal(secondResult.messageId, "final");
});
