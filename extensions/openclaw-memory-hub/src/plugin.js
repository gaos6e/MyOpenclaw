import path from "node:path";
import { jsonResult } from "./json-result.js";
import { MemoryHubIndexer } from "./indexer.js";
import { createRemoteEmbedMany, ensureAuxVectorIndex, searchAuxVectorIndex } from "./aux-vector.js";
import { inferSessionScope } from "./session-scope.js";
import {
  collectCurrentSessionUserTexts,
  readSessionTranscriptSnippet,
  searchSessionTranscript,
} from "./session-recall.js";
import { extractCandidateBatch, extractHeuristicCandidates } from "./candidates.js";
import { lookupOntology, rebuildOntologyGraph } from "./ontology.js";
import { backfillTranscriptCandidates, snapshotMemorySources } from "./backfill.js";
import { appendOperationLog } from "./operation-log.js";
import { appendCandidates, listInboxCandidates, promoteCandidate } from "./stores.js";
import { ensureMemoryHubFiles, resolveMemoryHubPaths } from "./runtime-paths.js";

const INDEXERS = new Map();

function makeError(message, extra = {}) {
  return jsonResult({ disabled: true, error: message, ...extra });
}

function getIndexer(paths) {
  const key = paths.dbPath;
  if (!INDEXERS.has(key)) {
    INDEXERS.set(key, new MemoryHubIndexer({ workspaceDir: paths.workspaceDir, dbPath: paths.dbPath }));
  }
  return INDEXERS.get(key);
}

function resolveEmbedClientConfig(memorySearchConfig) {
  const baseUrl = String(memorySearchConfig?.remote?.baseUrl ?? "").trim();
  const model = String(memorySearchConfig?.model ?? "").trim();
  const source = memorySearchConfig?.remote?.apiKey;
  const apiKey =
    source?.source === "env" && source?.id
      ? String(process.env[source.id] ?? "").trim()
      : typeof source === "string"
        ? source.trim()
        : "";
  return { baseUrl, model, apiKey };
}

function getVectorEmbedMany(api, memorySearchConfig = api.config?.agents?.defaults?.memorySearch) {
  if (typeof api.pluginConfig?.embedMany === "function") {
    return api.pluginConfig.embedMany;
  }
  return createRemoteEmbedMany(resolveEmbedClientConfig(memorySearchConfig));
}

function resolveAgentWorkspaceDir(config, agentId) {
  const configured =
    config?.agents?.list?.find?.((entry) => entry?.id === agentId)?.workspace
    ?? config?.agents?.defaults?.workspace;
  return configured ? path.resolve(configured) : path.resolve(process.cwd(), "workspace");
}

async function preparePaths(api, toolContext) {
  const paths = resolveMemoryHubPaths({
    config: api.config,
    pluginConfig: api.pluginConfig,
    toolContext,
  });
  ensureMemoryHubFiles(paths);
  return paths;
}

function toolSchema(properties, required = []) {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required,
  };
}

async function ensureOntologyAndIndex(paths) {
  await rebuildOntologyGraph({
    workspaceDir: paths.workspaceDir,
    historyPath: paths.historyPath,
    ontologyPath: paths.ontologyPath,
  });
  await getIndexer(paths).reindex({ force: true });
}

function buildRuntimeStatus(paths, indexerStatus, vectorAvailable, requestedModel) {
  return {
    backend: "builtin",
    provider: "openclaw-memory-hub",
    model: requestedModel || undefined,
    files: Number(indexerStatus.docs ?? 0),
    chunks: Number(indexerStatus.chunks ?? 0),
    workspaceDir: paths.workspaceDir,
    dbPath: paths.dbPath,
    sources: ["memory", "sessions"],
    fts: {
      enabled: true,
      available: true,
    },
    vector: {
      enabled: true,
      available: vectorAvailable,
      extensionPath: paths.vectorIndexPath,
    },
    custom: {
      backend: indexerStatus.backend,
      inboxDir: paths.inboxDir,
      historyPath: paths.historyPath,
      ontologyPath: paths.ontologyPath,
    },
  };
}

function createMemoryRuntimeManager(api, paths, memorySearchConfig) {
  const indexer = getIndexer(paths);
  const embedMany = getVectorEmbedMany(api, memorySearchConfig);
  const requestedModel = String(memorySearchConfig?.model ?? "").trim();

  return {
    async search(query, opts = {}) {
      await indexer.reindex();
      const results = await indexer.search(query, {
        maxResults: opts.maxResults,
        minScore: opts.minScore,
      });
      return results.map((item) => ({
        path: item.path,
        startLine: item.startLine,
        endLine: item.endLine,
        score: item.score,
        snippet: item.snippet,
        source: "memory",
      }));
    },
    async readFile(params) {
      return indexer.readFile({
        relPath: params.relPath,
        from: params.from,
        lines: params.lines,
      });
    },
    status() {
      return buildRuntimeStatus(paths, indexer.status(), typeof embedMany === "function", requestedModel);
    },
    async sync(params = {}) {
      await ensureOntologyAndIndex(paths);
      if (typeof embedMany === "function") {
        await ensureAuxVectorIndex({
          workspaceDir: paths.workspaceDir,
          stateDir: paths.stateDir,
          agentId: "main",
          indexPath: paths.vectorIndexPath,
          embedMany,
          maxSessionFiles: paths.vectorMaxSessionFiles,
          maxSessionMessagesPerFile: paths.vectorMaxSessionMessagesPerFile,
        });
      }
      if (typeof params.progress === "function") {
        params.progress({ completed: 1, total: 1, label: "memory-hub sync" });
      }
    },
    async probeEmbeddingAvailability() {
      return typeof embedMany === "function"
        ? { ok: true }
        : { ok: false, error: "memorySearch embedding settings are missing" };
    },
    async probeVectorAvailability() {
      return typeof embedMany === "function";
    },
  };
}

const plugin = {
  id: "openclaw-memory-hub",
  name: "OpenClaw Memory Hub",
  description: "Scoped durable memory, session recall, ontology lookup, and candidate extraction.",
  configSchema: {
    parse(value) {
      return value ?? {};
    },
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { type: "string", enum: ["primary", "auxiliary"] },
        dbPath: { type: "string" },
        vectorIndexPath: { type: "string" },
        manifestPath: { type: "string" },
        historyPath: { type: "string" },
        ontologyPath: { type: "string" },
        inboxDir: { type: "string" },
        logPath: { type: "string" },
        snapshotDir: { type: "string" },
        transcriptBackfillLimit: { type: "integer", minimum: 1 },
        sessionRecallWindow: { type: "integer", minimum: 1 },
        vectorMaxSessionFiles: { type: "integer", minimum: 1 },
        vectorMaxSessionMessagesPerFile: { type: "integer", minimum: 1 },
      },
    },
  },
  register(api) {
    const auxiliaryMode = String(api.pluginConfig?.mode ?? "primary") === "auxiliary";

    if (!auxiliaryMode && typeof api.registerMemoryRuntime === "function") {
      api.registerMemoryRuntime({
        async getMemorySearchManager({ cfg, agentId }) {
          const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
          const paths = resolveMemoryHubPaths({
            config: cfg,
            pluginConfig: api.pluginConfig,
            toolContext: { workspaceDir },
          });
          ensureMemoryHubFiles(paths);
          return {
            manager: createMemoryRuntimeManager(api, paths, cfg?.agents?.defaults?.memorySearch),
          };
        },
        resolveMemoryBackendConfig() {
          return { backend: "builtin" };
        },
        async closeAllMemorySearchManagers() {
          for (const indexer of INDEXERS.values()) {
            indexer.close();
          }
          INDEXERS.clear();
        },
      });
    }

    api.registerTool(
      (ctx) => {
        const tools = [
          {
            name: "memory_search",
            label: "Memory Search",
            description:
              "Search durable memory, daily memory, and reviewed ontology facts. In shared contexts this tool is disabled for privacy.",
            parameters: toolSchema(
              {
                query: { type: "string" },
                maxResults: { type: "integer", minimum: 1 },
                minScore: { type: "number", minimum: 0 },
              },
              ["query"],
            ),
            async execute(_toolCallId, params) {
              const paths = await preparePaths(api, ctx);
              const scope = inferSessionScope(ctx.sessionKey);
              if (scope.isShared) {
                return makeError("global memory search is disabled in shared contexts; use session_recall_search instead");
              }
              const indexer = getIndexer(paths);
              await indexer.reindex();
              const results = await indexer.search(params.query, { maxResults: params.maxResults });
              return jsonResult({
                backend: "memory-hub-v2",
                mode: "fts-weighted",
                results,
              });
            },
          },
          {
            name: "memory_get",
            label: "Memory Get",
            description: "Read a snippet from durable memory, daily memory, or ontology-backed file sources.",
            parameters: toolSchema(
              {
                path: { type: "string" },
                from: { type: "integer", minimum: 1 },
                lines: { type: "integer", minimum: 1 },
              },
              ["path"],
            ),
            async execute(_toolCallId, params) {
              const paths = await preparePaths(api, ctx);
              const scope = inferSessionScope(ctx.sessionKey);
              if (scope.isShared) {
                return makeError("memory_get is disabled in shared contexts");
              }
              const result = await getIndexer(paths).readFile({
                relPath: params.path,
                from: params.from,
                lines: params.lines,
              });
              return jsonResult(result);
            },
          },
          {
            name: "memory_vector_search",
            label: "Memory Vector Search",
            description:
              "Semantic recall over auxiliary memory sources: daily memory, learnings, pending candidates, and private/direct session notes. Results are hints only and do not modify durable memory.",
            parameters: toolSchema(
              {
                query: { type: "string" },
                maxResults: { type: "integer", minimum: 1 },
              },
              ["query"],
            ),
            async execute(_toolCallId, params) {
              const paths = await preparePaths(api, ctx);
              const scope = inferSessionScope(ctx.sessionKey);
              if (scope.isShared) {
                return makeError("memory_vector_search is disabled in shared contexts");
              }
              const embedMany = getVectorEmbedMany(api);
              if (typeof embedMany !== "function") {
                return makeError("memory vector search is not configured; memorySearch embedding settings are missing");
              }
              const indexStatus = await ensureAuxVectorIndex({
                workspaceDir: paths.workspaceDir,
                stateDir: paths.stateDir,
                agentId: ctx.agentId ?? "main",
                indexPath: paths.vectorIndexPath,
                embedMany,
                maxSessionFiles: paths.vectorMaxSessionFiles,
                maxSessionMessagesPerFile: paths.vectorMaxSessionMessagesPerFile,
              });
              const results = await searchAuxVectorIndex({
                indexPath: paths.vectorIndexPath,
                query: params.query,
                maxResults: params.maxResults,
                embedMany,
              });
              appendOperationLog(paths.logPath, {
                event: "memory_vector_search",
                sessionKey: ctx.sessionKey ?? null,
                query: params.query,
                maxResults: params.maxResults ?? 5,
                resultCount: results.length,
                indexMode: indexStatus.mode,
                indexItems: indexStatus.items,
              });
              return jsonResult({
                backend: "memory-hub-aux-vector",
                mode: "semantic-hint",
                indexStatus,
                results,
              });
            },
          },
          {
            name: "session_recall_search",
            label: "Session Recall Search",
            description: "Search only the current session transcript.",
            parameters: toolSchema(
              {
                query: { type: "string" },
                maxResults: { type: "integer", minimum: 1 },
              },
              ["query"],
            ),
            async execute(_toolCallId, params) {
              const paths = await preparePaths(api, ctx);
              if (!ctx.sessionKey) {
                return makeError("session_recall_search requires a session context");
              }
              const results = await searchSessionTranscript({
                stateDir: paths.stateDir,
                agentId: ctx.agentId ?? "main",
                sessionKey: ctx.sessionKey,
                query: params.query,
                maxResults: params.maxResults,
              });
              return jsonResult({ results });
            },
          },
          {
            name: "session_recall_get",
            label: "Session Recall Get",
            description: "Read a snippet from the current session transcript only.",
            parameters: toolSchema({
              path: { type: "string" },
              from: { type: "integer", minimum: 1 },
              lines: { type: "integer", minimum: 1 },
            }),
            async execute(_toolCallId, params) {
              const paths = await preparePaths(api, ctx);
              if (!ctx.sessionKey) {
                return makeError("session_recall_get requires a session context");
              }
              const result = await readSessionTranscriptSnippet({
                stateDir: paths.stateDir,
                agentId: ctx.agentId ?? "main",
                sessionKey: ctx.sessionKey,
                path: params.path,
                from: params.from,
                lines: params.lines,
              });
              return jsonResult(result);
            },
          },
          {
            name: "ontology_lookup",
            label: "Ontology Lookup",
            description: "Search reviewed ontology entities and relations derived from durable memory/history.",
            parameters: toolSchema(
              {
                query: { type: "string" },
                limit: { type: "integer", minimum: 1 },
              },
              ["query"],
            ),
            async execute(_toolCallId, params) {
              const paths = await preparePaths(api, ctx);
              const scope = inferSessionScope(ctx.sessionKey);
              if (scope.isShared) {
                return makeError("ontology lookup is disabled in shared contexts");
              }
              await rebuildOntologyGraph({
                workspaceDir: paths.workspaceDir,
                historyPath: paths.historyPath,
                ontologyPath: paths.ontologyPath,
              });
              const results = await lookupOntology({
                ontologyPath: paths.ontologyPath,
                query: params.query,
                limit: params.limit,
              });
              return jsonResult({ results });
            },
          },
          {
            name: "memory_extract_candidates",
            label: "Memory Extract Candidates",
            description: "Extract stable memory candidates from current session context and write them to the inbox.",
            parameters: toolSchema({
              sourceText: { type: "string" },
              maxCandidates: { type: "integer", minimum: 1 },
            }),
            async execute(_toolCallId, params) {
              const paths = await preparePaths(api, ctx);
              const texts = params.sourceText
                ? [String(params.sourceText)]
                : ctx.sessionKey
                  ? await collectCurrentSessionUserTexts({
                      stateDir: paths.stateDir,
                      agentId: ctx.agentId ?? "main",
                      sessionKey: ctx.sessionKey,
                    })
                  : [];
              const extraction = extractCandidateBatch({
                sourceKind: ctx.sessionKey ? "session" : "manual",
                sourceRef: ctx.sessionKey ?? "manual",
                texts,
              });
              const candidates = extraction.candidates.slice(0, Math.max(1, Number(params.maxCandidates ?? 5)));
              const fileStem = new Date().toISOString().slice(0, 10);
              const writeResult = appendCandidates({
                inboxDir: paths.inboxDir,
                fileStem,
                candidates,
              });
              appendOperationLog(paths.logPath, {
                event: "memory_extract_candidates",
                sourceKind: ctx.sessionKey ? "session" : "manual",
                sourceRef: ctx.sessionKey ?? "manual",
                sessionKey: ctx.sessionKey ?? null,
                textsCount: texts.length,
                candidateCount: candidates.length,
                schemaKeys: [...new Set(candidates.map((candidate) => candidate.schema_key).filter(Boolean))].sort(),
                stats: extraction.stats,
                path: writeResult.path,
              });
              return jsonResult({ ...writeResult, candidates, stats: extraction.stats });
            },
          },
          {
            name: "memory_list_candidates",
            label: "Memory List Candidates",
            description: "List pending memory candidates from inbox JSONL files.",
            parameters: toolSchema({
              limit: { type: "integer", minimum: 1 },
            }),
            async execute() {
              const paths = await preparePaths(api, ctx);
              const candidates = listInboxCandidates({ workspaceDir: paths.workspaceDir }).filter(
                (candidate) => candidate.reviewed !== true,
              );
              return jsonResult({ candidates: candidates.slice(0, Math.max(1, 20)) });
            },
          },
          {
            name: "memory_promote_candidate",
            label: "Memory Promote Candidate",
            description: "Mark an inbox candidate reviewed, write it into durable memory, append history, rebuild ontology, and refresh index.",
            parameters: toolSchema(
              {
                candidateId: { type: "string" },
                target: { type: "string", enum: ["durable"] },
              },
              ["candidateId"],
            ),
            async execute(_toolCallId, params) {
              const paths = await preparePaths(api, ctx);
              const scope = inferSessionScope(ctx.sessionKey);
              if (scope.isShared) {
                return makeError("candidate promotion is disabled in shared contexts");
              }
              const result = await promoteCandidate({
                workspaceDir: paths.workspaceDir,
                candidateId: params.candidateId,
                target: params.target ?? "durable",
              });
              appendOperationLog(paths.logPath, {
                event: "memory_promote_candidate",
                candidateId: params.candidateId,
                target: params.target ?? "durable",
                sessionKey: ctx.sessionKey ?? null,
              });
              await ensureOntologyAndIndex(paths);
              return jsonResult(result);
            },
          },
        ];
        return auxiliaryMode
          ? tools.filter(
              (entry) =>
                ![
                  "memory_search",
                  "memory_get",
                ].includes(entry.name),
            )
          : tools;
      },
      {
        names: [
          "memory_search",
          "memory_get",
          "memory_vector_search",
          "session_recall_search",
          "session_recall_get",
          "ontology_lookup",
          "memory_extract_candidates",
          "memory_list_candidates",
          "memory_promote_candidate",
        ],
      },
    );

    api.registerCli(
      ({ program }) => {
        const command = program.command("memory-hub").description("OpenClaw memory hub commands");

        command
          .command("status")
          .option("--json", "output json")
          .action(async (opts) => {
            const paths = await preparePaths(api, {});
            const status = {
              ...getIndexer(paths).status(),
              inboxDir: paths.inboxDir,
              historyPath: paths.historyPath,
              ontologyPath: paths.ontologyPath,
              candidates: listInboxCandidates({ workspaceDir: paths.workspaceDir }).filter(
                (candidate) => candidate.reviewed !== true,
              ).length,
            };
            if (opts.json) {
              console.log(JSON.stringify(status, null, 2));
              return;
            }
            console.log(`backend: ${status.backend}`);
            console.log(`docs: ${status.docs}`);
            console.log(`chunks: ${status.chunks}`);
            console.log(`db: ${status.dbPath}`);
            console.log(`pending candidates: ${status.candidates}`);
          });

        command
          .command("index")
          .option("--force", "force full reindex")
          .action(async (opts) => {
            const paths = await preparePaths(api, {});
            await ensureOntologyAndIndex(paths);
            const status = await getIndexer(paths).reindex({ force: Boolean(opts.force) });
            console.log(JSON.stringify(status, null, 2));
          });

        command
          .command("vector-index")
          .option("--json", "output json")
          .action(async (opts) => {
            const paths = await preparePaths(api, {});
            const embedMany = getVectorEmbedMany(api);
            if (typeof embedMany !== "function") {
              throw new Error("memory vector search is not configured; memorySearch embedding settings are missing");
            }
            const status = await ensureAuxVectorIndex({
              workspaceDir: paths.workspaceDir,
              stateDir: paths.stateDir,
              agentId: "main",
              indexPath: paths.vectorIndexPath,
              embedMany,
              maxSessionFiles: paths.vectorMaxSessionFiles,
              maxSessionMessagesPerFile: paths.vectorMaxSessionMessagesPerFile,
            });
            appendOperationLog(paths.logPath, {
              event: "memory_vector_index",
              mode: status.mode,
              items: status.items,
              fingerprint: status.fingerprint,
            });
            console.log(opts.json ? JSON.stringify(status, null, 2) : `vector index: ${status.mode}\nitems: ${status.items}`);
          });

        command
          .command("vector-search")
          .argument("[query]", "query")
          .option("--query <text>", "query text")
          .option("--max-results <n>", "max results", "5")
          .option("--json", "output json")
          .action(async (queryArg, opts) => {
            const query = opts.query ?? queryArg;
            if (!query) {
              throw new Error("query required");
            }
            const paths = await preparePaths(api, {});
            const embedMany = getVectorEmbedMany(api);
            if (typeof embedMany !== "function") {
              throw new Error("memory vector search is not configured; memorySearch embedding settings are missing");
            }
            const indexStatus = await ensureAuxVectorIndex({
              workspaceDir: paths.workspaceDir,
              stateDir: paths.stateDir,
              agentId: "main",
              indexPath: paths.vectorIndexPath,
              embedMany,
              maxSessionFiles: paths.vectorMaxSessionFiles,
              maxSessionMessagesPerFile: paths.vectorMaxSessionMessagesPerFile,
            });
            const results = await searchAuxVectorIndex({
              indexPath: paths.vectorIndexPath,
              query,
              maxResults: Number(opts.maxResults),
              embedMany,
            });
            appendOperationLog(paths.logPath, {
              event: "memory_vector_search",
              sessionKey: null,
              query,
              maxResults: Number(opts.maxResults),
              resultCount: results.length,
              indexMode: indexStatus.mode,
              indexItems: indexStatus.items,
            });
            if (opts.json) {
              console.log(JSON.stringify({ backend: "memory-hub-aux-vector", mode: "semantic-hint", indexStatus, results }, null, 2));
              return;
            }
            for (const item of results) {
              console.log(`${item.namespace} ${item.score.toFixed(3)} ${item.path}`);
              console.log(item.text);
              console.log("");
            }
          });

        command
          .command("search")
          .argument("[query]", "query")
          .option("--query <text>", "query text")
          .option("--max-results <n>", "max results", "5")
          .option("--json", "output json")
          .action(async (queryArg, opts) => {
            const query = opts.query ?? queryArg;
            if (!query) {
              throw new Error("query required");
            }
            const paths = await preparePaths(api, {});
            await getIndexer(paths).reindex();
            const results = await getIndexer(paths).search(query, { maxResults: Number(opts.maxResults) });
            if (opts.json) {
              console.log(JSON.stringify({ results }, null, 2));
              return;
            }
            for (const item of results) {
              console.log(`${item.path}:${item.startLine}-${item.endLine} [${item.namespace}] ${item.score.toFixed(2)}`);
              console.log(item.snippet);
              console.log("");
            }
          });

        command
          .command("backfill")
          .option("--json", "output json")
          .action(async (opts) => {
            const paths = await preparePaths(api, {});
            const snapshot = await snapshotMemorySources({
              workspaceDir: paths.workspaceDir,
              stateDir: paths.stateDir,
              snapshotDir: paths.snapshotDir,
              agentId: "main",
            });
            const result = await backfillTranscriptCandidates({
              stateDir: paths.stateDir,
              agentId: "main",
              inboxDir: paths.inboxDir,
              limit: paths.transcriptBackfillLimit,
            });
            appendOperationLog(paths.logPath, {
              event: "memory_backfill_candidates",
              agentId: "main",
              limit: paths.transcriptBackfillLimit,
              appended: result.appended,
              path: result.path,
              snapshotDir: snapshot.snapshotDir,
            });
            const payload = { snapshot, result };
            console.log(opts.json ? JSON.stringify(payload, null, 2) : `snapshot: ${snapshot.snapshotDir}\nappended: ${result.appended}`);
          });

        command
          .command("candidates")
          .option("--json", "output json")
          .action(async (opts) => {
            const paths = await preparePaths(api, {});
            const candidates = listInboxCandidates({ workspaceDir: paths.workspaceDir }).filter(
              (candidate) => candidate.reviewed !== true,
            );
            console.log(opts.json ? JSON.stringify({ candidates }, null, 2) : candidates.map((entry) => `${entry.id} ${entry.candidate_kind} ${entry.normalized}`).join("\n"));
          });

        command
          .command("extract")
          .requiredOption("--source <text>", "source text")
          .option("--max-candidates <n>", "max candidates", "5")
          .action(async (opts) => {
            const paths = await preparePaths(api, {});
            const candidates = extractHeuristicCandidates({
              sourceKind: "manual",
              sourceRef: "memory-cli",
              texts: [opts.source],
            }).slice(0, Math.max(1, Number(opts.maxCandidates)));
            const result = appendCandidates({
              inboxDir: paths.inboxDir,
              fileStem: new Date().toISOString().slice(0, 10),
              candidates,
            });
            console.log(JSON.stringify({ ...result, candidates }, null, 2));
          });

        command
          .command("promote")
          .argument("<candidateId>", "candidate id")
          .option("--target <target>", "promotion target", "durable")
          .action(async (candidateId, opts) => {
            const paths = await preparePaths(api, {});
            const result = await promoteCandidate({
              workspaceDir: paths.workspaceDir,
              candidateId,
              target: opts.target,
            });
            await ensureOntologyAndIndex(paths);
            console.log(JSON.stringify(result, null, 2));
          });
      },
      { commands: ["memory-hub"] },
    );

    api.on("gateway_start", async () => {
      const paths = await preparePaths(api, {});
      ensureMemoryHubFiles(paths);
    });
  },
};

export default plugin;
