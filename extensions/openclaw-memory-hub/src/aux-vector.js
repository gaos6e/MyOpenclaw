import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { inferSessionScope } from "./session-scope.js";

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function hashText(text) {
  return crypto.createHash("sha1").update(text).digest("hex");
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function extractMessageText(content) {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((item) => item?.type === "text" && typeof item?.text === "string")
      .map((item) => item.text)
      .join("\n")
      .trim();
  }
  return "";
}

function splitParagraphs(text) {
  return String(text ?? "")
    .split(/\r?\n\r?\n+/)
    .map((chunk) =>
      normalizeText(
        chunk
          .split(/\r?\n/)
          .filter((line) => !/^\s*#+\s*/.test(line))
          .join("\n"),
      ),
    )
    .filter(Boolean);
}

function createDoc(namespace, filePath, text, extra = {}) {
  const normalized = normalizeText(text);
  return normalized
    ? {
        id: hashText(`${namespace}:${filePath}:${normalized}`),
        namespace,
        path: filePath,
        text: normalized,
        ...extra,
      }
    : null;
}

async function collectDailyDocs(workspaceDir) {
  const memoryDir = path.join(workspaceDir, "memory");
  if (!fs.existsSync(memoryDir)) {
    return [];
  }
  const docs = [];
  for (const entry of fs.readdirSync(memoryDir, { withFileTypes: true })) {
    if (!entry.isFile() || !/^\d{4}-\d{2}-\d{2}\.md$/i.test(entry.name)) {
      continue;
    }
    const filePath = path.join(memoryDir, entry.name);
    const relPath = path.relative(workspaceDir, filePath).replace(/\\/g, "/");
    const text = await fsPromises.readFile(filePath, "utf8");
    for (const chunk of splitParagraphs(text)) {
      const doc = createDoc("daily", relPath, chunk, { sourceType: "daily" });
      if (doc) {
        docs.push(doc);
      }
    }
  }
  return docs;
}

async function collectLearningDocs(workspaceDir) {
  const learningsDir = path.join(workspaceDir, ".learnings");
  const names = ["ERRORS.md", "LEARNINGS.md"];
  const docs = [];
  for (const name of names) {
    const filePath = path.join(learningsDir, name);
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const relPath = path.relative(workspaceDir, filePath).replace(/\\/g, "/");
    const text = await fsPromises.readFile(filePath, "utf8");
    for (const chunk of splitParagraphs(text)) {
      const doc = createDoc("learning", relPath, chunk, { sourceType: "learning" });
      if (doc) {
        docs.push(doc);
      }
    }
  }
  return docs;
}

async function collectCandidateDocs(workspaceDir) {
  const inboxDir = path.join(workspaceDir, "memory", "inbox");
  if (!fs.existsSync(inboxDir)) {
    return [];
  }
  const docs = [];
  for (const entry of fs.readdirSync(inboxDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".jsonl")) {
      continue;
    }
    const filePath = path.join(inboxDir, entry.name);
    const relPath = path.relative(workspaceDir, filePath).replace(/\\/g, "/");
    for (const record of readJsonl(filePath)) {
      if (record?.reviewed === true) {
        continue;
      }
      const doc = createDoc("candidate", relPath, record?.normalized ?? record?.text, {
        sourceType: "candidate",
        candidateId: record?.id ?? null,
      });
      if (doc) {
        docs.push(doc);
      }
    }
  }
  return docs;
}

async function collectSessionDocs(stateDir, agentId, maxSessionFiles, maxSessionMessagesPerFile) {
  const sessionsDir = path.join(stateDir, "agents", agentId ?? "main", "sessions");
  const storePath = path.join(sessionsDir, "sessions.json");
  if (!fs.existsSync(storePath)) {
    return [];
  }
  const store = JSON.parse(await fsPromises.readFile(storePath, "utf8"));
  const records = Object.entries(store)
    .filter(([sessionKey, value]) => {
      const scope = inferSessionScope(sessionKey);
      return !scope.isShared && value?.sessionId;
    })
    .map(([sessionKey, value]) => {
      const transcriptPath = path.join(sessionsDir, `${value.sessionId}.jsonl`);
      return {
        sessionKey,
        transcriptPath,
        sessionId: value.sessionId,
        mtimeMs: fs.existsSync(transcriptPath) ? fs.statSync(transcriptPath).mtimeMs : 0,
      };
    })
    .filter((item) => item.mtimeMs > 0)
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .slice(0, Math.max(1, Number(maxSessionFiles ?? 25)));

  const docs = [];
  for (const record of records) {
    const entries = readJsonl(record.transcriptPath)
      .map((entry) => entry?.message ?? entry)
      .filter((message) => message?.role === "user")
      .map((message) => extractMessageText(message?.content))
      .filter(Boolean)
      .slice(-Math.max(1, Number(maxSessionMessagesPerFile ?? 20)));
    for (const message of entries) {
      const doc = createDoc("session", record.transcriptPath, message, {
        sourceType: "session",
        sessionKey: record.sessionKey,
      });
      if (doc) {
        docs.push(doc);
      }
    }
  }
  return docs;
}

export async function collectAuxVectorDocuments(params) {
  const workspaceDir = path.resolve(params.workspaceDir);
  const stateDir = path.resolve(params.stateDir);
  const [dailyDocs, learningDocs, candidateDocs, sessionDocs] = await Promise.all([
    collectDailyDocs(workspaceDir),
    collectLearningDocs(workspaceDir),
    collectCandidateDocs(workspaceDir),
    collectSessionDocs(
      stateDir,
      params.agentId ?? "main",
      params.maxSessionFiles ?? 25,
      params.maxSessionMessagesPerFile ?? 20,
    ),
  ]);
  return [...dailyDocs, ...learningDocs, ...candidateDocs, ...sessionDocs];
}

function buildFingerprint(docs) {
  return hashText(docs.map((doc) => `${doc.id}:${doc.namespace}:${doc.path}:${doc.text}`).join("\n"));
}

function cosineSimilarity(left, right) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = Number(left[index] ?? 0);
    const b = Number(right[index] ?? 0);
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function countByNamespace(docs) {
  const counts = {};
  for (const doc of docs) {
    counts[doc.namespace] = (counts[doc.namespace] ?? 0) + 1;
  }
  return counts;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeAuxVectorIndex(indexPath, docs, embedMany) {
  const embeddings = await Promise.resolve(embedMany(docs.map((doc) => doc.text)));
  if (!Array.isArray(embeddings) || embeddings.length !== docs.length) {
    throw new Error("embedMany must return one embedding per document");
  }
  const items = docs.map((doc, index) => ({
    ...doc,
    embedding: embeddings[index],
  }));
  const payload = {
    version: 1,
    createdAt: new Date().toISOString(),
    fingerprint: buildFingerprint(docs),
    dimensions: Array.isArray(items[0]?.embedding) ? items[0].embedding.length : 0,
    items,
  };
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  await fsPromises.writeFile(indexPath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

export async function buildAuxVectorIndex(params) {
  if (typeof params.embedMany !== "function") {
    throw new Error("embedMany is required");
  }
  const docs = await collectAuxVectorDocuments(params);
  const payload = await writeAuxVectorIndex(params.indexPath, docs, params.embedMany);
  return {
    path: params.indexPath,
    items: payload.items.length,
    namespaces: countByNamespace(payload.items),
    fingerprint: payload.fingerprint,
    mode: "rebuilt",
  };
}

export async function ensureAuxVectorIndex(params) {
  if (typeof params.embedMany !== "function") {
    throw new Error("embedMany is required");
  }
  const docs = await collectAuxVectorDocuments(params);
  const fingerprint = buildFingerprint(docs);
  if (fs.existsSync(params.indexPath)) {
    const existing = JSON.parse(await fsPromises.readFile(params.indexPath, "utf8"));
    if (existing?.fingerprint === fingerprint) {
      return {
        path: params.indexPath,
        items: Array.isArray(existing.items) ? existing.items.length : 0,
        namespaces: countByNamespace(existing.items ?? []),
        fingerprint,
        mode: "cached",
      };
    }
  }
  const payload = await writeAuxVectorIndex(params.indexPath, docs, params.embedMany);
  return {
    path: params.indexPath,
    items: payload.items.length,
    namespaces: countByNamespace(payload.items),
    fingerprint,
    mode: "rebuilt",
  };
}

export async function searchAuxVectorIndex(params) {
  if (typeof params.embedMany !== "function") {
    throw new Error("embedMany is required");
  }
  if (!fs.existsSync(params.indexPath)) {
    return [];
  }
  const payload = JSON.parse(await fsPromises.readFile(params.indexPath, "utf8"));
  const [queryEmbedding] = await Promise.resolve(params.embedMany([params.query]));
  return (payload.items ?? [])
    .map((item) => ({
      ...item,
      score: cosineSimilarity(queryEmbedding, item.embedding ?? []),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, Number(params.maxResults ?? 5)))
    .map(({ embedding, ...item }) => item);
}

function resolveApiKey(memorySearchConfig) {
  const source = memorySearchConfig?.remote?.apiKey;
  if (source?.source === "env" && source?.id) {
    return process.env[source.id] ?? null;
  }
  return null;
}

export function createRemoteEmbedMany(memorySearchConfig, fetchImpl = fetch) {
  const baseUrl = String(memorySearchConfig?.remote?.baseUrl ?? "").trim();
  const model = String(memorySearchConfig?.model ?? "").trim();
  const apiKey = resolveApiKey(memorySearchConfig);
  if (!baseUrl || !model || !apiKey) {
    return null;
  }
  const endpoint = `${baseUrl.replace(/\/$/, "")}/embeddings`;
  return async function embedMany(texts) {
    const vectors = [];
    for (const text of texts) {
      let lastError = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const response = await fetchImpl(endpoint, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              input: text,
            }),
          });
          if (!response.ok) {
            const errorBody = await response.text().catch(() => "");
            throw new Error(
              `embedding request failed: ${response.status} ${response.statusText}${errorBody ? ` | ${errorBody}` : ""}`,
            );
          }
          const payload = await response.json();
          const embedding = payload?.data?.[0]?.embedding;
          if (!Array.isArray(embedding)) {
            throw new Error("embedding response missing vector");
          }
          vectors.push(embedding);
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 4) {
            await sleep(500 * (attempt + 1));
          }
        }
      }
      if (lastError) {
        throw lastError;
      }
    }
    return vectors;
  };
}
