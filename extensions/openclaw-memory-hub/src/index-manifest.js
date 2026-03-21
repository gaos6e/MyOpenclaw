import path from "node:path";

const DEFAULT_MANIFEST = {
  include: ["MEMORY.md", "memory/YYYY-MM-DD.md", "memory/ontology/graph.jsonl"],
  exclude: ["memory/README.md", "memory/TEMPLATE.md", "memory/**/*plan*.md", "memory/inbox/**"],
};

function normalizeSlashes(value) {
  return String(value ?? "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function compilePattern(pattern) {
  const normalized = normalizeSlashes(pattern);
  const withTokens = normalized
    .replaceAll("**", "__DOUBLE_STAR__")
    .replaceAll("*", "__SINGLE_STAR__")
    .replaceAll("YYYY-MM-DD", "__DATE_TOKEN__");
  const escaped = escapeRegex(withTokens)
    .replaceAll("__DOUBLE_STAR__", ".*")
    .replaceAll("__SINGLE_STAR__", "[^/]*")
    .replaceAll("__DATE_TOKEN__", "\\d{4}-\\d{2}-\\d{2}");
  return new RegExp(`^${escaped}$`, "i");
}

function matchAny(patterns, relPath) {
  return patterns.some((pattern) => compilePattern(pattern).test(relPath));
}

function inferNamespace(relPath) {
  if (relPath === "MEMORY.md") {
    return "durable";
  }
  if (/^memory\/\d{4}-\d{2}-\d{2}\.md$/i.test(relPath)) {
    return "daily";
  }
  if (relPath === "memory/ontology/graph.jsonl") {
    return "ontology";
  }
  if (/^memory\/inbox\/.+\.jsonl$/i.test(relPath)) {
    return "candidate";
  }
  if (/readme\.md$/i.test(relPath) || /template\.md$/i.test(relPath)) {
    return "governance";
  }
  if (/plan/i.test(path.basename(relPath))) {
    return "archive";
  }
  return "other";
}

export function defaultIndexManifest() {
  return structuredClone(DEFAULT_MANIFEST);
}

export function classifyIndexedPath(relPath, manifest = DEFAULT_MANIFEST) {
  const normalized = normalizeSlashes(relPath);
  const namespace = inferNamespace(normalized);
  if (!normalized) {
    return { included: false, namespace: "other", reason: "empty" };
  }
  if (matchAny(manifest.exclude ?? [], normalized)) {
    return { included: false, namespace, reason: "excluded" };
  }
  if (matchAny(manifest.include ?? [], normalized)) {
    return { included: true, namespace, reason: "included" };
  }
  return { included: false, namespace, reason: "not-included" };
}

export function isIndexableMemoryPath(relPath, manifest = DEFAULT_MANIFEST) {
  return classifyIndexedPath(relPath, manifest).included;
}
