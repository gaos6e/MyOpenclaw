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
const sourcePath = path.join(repoRoot, "extensions", "openclaw-qqbot", "src", "websocket-proxy.ts");

async function importWebSocketProxyModule() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-qqbot-ws-proxy-"));
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
    path.join(tempRoot, "proxy-agent.mjs"),
    [
      "export class ProxyAgent {",
      "  constructor() {",
      "    this.kind = 'proxy-agent';",
      "  }",
      "}",
    ].join("\n"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(tempRoot, "child-process.mjs"),
    [
      "export function execFileSync() {",
      "  throw new Error('registry unavailable in tests');",
      "}",
    ].join("\n"),
    "utf8",
  );

  const tempFile = path.join(tempRoot, "websocket-proxy.mjs");
  transpile(
    sourcePath,
    tempFile,
    (code) => code
      .replace(/from \"proxy-agent\"/g, 'from "./proxy-agent.mjs"')
      .replace(/from \"node:child_process\"/g, 'from "./child-process.mjs"'),
  );

  try {
    const mod = await import(pathToFileURL(tempFile).href);
    return { mod, cleanup: () => fs.rmSync(tempRoot, { recursive: true, force: true }) };
  } catch (error) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

test("resolveWebSocketAgent only enables proxy support when proxy env is configured", async () => {
  const savedEnv = { ...process.env };
  const { mod, cleanup } = await importWebSocketProxyModule();
  try {
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.ALL_PROXY;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.all_proxy;

    assert.equal(mod.describeConfiguredWebSocketProxy(), null);
    assert.equal(mod.resolveWebSocketAgent(), undefined);

    process.env.HTTPS_PROXY = "http://user:pass@127.0.0.1:7890";
    const agent = mod.resolveWebSocketAgent();
    assert.equal(agent?.kind, "proxy-agent");
    assert.equal(mod.describeConfiguredWebSocketProxy(), "http://***:***@127.0.0.1:7890/");
  } finally {
    cleanup();
    process.env = savedEnv;
  }
});

test("normalizeProxyUrl supports WinINET proxy strings and bare host:port values", async () => {
  const { mod, cleanup } = await importWebSocketProxyModule();
  try {
    assert.equal(
      mod.normalizeProxyUrl("127.0.0.1:7890"),
      "http://127.0.0.1:7890",
    );
    assert.equal(
      mod.normalizeProxyUrl("http=127.0.0.1:7890;https=127.0.0.1:8888"),
      "http://127.0.0.1:8888",
    );
  } finally {
    cleanup();
  }
});
