#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function parseArgs(argv) {
  const args = argv.slice(2);
  const repoRoot = path.resolve(__dirname, "..", "..");
  const options = {
    repoRoot,
    command: args[0] ?? "status",
    workspace: path.join(repoRoot, "workspace"),
    state: repoRoot,
    indexPath: path.join(repoRoot, "memory", "aux-vector-index.json"),
    maxResults: 5,
    query: "",
    json: false,
    embedMode: "remote",
  };
  for (let index = 1; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--workspace" && args[index + 1]) {
      options.workspace = path.resolve(args[++index]);
      continue;
    }
    if (token === "--state" && args[index + 1]) {
      options.state = path.resolve(args[++index]);
      continue;
    }
    if (token === "--index-path" && args[index + 1]) {
      options.indexPath = path.resolve(args[++index]);
      continue;
    }
    if ((token === "--query" || token === "-q") && args[index + 1]) {
      options.query = args[++index];
      continue;
    }
    if (token === "--max-results" && args[index + 1]) {
      options.maxResults = Number(args[++index]);
      continue;
    }
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token === "--embed-mode" && args[index + 1]) {
      options.embedMode = args[++index];
    }
  }
  return options;
}

function hashEmbedMany(texts) {
  return texts.map((text) => {
    const lower = String(text).toLowerCase();
    return [
      /cron|timeout|job-id/.test(lower) ? 1 : 0,
      /qq|wechat|telegram|slack/.test(lower) ? 1 : 0,
      /path|workspace|skills|目录|文件|路径/.test(lower) ? 1 : 0,
      Math.min(String(text).length / 2000, 1),
    ];
  });
}

async function loadConfig(stateDir) {
  const configPath = path.join(stateDir, "openclaw.json");
  if (!fs.existsSync(configPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

async function main() {
  const options = parseArgs(process.argv);
  const moduleUrl = pathToFileURL(
    path.join(options.repoRoot, "extensions", "openclaw-memory-hub", "src", "aux-vector.js"),
  ).href;
  const { buildAuxVectorIndex, createRemoteEmbedMany, searchAuxVectorIndex } = await import(moduleUrl);
  const config = await loadConfig(options.state);
  const memorySearchConfig = config?.agents?.defaults?.memorySearch ?? {};
  const embedMany =
    options.embedMode === "hash" ? hashEmbedMany : createRemoteEmbedMany(memorySearchConfig);

  if (typeof embedMany !== "function") {
    throw new Error("embedding configuration is missing; use --embed-mode hash for offline tests or configure memorySearch");
  }

  if (options.command === "index") {
    const result = await buildAuxVectorIndex({
      workspaceDir: options.workspace,
      stateDir: options.state,
      agentId: "main",
      indexPath: options.indexPath,
      embedMany,
      maxSessionFiles: 25,
      maxSessionMessagesPerFile: 20,
    });
    console.log(options.json ? JSON.stringify(result, null, 2) : `indexed ${result.items} items -> ${result.path}`);
    return;
  }

  if (options.command === "search") {
    if (!options.query) {
      throw new Error("query required for search");
    }
    const result = await searchAuxVectorIndex({
      indexPath: options.indexPath,
      query: options.query,
      embedMany,
      maxResults: options.maxResults,
    });
    if (options.json) {
      console.log(JSON.stringify({ results: result }, null, 2));
      return;
    }
    for (const item of result) {
      console.log(`${item.namespace} ${item.score.toFixed(3)} ${item.path}`);
      console.log(item.text);
      console.log("");
    }
    return;
  }

  const exists = fs.existsSync(options.indexPath);
  console.log(
    options.json
      ? JSON.stringify({ exists, indexPath: options.indexPath, embedMode: options.embedMode }, null, 2)
      : `${exists ? "present" : "missing"} ${options.indexPath}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
