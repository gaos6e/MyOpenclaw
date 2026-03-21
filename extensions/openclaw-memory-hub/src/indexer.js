import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { classifyIndexedPath, defaultIndexManifest } from "./index-manifest.js";

const DEFAULT_NAMESPACE_WEIGHTS = {
  durable: 5,
  ontology: 2.2,
  daily: 1.4,
  other: 1,
};

function normalizeRelPath(value) {
  return String(value ?? "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function tokenizeQuery(query) {
  return String(query ?? "")
    .match(/[\p{L}\p{N}_./:-]+/gu)
    ?.map((item) => item.trim())
    .filter(Boolean) ?? [];
}

function buildFtsQuery(query) {
  const tokens = tokenizeQuery(query).map((token) => token.replaceAll('"', ""));
  if (tokens.length === 0) {
    return null;
  }
  return tokens.map((token) => `"${token}"`).join(" AND ");
}

function tryReadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveManifest(workspaceDir) {
  const manifestPath = path.join(workspaceDir, "memory", "index-manifest.json");
  return tryReadJson(manifestPath) ?? defaultIndexManifest();
}

function gatherCandidateFiles(workspaceDir) {
  const candidates = new Set([
    path.join(workspaceDir, "MEMORY.md"),
    path.join(workspaceDir, "memory", "ontology", "graph.jsonl"),
  ]);
  const memoryDir = path.join(workspaceDir, "memory");
  if (fs.existsSync(memoryDir)) {
    for (const entry of fs.readdirSync(memoryDir, { withFileTypes: true })) {
      if (!entry.isFile()) {
        continue;
      }
      candidates.add(path.join(memoryDir, entry.name));
    }
  }
  return [...candidates];
}

function inferDateAgeMultiplier(relPath) {
  const match = /^memory\/(\d{4})-(\d{2})-(\d{2})\.md$/i.exec(relPath);
  if (!match) {
    return 1;
  }
  const timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const ageDays = Math.max(0, (Date.now() - timestamp) / 86400000);
  const halfLifeDays = 60;
  return Math.exp((-Math.log(2) * ageDays) / halfLifeDays);
}

function chunkMarkdown(relPath, text, namespace) {
  const lines = text.split(/\r?\n/);
  const chunks = [];
  let startLine = 1;
  let buffer = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === "" && buffer.length > 0) {
      const chunkText = buffer.join("\n").trim();
      if (chunkText) {
        chunks.push({
          id: hashText(`${relPath}:${startLine}:${chunkText}`),
          path: relPath,
          namespace,
          start_line: startLine,
          end_line: index,
          text: chunkText,
        });
      }
      buffer = [];
      startLine = index + 2;
      continue;
    }
    if (buffer.length === 0) {
      startLine = index + 1;
    }
    buffer.push(line);
  }
  const trailing = buffer.join("\n").trim();
  if (trailing) {
    chunks.push({
      id: hashText(`${relPath}:${startLine}:${trailing}`),
      path: relPath,
      namespace,
      start_line: startLine,
      end_line: lines.length,
      text: trailing,
    });
  }
  return chunks;
}

function chunkOntology(relPath, text) {
  const lines = text.split(/\r?\n/);
  const chunks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      continue;
    }
    try {
      const record = JSON.parse(line);
      if (record.reviewed === false) {
        continue;
      }
      const summary = normalizeRelPath(
        `${record.summary ?? record.name ?? record.value ?? record.text ?? JSON.stringify(record)}`,
      );
      if (!summary) {
        continue;
      }
      chunks.push({
        id: String(record.id ?? hashText(`${relPath}:${index + 1}:${summary}`)),
        path: relPath,
        namespace: "ontology",
        start_line: index + 1,
        end_line: index + 1,
        text: summary,
      });
    } catch {
      // Ignore malformed runtime records.
    }
  }
  return chunks;
}

async function readIndexableDocuments(workspaceDir, manifest) {
  const docs = [];
  for (const absolutePath of gatherCandidateFiles(workspaceDir)) {
    const relPath = normalizeRelPath(path.relative(workspaceDir, absolutePath));
    const classification = classifyIndexedPath(relPath, manifest);
    if (!classification.included) {
      continue;
    }
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      continue;
    }
    const text = await fsPromises.readFile(absolutePath, "utf8");
    docs.push({
      absolutePath,
      relPath,
      namespace: classification.namespace,
      text,
      stat: await fsPromises.stat(absolutePath),
    });
  }
  return docs;
}

export class MemoryHubIndexer {
  constructor(options) {
    this.workspaceDir = options.workspaceDir;
    this.dbPath = options.dbPath;
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.db = new DatabaseSync(this.dbPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA synchronous = NORMAL");
    this.ensureSchema();
  }

  ensureSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS docs (
        path TEXT PRIMARY KEY,
        namespace TEXT NOT NULL,
        mtime INTEGER NOT NULL,
        size INTEGER NOT NULL,
        hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        namespace TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        text TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(id UNINDEXED, text);
    `);
  }

  async reindex(options = {}) {
    const manifest = resolveManifest(this.workspaceDir);
    const docs = await readIndexableDocuments(this.workspaceDir, manifest);
    if (options.force) {
      this.db.exec("DELETE FROM docs; DELETE FROM chunks; DELETE FROM chunks_fts;");
    }
    const existing = new Map(
      this.db.prepare("SELECT path, mtime, size, hash FROM docs").all().map((row) => [row.path, row]),
    );
    for (const doc of docs) {
      const mtime = Math.floor(doc.stat.mtimeMs);
      const size = Math.floor(doc.stat.size);
      const hash = hashText(doc.text);
      const current = existing.get(doc.relPath);
      if (current && current.mtime === mtime && current.size === size && current.hash === hash) {
        continue;
      }
      this.db.prepare("DELETE FROM chunks_fts WHERE id IN (SELECT id FROM chunks WHERE path = ?)").run(doc.relPath);
      this.db.prepare("DELETE FROM chunks WHERE path = ?").run(doc.relPath);
      const chunks =
        doc.namespace === "ontology"
          ? chunkOntology(doc.relPath, doc.text)
          : chunkMarkdown(doc.relPath, doc.text, doc.namespace);
      const insertChunk = this.db.prepare(
        "INSERT INTO chunks (id, path, namespace, start_line, end_line, text) VALUES (?, ?, ?, ?, ?, ?)",
      );
      const insertFts = this.db.prepare("INSERT INTO chunks_fts (id, text) VALUES (?, ?)");
      for (const chunk of chunks) {
        insertChunk.run(chunk.id, chunk.path, chunk.namespace, chunk.start_line, chunk.end_line, chunk.text);
        insertFts.run(chunk.id, chunk.text);
      }
      this.db.prepare(
        "INSERT OR REPLACE INTO docs (path, namespace, mtime, size, hash) VALUES (?, ?, ?, ?, ?)",
      ).run(doc.relPath, doc.namespace, mtime, size, hash);
    }
    return this.status();
  }

  scoreRow(row) {
    const namespaceWeight = DEFAULT_NAMESPACE_WEIGHTS[row.namespace] ?? DEFAULT_NAMESPACE_WEIGHTS.other;
    const ageMultiplier = row.namespace === "daily" ? inferDateAgeMultiplier(row.path) : 1;
    const rank = Number.isFinite(row.rank) ? row.rank : 1000;
    const base = rank < 0 ? (-rank) / (1 + -rank) : 1 / (1 + rank);
    return base * namespaceWeight * ageMultiplier;
  }

  async search(query, options = {}) {
    const maxResults = Math.max(1, Number(options.maxResults ?? 5));
    const tokens = tokenizeQuery(query);
    if (tokens.length === 0) {
      return [];
    }
    const merged = new Map();
    const addResult = (row, score) => {
      const key = `${row.path}:${row.start_line}:${row.end_line}`;
      const existing = merged.get(key);
      if (!existing || score > existing.score) {
        merged.set(key, {
          path: row.path,
          namespace: row.namespace,
          startLine: row.start_line,
          endLine: row.end_line,
          snippet: row.text,
          score,
        });
      }
    };

    const ftsQuery = buildFtsQuery(query);
    let rows = [];
    if (ftsQuery) {
      try {
        rows = this.db.prepare(
          `
            SELECT
              chunks.id,
              chunks.path,
              chunks.namespace,
              chunks.start_line,
              chunks.end_line,
              chunks.text,
              bm25(chunks_fts) AS rank
            FROM chunks_fts
            JOIN chunks ON chunks.id = chunks_fts.id
            WHERE chunks_fts MATCH ?
            LIMIT ?
          `,
        ).all(ftsQuery, maxResults * 20);
      } catch {
        rows = [];
      }
    }

    if (rows.length > 0) {
      for (const row of rows) {
        addResult(row, this.scoreRow(row));
      }
    } else {
      const fallbackRows = this.db.prepare(
        "SELECT id, path, namespace, start_line, end_line, text FROM chunks",
      ).all();
      for (const row of fallbackRows) {
        const haystack = String(row.text ?? "").toLowerCase();
        const hits = tokens.filter((token) => haystack.includes(token.toLowerCase())).length;
        if (hits === 0) {
          continue;
        }
        const score =
          (hits / Math.max(tokens.length, 1)) *
          (DEFAULT_NAMESPACE_WEIGHTS[row.namespace] ?? DEFAULT_NAMESPACE_WEIGHTS.other) *
          (row.namespace === "daily" ? inferDateAgeMultiplier(row.path) : 1);
        addResult(row, score);
      }
    }
    const results = [...merged.values()];
    if (results.length === 0) {
      return [];
    }
    return results.sort((left, right) => right.score - left.score).slice(0, maxResults);
  }

  async readFile(params) {
    const relPath = normalizeRelPath(params.relPath);
    if (!relPath) {
      throw new Error("path required");
    }
    const classification = classifyIndexedPath(relPath, resolveManifest(this.workspaceDir));
    if (!classification.included) {
      throw new Error("path not allowed");
    }
    const absolutePath = path.join(this.workspaceDir, relPath);
    const content = await fsPromises.readFile(absolutePath, "utf8");
    if (!params.from && !params.lines) {
      return { path: relPath, text: content };
    }
    const lines = content.split(/\r?\n/);
    const from = Math.max(1, Number(params.from ?? 1));
    const count = Math.max(1, Number(params.lines ?? lines.length));
    return {
      path: relPath,
      text: lines.slice(from - 1, from - 1 + count).join("\n"),
    };
  }

  status() {
    const row = this.db.prepare("SELECT COUNT(*) AS docs FROM docs").get();
    const chunkRow = this.db.prepare("SELECT COUNT(*) AS chunks FROM chunks").get();
    return {
      backend: "memory-hub-v2",
      docs: row.docs,
      chunks: chunkRow.chunks,
      dbPath: this.dbPath,
      workspaceDir: this.workspaceDir,
    };
  }

  close() {
    this.db.close();
  }
}
