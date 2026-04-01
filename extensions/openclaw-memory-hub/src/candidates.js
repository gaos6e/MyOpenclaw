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
  /timezone/i,
  /what to call/i,
  /lives?\s+in/i,
  /住在/i,
  /常住/i,
  /name[:：]/i,
  /pronouns?/i,
];

const SCHEMA_EXTRACTORS = [
  {
    key: "notify_before_self_improve",
    candidateKind: "preference",
    confidence: 0.95,
    match(text) {
      return /(?:开始|进行)?自我提升前(?:先)?(?:告知|通知)(?:我|用户)/i.test(text)
        ? { normalized: "进行自我提升前先告知用户" }
        : null;
    },
  },
  {
    key: "preferred_address",
    candidateKind: "preference",
    confidence: 0.94,
    match(text) {
      const match = text.match(
        /(?:以后)?(?:请)?(?:称呼|叫)(?:我|用户)(?:为|做)?[“"'「『]?([^”"'」』，。！？；;\s]+(?:～)?)[”"'」』]?/i,
      );
      if (!match?.[1]) {
        return null;
      }
      return { normalized: `希望以后称呼他为“${match[1].trim()}”` };
    },
  },
  {
    key: "communication_channel",
    candidateKind: "preference",
    confidence: 0.9,
    match(text) {
      const english = text.match(/use\s+([a-z0-9_-]+)\s+for communication/i);
      if (english?.[1]) {
        return { normalized: `Use ${english[1]} for communication` };
      }
      const chinese =
        text.match(/(?:我|用户).{0,6}(?:用|使用)(QQ|微信|WeChat|Telegram|Slack).{0,8}(?:联系|沟通)/i) ??
        text.match(/(?:以后|之后)?(?:直接)?(?:用|使用)(QQ|微信|WeChat|Telegram|Slack).{0,8}(?:联系|沟通)(?:我|用户)?/i);
      if (!chinese?.[1]) {
        return null;
      }
      return { normalized: `Use ${chinese[1]} for communication` };
    },
  },
  {
    key: "call_and_response_codeword",
    candidateKind: "fact",
    confidence: 0.93,
    match(text) {
      const match = text.match(/(?:暗号|约定).{0,12}(?:我|用户)说[“"'「『]([^”"'」』]+)[”"'」』].{0,8}(?:你|助手)就?回[“"'「『]([^”"'」』]+)[”"'」』]/i);
      if (!match?.[1] || !match?.[2]) {
        return null;
      }
      return { normalized: `暗号约定：用户说“${match[1].trim()}”，助手回“${match[2].trim()}”。` };
    },
  },
];

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function splitIntoSegments(value) {
  return String(value ?? "")
    .split(/[\r\n]+|(?<=[。；;])/u)
    .map((item) => normalizeText(item.replace(/[。；;]+$/u, "")))
    .filter(Boolean);
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

function classifyMissBucket(text) {
  if (/(?:思考模式|thinking|模型).*medium|medium.*(?:思考模式|thinking)/i.test(text)) {
    return "model_setting";
  }
  if (/报告|摘要|压缩|完整|verbatim|script report/i.test(text)) {
    return "reporting_rule";
  }
  if (/workspace|skills|路径|目录|文件|临时文件|backup|logs|[A-Za-z]:\\/i.test(text)) {
    return "path_rule";
  }
  if (/cron|job-id|限流|超时|timeout|rate limit|重试|日志/i.test(text)) {
    return "automation_rule";
  }
  if (/喜欢|偏好|称呼|告知|通知|沟通|使用/i.test(text)) {
    return "preference_rule";
  }
  return "generic";
}

function buildCandidateRecord({ sourceKind, sourceRef, now, text, normalized, candidateKind, confidence, schemaKey }) {
  return {
    id: buildCandidateId(sourceRef, normalized),
    captured_at: now,
    source_kind: sourceKind,
    source_ref: sourceRef,
    candidate_kind: candidateKind,
    text,
    normalized,
    confidence,
    schema_key: schemaKey ?? null,
    extraction_strategy: schemaKey ? "schema" : "heuristic",
    reviewed: false,
    promoted_to: null,
  };
}

function extractStructuredCandidate(text) {
  for (const extractor of SCHEMA_EXTRACTORS) {
    const match = extractor.match(text);
    if (!match?.normalized) {
      continue;
    }
    return {
      candidateKind: extractor.candidateKind,
      confidence: extractor.confidence,
      normalized: match.normalized,
      schemaKey: extractor.key,
    };
  }
  return null;
}

export function extractCandidateBatch(params) {
  const sourceKind = String(params?.sourceKind ?? "unknown");
  const sourceRef = String(params?.sourceRef ?? "unknown");
  const now = params?.capturedAt ?? new Date().toISOString();
  const seen = new Set();
  const results = [];
  const stats = {
    textsTotal: Array.isArray(params?.texts) ? params.texts.length : 0,
    segmentsTotal: 0,
    candidatesTotal: 0,
    droppedTooShort: 0,
    droppedTooLong: 0,
    droppedTooling: 0,
    droppedUnmatched: 0,
    droppedDuplicate: 0,
    schemaHits: 0,
    heuristicHits: 0,
    matchedBySchema: {},
    missBuckets: {},
  };

  for (const raw of params?.texts ?? []) {
    for (const segment of splitIntoSegments(raw)) {
      stats.segmentsTotal += 1;
      const text = normalizeText(segment);
      if (!text || text.length < 6) {
        stats.droppedTooShort += 1;
        continue;
      }
      if (text.length > 500) {
        stats.droppedTooLong += 1;
        continue;
      }
      if (isToolingRule(text)) {
        stats.droppedTooling += 1;
        continue;
      }
      const structured = extractStructuredCandidate(text);
      if (structured) {
        const candidate = buildCandidateRecord({
          sourceKind,
          sourceRef,
          now,
          text,
          normalized: structured.normalized,
          candidateKind: structured.candidateKind,
          confidence: structured.confidence,
          schemaKey: structured.schemaKey,
        });
        if (seen.has(candidate.id)) {
          stats.droppedDuplicate += 1;
          continue;
        }
        seen.add(candidate.id);
        stats.schemaHits += 1;
        stats.matchedBySchema[structured.schemaKey] = (stats.matchedBySchema[structured.schemaKey] ?? 0) + 1;
        results.push(candidate);
        continue;
      }
      const candidateKind = detectCandidateKind(text);
      if (!candidateKind) {
        stats.droppedUnmatched += 1;
        const missType = classifyMissBucket(text);
        stats.missBuckets[missType] = (stats.missBuckets[missType] ?? 0) + 1;
        continue;
      }
      const candidate = buildCandidateRecord({
        sourceKind,
        sourceRef,
        now,
        text,
        normalized: text,
        candidateKind,
        confidence: candidateKind === "preference" ? 0.82 : 0.76,
        schemaKey: null,
      });
      if (seen.has(candidate.id)) {
        stats.droppedDuplicate += 1;
        continue;
      }
      seen.add(candidate.id);
      stats.heuristicHits += 1;
      results.push(candidate);
    }
  }
  stats.candidatesTotal = results.length;
  return { candidates: results, stats };
}

export function extractHeuristicCandidates(params) {
  return extractCandidateBatch(params).candidates;
}
