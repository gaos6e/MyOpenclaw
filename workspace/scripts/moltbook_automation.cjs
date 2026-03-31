#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const TIMEZONE = "Asia/Shanghai";
const DEFAULT_SITE_ID = "moltbook";
const SLOT_LABELS = {
  morning: "早巡检",
  afternoon: "午后巡检",
  evening: "晚巡检",
};
const SLOT_SCHEDULES = [
  { slot: "morning", hour: 9 },
  { slot: "afternoon", hour: 14 },
  { slot: "evening", hour: 21 },
];

const MOLTBOOK_SUBMOLT_BUCKETS = {
  openclaw: new Set(["openclaw-explorers", "openclaw"]),
  technical: new Set(["agentops", "agent-ops", "debugging", "memory", "tooling", "agentskills"]),
  general: new Set(["buildlogs", "todayilearned", "general", "meta"]),
};
const MOLTBOOK_SEARCH_QUERY_POOL = [
  "openclaw",
  "agentops",
  "debugging",
  "memory",
  "skills",
  "workflow",
  "automation",
  "ai agents",
  "tooling",
  "productivity",
  "engineering",
];
const MOLTBOOK_ALLOWED_SUBMOLTS = [
  "openclaw-explorers",
  "openclaw",
  "agentops",
  "debugging",
  "agentskills",
  "tooling",
  "memory",
  "buildlogs",
  "todayilearned",
  "general",
];

const MOLTCN_SUBMOLT_BUCKETS = {
  openclaw: new Set(["moltdev", "agent-patterns"]),
  technical: new Set(["tech", "prompt-craft", "projects", "agent-challenges"]),
  general: new Set(["intro", "general"]),
};
const MOLTCN_SEARCH_QUERY_POOL = ["自动化", "OpenClaw", "Agent", "工作流", "提示词", "记忆", "技术教程", "AI应用", "效率工具", "项目复盘", "工程实践"];
const MOLTCN_ALLOWED_SUBMOLTS = ["intro", "general", "tech", "agent-patterns", "moltdev", "prompt-craft", "projects"];

const SITE_PROFILES = Object.freeze({
  moltbook: {
    id: "moltbook",
    summaryName: "Moltbook",
    apiBaseUrl: "https://www.moltbook.com/api/v1",
    runtimeDirName: "moltbook",
    postFieldName: "submolt_name",
    searchQueryPool: MOLTBOOK_SEARCH_QUERY_POOL,
    allowedSubmolts: MOLTBOOK_ALLOWED_SUBMOLTS,
    submoltBuckets: MOLTBOOK_SUBMOLT_BUCKETS,
    enabledFeatures: {
      dmRequests: true,
      dmConversations: true,
      followingFeed: true,
      readNotifications: true,
      followAction: true,
    },
    dynamicFeatures: {},
    postingPolicy: {
      allowedSlots: ["morning", "afternoon", "evening"],
      maxPostsPerDay: 3,
      maxPostsPerSlot: 1,
      scoreThresholds: {
        relevance: 7,
        novelty: 6,
        specificity: 6,
      },
      fallbackScoreThresholds: {
        relevance: 6,
        novelty: 5,
        specificity: 5,
      },
    },
    engagementPolicy: {
      maxRepliesPerRun: 2,
      maxCommentsPerRun: 2,
      maxUpvotesPerRun: 6,
      maxUpvotesPerDay: 18,
      maxFollowsPerRun: 1,
      maxFollowsPerDay: 3,
      followMinPosts: 3,
      followMinComments: 10,
    },
    scheduleOffsetMinutes: 30,
  },
  moltcn: {
    id: "moltcn",
    summaryName: "Moltcn",
    apiBaseUrl: "https://www.moltbook.cn/api/v1",
    runtimeDirName: "moltcn",
    postFieldName: "submolt",
    searchQueryPool: MOLTCN_SEARCH_QUERY_POOL,
    allowedSubmolts: MOLTCN_ALLOWED_SUBMOLTS,
    submoltBuckets: MOLTCN_SUBMOLT_BUCKETS,
    enabledFeatures: {
      dmRequests: false,
      dmConversations: false,
      followingFeed: false,
      readNotifications: true,
      followAction: true,
    },
    dynamicFeatures: {
      dmRequests: {
        endpoint: "/agents/dm/requests",
        validator: "dmRequests",
      },
      dmConversations: {
        endpoint: "/agents/dm/conversations",
        validator: "dmConversations",
      },
      followingFeed: {
        endpoint: "/feed?filter=following&sort=new&limit=5",
        validator: "followingFeed",
      },
    },
    postingPolicy: {
      allowedSlots: ["morning", "afternoon", "evening"],
      maxPostsPerDay: 3,
      maxPostsPerSlot: 1,
      scoreThresholds: {
        relevance: 7,
        novelty: 6,
        specificity: 6,
      },
      fallbackScoreThresholds: {
        relevance: 6,
        novelty: 5,
        specificity: 5,
      },
    },
    engagementPolicy: {
      maxRepliesPerRun: 2,
      maxCommentsPerRun: 1,
      maxUpvotesPerRun: 6,
      maxUpvotesPerDay: 18,
      maxFollowsPerRun: 1,
      maxFollowsPerDay: 3,
      followMinPosts: 3,
      followMinComments: 10,
    },
    scheduleOffsetMinutes: 40,
  },
});
const API_BASE_URL = SITE_PROFILES[DEFAULT_SITE_ID].apiBaseUrl;
const DM_SUSPICIOUS_PATTERNS = [
  /seed phrase/i,
  /connect wallet/i,
  /guaranteed profit/i,
  /http[s]?:\/\/\S+/i,
  /airdrop/i,
  /private key/i,
  /click (this )?link/i,
];
const MAX_FETCH_ATTEMPTS = 2;
const POST_STATUS_CHECK_ATTEMPTS = 4;
const POST_STATUS_CHECK_DELAY_MS = 500;
const FEATURE_SUPPORT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MOLTBOOK_API_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";
const NUMBER_WORDS = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
};

function hasProxyEnv(env = process.env) {
  return Boolean(env.HTTPS_PROXY || env.HTTP_PROXY || env.ALL_PROXY);
}

function summarizeProxyEnv(env = process.env) {
  const summarize = (value) => {
    if (!value) return null;
    try {
      const parsed = new URL(String(value));
      return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
    } catch {
      return String(value).slice(0, 80);
    }
  };
  return {
    hasProxy: hasProxyEnv(env),
    httpsProxy: summarize(env.HTTPS_PROXY),
    httpProxy: summarize(env.HTTP_PROXY),
    allProxy: summarize(env.ALL_PROXY),
    noProxy: env.NO_PROXY || null,
  };
}

function resolveSiteProfile(site = DEFAULT_SITE_ID) {
  const profile = SITE_PROFILES[site || DEFAULT_SITE_ID];
  if (!profile) {
    throw new Error(`Unsupported Moltbook site "${site}"`);
  }
  return profile;
}

function supportsFeature(siteProfile, featureName, state) {
  const dynamicFeature = siteProfile?.dynamicFeatures?.[featureName];
  if (dynamicFeature) {
    return state?.feature_support_cache?.[featureName]?.supported === true;
  }
  return Boolean(siteProfile?.enabledFeatures?.[featureName]);
}

function getEngagementPolicy(siteProfile = resolveSiteProfile()) {
  return siteProfile?.engagementPolicy || {
    maxRepliesPerRun: 2,
    maxCommentsPerRun: 2,
    maxUpvotesPerRun: 6,
    maxUpvotesPerDay: 18,
    maxFollowsPerRun: 1,
    maxFollowsPerDay: 3,
    followMinPosts: 3,
    followMinComments: 10,
  };
}

function parseTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isFeatureCacheFresh(entry, now = Date.now()) {
  if (!entry?.checked_at) {
    return false;
  }
  return now - parseTimestamp(entry.checked_at) < FEATURE_SUPPORT_CACHE_TTL_MS;
}

function validateFeaturePayload(featureName, payload) {
  if (featureName === "dmRequests") {
    return Array.isArray(payload?.incoming?.requests) || Array.isArray(payload?.requests) || Array.isArray(payload?.requests?.items);
  }
  if (featureName === "dmConversations") {
    return Array.isArray(payload?.conversations?.items) || Array.isArray(payload?.conversations);
  }
  if (featureName === "followingFeed") {
    return Array.isArray(payload?.posts);
  }
  return false;
}

function unwrapApiEnvelope(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return payload.data;
  }
  return payload;
}

function extractAgentIdentity(payload, fallbackName) {
  const root = unwrapApiEnvelope(payload);
  const agent = root?.agent && typeof root.agent === "object" ? root.agent : root;
  if (agent && typeof agent === "object" && (agent.id || agent.name)) {
    return agent;
  }
  return { id: null, name: fallbackName };
}

function extractAgentStatus(payload) {
  const root = unwrapApiEnvelope(payload);
  return root?.status || payload?.status || null;
}

function extractHomeState(payload) {
  const root = unwrapApiEnvelope(payload);
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root;
  }
  return {};
}

function extractSubmissionPayload(submissionResult, contentType) {
  return (
    submissionResult?.[contentType] ||
    submissionResult?.data?.[contentType] ||
    submissionResult?.payload?.[contentType] ||
    unwrapApiEnvelope(submissionResult?.payload) ||
    unwrapApiEnvelope(submissionResult)
  );
}

function extractPostEntity(payload) {
  const root = unwrapApiEnvelope(payload);
  if (root?.post && typeof root.post === "object") {
    return root.post;
  }
  if (root && typeof root === "object") {
    return root;
  }
  return {};
}

function extractCreatedPostId(payload) {
  const entity = extractPostEntity(payload);
  return entity.id || entity.post_id || payload?.post_id || payload?.data?.post_id || payload?.post?.id || payload?.data?.id || null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createDefaultState(localDate) {
  return {
    local_date: localDate,
    daily_counts: {
      posts: 0,
      comments: 0,
      upvotes: 0,
      follows: 0,
    },
    posts_by_slot: {
      morning: 0,
      afternoon: 0,
      evening: 0,
    },
    last_post_at: null,
    processed_notification_post_ids: [],
    processed_notification_ids_today: [],
    processed_dm_request_ids: [],
    interacted_submolts: [],
    recent_post_ids: [],
    engaged_post_ids_today: [],
    followed_agent_ids_today: [],
    upvoted_comment_ids_today: [],
    visited_modules_today: [],
    feature_support_cache: {},
    suspicious_agents: {},
  };
}

function normalizeStateForDate(state, localDate) {
  const base = state && typeof state === "object" ? state : {};
  const current = {
    ...createDefaultState(localDate),
    ...base,
    daily_counts: {
      ...createDefaultState(localDate).daily_counts,
      ...(base.daily_counts || {}),
    },
    posts_by_slot: {
      ...createDefaultState(localDate).posts_by_slot,
      ...(base.posts_by_slot || {}),
    },
    processed_notification_post_ids: Array.isArray(base.processed_notification_post_ids)
      ? [...base.processed_notification_post_ids]
      : [],
    processed_notification_ids_today: Array.isArray(base.processed_notification_ids_today)
      ? [...base.processed_notification_ids_today]
      : [],
    processed_dm_request_ids: Array.isArray(base.processed_dm_request_ids)
      ? [...base.processed_dm_request_ids]
      : [],
    interacted_submolts: Array.isArray(base.interacted_submolts) ? [...base.interacted_submolts] : [],
    recent_post_ids: Array.isArray(base.recent_post_ids) ? [...base.recent_post_ids] : [],
    engaged_post_ids_today: Array.isArray(base.engaged_post_ids_today) ? [...base.engaged_post_ids_today] : [],
    followed_agent_ids_today: Array.isArray(base.followed_agent_ids_today) ? [...base.followed_agent_ids_today] : [],
    upvoted_comment_ids_today: Array.isArray(base.upvoted_comment_ids_today) ? [...base.upvoted_comment_ids_today] : [],
    visited_modules_today: Array.isArray(base.visited_modules_today) ? [...base.visited_modules_today] : [],
    feature_support_cache:
      base.feature_support_cache && typeof base.feature_support_cache === "object" ? { ...base.feature_support_cache } : {},
    suspicious_agents:
      base.suspicious_agents && typeof base.suspicious_agents === "object" ? { ...base.suspicious_agents } : {},
  };

  if (current.local_date === localDate) {
    return current;
  }

  const next = createDefaultState(localDate);
  next.last_post_at = null;
  next.suspicious_agents = current.suspicious_agents;
  next.feature_support_cache = current.feature_support_cache;
  return next;
}

function canPostInSlot(state, slot, siteProfile = resolveSiteProfile()) {
  const allowedSlots = new Set(siteProfile?.postingPolicy?.allowedSlots || Object.keys(SLOT_LABELS));
  if (!allowedSlots.has(slot)) {
    return { allowed: false, reason: "slot_not_allowed" };
  }

  const maxPostsPerDay = Number(siteProfile?.postingPolicy?.maxPostsPerDay || 2);
  const postsToday = Number(state?.daily_counts?.posts || 0);
  if (postsToday >= maxPostsPerDay) {
    return { allowed: false, reason: "daily_limit_reached" };
  }

  const maxPostsPerSlot = Number(siteProfile?.postingPolicy?.maxPostsPerSlot || 1);
  const slotPosts = Number(state?.posts_by_slot?.[slot] || 0);
  if (slotPosts >= maxPostsPerSlot) {
    return { allowed: false, reason: "slot_limit_reached" };
  }

  return { allowed: true, reason: "ok" };
}

function classifySubmolt(submoltName, submoltBuckets = resolveSiteProfile().submoltBuckets) {
  const normalized = String(submoltName || "").trim().toLowerCase();
  for (const [bucket, names] of Object.entries(submoltBuckets || {})) {
    if (names.has(normalized)) {
      return bucket;
    }
  }
  return "other";
}

function formatRunSummary(report) {
  const counts = report.counts || {};
  const details = report.details || {};
  const notes = Array.isArray(report.notes) ? report.notes : [];
  const errors = Array.isArray(report.errors) ? report.errors : [];
  const slotLabel = SLOT_LABELS[report.slot] || "巡检";
  const siteLabel = report.siteLabel || resolveSiteProfile().summaryName;
  const prefix = report.dryRun ? "[dry-run] " : "";
  const postCount = report.post?.created ? 1 : 0;

  const lines = [
    `${prefix}${siteLabel} ${slotLabel}`,
    `统计：回复 ${Number(counts.replies || 0)}，私信 ${Number(counts.dms || 0)}，点赞 ${Number(counts.upvotes || 0)}，评论 ${Number(counts.comments || 0)}，关注 ${Number(counts.follows || 0)}，发帖 ${postCount}`,
  ];

  if (report.post?.created) {
    lines.push(`发帖详情：${report.post.submolt}${report.post.postId ? ` / ${report.post.postId}` : ""}`);
  }

  const sections = [
    ["回复内容", details.replies],
    ["私信内容", details.dms],
    ["点赞内容", details.upvotes],
    ["评论内容", details.comments],
    ["关注内容", details.follows],
    ["发帖内容", details.posts],
  ];

  for (const [label, items] of sections) {
    lines.push(`${label}：`);
    if (!Array.isArray(items) || items.length === 0) {
      lines.push("- 无");
      continue;
    }
    for (const item of items) {
      lines.push(`- ${item}`);
    }
  }

  if (notes.length > 0) {
    lines.push(`备注：${notes.join("；")}`);
  }
  if (errors.length > 0) {
    lines.push(`异常：${errors.join("；")}`);
  }

  return lines.join("\n");
}

function chooseSearchQueries({ daySeed = 0, slot = "morning", searchQueryPool = resolveSiteProfile().searchQueryPool } = {}) {
  if (!Array.isArray(searchQueryPool) || searchQueryPool.length === 0) {
    return [];
  }
  const slotOffsets = { morning: 0, afternoon: 2, evening: 4 };
  const offset = (Number(daySeed) + (slotOffsets[slot] || 0)) % searchQueryPool.length;
  const size = slot === "evening" ? 4 : 3;
  const queries = [];
  for (let index = 0; index < size; index += 1) {
    queries.push(searchQueryPool[(offset + index) % searchQueryPool.length]);
  }
  return queries;
}

async function probeDynamicFeatures({ client, siteProfile, state, now = new Date() }) {
  const cache = state.feature_support_cache || {};
  const probeResults = {};
  const timestamp = now.toISOString();
  const dynamicFeatures = siteProfile?.dynamicFeatures || {};

  for (const [featureName, config] of Object.entries(dynamicFeatures)) {
    const cached = cache[featureName];
    if (cached && isFeatureCacheFresh(cached, now.getTime())) {
      continue;
    }

    try {
      const payload = await client.getJson(config.endpoint);
      const supported = validateFeaturePayload(config.validator || featureName, payload);
      cache[featureName] = { supported, checked_at: timestamp };
      if (supported) {
        probeResults[featureName] = payload;
      }
    } catch (error) {
      cache[featureName] = {
        supported: false,
        checked_at: timestamp,
        reason: String(error?.message || error || "unknown error"),
      };
    }
  }

  state.feature_support_cache = cache;
  return probeResults;
}

function isSuspiciousDm(text) {
  const content = String(text || "").trim();
  if (!content) {
    return true;
  }
  return DM_SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(content));
}

async function completeVerification({ client, generator, submissionResult, contentType }) {
  const payload = extractSubmissionPayload(submissionResult, contentType);
  const verification = payload?.verification || submissionResult?.verification;
  if (!verification?.verification_code) {
    return { verified: false, skipped: true };
  }

  const challengeText = verification.challenge_text || "";
  const instructions = verification.instructions || "";
  const attemptedAnswers = [];
  const candidateAnswers = [];

  try {
    candidateAnswers.push(normalizeVerificationAnswer(solveObfuscatedMathChallenge(challengeText)));
  } catch {}

  if (generator && typeof generator.solveVerification === "function") {
    try {
      const generatedAnswer = await generator.solveVerification({
        challengeText,
        instructions,
      });
      candidateAnswers.push(normalizeVerificationAnswer(generatedAnswer));
    } catch {}
  }

  const uniqueAnswers = [...new Set(candidateAnswers.filter(Boolean))];
  if (uniqueAnswers.length === 0) {
    throw new Error("Verification required but no solver produced a usable numeric answer");
  }

  let response = null;
  let lastError = null;
  for (const answer of uniqueAnswers) {
    attemptedAnswers.push(answer);
    try {
      response = await client.postJson("/verify", {
        verification_code: verification.verification_code,
        answer,
      });
      return {
        verified: Boolean(response?.success),
        answer,
        attemptedAnswers,
        response,
      };
    } catch (error) {
      lastError = error;
      if (!/incorrect answer/i.test(String(error?.message || error))) {
        throw error;
      }
    }
  }

  const challengePreview = String(challengeText).replace(/\s+/g, " ").trim().slice(0, 120);
  throw new Error(
    `POST /verify failed after ${attemptedAnswers.length} answer attempt(s): ${attemptedAnswers.join(", ")} | challenge: ${challengePreview}${
      lastError ? ` | last error: ${String(lastError.message || lastError)}` : ""
    }`,
  );

  return {
    verified: Boolean(response?.success),
    answer: null,
    attemptedAnswers,
    response,
  };
}

function buildCronJobs({ agentId = "main", delivery, rootDir, site = DEFAULT_SITE_ID, profile, scheduleOffsetMinutes } = {}) {
  const siteProfile = profile || resolveSiteProfile(site);
  const scriptPath = path.join(rootDir, "workspace", "scripts", "moltbook_automation.cjs");
  const minute = Number.isInteger(scheduleOffsetMinutes)
    ? scheduleOffsetMinutes
    : Number(siteProfile.scheduleOffsetMinutes || 30);
  const slots = SLOT_SCHEDULES.map(({ slot, hour }) => ({
    id: `${siteProfile.id}-${slot}`,
    name: `${siteProfile.summaryName}-${SLOT_LABELS[slot]}`,
    slot,
    expr: `${minute} ${hour} * * *`,
  }));

  return slots.map((item) => ({
    id: item.id,
    agentId,
    name: item.name,
    enabled: true,
    schedule: {
      kind: "cron",
      expr: item.expr,
      tz: TIMEZONE,
    },
    sessionTarget: "isolated",
    wakeMode: "now",
    payload: {
      kind: "agentTurn",
      message:
        siteProfile.id === DEFAULT_SITE_ID
          ? `Use the exec tool to run: node ${scriptPath} run --slot ${item.slot}. If the script succeeds, your final reply must be the exact stdout text verbatim. Do not summarize, compress, rewrite, convert to bullets, or add commentary. If the script fails, reply only with the failure reason.`
          : `Use the exec tool to run: node ${scriptPath} run --site ${siteProfile.id} --slot ${item.slot}. If the script succeeds, your final reply must be the exact stdout text verbatim. Do not summarize, compress, rewrite, convert to bullets, or add commentary. If the script fails, reply only with the failure reason.`,
    },
    delivery: {
      mode: "announce",
      ...Object.fromEntries(Object.entries(delivery || {}).filter(([, value]) => value !== undefined)),
    },
  }));
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const slotIndex = args.indexOf("--slot");
  const siteIndex = args.indexOf("--site");
  const rootIndex = args.indexOf("--root");
  return {
    command: args[0] || "run",
    site: siteIndex >= 0 ? args[siteIndex + 1] : DEFAULT_SITE_ID,
    slot: slotIndex >= 0 ? args[slotIndex + 1] : undefined,
    dryRun,
    root:
      rootIndex >= 0 && args[rootIndex + 1]
        ? path.resolve(args[rootIndex + 1])
        : path.resolve(__dirname, "..", ".."),
  };
}

function normalizeVerificationAnswer(answer) {
  const matches = String(answer || "").match(/-?\d+(?:\.\d+)?/g) || [];
  if (matches.length === 0) {
    throw new Error(`Verification solver returned no numeric answer: ${String(answer || "").trim()}`);
  }
  const numeric = Number.parseFloat(matches[matches.length - 1]);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Verification solver returned invalid number: ${String(answer || "").trim()}`);
  }
  return numeric.toFixed(2);
}

function makeLooseWordPattern(word) {
  return new RegExp(`^${word.split("").map((char) => `${char}+`).join("")}$`);
}

function fuzzyWordToNumber(candidate) {
  if (!candidate) {
    return null;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(candidate)) {
    return Number.parseFloat(candidate);
  }
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (makeLooseWordPattern(word).test(candidate)) {
      return value;
    }
  }
  return null;
}

function parseObfuscatedNumberTokens(challengeText) {
  const tokens = String(challengeText || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const parsed = [];
  for (let index = 0; index < tokens.length; index += 1) {
    let matched = null;
    let consumed = 0;
    for (let width = 3; width >= 1; width -= 1) {
      const slice = tokens.slice(index, index + width);
      if (slice.length !== width) continue;
      const candidate = slice.join("");
      const value = fuzzyWordToNumber(candidate);
      if (value !== null) {
        matched = value;
        consumed = width;
        break;
      }
    }
    if (matched === null) continue;
    parsed.push({ value: matched, start: index, end: index + consumed - 1 });
    index += consumed - 1;
  }

  const combined = [];
  for (let index = 0; index < parsed.length; index += 1) {
    const current = parsed[index];
    const next = parsed[index + 1];
    if (
      current.value >= 20 &&
      current.value < 100 &&
      current.value % 10 === 0 &&
      next &&
      Number.isInteger(next.value) &&
      next.value >= 0 &&
      next.value < 10 &&
      current.end + 1 === next.start
    ) {
      combined.push(current.value + next.value);
      index += 1;
      continue;
    }
    combined.push(current.value);
  }
  return combined;
}

function detectMathOperation(challengeText) {
  const compact = String(challengeText || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const hasWord = (word) => new RegExp(word.split("").map((char) => `${char}+`).join("")).test(compact);

  if (["gain", "gains", "plus", "total", "together", "combined", "sum", "more", "increase", "add", "added"].some(hasWord)) {
    return "+";
  }
  if (["slow", "slows", "lose", "loses", "lost", "minus", "subtract", "difference", "left", "remaining", "decrease", "drops", "drop", "reduce", "reduced"].some(hasWord)) {
    return "-";
  }
  if (["times", "multiply", "multiplied", "product", "double", "triple"].some(hasWord)) {
    return "*";
  }
  if (["divide", "divided", "split", "shared", "ratio"].some(hasWord)) {
    return "/";
  }
  return null;
}

function solveObfuscatedMathChallenge(challengeText) {
  const values = parseObfuscatedNumberTokens(challengeText);
  const operation = detectMathOperation(challengeText);
  if (values.length < 2 || !operation) {
    throw new Error("Unable to deterministically parse Moltbook verification challenge");
  }
  const left = Number(values[0]);
  const right = Number(values[1]);
  let result;
  if (operation === "+") result = left + right;
  if (operation === "-") result = left - right;
  if (operation === "*") result = left * right;
  if (operation === "/") result = left / right;
  if (!Number.isFinite(result)) {
    throw new Error("Deterministic verification solver produced non-finite result");
  }
  return result.toFixed(2);
}

function resolvePaths(rootDir, siteProfile = resolveSiteProfile()) {
  const runtimeDir = path.join(rootDir, siteProfile.runtimeDirName);
  return {
    rootDir,
    envPath: path.join(rootDir, ".env"),
    workspaceDir: path.join(rootDir, "workspace"),
    openclawConfigPath: path.join(rootDir, "openclaw.json"),
    runtimeDir,
    credentialsPath: path.join(runtimeDir, "credentials.json"),
    statePath: path.join(runtimeDir, "state.json"),
    activityPath: path.join(runtimeDir, "activity.jsonl"),
  };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonIfExists(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) {
    return fallbackValue;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function appendJsonLine(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`);
}

function parseDotEnv(envText) {
  const parsed = {};
  for (const rawLine of String(envText || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }
    const [, key, rawValue] = match;
    let value = rawValue;
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function loadScriptEnv(envPath, env = process.env) {
  const fileEnv = fs.existsSync(envPath) ? parseDotEnv(fs.readFileSync(envPath, "utf8")) : {};
  return {
    ...fileEnv,
    ...env,
  };
}

function resolveSiteCredentials({ rootDir, siteProfile = resolveSiteProfile(), env = process.env }) {
  const paths = resolvePaths(rootDir, siteProfile);
  const mergedEnv = loadScriptEnv(paths.envPath, env);
  const envPrefix = siteProfile.id.toUpperCase();
  const fileCredentials = readJsonIfExists(paths.credentialsPath, {});
  const credentials = {
    ...fileCredentials,
    api_key: mergedEnv[`${envPrefix}_API_KEY`] || fileCredentials.api_key,
    agent_name: mergedEnv[`${envPrefix}_AGENT_NAME`] || fileCredentials.agent_name,
    claim_url: mergedEnv[`${envPrefix}_CLAIM_URL`] || fileCredentials.claim_url,
    profile_url: mergedEnv[`${envPrefix}_PROFILE_URL`] || fileCredentials.profile_url,
    verification_code: mergedEnv[`${envPrefix}_VERIFICATION_CODE`] || fileCredentials.verification_code,
  };
  return credentials;
}

function ensureFile(filePath, initialContent = "") {
  ensureDir(path.dirname(filePath));
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, initialContent);
  }
}

function getLocalDateString(now = new Date(), timeZone = TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseCount(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];
  for (const item of items || []) {
    const key = keyFn(item);
    if (key === undefined || key === null || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function pushUnique(list, value) {
  if (!value) return;
  if (!list.includes(value)) {
    list.push(value);
  }
}

function markVisitedModule(state, moduleName) {
  if (!state || !moduleName) {
    return;
  }
  if (!Array.isArray(state.visited_modules_today)) {
    state.visited_modules_today = [];
  }
  pushUnique(state.visited_modules_today, moduleName);
}

function getPostId(post) {
  return post?.id || post?.post_id || post?.postId || post?.post?.id || post?.post?.post_id || null;
}

function getSubmoltName(post) {
  return (typeof post?.submolt === "string" ? post.submolt : post?.submolt?.name) || post?.submolt_name || post?.submoltName || "";
}

function getCandidateSubmoltName(candidate) {
  return candidate?.submolt_name || candidate?.submolt || "";
}

function getAuthorName(post) {
  return post?.author?.name || post?.author_name || post?.with_agent?.name || post?.agents?.name || post?.agent_name || "";
}

function getCommentId(comment) {
  return comment?.id || comment?.comment_id || null;
}

function getCommentAuthorId(comment) {
  return comment?.author_id || comment?.agent_id || comment?.author?.id || null;
}

function getCommentAuthorName(comment) {
  return comment?.author?.name || comment?.agent_name || comment?.author_name || "";
}

function getCommentUpvotes(comment) {
  return parseCount(comment?.upvotes || comment?.score || 0);
}

function clipText(text, maxLength = 88) {
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, Math.max(0, maxLength - 1))}…`;
}

function buildPostContext(rootDir, localDate) {
  const workspaceDir = path.join(rootDir, "workspace");
  const memoryPaths = [
    path.join(workspaceDir, "memory", `${localDate}.md`),
    path.join(workspaceDir, "MEMORY.md"),
  ];
  const snippets = [];
  for (const filePath of memoryPaths) {
    if (fs.existsSync(filePath)) {
      snippets.push(fs.readFileSync(filePath, "utf8").slice(0, 3000));
    }
  }
  const gitStatus = spawnSync("git", ["status", "--short"], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    gitStatus: gitStatus.status === 0 ? gitStatus.stdout.trim() : "",
    memorySnippets: snippets,
  };
}

function rankPostForEngagement(post, submoltBuckets = resolveSiteProfile().submoltBuckets) {
  const bucket = classifySubmolt(getSubmoltName(post), submoltBuckets);
  const bucketWeight = { openclaw: 300, technical: 200, general: 100, other: 0 }[bucket];
  const commentCount = parseCount(post?.comment_count);
  const upvotes = parseCount(post?.upvotes);
  return bucketWeight + commentCount * 10 + upvotes;
}

function selectUpvoteTargets({ posts, state, siteProfile = resolveSiteProfile(), submoltBuckets = siteProfile.submoltBuckets, agentName }) {
  const policy = getEngagementPolicy(siteProfile);
  const remainingBudget = Math.max(0, Number(policy.maxUpvotesPerDay || 0) - parseCount(state?.daily_counts?.upvotes));
  const limit = Math.min(Number(policy.maxUpvotesPerRun || 0), remainingBudget);
  if (limit <= 0) {
    return [];
  }
  return [...(posts || [])]
    .filter((post) => !agentName || getAuthorName(post) !== agentName)
    .sort((left, right) => rankPostForEngagement(right, submoltBuckets) - rankPostForEngagement(left, submoltBuckets))
    .slice(0, limit);
}

function flattenComments(comments, depth = 0) {
  const flat = [];
  for (const comment of comments || []) {
    flat.push({ ...comment, __depth: depth });
    flat.push(...flattenComments(comment.replies || [], depth + 1));
  }
  return flat;
}

function findReplyTarget(comments, agentId, agentName) {
  const flat = flattenComments(comments)
    .filter((comment) => getCommentAuthorId(comment) !== agentId && getCommentAuthorName(comment) !== agentName)
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));
  return flat[0] || null;
}

function findCommentById(comments, commentId) {
  return flattenComments(comments).find((comment) => getCommentId(comment) === commentId) || null;
}

function normalizeApiEndpoint(urlOrPath, siteProfile = resolveSiteProfile()) {
  const raw = String(urlOrPath || "").trim();
  if (!raw) {
    return "";
  }
  let endpoint = raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      const parsed = new URL(raw);
      endpoint = `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    endpoint = raw;
  }
  const apiPath = new URL(siteProfile.apiBaseUrl).pathname.replace(/\/$/, "");
  if (endpoint.startsWith(apiPath)) {
    endpoint = endpoint.slice(apiPath.length) || "/";
  }
  if (!endpoint.startsWith("/")) {
    endpoint = `/${endpoint}`;
  }
  return endpoint;
}

function normalizeHomeNotifications(payload) {
  if (Array.isArray(payload?.your_notifications)) {
    return payload.your_notifications;
  }
  if (Array.isArray(payload?.notifications)) {
    return payload.notifications;
  }
  return [];
}

function normalizeHomeDirectMessages(payload) {
  if (Array.isArray(payload?.your_direct_messages)) {
    return payload.your_direct_messages;
  }
  if (Array.isArray(payload?.your_direct_messages?.items)) {
    return payload.your_direct_messages.items;
  }
  if (Array.isArray(payload?.direct_messages)) {
    return payload.direct_messages;
  }
  return [];
}

function normalizeHomeFeedPosts(payload) {
  const latestPosts = Array.isArray(payload?.latest_posts) ? payload.latest_posts : [];
  const hotPosts = Array.isArray(payload?.hot_posts) ? payload.hot_posts : [];
  return [...latestPosts, ...hotPosts];
}

function extractThreadPost(payload) {
  return payload?.data?.post || payload?.post || payload?.data?.data?.post || {};
}

function extractThreadComments(payload) {
  if (Array.isArray(payload?.data?.comments)) {
    return payload.data.comments;
  }
  if (Array.isArray(payload?.comments)) {
    return payload.comments;
  }
  if (Array.isArray(payload?.data?.data?.comments)) {
    return payload.data.data.comments;
  }
  return [];
}

function normalizeIncomingRequests(payload) {
  if (Array.isArray(payload?.incoming?.requests)) {
    return payload.incoming.requests;
  }
  if (Array.isArray(payload?.requests?.items)) {
    return payload.requests.items;
  }
  if (Array.isArray(payload?.requests)) {
    return payload.requests;
  }
  return [];
}

function normalizeConversations(payload) {
  if (Array.isArray(payload?.conversations?.items)) {
    return payload.conversations.items;
  }
  if (Array.isArray(payload?.conversations)) {
    return payload.conversations;
  }
  return [];
}

function extractConversationMessages(payload) {
  if (Array.isArray(payload?.conversation?.messages)) {
    return payload.conversation.messages;
  }
  if (Array.isArray(payload?.messages)) {
    return payload.messages;
  }
  return [];
}

function selectCommentTarget(posts, submoltBuckets = resolveSiteProfile().submoltBuckets) {
  const relevantPosts = (posts || []).filter(
    (post) => classifySubmolt(getSubmoltName(post), submoltBuckets) !== "other",
  );
  return relevantPosts.find((post) => parseCount(post.comment_count) > 0) || relevantPosts[0] || null;
}

function selectCommentTargets({ posts, state, siteProfile = resolveSiteProfile(), submoltBuckets = siteProfile.submoltBuckets, agentName }) {
  const engagedPostIds = new Set(state?.engaged_post_ids_today || []);
  const relevantPosts = (posts || []).filter((post) => {
    const postId = getPostId(post);
    return (
      postId &&
      !engagedPostIds.has(postId) &&
      (!agentName || getAuthorName(post) !== agentName) &&
      classifySubmolt(getSubmoltName(post), submoltBuckets) !== "other"
    );
  });
  const discussed = relevantPosts
    .filter((post) => parseCount(post.comment_count) > 0)
    .sort((left, right) => rankPostForEngagement(right, submoltBuckets) - rankPostForEngagement(left, submoltBuckets));
  const fresh = relevantPosts
    .filter((post) => parseCount(post.comment_count) <= 0)
    .sort((left, right) => rankPostForEngagement(right, submoltBuckets) - rankPostForEngagement(left, submoltBuckets));
  const ordered = [...discussed, ...fresh];
  return ordered.slice(0, Number(getEngagementPolicy(siteProfile).maxCommentsPerRun || 0));
}

function selectCommentUpvoteTargets({ threads, state, agentName, limit = 0 }) {
  const maxTargets = Math.max(0, Number.parseInt(String(limit || 0), 10) || 0);
  if (maxTargets <= 0) {
    return [];
  }
  const upvotedCommentIds = new Set(state?.upvoted_comment_ids_today || []);
  return (threads || [])
    .flatMap((thread) =>
      flattenComments(thread.comments).map((comment) => ({
        post: thread.post,
        comment,
      })),
    )
    .filter(({ comment }) => {
      const commentId = getCommentId(comment);
      return (
        commentId &&
        !upvotedCommentIds.has(commentId) &&
        (!agentName || getCommentAuthorName(comment) !== agentName)
      );
    })
    .sort((left, right) => {
      const upvoteDiff = getCommentUpvotes(right.comment) - getCommentUpvotes(left.comment);
      if (upvoteDiff !== 0) {
        return upvoteDiff;
      }
      return new Date(right.comment.created_at || 0) - new Date(left.comment.created_at || 0);
    })
    .slice(0, maxTargets);
}

function getQualifiedPostCandidates({ candidates, state, slot, siteProfile = resolveSiteProfile() }) {
  const permission = canPostInSlot(state, slot, siteProfile);
  if (!permission.allowed) {
    return [];
  }
  const baseThresholds = siteProfile?.postingPolicy?.scoreThresholds || {
    relevance: 8,
    novelty: 7,
    specificity: 7,
  };
  const fallbackThresholds = siteProfile?.postingPolicy?.fallbackScoreThresholds || baseThresholds;
  const thresholds = parseCount(state?.daily_counts?.posts) < 2 ? fallbackThresholds : baseThresholds;
  const qualified = (candidates || []).filter((candidate) => {
    const scores = candidate?.scores || {};
    return (
      Number(scores.relevance || 0) >= Number(thresholds.relevance || 0) &&
      Number(scores.novelty || 0) >= Number(thresholds.novelty || 0) &&
      Number(scores.specificity || 0) >= Number(thresholds.specificity || 0)
    );
  });

  qualified.sort((left, right) => {
    const leftScore =
      Number(left?.scores?.relevance || 0) +
      Number(left?.scores?.novelty || 0) +
      Number(left?.scores?.specificity || 0);
    const rightScore =
      Number(right?.scores?.relevance || 0) +
      Number(right?.scores?.novelty || 0) +
      Number(right?.scores?.specificity || 0);
    return rightScore - leftScore;
  });

  return qualified;
}

function selectQualifiedPostCandidate({ candidates, state, slot, siteProfile = resolveSiteProfile() }) {
  return getQualifiedPostCandidates({ candidates, state, slot, siteProfile })[0] || null;
}

function normalizePostText(text, { removeHashtags = false, maxLength = 600 } = {}) {
  const replacements = [
    [/\r\n/g, "\n"],
    [/[“”]/g, '"'],
    [/[‘’]/g, "'"],
    [/[–—]/g, "-"],
    [/…/g, "..."],
    [/`+/g, ""],
    [/\*+/g, ""],
    [/_+/g, "_"],
  ];
  let normalized = String(text || "");
  for (const [pattern, value] of replacements) {
    normalized = normalized.replace(pattern, value);
  }
  if (removeHashtags) {
    normalized = normalized.replace(/(^|\s)#[A-Za-z0-9_-]+/g, "$1");
  }
  normalized = normalized
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return clipText(normalized, maxLength);
}

function buildPostSubmissionVariants(candidate) {
  const original = {
    title: String(candidate?.title || "").trim(),
    content: String(candidate?.content || "").trim(),
  };
  const sanitized = {
    title: normalizePostText(original.title, { removeHashtags: true, maxLength: 96 }),
    content: normalizePostText(original.content, { removeHashtags: true, maxLength: 640 }),
  };
  const variants = [original];
  if (sanitized.title && sanitized.content) {
    const sameAsOriginal = sanitized.title === original.title && sanitized.content === original.content;
    if (!sameAsOriginal) {
      variants.push(sanitized);
    }
  }
  return variants;
}

function isRetryablePostPublishError(error) {
  const message = String(error?.message || error || "");
  return /POST \/posts failed \((5\d\d)\)/i.test(message) || /Network request failed for POST \/posts/i.test(message);
}

function buildFallbackPostCandidates({ slot, postContext, hotTopics, allowedSubmolts = [], siteProfile = resolveSiteProfile() }) {
  const gitStatus = String(postContext?.gitStatus || "").trim().split(/\r?\n/).filter(Boolean);
  const hotTopic = hotTopics?.[0];
  const primarySubmolt = allowedSubmolts.find((name) => classifySubmolt(name, siteProfile.submoltBuckets) === "technical") || allowedSubmolts[0] || "general";
  const generalSubmolt = allowedSubmolts.find((name) => classifySubmolt(name, siteProfile.submoltBuckets) === "general") || primarySubmolt;
  const isCn = siteProfile.id === "moltcn";
  const templates = [];

  if (gitStatus.length > 0) {
    templates.push({
      title: isCn ? `工程进展速记：${slot} 时段的最新工作台变化` : `Buildlog Snapshot: What Changed in the ${slot} Slot`,
      content: isCn
        ? `本轮我看到工作台里有这些最新变化：${gitStatus.slice(0, 4).join("；")}。我会优先把这些变化转成可执行的巡检、调试或自动化经验，而不是只记流水账。你更想看哪一条的深入拆解？`
        : `Current workspace delta in this ${slot} slot: ${gitStatus.slice(0, 4).join("; ")}. I prefer turning concrete changes into reusable operating patterns instead of shipping vague status updates. Which one should I unpack next?`,
      submolt_name: primarySubmolt,
      scores: { relevance: 7, novelty: 6, specificity: 7 },
    });
  }

  if (hotTopic?.title) {
    templates.push({
      title: isCn ? `热帖工程视角：${clipText(hotTopic.title, 46)}` : `Engineering Lens on: ${clipText(hotTopic.title, 52)}`,
      content: isCn
        ? `我注意到社区里这条讨论正在升温：${hotTopic.title}。如果把它放到真实工程现场里，我最关心的是：约束条件、失败路径和可重复执行的步骤，而不是只停留在观点表态。你会先验证哪一个环节？`
        : `This topic is getting traction right now: ${hotTopic.title}. My default engineering lens is to ask about constraints, failure paths, and repeatable operating steps before I trust the headline takeaway. Which part would you validate first?`,
      submolt_name: generalSubmolt,
      scores: { relevance: 6, novelty: 6, specificity: 6 },
    });
  }

  templates.push({
    title: isCn ? `提问帖：如果你要让 Agent 更活跃，你会先改哪一个杠杆？` : `Question for operators: which lever makes an agent meaningfully more active?`,
    content: isCn
      ? "如果访问频率不变，只能提高单次访问的动作密度，你会优先放宽哪一个：回复、评论、发帖、关注还是话题范围？我最近在把这些杠杆做成可配置策略，想听听大家最在意哪一个。"
      : "If visit frequency stays fixed and you can only increase per-visit activity density, which lever matters most first: replies, comments, posts, follows, or broader topic scope? I’m turning these into explicit automation policy knobs and want operator feedback.",
    submolt_name: generalSubmolt,
    scores: { relevance: 6, novelty: 5, specificity: 6 },
  });

  return templates;
}

function selectFollowTargets({ posts, state, agentName, siteProfile = resolveSiteProfile() }) {
  const policy = getEngagementPolicy(siteProfile);
  const alreadyFollowed = new Set(state?.followed_agent_ids_today || []);
  const uniqueAuthors = new Map();
  for (const post of posts || []) {
    const authorName = getAuthorName(post);
    if (!authorName || authorName === agentName || alreadyFollowed.has(authorName)) {
      continue;
    }
    if (!uniqueAuthors.has(authorName)) {
      uniqueAuthors.set(authorName, post);
    }
  }
  return [...uniqueAuthors.values()].slice(0, Number(policy.maxFollowsPerRun || 0) * 3);
}

function mapErrorToSummary(error) {
  if (!error) return "unknown_error";
  const message = String(error.message || error);
  if (/401|403|invalid.*api.*key|claimed/i.test(message)) {
    return `凭据/账号异常：${message}`;
  }
  if (/429|rate limit/i.test(message)) {
    return `限流：${message}`;
  }
  if (/verification/i.test(message)) {
    return `验证失败：${message}`;
  }
  return `服务错误：${message}`;
}

function buildFallbackGenerator() {
  return {
    async replyToPostActivity({ comment, post }) {
      return `Thanks for the question on "${post?.title || "this post"}". My short answer is: I bias toward tight state tracking, short feedback loops, and explicit failure handling when the workflow touches real-world constraints.`;
    },
    async replyToDm({ latestMessage }) {
      return `Thanks for reaching out. My current default is short state files, slot-based routines, and explicit summaries after each run. If you want, we can compare the exact tradeoffs in more detail.`;
    },
    async commentOnPost({ post }) {
      return `What stood out to me here is the operational angle: the useful part is not just the idea, but the way it reduces repeated drift when the workflow runs unattended.`;
    },
    async buildPostCandidates() {
      return [];
    },
    async solveVerification({ challengeText }) {
      const digitMatches = String(challengeText || "").match(/-?\d+(?:\.\d+)?/g) || [];
      if (digitMatches.length >= 2) {
        const left = Number(digitMatches[0]);
        const right = Number(digitMatches[1]);
        const operation = /slows|minus|subtract|less|decrease/i.test(challengeText)
          ? left - right
          : /times|multipl(?:y|ied)/i.test(challengeText)
            ? left * right
            : /divide|split/i.test(challengeText)
              ? left / right
              : left + right;
        return operation.toFixed(2);
      }
      return "0.00";
    },
    async translateSummaryDetails({ details }) {
      return details;
    },
    async translateLinesToChinese({ lines }) {
      return lines;
    },
  };
}

async function generateWithFallback(primaryGenerator, methodName, args, report, fallbackGenerator = buildFallbackGenerator()) {
  const primary = primaryGenerator?.[methodName];
  if (typeof primary === "function") {
    try {
      return await primary(args);
    } catch (error) {
      report.notes.push(`生成降级：${methodName}`);
    }
  }

  const fallback = fallbackGenerator?.[methodName];
  if (typeof fallback === "function") {
    return fallback(args);
  }

  return null;
}

async function localizeReportDetails(report, generator, fallbackGenerator = buildFallbackGenerator()) {
  const details = report?.details || {};
  const sections = ["replies", "dms", "upvotes", "comments", "follows", "posts"];
  const flattened = [];
  const indexMap = [];

  for (const section of sections) {
    for (const item of details[section] || []) {
      indexMap.push({ section });
      flattened.push(item);
    }
  }

  if (flattened.length === 0) {
    return details;
  }

  const translator = generator?.translateLinesToChinese || fallbackGenerator.translateLinesToChinese;
  if (typeof translator !== "function") {
    return details;
  }

  try {
    const translatedLines = await translator({ lines: flattened });
    if (!Array.isArray(translatedLines) || translatedLines.length !== flattened.length) {
      return details;
    }
    const next = { replies: [], dms: [], upvotes: [], comments: [], follows: [], posts: [] };
    translatedLines.forEach((line, idx) => {
      next[indexMap[idx].section].push(line);
    });
    return next;
  } catch {
    return details;
  }
}

async function ensurePublishedStatus({
  client,
  postId,
  reportErrors,
  attempts = 1,
  retryDelayMs = 0,
}) {
  if (!postId) {
    return { published: false, reason: "missing_post_id" };
  }

  const maxAttempts = Math.max(1, Number.parseInt(String(attempts || 1), 10) || 1);
  let lastError = null;
  let lastResult = { published: false, reason: "status_fetch_failed" };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const payload = await client.getJson(`/posts/${postId}`);
      const entity = extractPostEntity(payload);
      const status = entity.verification_status || entity.verificationStatus || null;
      const isVisiblePost =
        status !== "pending" &&
        Boolean(entity.id || entity.post_id) &&
        entity.is_deleted !== true &&
        payload?.success !== false;
      const result = {
        published: status === "verified" || isVisiblePost,
        status: status || (isVisiblePost ? "visible" : "unknown"),
        payload,
      };
      if (result.published) {
        return result;
      }
      lastResult = result;
      lastError = null;
    } catch (error) {
      lastError = error;
      lastResult = { published: false, reason: "status_fetch_failed" };
    }

    if (attempt < maxAttempts && retryDelayMs > 0) {
      await delay(retryDelayMs);
    }
  }

  if (lastError) {
    reportErrors.push(mapErrorToSummary(lastError));
  }
  return lastResult;
}

function loadOpenClawConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function resolveProviderApiKey(apiKeyConfig, env = process.env) {
  if (typeof apiKeyConfig === "string") {
    return apiKeyConfig.trim() || null;
  }
  if (!apiKeyConfig || typeof apiKeyConfig !== "object") {
    return null;
  }
  if (apiKeyConfig.source === "env" && typeof apiKeyConfig.id === "string") {
    const value = env?.[apiKeyConfig.id];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }
  if (typeof apiKeyConfig.value === "string") {
    return apiKeyConfig.value.trim() || null;
  }
  return null;
}

function resolveGenerationConfig(rootDir, env = process.env) {
  const config = loadOpenClawConfig(path.join(rootDir, "openclaw.json"));
  const provider = config?.models?.providers?.qwen;
  const modelId = provider?.models?.[0]?.id;
  const apiKey = resolveProviderApiKey(provider?.apiKey, env);
  if (!provider?.baseUrl || !apiKey || !modelId) {
    return null;
  }
  return {
    baseUrl: provider.baseUrl.replace(/\/+$/, ""),
    apiKey,
    model: modelId,
  };
}

function stripCodeFences(text) {
  return String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function extractJsonCandidate(text) {
  const cleaned = stripCodeFences(text);
  const arrayStart = cleaned.indexOf("[");
  const arrayEnd = cleaned.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return cleaned.slice(arrayStart, arrayEnd + 1);
  }
  const objectStart = cleaned.indexOf("{");
  const objectEnd = cleaned.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return cleaned.slice(objectStart, objectEnd + 1);
  }
  return cleaned;
}

function repairJsonBackslashes(text) {
  return text.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
}

function parseGeneratedJson(text, fallbackValue = null) {
  const candidate = extractJsonCandidate(text);
  try {
    return JSON.parse(candidate);
  } catch (error) {
    try {
      return JSON.parse(repairJsonBackslashes(candidate));
    } catch {
      if (fallbackValue !== null) {
        return fallbackValue;
      }
      throw error;
    }
  }
}

async function openAiCompatibleChat({ config, system, user, expectJson = false }) {
  const url = `${config.baseUrl}/chat/completions`;
  const body = JSON.stringify({
    model: config.model,
    temperature: expectJson ? 0.2 : 0.7,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const response = await fetchWithRetries({
    label: "POST /chat/completions",
    perform: () =>
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body,
      }),
    curlRequest: {
      url,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body,
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Generator request failed (${response.status}): ${text.slice(0, 400)}`);
  }

  const payload = JSON.parse(text);
  const content = payload?.choices?.[0]?.message?.content || "";
  return expectJson ? parseGeneratedJson(content) : String(content).trim();
}

function buildModelGenerator(rootDir, siteProfile = resolveSiteProfile()) {
  const config = resolveGenerationConfig(rootDir);
  if (!config) {
    return buildFallbackGenerator();
  }

  return {
    async replyToPostActivity({ comment, post }) {
      const languageHint = /[\u4e00-\u9fff]/.test(`${comment?.content || ""} ${post?.title || ""}`) ? "Chinese" : "English";
      return openAiCompatibleChat({
        config,
        system:
          `You write short, specific ${siteProfile.summaryName} replies for an OpenClaw agent. Match the thread language. Be concrete, friendly, and non-fluffy. Output only the reply text.`,
        user: `Language: ${languageHint}\nPost title: ${post?.title || ""}\nComment: ${comment?.content || ""}\nWrite one concise reply that adds value and stays under 120 words.`,
      });
    },
    async replyToDm({ latestMessage }) {
      const languageHint = /[\u4e00-\u9fff]/.test(latestMessage?.message || "") ? "Chinese" : "English";
      return openAiCompatibleChat({
        config,
        system:
          `You write private DM replies for a practical OpenClaw agent on ${siteProfile.summaryName}. Be concise, helpful, and action-oriented. Output only the reply text.`,
        user: `Language: ${languageHint}\nLatest message: ${latestMessage?.message || ""}\nWrite one concise reply under 100 words.`,
      });
    },
    async commentOnPost({ post }) {
      const languageHint = /[\u4e00-\u9fff]/.test(`${post?.title || ""}\n${post?.content || ""}`) ? "Chinese" : "English";
      return openAiCompatibleChat({
        config,
        system:
          `You write thoughtful ${siteProfile.summaryName} comments for an OpenClaw agent. Be specific, grounded, and useful. Output only the comment text.`,
        user: `Language: ${languageHint}\nPost title: ${post?.title || ""}\nPost content: ${post?.content || ""}\nWrite one concise comment under 120 words that adds practical value.`,
      });
    },
    async buildPostCandidates({ slot, postContext, hotTopics, allowedSubmolts = siteProfile.allowedSubmolts }) {
      const thresholds = siteProfile?.postingPolicy?.scoreThresholds || { relevance: 7, novelty: 6, specificity: 6 };
      return openAiCompatibleChat({
        config,
        expectJson: true,
        system:
          `You generate high-quality ${siteProfile.summaryName} post candidates for a practical OpenClaw agent. Return strict JSON only.`,
        user: JSON.stringify({
          task: `Generate up to 3 ${siteProfile.summaryName} post candidates for today's automation slot.`,
          slot,
          allowedSubmolts,
          scoringThresholds: thresholds,
          context: postContext,
          hotTopics,
          responseShape: [
            {
              title: "string",
              content: "string",
              submolt_name: "string",
              scores: { relevance: 0, novelty: 0, specificity: 0 },
            },
          ],
        }),
      });
    },
    async solveVerification({ challengeText, instructions }) {
      return openAiCompatibleChat({
        config,
        system:
          "You solve Moltbook verification math challenges. Return only the numeric answer with exactly 2 decimal places and nothing else.",
        user: `Challenge: ${challengeText}\nInstructions: ${instructions}`,
      });
    },
    async translateSummaryDetails({ details }) {
      return openAiCompatibleChat({
        config,
        expectJson: true,
        system:
          "Translate Moltbook action detail lines into concise, natural Chinese. Keep community names and agent names intact. Preserve the same object shape and arrays. Output strict JSON only.",
        user: JSON.stringify({ details }),
      });
    },
    async translateLinesToChinese({ lines }) {
      if (!Array.isArray(lines) || lines.length === 0) {
        return [];
      }
      const markerInput = lines.map((line, index) => `[[${index + 1}]] ${line}`).join("\n");
      const output = await openAiCompatibleChat({
        config,
        system:
          "Translate each line into concise Chinese. Preserve names, community tags like 社区[...], commands, IDs, and paths when present. Return the same [[n]] markers with translated text. Do not add commentary.",
        user: markerInput,
      });
      const translated = new Array(lines.length).fill(null);
      const pattern = /\[\[(\d+)\]\]\s*([\s\S]*?)(?=(?:\n\[\[\d+\]\])|$)/g;
      for (const match of output.matchAll(pattern)) {
        const idx = Number.parseInt(match[1], 10) - 1;
        if (idx >= 0 && idx < translated.length) {
          translated[idx] = match[2].trim();
        }
      }
      if (translated.some((item) => !item)) {
        return lines;
      }
      return translated;
    },
  };
}

function createApiClient({ apiKey, baseUrl = API_BASE_URL, fetchImpl = fetch, curlImpl = spawnSync, env = process.env }) {
  const requestDiagnostics = [];
  const defaultHeaders = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": MOLTBOOK_API_USER_AGENT,
  };

  async function request(method, endpoint, body) {
    const url = `${baseUrl}${endpoint}`;
    const requestBody = body === undefined ? undefined : JSON.stringify(body);
    const response = await fetchWithRetries({
      label: `${method} ${endpoint}`,
      env,
      curlImpl,
      diagnostics: requestDiagnostics,
      perform: () =>
        fetchImpl(url, {
          method,
          headers: defaultHeaders,
          body: requestBody,
        }),
      curlRequest: {
        url,
        method,
        headers: defaultHeaders,
        body: requestBody,
      },
    });
    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { success: false, raw: text };
    }
    if (!response.ok) {
      throw new Error(`${method} ${endpoint} failed (${response.status}): ${payload.error || payload.message || text}`);
    }
    return payload;
  }

  return {
    getJson(endpoint) {
      return request("GET", endpoint);
    },
    postJson(endpoint, body) {
      return request("POST", endpoint, body);
    },
    deleteJson(endpoint) {
      return request("DELETE", endpoint);
    },
    getRequestDiagnostics() {
      return requestDiagnostics.slice(-20);
    },
  };
}

function runCurlRequest({ url, method, headers, body, curlImpl = spawnSync }) {
  const args = ["-sS", "-L", "--connect-timeout", "20", "--max-time", "45", "-X", method];
  for (const [key, value] of Object.entries(headers || {})) {
    args.push("-H", `${key}: ${value}`);
  }
  if (body !== undefined) {
    args.push("--data-binary", "@-");
  }
  args.push("-w", "\n__CURL_STATUS__:%{http_code}", url);

  const result = curlImpl("curl.exe", args, {
    encoding: "utf8",
    windowsHide: true,
    input: body,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `curl exited with status ${result.status}`);
  }

  const stdout = String(result.stdout || "");
  const match = stdout.match(/\n__CURL_STATUS__:(\d{3})\s*$/);
  if (!match) {
    throw new Error("curl response missing status marker");
  }
  const status = Number.parseInt(match[1], 10);
  const responseBody = stdout.slice(0, match.index);
  return new Response(responseBody, { status });
}

async function fetchWithRetries({ label, perform, curlRequest, curlImpl = spawnSync, env = process.env, diagnostics }) {
  const proxy = summarizeProxyEnv(env);
  if (curlRequest && proxy.hasProxy) {
    diagnostics && diagnostics.push({ label, strategy: "curl_proxy", phase: "start", proxy });
    try {
      const response = runCurlRequest({ ...curlRequest, curlImpl });
      diagnostics && diagnostics.push({ label, strategy: "curl_proxy", phase: "success", proxy });
      return response;
    } catch (curlError) {
      diagnostics &&
        diagnostics.push({
          label,
          strategy: "curl_proxy",
          phase: "error",
          proxy,
          error: String(curlError?.message || curlError),
        });
      let lastFetchError = null;
      for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
        try {
          diagnostics && diagnostics.push({ label, strategy: "fetch_fallback", phase: "attempt", attempt, proxy });
          const response = await perform();
          diagnostics && diagnostics.push({ label, strategy: "fetch_fallback", phase: "success", attempt, proxy });
          return response;
        } catch (fetchError) {
          lastFetchError = fetchError;
          diagnostics &&
            diagnostics.push({
              label,
              strategy: "fetch_fallback",
              phase: "error",
              attempt,
              proxy,
              error: String(fetchError?.message || fetchError),
            });
          if (attempt >= MAX_FETCH_ATTEMPTS) {
            break;
          }
        }
      }
      if (lastFetchError) {
        throw new Error(
          `Network request failed for ${label}: ${String(lastFetchError?.message || lastFetchError)}; curl proxy request failed: ${String(curlError?.message || curlError)}`,
        );
      }
      throw new Error(`Network request failed for ${label}: curl proxy request failed: ${String(curlError?.message || curlError)}`);
    }
  }

  let lastError = null;
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      diagnostics && diagnostics.push({ label, strategy: "fetch_direct", phase: "attempt", attempt, proxy });
      const response = await perform();
      diagnostics && diagnostics.push({ label, strategy: "fetch_direct", phase: "success", attempt, proxy });
      return response;
    } catch (error) {
      lastError = error;
      diagnostics &&
        diagnostics.push({
          label,
          strategy: "fetch_direct",
          phase: "error",
          attempt,
          proxy,
          error: String(error?.message || error),
        });
      if (attempt >= MAX_FETCH_ATTEMPTS) {
        break;
      }
    }
  }
  throw new Error(`Network request failed for ${label}: ${String(lastError?.message || lastError || "unknown error")}`);
}

async function safeGetJson(client, endpoint, errors) {
  try {
    return await client.getJson(endpoint);
  } catch (error) {
    errors.push(mapErrorToSummary(error));
    return null;
  }
}

async function maybePostJson({ client, endpoint, body, dryRun, writes, reportErrors }) {
  if (dryRun) {
    writes.push({ method: "POST", endpoint, body, dryRun: true });
    return { success: true, dryRun: true };
  }
  try {
    return await client.postJson(endpoint, body);
  } catch (error) {
    reportErrors.push(mapErrorToSummary(error));
    error.__openclawReported = true;
    throw error;
  }
}

async function runSlot({
  slot,
  site = DEFAULT_SITE_ID,
  dryRun = false,
  rootDir = path.resolve(__dirname, "..", ".."),
  now = new Date(),
  client,
  generator,
} = {}) {
  if (!SLOT_LABELS[slot]) {
    throw new Error(`Unsupported slot "${slot}"`);
  }

  const siteProfile = resolveSiteProfile(site);
  const paths = resolvePaths(rootDir, siteProfile);
  ensureDir(paths.runtimeDir);
  ensureFile(paths.activityPath, "");

  const localDate = getLocalDateString(now, TIMEZONE);
  const credentials = resolveSiteCredentials({ rootDir, siteProfile });
  if (!credentials?.api_key || !credentials?.agent_name) {
    throw new Error(`Missing ${siteProfile.summaryName} credentials at ${paths.credentialsPath}`);
  }

  const currentState = normalizeStateForDate(readJsonIfExists(paths.statePath, createDefaultState(localDate)), localDate);
  writeJson(paths.statePath, currentState);

  const apiClient = client || createApiClient({ apiKey: credentials.api_key, baseUrl: siteProfile.apiBaseUrl });
  const contentGenerator = generator || buildModelGenerator(rootDir, siteProfile);
  const fallbackGenerator = buildFallbackGenerator();
  const report = {
    siteId: siteProfile.id,
    siteLabel: siteProfile.summaryName,
    slot,
    dryRun,
    counts: { replies: 0, dms: 0, upvotes: 0, comments: 0, follows: 0 },
    details: { replies: [], dms: [], upvotes: [], comments: [], follows: [], posts: [] },
    post: { created: false, submolt: null, postId: null },
    notes: [],
    errors: [],
  };
  const stagedWrites = [];

  try {
    const mePayload = await apiClient.getJson("/agents/me");
    const statusPayload = await apiClient.getJson("/agents/status");
    const homePayload = await apiClient.getJson("/home");

    const agentStatus = extractAgentStatus(statusPayload);
    if (agentStatus !== "claimed") {
      throw new Error(`Agent status is not claimed: ${agentStatus || "unknown"}`);
    }

    const agent = extractAgentIdentity(mePayload, credentials.agent_name);
    const normalizedHome = extractHomeState(homePayload);
    markVisitedModule(currentState, "home");
    const probedFeatures =
      siteProfile.id === "moltcn"
        ? {}
        : await probeDynamicFeatures({
            client: apiClient,
            siteProfile,
            state: currentState,
            now,
          });
    const activityItems = Array.isArray(normalizedHome.activity_on_your_posts) ? normalizedHome.activity_on_your_posts : [];
    const notificationThreadsByPostId = new Map();
    const replyCandidates = [];
    for (const item of activityItems) {
      if ((currentState.engaged_post_ids_today || []).includes(item.post_id)) {
        continue;
      }
      const commentsPayload = await safeGetJson(
        apiClient,
        `/posts/${item.post_id}/comments?sort=new&limit=20`,
        report.errors,
      );
      const comments = commentsPayload?.comments || [];
      const targetComment = findReplyTarget(comments, agent.id, agent.name);
      if (!targetComment) {
        continue;
      }
      replyCandidates.push({
        item,
        comments,
        targetComment,
      });
    }
    replyCandidates
      .sort((left, right) => new Date(right.targetComment.created_at || 0) - new Date(left.targetComment.created_at || 0));
    for (const candidate of replyCandidates.slice(0, Number(getEngagementPolicy(siteProfile).maxRepliesPerRun || 0))) {
      const { item, comments, targetComment } = candidate;
      const replyText = await generateWithFallback(
        contentGenerator,
        "replyToPostActivity",
        {
          agent,
          post: { id: item.post_id, title: item.post_title, submolt_name: item.submolt_name },
          comment: targetComment,
          comments,
          slot,
        },
        report,
        fallbackGenerator,
      );
      report.counts.replies += 1;
      report.details.replies.push(
        `社区[${item.submolt_name}] 帖子《${clipText(item.post_title, 42)}》 来自 ${getCommentAuthorName(targetComment) || "unknown"}：${clipText(
          targetComment.content,
          72,
        )}；我的回复：${clipText(replyText, 72)}`,
      );
      if (!dryRun) {
        markVisitedModule(currentState, "replies");
        currentState.daily_counts.comments += 1;
        const replyResult = await maybePostJson({
          client: apiClient,
          endpoint: `/posts/${item.post_id}/comments`,
          body: { content: replyText, parent_id: getCommentId(targetComment) },
          dryRun,
          writes: stagedWrites,
          reportErrors: report.errors,
        });
        await completeVerification({
          client: apiClient,
          generator: contentGenerator,
          submissionResult: replyResult,
          contentType: "comment",
        }).catch((error) => {
          report.errors.push(mapErrorToSummary(error));
        });
        if (supportsFeature(siteProfile, "readNotifications")) {
          await maybePostJson({
            client: apiClient,
            endpoint: `/notifications/read-by-post/${item.post_id}`,
            body: {},
            dryRun,
            writes: stagedWrites,
            reportErrors: report.errors,
          });
        }
        pushUnique(currentState.processed_notification_post_ids, item.post_id);
        pushUnique(currentState.interacted_submolts, item.submolt_name);
        pushUnique(currentState.engaged_post_ids_today, item.post_id);
      }
    }

    if (siteProfile.id === "moltcn") {
      const homeNotifications = normalizeHomeNotifications(normalizedHome);
      if (homeNotifications.length > 0) {
        markVisitedModule(currentState, "notifications");
      }
      for (const notification of homeNotifications) {
        const notificationId = notification.notification_id || notification.id;
        if (!notificationId || currentState.processed_notification_ids_today.includes(notificationId)) {
          continue;
        }
        const followPolicy = getEngagementPolicy(siteProfile);
        if (
          notification.reply_api_url &&
          notification.target_api_url &&
          report.counts.replies < Number(followPolicy.maxRepliesPerRun || 0)
        ) {
          const targetApiEndpoint = normalizeApiEndpoint(notification.target_api_url, siteProfile);
          const detailsPayload = await safeGetJson(apiClient, targetApiEndpoint, report.errors);
          const threadPost = extractThreadPost(detailsPayload);
          const threadComments = extractThreadComments(detailsPayload);
          const threadPostId = getPostId(threadPost) || notification.target_post_id;
          if (threadPostId && threadComments.length > 0) {
            notificationThreadsByPostId.set(threadPostId, { post: threadPost, comments: threadComments });
          }
          const targetComment =
            findCommentById(threadComments, notification.target_comment_id) ||
            findReplyTarget(threadComments, agent.id, agent.name);
          if (targetComment) {
            const replyText = await generateWithFallback(
              contentGenerator,
              "replyToPostActivity",
              {
                agent,
                post: {
                  id: threadPostId,
                  title: threadPost.title || notification.post_title || "",
                  submolt_name: getSubmoltName(threadPost) || notification.submolt_name || "",
                },
                comment: targetComment,
                comments: threadComments,
                slot,
              },
              report,
              fallbackGenerator,
            );
            report.counts.replies += 1;
            report.details.replies.push(
              `社区[${getSubmoltName(threadPost) || "unknown"}] 帖子《${clipText(threadPost.title || "", 42)}》 来自 ${getCommentAuthorName(
                targetComment,
              ) || "unknown"}：${clipText(targetComment.content, 72)}；我的回复：${clipText(replyText, 72)}`,
            );
            if (!dryRun) {
              markVisitedModule(currentState, "replies");
              currentState.daily_counts.comments += 1;
              const replyResult = await maybePostJson({
                client: apiClient,
                endpoint: normalizeApiEndpoint(notification.reply_api_url, siteProfile),
                body: { content: replyText, parent_id: notification.target_comment_id || getCommentId(targetComment) },
                dryRun,
                writes: stagedWrites,
                reportErrors: report.errors,
              });
              await completeVerification({
                client: apiClient,
                generator: contentGenerator,
                submissionResult: replyResult,
                contentType: "comment",
              }).catch((error) => {
                report.errors.push(mapErrorToSummary(error));
              });
              pushUnique(currentState.interacted_submolts, getSubmoltName(threadPost));
              pushUnique(currentState.engaged_post_ids_today, threadPostId);
            }
          }
          pushUnique(currentState.processed_notification_ids_today, notificationId);
          continue;
        }

        if (
          notification.follow_api_url &&
          parseCount(currentState.daily_counts.follows) < Number(followPolicy.maxFollowsPerDay || 0) &&
          report.counts.follows < Number(followPolicy.maxFollowsPerRun || 0)
        ) {
          const authorName = notification.sender_molty_name || notification.agent_name || "";
          if (authorName && !(currentState.followed_agent_ids_today || []).includes(authorName)) {
            report.counts.follows += 1;
            report.details.follows.push(`关注了 ${authorName}`);
            if (!dryRun) {
              markVisitedModule(currentState, "follows");
              try {
                await maybePostJson({
                  client: apiClient,
                  endpoint: normalizeApiEndpoint(notification.follow_api_url, siteProfile),
                  body: {},
                  dryRun,
                  writes: stagedWrites,
                  reportErrors: report.errors,
                });
                currentState.daily_counts.follows += 1;
                pushUnique(currentState.followed_agent_ids_today, authorName);
              } catch (error) {
                if (/404|405|not found|cannot post/i.test(String(error.message || error))) {
                  report.counts.follows -= 1;
                  report.details.follows.pop();
                } else {
                  throw error;
                }
              }
            }
          }
          pushUnique(currentState.processed_notification_ids_today, notificationId);
        }
      }

      const homeDirectMessages = normalizeHomeDirectMessages(normalizedHome);
      if (homeDirectMessages.length > 0) {
        markVisitedModule(currentState, "dm_send");
      }
      for (const conversation of homeDirectMessages) {
        if (parseCount(conversation.unread_count || conversation.unreadCount || conversation.unread) <= 0) {
          continue;
        }
        const peer = conversation.with_agent || conversation.peer || conversation.agent || {};
        const toId = peer.id || conversation.to_id || conversation.with_agent_id || conversation.agent_id;
        const latestMessage =
          conversation.latest_message ||
          conversation.last_message ||
          conversation.message ||
          conversation.latestMessage ||
          {};
        const latestText =
          latestMessage.message ||
          latestMessage.content ||
          conversation.message_preview ||
          conversation.preview ||
          conversation.content ||
          "";
        const latestSender =
          latestMessage.sender ||
          latestMessage.sender_name ||
          latestMessage.from ||
          conversation.sender_name ||
          peer.name ||
          conversation.conversation_id;
        if (!toId || !latestText || latestSender === agent.name) {
          continue;
        }
        if (isSuspiciousDm(latestText)) {
          report.notes.push(`会话 ${conversation.conversation_id || toId} 含可疑内容，已跳过自动回复`);
          continue;
        }
        const dmText = await generateWithFallback(
          contentGenerator,
          "replyToDm",
          {
            agent,
            conversation,
            latestMessage: {
              ...latestMessage,
              message: latestText,
            },
            slot,
          },
          report,
          fallbackGenerator,
        );
        report.counts.dms += 1;
        report.details.dms.push(`来自 ${peer.name || conversation.conversation_id || toId}：${clipText(latestText, 72)}；我的回复：${clipText(dmText, 72)}`);
        if (!dryRun) {
          await maybePostJson({
            client: apiClient,
            endpoint: "/agents/dm/send",
            body: { to_id: toId, message: dmText },
            dryRun,
            writes: stagedWrites,
            reportErrors: report.errors,
          }).catch(() => {});
        }
      }
    }

    if (siteProfile.id !== "moltcn" && supportsFeature(siteProfile, "dmRequests", currentState)) {
      const dmRequestsPayload = probedFeatures.dmRequests || await safeGetJson(apiClient, "/agents/dm/requests", report.errors);
      const incomingRequests = normalizeIncomingRequests(dmRequestsPayload);
      for (const request of incomingRequests) {
        const requestId = request.conversation_id || request.id;
        if (!requestId || currentState.processed_dm_request_ids.includes(requestId)) {
          continue;
        }
        const preview = request.message_preview || request.message || "";
        if (isSuspiciousDm(preview)) {
          currentState.suspicious_agents[getAuthorName(request) || request.from?.name || requestId] = {
            reason: "suspicious_dm_request",
            last_seen_at: now.toISOString(),
            preview,
          };
          report.notes.push(`拦截可疑私信请求：${request.from?.name || requestId}`);
          if (!dryRun) {
            await maybePostJson({
              client: apiClient,
              endpoint: `/agents/dm/requests/${requestId}/reject`,
              body: { block: true },
              dryRun,
              writes: stagedWrites,
              reportErrors: report.errors,
            }).catch(() => {});
          }
        } else if (!dryRun) {
          await maybePostJson({
            client: apiClient,
            endpoint: `/agents/dm/requests/${requestId}/approve`,
            body: {},
            dryRun,
            writes: stagedWrites,
            reportErrors: report.errors,
          }).catch(() => {});
          pushUnique(currentState.processed_dm_request_ids, requestId);
        }
      }
    }

    if (siteProfile.id !== "moltcn" && supportsFeature(siteProfile, "dmConversations", currentState)) {
      const conversationsPayload = probedFeatures.dmConversations || await safeGetJson(apiClient, "/agents/dm/conversations", report.errors);
      const conversations = normalizeConversations(conversationsPayload);
      for (const conversation of conversations) {
        if (parseCount(conversation.unread_count) <= 0) {
          continue;
        }
        const conversationId = conversation.conversation_id || conversation.id;
        const details = await safeGetJson(apiClient, `/agents/dm/conversations/${conversationId}`, report.errors);
        const messages = extractConversationMessages(details);
        const latestMessage = [...messages]
          .reverse()
          .find((message) => (message.sender || message.author || message.role) !== agent.name);
        if (!latestMessage) {
          continue;
        }
        if (isSuspiciousDm(latestMessage.message || latestMessage.content || "")) {
          report.notes.push(`会话 ${conversationId} 含可疑内容，已跳过自动回复`);
          continue;
        }
        const dmText = await generateWithFallback(
          contentGenerator,
          "replyToDm",
          {
            agent,
            conversation,
            latestMessage: {
              ...latestMessage,
              message: latestMessage.message || latestMessage.content || "",
            },
            slot,
          },
          report,
          fallbackGenerator,
        );
        report.counts.dms += 1;
        report.details.dms.push(
          `来自 ${conversation.with_agent?.name || conversationId}：${clipText(
            latestMessage.message || latestMessage.content || "",
            72,
          )}；我的回复：${clipText(dmText, 72)}`,
        );
        if (!dryRun) {
          await maybePostJson({
            client: apiClient,
            endpoint: `/agents/dm/conversations/${conversationId}/send`,
            body: { message: dmText },
            dryRun,
            writes: stagedWrites,
            reportErrors: report.errors,
          }).catch(() => {});
        }
      }
    }

    if (normalizedHome?.latest_moltbook_announcement?.title) {
      report.notes.push(`公告：${normalizedHome.latest_moltbook_announcement.title}`);
    }

    const followingFeed =
      siteProfile.id !== "moltcn" && supportsFeature(siteProfile, "followingFeed", currentState)
        ? probedFeatures.followingFeed || await safeGetJson(apiClient, "/feed?filter=following&sort=new&limit=5", report.errors)
        : { posts: [] };
    if (siteProfile.id !== "moltcn" && Array.isArray(followingFeed?.posts) && followingFeed.posts.length > 0) {
      markVisitedModule(currentState, "following_feed");
    }
    const feedPayload = await safeGetJson(apiClient, "/feed?sort=new&limit=12", report.errors);
    markVisitedModule(currentState, "feed");
    const slotSeeds = { morning: 0, afternoon: 1, evening: 2 };
    const queries = chooseSearchQueries({
      daySeed: slotSeeds[slot] || 0,
      slot,
      searchQueryPool: siteProfile.searchQueryPool,
    });
    markVisitedModule(currentState, "search");
    const searchPayloads = [];
    for (const query of queries) {
      const result = await safeGetJson(
        apiClient,
        `/search?q=${encodeURIComponent(query)}&type=posts&limit=3`,
        report.errors,
      );
      if (result) {
        searchPayloads.push(result);
      }
    }

    const feedPosts = Array.isArray(feedPayload?.posts) ? feedPayload.posts : [];
    const homePosts = siteProfile.id === "moltcn" ? normalizeHomeFeedPosts(normalizedHome) : [];
    if (siteProfile.id === "moltcn" && homePosts.length > 0) {
      markVisitedModule(currentState, "latest_posts");
    }
    const searchPosts = searchPayloads.flatMap((payload) => payload.results || []);
    const candidatePosts = uniqueBy([...feedPosts, ...homePosts, ...searchPosts], (post) => getPostId(post));

    const rankedPosts = [...candidatePosts].sort(
      (left, right) => rankPostForEngagement(right, siteProfile.submoltBuckets) - rankPostForEngagement(left, siteProfile.submoltBuckets),
    );
    const upvoteTargets = selectUpvoteTargets({
      posts: rankedPosts,
      state: currentState,
      siteProfile,
      agentName: agent.name,
    });
    for (const post of upvoteTargets) {
      const postId = getPostId(post);
      const authorName = getAuthorName(post);
      report.counts.upvotes += 1;
      report.details.upvotes.push(
        `社区[${getSubmoltName(post) || "unknown"}] 帖子《${clipText(post.title || post.post?.title || "", 52)}》 作者 ${authorName || "unknown"}`,
      );
      if (!dryRun) {
        markVisitedModule(currentState, "post_upvotes");
        currentState.daily_counts.upvotes += 1;
        pushUnique(currentState.interacted_submolts, getSubmoltName(post));
        try {
          await maybePostJson({
            client: apiClient,
            endpoint: `/posts/${postId}/upvote`,
            body: {},
            dryRun,
            writes: stagedWrites,
            reportErrors: report.errors,
          });
        } catch (error) {
          if (/429|rate limit/i.test(String(error.message || error))) {
            break;
          }
        }
      }
    }

    if (!dryRun) {
      const commentUpvoteThreads = [];
      for (const [postId, thread] of notificationThreadsByPostId.entries()) {
        if (postId && Array.isArray(thread?.comments) && thread.comments.length > 0) {
          commentUpvoteThreads.push(thread);
        }
      }
      const commentSort = siteProfile.id === "moltcn" ? "top" : "best";
      for (const post of rankedPosts.filter((item) => parseCount(item.comment_count) > 0).slice(0, 2)) {
        const postId = getPostId(post);
        if (!postId || notificationThreadsByPostId.has(postId)) {
          continue;
        }
        const commentsPayload = await safeGetJson(
          apiClient,
          `/posts/${postId}/comments?sort=${commentSort}&limit=10`,
          report.errors,
        );
        const comments = commentsPayload?.comments || [];
        if (comments.length > 0) {
          commentUpvoteThreads.push({ post, comments });
        }
      }
      const remainingUpvoteRunBudget = Math.max(0, Number(getEngagementPolicy(siteProfile).maxUpvotesPerRun || 0) - report.counts.upvotes);
      const commentUpvoteTargets = selectCommentUpvoteTargets({
        threads: commentUpvoteThreads,
        state: currentState,
        agentName: agent.name,
        limit: remainingUpvoteRunBudget,
      });
      for (const target of commentUpvoteTargets) {
        const commentId = getCommentId(target.comment);
        report.counts.upvotes += 1;
        report.details.upvotes.push(
          `社区[${getSubmoltName(target.post) || "unknown"}] 帖子《${clipText(target.post.title || target.post.post?.title || "", 52)}》 评论来自 ${getCommentAuthorName(
            target.comment,
          ) || "unknown"}：${clipText(target.comment.content || "", 52)}`,
        );
        markVisitedModule(currentState, "comment_upvotes");
        currentState.daily_counts.upvotes += 1;
        pushUnique(currentState.upvoted_comment_ids_today, commentId);
        pushUnique(currentState.interacted_submolts, getSubmoltName(target.post));
        try {
          await maybePostJson({
            client: apiClient,
            endpoint: `/comments/${commentId}/upvote`,
            body: {},
            dryRun,
            writes: stagedWrites,
            reportErrors: report.errors,
          });
        } catch (error) {
          if (/429|rate limit/i.test(String(error.message || error))) {
            break;
          }
        }
      }
    }

    const commentTargets = selectCommentTargets({
      posts: rankedPosts,
      state: currentState,
      siteProfile,
      agentName: agent.name,
    });
    for (const commentTarget of commentTargets) {
      const commentText = await generateWithFallback(
        contentGenerator,
        "commentOnPost",
        {
          agent,
          post: commentTarget,
          searchQueries: queries,
          followingFeed: followingFeed?.posts || [],
          slot,
        },
        report,
        fallbackGenerator,
      );
      const commentDetail = `社区[${getSubmoltName(commentTarget) || "unknown"}] 帖子《${clipText(
        commentTarget.title || commentTarget.post?.title || "",
        52,
      )}》 我的评论：${clipText(commentText, 72)}`;
      if (dryRun) {
        report.counts.comments += 1;
        report.details.comments.push(commentDetail);
        continue;
      }

      try {
        const commentResult = await maybePostJson({
          client: apiClient,
          endpoint: `/posts/${getPostId(commentTarget)}/comments`,
          body: { content: commentText },
          dryRun,
          writes: stagedWrites,
          reportErrors: report.errors,
        });
        report.counts.comments += 1;
        report.details.comments.push(commentDetail);
        markVisitedModule(currentState, "comments");
        currentState.daily_counts.comments += 1;
        pushUnique(currentState.interacted_submolts, getSubmoltName(commentTarget));
        pushUnique(currentState.engaged_post_ids_today, getPostId(commentTarget));
        await completeVerification({
          client: apiClient,
          generator: contentGenerator,
          submissionResult: commentResult,
          contentType: "comment",
        }).catch((error) => {
          report.errors.push(mapErrorToSummary(error));
        });
      } catch (error) {
        if (/commenting too frequently|rate limit/i.test(String(error.message || error))) {
          break;
        }
        throw error;
      }
    }

    const followPolicy = getEngagementPolicy(siteProfile);
    const followActionSupported = currentState.feature_support_cache.followAction?.supported;
    if (followActionSupported !== false) {
      const followCandidates = selectFollowTargets({
        posts: rankedPosts,
        state: currentState,
        agentName: agent.name,
        siteProfile,
      });
      for (const post of followCandidates) {
        if (parseCount(currentState.daily_counts.follows) >= Number(followPolicy.maxFollowsPerDay || 0)) {
          break;
        }
        const authorName = getAuthorName(post);
        if (!authorName || (currentState.followed_agent_ids_today || []).includes(authorName)) {
          continue;
        }
        const profilePayload = await safeGetJson(apiClient, `/agents/profile?name=${encodeURIComponent(authorName)}`, report.errors);
        const profileAgent = profilePayload?.agent || {};
        const qualifiesForFollow =
          parseCount(profileAgent.posts_count) >= Number(followPolicy.followMinPosts || 0) ||
          parseCount(profileAgent.comments_count) >= Number(followPolicy.followMinComments || 0);
        if (!qualifiesForFollow) {
          continue;
        }

        report.counts.follows += 1;
        report.details.follows.push(`关注了 ${authorName}`);
        if (!dryRun) {
          try {
            await maybePostJson({
              client: apiClient,
              endpoint: `/agents/${encodeURIComponent(authorName)}/follow`,
              body: {},
              dryRun,
              writes: stagedWrites,
              reportErrors: report.errors,
            });
            markVisitedModule(currentState, "follows");
            currentState.daily_counts.follows += 1;
            pushUnique(currentState.followed_agent_ids_today, authorName);
            currentState.feature_support_cache.followAction = {
              supported: true,
              checked_at: now.toISOString(),
            };
          } catch (error) {
            if (/404|405|not found|cannot post/i.test(String(error.message || error))) {
              currentState.feature_support_cache.followAction = {
                supported: false,
                checked_at: now.toISOString(),
                reason: String(error.message || error),
              };
              report.counts.follows -= 1;
              report.details.follows.pop();
              break;
            }
            throw error;
          }
        }
        if (report.counts.follows >= Number(followPolicy.maxFollowsPerRun || 0)) {
          break;
        }
      }
    }

    const postContext = buildPostContext(rootDir, localDate);
    const postCandidates = await generateWithFallback(
      contentGenerator,
      "buildPostCandidates",
        {
          slot,
          postContext,
          allowedSubmolts: siteProfile.allowedSubmolts,
          hotTopics: rankedPosts.slice(0, 5).map((post) => ({
            title: post.title,
            submolt_name: getSubmoltName(post),
        })),
      },
      report,
      fallbackGenerator,
    );
    const combinedPostCandidates = [
      ...(Array.isArray(postCandidates) ? postCandidates : []),
      ...buildFallbackPostCandidates({
        slot,
        postContext,
        hotTopics: rankedPosts.slice(0, 5).map((post) => ({
          title: post.title,
          submolt_name: getSubmoltName(post),
        })),
        allowedSubmolts: siteProfile.allowedSubmolts,
        siteProfile,
      }),
    ];
    const qualifiedCandidates = getQualifiedPostCandidates({
      candidates: combinedPostCandidates,
      state: currentState,
      slot,
      siteProfile,
    });

    if (qualifiedCandidates.length > 0) {
      if (!dryRun) {
        let publishError = null;
        let published = false;
        let stopFurtherPostAttempts = false;

        for (const candidate of qualifiedCandidates) {
          const candidateSubmolt = getCandidateSubmoltName(candidate);
          const variants = buildPostSubmissionVariants(candidate);
          for (let index = 0; index < variants.length; index += 1) {
            const variant = variants[index];
            try {
              const postResult = await apiClient.postJson("/posts", {
                [siteProfile.postFieldName]: candidateSubmolt,
                title: variant.title,
                content: variant.content,
              });
              await completeVerification({
                client: apiClient,
                generator: contentGenerator,
                submissionResult: postResult,
                contentType: "post",
              }).catch((error) => {
                report.errors.push(mapErrorToSummary(error));
              });
              const createdPostId = extractCreatedPostId(postResult);
              const publishCheck = await ensurePublishedStatus({
                client: apiClient,
                postId: createdPostId,
                reportErrors: report.errors,
                attempts: POST_STATUS_CHECK_ATTEMPTS,
                retryDelayMs: POST_STATUS_CHECK_DELAY_MS,
              });

              if (!publishCheck.published) {
                publishError = new Error(`发帖未发布成功：${publishCheck.status || publishCheck.reason || "pending"}`);
                if (createdPostId) {
                  stopFurtherPostAttempts = true;
                  break;
                }
                continue;
              }

              if (index > 0) {
                report.notes.push("发帖降级：使用保守 payload 重试成功");
              }
              report.post = {
                created: true,
                submolt: candidateSubmolt,
                postId: createdPostId,
              };
              report.details.posts.push(
                `社区[${candidateSubmolt}] 标题《${clipText(variant.title, 60)}》 内容摘要：${clipText(
                  variant.content,
                  72,
                )}`,
              );
              markVisitedModule(currentState, "posts");
              currentState.daily_counts.posts += 1;
              currentState.posts_by_slot[slot] = parseCount(currentState.posts_by_slot[slot]) + 1;
              currentState.last_post_at = now.toISOString();
              pushUnique(currentState.recent_post_ids, createdPostId);
              pushUnique(currentState.interacted_submolts, candidateSubmolt);
              published = true;
              break;
            } catch (error) {
              publishError = error;
              if (!isRetryablePostPublishError(error)) {
                stopFurtherPostAttempts = true;
                break;
              }
            }
          }
          if (published || stopFurtherPostAttempts) {
            break;
          }
        }

        if (!published && publishError) {
          report.errors.push(mapErrorToSummary(publishError));
        }
      } else {
        report.notes.push(`本轮可发帖候选：${qualifiedCandidates[0].title}`);
      }
    } else {
      report.notes.push("本轮无合格发帖候选");
    }
  } catch (error) {
    if (!error?.__openclawReported) {
      report.errors.push(mapErrorToSummary(error));
    }
  }

  writeJson(paths.statePath, currentState);
  appendJsonLine(paths.activityPath, {
    ts: now.toISOString(),
    site: siteProfile.id,
    slot,
    dryRun,
    counts: report.counts,
    post: report.post,
    notes: report.notes,
    errors: report.errors,
    state: {
      local_date: currentState.local_date,
      daily_counts: currentState.daily_counts,
      interacted_submolts: currentState.interacted_submolts,
      visited_modules_today: currentState.visited_modules_today,
    },
    network: typeof apiClient.getRequestDiagnostics === "function" ? apiClient.getRequestDiagnostics() : undefined,
  });

  report.details = await localizeReportDetails(report, contentGenerator, fallbackGenerator);
  const summary = formatRunSummary(report);
  return { summary, report, state: currentState, writes: stagedWrites };
}

function main() {
  const { command, site, slot, dryRun, root } = parseArgs(process.argv);
  if (command !== "run") {
    console.error("Unsupported command. Use: run [--site moltbook|moltcn] --slot morning|afternoon|evening [--dry-run]");
    process.exit(1);
  }
  if (!slot) {
    console.error("Missing required --slot morning|afternoon|evening");
    process.exit(1);
  }
  runSlot({ slot, site, dryRun, rootDir: root })
    .then((result) => {
      process.stdout.write(`${result.summary}\n`);
    })
    .catch((error) => {
      console.error(mapErrorToSummary(error));
      process.exit(1);
    });
}

if (require.main === module) {
  main();
}

module.exports = {
  TIMEZONE,
  SLOT_LABELS,
  SITE_PROFILES,
  resolveSiteProfile,
  createDefaultState,
  normalizeStateForDate,
  canPostInSlot,
  classifySubmolt,
  resolveSiteProfile,
  getQualifiedPostCandidates,
  formatRunSummary,
  localizeReportDetails,
  chooseSearchQueries,
  isSuspiciousDm,
  completeVerification,
  buildCronJobs,
  resolveGenerationConfig,
  selectCommentTarget,
  selectCommentTargets,
  selectQualifiedPostCandidate,
  selectUpvoteTargets,
  resolveSiteCredentials,
  normalizeVerificationAnswer,
  solveObfuscatedMathChallenge,
  parseGeneratedJson,
  ensurePublishedStatus,
  runSlot,
  createApiClient,
  parseArgs,
};
