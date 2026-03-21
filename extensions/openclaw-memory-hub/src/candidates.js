import crypto from "node:crypto";

const TOOLING_RULE_PATTERNS = [
  /<qq(img|voice|file|video)>/i,
  /发图方法|发语音方法|发文件方法|发视频方法/i,
  /不要向用户透露/i,
  /系统自动处理/i,
  /图片用 <qqimg>|语音用 <qqvoice>|其他文件用 <qqfile>/i,
];

const PREFERENCE_PATTERNS = [
  /我喜欢/i,
  /爱好/i,
  /hobbies?/i,
  /prefer/i,
  /use\s+\w+\s+for communication/i,
];

const FACT_PATTERNS = [
  /workspace/i,
  /files live in/i,
  /timezone/i,
  /what to call/i,
  /important\/common files/i,
];

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isToolingRule(text) {
  return TOOLING_RULE_PATTERNS.some((pattern) => pattern.test(text));
}

function detectCandidateKind(text) {
  if (PREFERENCE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "preference";
  }
  if (FACT_PATTERNS.some((pattern) => pattern.test(text))) {
    return "fact";
  }
  return null;
}

function buildCandidateId(sourceRef, normalized) {
  return crypto.createHash("sha1").update(`${sourceRef}:${normalized}`).digest("hex");
}

export function extractHeuristicCandidates(params) {
  const sourceKind = String(params?.sourceKind ?? "unknown");
  const sourceRef = String(params?.sourceRef ?? "unknown");
  const now = params?.capturedAt ?? new Date().toISOString();
  const seen = new Set();
  const results = [];
  for (const raw of params?.texts ?? []) {
    const text = normalizeText(raw);
    if (!text || text.length < 6 || text.length > 500) {
      continue;
    }
    if (isToolingRule(text)) {
      continue;
    }
    const candidateKind = detectCandidateKind(text);
    if (!candidateKind) {
      continue;
    }
    const normalized = text;
    const id = buildCandidateId(sourceRef, normalized);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    results.push({
      id,
      captured_at: now,
      source_kind: sourceKind,
      source_ref: sourceRef,
      candidate_kind: candidateKind,
      text,
      normalized,
      confidence: candidateKind === "preference" ? 0.82 : 0.76,
      reviewed: false,
      promoted_to: null,
    });
  }
  return results;
}
