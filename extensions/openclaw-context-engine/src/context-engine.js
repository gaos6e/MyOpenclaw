import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function normalizeSessionKey(sessionKey) {
  return String(sessionKey ?? "").trim().toLowerCase();
}

function inferSessionScope(sessionKey) {
  const normalized = normalizeSessionKey(sessionKey);
  const isShared = [":group:", ":channel:", ":room:", ":space:", ":topic:"].some((segment) =>
    normalized.includes(segment),
  );
  return {
    isShared,
    isPrivate: !isShared,
    sessionKey: normalized,
  };
}

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function parseMarkdownSections(text) {
  const sections = new Map();
  let current = "";
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      current = match[1].trim();
      if (!sections.has(current)) {
        sections.set(current, []);
      }
      continue;
    }
    if (!current) {
      continue;
    }
    sections.get(current).push(line);
  }
  return sections;
}

function collectTopLevelBullets(lines) {
  return (lines ?? [])
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function collectNonEmptyIdentityBullets(lines) {
  return collectTopLevelBullets(lines).filter((line) => /[:：]\s+\S/.test(line));
}

function collectTodoItems(text, limit = 3) {
  const sections = parseMarkdownSections(text);
  return collectTopLevelBullets(sections.get("待做")).slice(0, limit);
}

function collectStatusItems(text, limit = 3) {
  const sections = parseMarkdownSections(text);
  return collectTopLevelBullets(sections.get("事项列表")).slice(0, limit);
}

function collectQualityItems(text, limit = 2) {
  const sections = parseMarkdownSections(text);
  const items = collectTopLevelBullets(sections.get("记录"));
  return items.slice(Math.max(0, items.length - limit));
}

function formatList(title, items) {
  if (!items || items.length === 0) {
    return [];
  }
  return [title, ...items.map((item) => `- ${item}`)];
}

function estimateTokensFromText(text) {
  return Math.ceil(String(text ?? "").length / 4);
}

function estimateTokensFromMessages(messages) {
  return (messages ?? []).reduce((sum, message) => {
    const content = message?.content;
    if (typeof content === "string") {
      return sum + estimateTokensFromText(content);
    }
    if (!Array.isArray(content)) {
      return sum;
    }
    const chars = content.reduce((inner, block) => inner + (typeof block?.text === "string" ? block.text.length : 0), 0);
    return sum + Math.ceil(chars / 4);
  }, 0);
}

function computeMaxChars(tokenBudget, configuredMaxChars) {
  if (Number.isFinite(configuredMaxChars) && configuredMaxChars > 0) {
    return Math.max(256, Math.floor(configuredMaxChars));
  }
  if (Number.isFinite(tokenBudget) && tokenBudget > 0) {
    return Math.max(512, Math.min(4000, Math.floor(tokenBudget * 3 * 0.18)));
  }
  return 2200;
}

function truncateSnapshot(text, maxChars) {
  const normalized = String(text ?? "").trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxChars - 16)).trimEnd()}\n[truncated]`;
}

function resolveWorkspaceGovernanceSnapshot(workspaceDir, scope) {
  const memoryPath = path.join(workspaceDir, "MEMORY.md");
  const todoPath = path.join(workspaceDir, "self_improve_todo.md");
  const statusPath = path.join(workspaceDir, "self_improve_status.md");
  const qualityPath = path.join(workspaceDir, "self_improve_quality.md");

  const memorySections = parseMarkdownSections(readIfExists(memoryPath));
  const lines = [
    "OpenClaw Context Snapshot",
    "- Canonical memory flow: memory_extract_candidates -> memory_list_candidates -> memory_promote_candidate",
    "- Ongoing context in MEMORY.md is human-readable only and should not be promoted directly.",
    "- Checkpoint discipline: persist durable learnings after extended exploration before continuing.",
  ];

  if (scope.isPrivate) {
    lines.push(
      ...formatList("About user", collectNonEmptyIdentityBullets(memorySections.get("About the user")).slice(0, 4)),
      ...formatList("Preferences & setup", collectTopLevelBullets(memorySections.get("Preferences & setup")).slice(0, 6)),
      ...formatList("Stable facts", collectTopLevelBullets(memorySections.get("Stable facts")).slice(0, 6)),
      ...formatList("Self-improve TODO", collectTodoItems(readIfExists(todoPath), 3)),
      ...formatList("Recent status", collectStatusItems(readIfExists(statusPath), 3)),
      ...formatList("Recent quality signals", collectQualityItems(readIfExists(qualityPath), 2)),
    );
  } else {
    lines.push("- Shared-session safety mode: omit private durable memory and local self-improvement state.");
  }

  return lines.join("\n");
}

function candidateOpenClawDistDirs() {
  const candidates = [];
  const pushCandidate = (value) => {
    if (!value) {
      return;
    }
    const normalized = path.resolve(value);
    if (!candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  if (process.argv[1]) {
    let current = path.resolve(process.argv[1]);
    for (let i = 0; i < 6; i += 1) {
      const parent = path.dirname(current);
      pushCandidate(path.join(parent, "dist"));
      current = parent;
    }
  }

  if (process.env.OPENCLAW_DIST_DIR) {
    pushCandidate(process.env.OPENCLAW_DIST_DIR);
  }
  if (process.env.APPDATA) {
    pushCandidate(path.join(process.env.APPDATA, "npm", "node_modules", "openclaw", "dist"));
  }
  if (process.env.USERPROFILE) {
    pushCandidate(path.join(process.env.USERPROFILE, "AppData", "Roaming", "npm", "node_modules", "openclaw", "dist"));
  }
  if (process.env.HOME) {
    pushCandidate(path.join(process.env.HOME, ".openclaw", "dist"));
  }
  return candidates;
}

async function createHostLegacyContextEngine() {
  for (const distDir of candidateOpenClawDistDirs()) {
    const modulePath = path.join(distDir, "plugin-sdk", "context-engine", "index.js");
    if (!fs.existsSync(modulePath)) {
      continue;
    }
    const module = await import(pathToFileURL(modulePath).href);
    if (typeof module.LegacyContextEngine === "function") {
      return new module.LegacyContextEngine();
    }
  }
  throw new Error("Unable to resolve OpenClaw LegacyContextEngine from host runtime");
}

export class OpenClawWorkspaceContextEngine {
  constructor(options = {}) {
    this.workspaceDir = path.resolve(options.workspaceDir ?? path.join(process.cwd(), "workspace"));
    this.maxChars = Number(options.maxChars ?? 0);
    this.createLegacyEngine = options.createLegacyEngine ?? createHostLegacyContextEngine;
    this.info = {
      id: "openclaw-context-engine",
      name: "OpenClaw Workspace Context Engine",
      version: "0.1.0",
    };
  }

  async bootstrap() {
    return {
      bootstrapped: false,
      reason: "stateless-engine",
    };
  }

  async ingest() {
    return {
      ingested: false,
    };
  }

  async assemble(params) {
    const scope = inferSessionScope(params.sessionKey);
    const snapshot = truncateSnapshot(
      resolveWorkspaceGovernanceSnapshot(this.workspaceDir, scope),
      computeMaxChars(params.tokenBudget, this.maxChars),
    );
    return {
      messages: params.messages,
      estimatedTokens: estimateTokensFromMessages(params.messages) + estimateTokensFromText(snapshot),
      systemPromptAddition: snapshot || undefined,
    };
  }

  async compact(params) {
    const legacyEngine = await this.createLegacyEngine();
    return legacyEngine.compact(params);
  }

  async afterTurn() {}
}
