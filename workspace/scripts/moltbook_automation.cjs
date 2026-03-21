#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const TIMEZONE = "Asia/Shanghai";
const API_BASE_URL = "https://www.moltbook.com/api/v1";
const SLOT_LABELS = {
  morning: "早巡检",
  afternoon: "午后巡检",
  evening: "晚巡检",
};

const SUBMOLT_BUCKETS = {
  openclaw: new Set(["openclaw-explorers", "openclaw"]),
  technical: new Set(["agentops", "agent-ops", "debugging", "memory", "tooling", "agentskills"]),
  general: new Set(["buildlogs", "todayilearned", "general", "meta"]),
};
const SEARCH_QUERY_POOL = ["openclaw", "agentops", "debugging", "memory", "skills", "workflow", "automation"];
const DM_SUSPICIOUS_PATTERNS = [
  /seed phrase/i,
  /connect wallet/i,
  /guaranteed profit/i,
  /http[s]?:\/\/\S+/i,
  /airdrop/i,
  /private key/i,
  /click (this )?link/i,
];

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
    processed_dm_request_ids: [],
    interacted_submolts: [],
    recent_post_ids: [],
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
    processed_dm_request_ids: Array.isArray(base.processed_dm_request_ids)
      ? [...base.processed_dm_request_ids]
      : [],
    interacted_submolts: Array.isArray(base.interacted_submolts) ? [...base.interacted_submolts] : [],
    recent_post_ids: Array.isArray(base.recent_post_ids) ? [...base.recent_post_ids] : [],
    suspicious_agents:
      base.suspicious_agents && typeof base.suspicious_agents === "object" ? { ...base.suspicious_agents } : {},
  };

  if (current.local_date === localDate) {
    return current;
  }

  const next = createDefaultState(localDate);
  next.last_post_at = null;
  next.suspicious_agents = current.suspicious_agents;
  return next;
}

function canPostInSlot(state, slot) {
  if (!["morning", "evening"].includes(slot)) {
    return { allowed: false, reason: "slot_not_allowed" };
  }

  const postsToday = Number(state?.daily_counts?.posts || 0);
  if (postsToday >= 2) {
    return { allowed: false, reason: "daily_limit_reached" };
  }

  const slotPosts = Number(state?.posts_by_slot?.[slot] || 0);
  if (slotPosts >= 1) {
    return { allowed: false, reason: "slot_limit_reached" };
  }

  return { allowed: true, reason: "ok" };
}

function classifySubmolt(submoltName) {
  const normalized = String(submoltName || "").trim().toLowerCase();
  for (const [bucket, names] of Object.entries(SUBMOLT_BUCKETS)) {
    if (names.has(normalized)) {
      return bucket;
    }
  }
  return "other";
}

function formatRunSummary(report) {
  const counts = report.counts || {};
  const notes = Array.isArray(report.notes) ? report.notes : [];
  const errors = Array.isArray(report.errors) ? report.errors : [];
  const slotLabel = SLOT_LABELS[report.slot] || "巡检";
  const prefix = report.dryRun ? "[dry-run] " : "";
  const postLine = report.post?.created
    ? `发帖 1（${report.post.submolt}${report.post.postId ? ` / ${report.post.postId}` : ""}）`
    : "发帖 0";

  const lines = [
    `${prefix}Moltbook ${slotLabel}`,
    `回复 ${Number(counts.replies || 0)}，私信 ${Number(counts.dms || 0)}，点赞 ${Number(counts.upvotes || 0)}，评论 ${Number(counts.comments || 0)}，关注 ${Number(counts.follows || 0)}，${postLine}`,
  ];

  if (notes.length > 0) {
    lines.push(`备注：${notes.join("；")}`);
  }
  if (errors.length > 0) {
    lines.push(`异常：${errors.join("；")}`);
  }

  return lines.join("\n");
}

function chooseSearchQueries({ daySeed = 0, slot = "morning" } = {}) {
  const slotOffsets = { morning: 0, afternoon: 2, evening: 4 };
  const offset = (Number(daySeed) + (slotOffsets[slot] || 0)) % SEARCH_QUERY_POOL.length;
  const size = slot === "evening" ? 4 : 3;
  const queries = [];
  for (let index = 0; index < size; index += 1) {
    queries.push(SEARCH_QUERY_POOL[(offset + index) % SEARCH_QUERY_POOL.length]);
  }
  return queries;
}

function isSuspiciousDm(text) {
  const content = String(text || "").trim();
  if (!content) {
    return true;
  }
  return DM_SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(content));
}

async function completeVerification({ client, generator, submissionResult, contentType }) {
  const payload = submissionResult?.[contentType];
  const verification = payload?.verification || submissionResult?.verification;
  if (!verification?.verification_code) {
    return { verified: false, skipped: true };
  }

  if (!generator || typeof generator.solveVerification !== "function") {
    throw new Error("Verification required but no solver is available");
  }

  const answer = await generator.solveVerification({
    challengeText: verification.challenge_text || "",
    instructions: verification.instructions || "",
  });
  const response = await client.postJson("/verify", {
    verification_code: verification.verification_code,
    answer,
  });

  return {
    verified: Boolean(response?.success),
    answer,
    response,
  };
}

function buildCronJobs({ agentId = "main", delivery, rootDir }) {
  const scriptPath = path.join(rootDir, "workspace", "scripts", "moltbook_automation.cjs");
  const slots = [
    { id: "moltbook-morning", name: "Moltbook-早巡检", slot: "morning", expr: "30 9 * * *" },
    { id: "moltbook-afternoon", name: "Moltbook-午后巡检", slot: "afternoon", expr: "30 14 * * *" },
    { id: "moltbook-evening", name: "Moltbook-晚巡检", slot: "evening", expr: "30 21 * * *" },
  ];

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
      message: `请使用exec工具执行：node ${scriptPath} run --slot ${item.slot}。执行成功后直接输出脚本返回的中文摘要；如果脚本失败，输出失败原因。`,
    },
    delivery: {
      mode: "announce",
      ...delivery,
    },
  }));
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const slotIndex = args.indexOf("--slot");
  const rootIndex = args.indexOf("--root");
  return {
    command: args[0] || "run",
    slot: slotIndex >= 0 ? args[slotIndex + 1] : undefined,
    dryRun,
    root:
      rootIndex >= 0 && args[rootIndex + 1]
        ? path.resolve(args[rootIndex + 1])
        : path.resolve(__dirname, "..", ".."),
  };
}

function resolvePaths(rootDir) {
  return {
    rootDir,
    workspaceDir: path.join(rootDir, "workspace"),
    openclawConfigPath: path.join(rootDir, "openclaw.json"),
    moltbookDir: path.join(rootDir, "moltbook"),
    credentialsPath: path.join(rootDir, "moltbook", "credentials.json"),
    statePath: path.join(rootDir, "moltbook", "state.json"),
    activityPath: path.join(rootDir, "moltbook", "activity.jsonl"),
  };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonIfExists(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) {
    return fallbackValue;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function appendJsonLine(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`);
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

function getSubmoltName(post) {
  return post?.submolt?.name || post?.submolt_name || post?.submoltName || "";
}

function getAuthorName(post) {
  return post?.author?.name || post?.author_name || post?.with_agent?.name || "";
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

function rankPostForEngagement(post) {
  const bucket = classifySubmolt(getSubmoltName(post));
  const bucketWeight = { openclaw: 300, technical: 200, general: 100, other: 0 }[bucket];
  const commentCount = parseCount(post?.comment_count);
  const upvotes = parseCount(post?.upvotes);
  return bucketWeight + commentCount * 10 + upvotes;
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
    .filter((comment) => comment.author_id !== agentId && comment.author?.name !== agentName)
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));
  return flat[0] || null;
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

function selectQualifiedPostCandidate({ candidates, state, slot }) {
  const permission = canPostInSlot(state, slot);
  if (!permission.allowed) {
    return null;
  }
  const qualified = (candidates || []).filter((candidate) => {
    const scores = candidate?.scores || {};
    return (
      Number(scores.relevance || 0) >= 8 &&
      Number(scores.novelty || 0) >= 7 &&
      Number(scores.specificity || 0) >= 7
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

  return qualified[0] || null;
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
  };
}

function loadOpenClawConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function resolveGenerationConfig(rootDir) {
  const config = loadOpenClawConfig(path.join(rootDir, "openclaw.json"));
  const provider = config?.models?.providers?.qwen;
  const modelId = provider?.models?.[0]?.id;
  if (!provider?.baseUrl || !provider?.apiKey || !modelId) {
    return null;
  }
  return {
    baseUrl: provider.baseUrl.replace(/\/+$/, ""),
    apiKey: provider.apiKey,
    model: modelId,
  };
}

function stripCodeFences(text) {
  return String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

async function openAiCompatibleChat({ config, system, user, expectJson = false }) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: expectJson ? 0.2 : 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Generator request failed (${response.status}): ${text.slice(0, 400)}`);
  }

  const payload = JSON.parse(text);
  const content = payload?.choices?.[0]?.message?.content || "";
  return expectJson ? JSON.parse(stripCodeFences(content)) : String(content).trim();
}

function buildModelGenerator(rootDir) {
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
          "You write short, specific Moltbook replies for an OpenClaw agent. Match the thread language. Be concrete, friendly, and non-fluffy. Output only the reply text.",
        user: `Language: ${languageHint}\nPost title: ${post?.title || ""}\nComment: ${comment?.content || ""}\nWrite one concise reply that adds value and stays under 120 words.`,
      });
    },
    async replyToDm({ latestMessage }) {
      const languageHint = /[\u4e00-\u9fff]/.test(latestMessage?.message || "") ? "Chinese" : "English";
      return openAiCompatibleChat({
        config,
        system:
          "You write private DM replies for a practical OpenClaw agent. Be concise, helpful, and action-oriented. Output only the reply text.",
        user: `Language: ${languageHint}\nLatest message: ${latestMessage?.message || ""}\nWrite one concise reply under 100 words.`,
      });
    },
    async commentOnPost({ post }) {
      const languageHint = /[\u4e00-\u9fff]/.test(`${post?.title || ""}\n${post?.content || ""}`) ? "Chinese" : "English";
      return openAiCompatibleChat({
        config,
        system:
          "You write thoughtful Moltbook comments for an OpenClaw agent. Be specific, grounded, and useful. Output only the comment text.",
        user: `Language: ${languageHint}\nPost title: ${post?.title || ""}\nPost content: ${post?.content || ""}\nWrite one concise comment under 120 words that adds practical value.`,
      });
    },
    async buildPostCandidates({ slot, postContext, hotTopics }) {
      return openAiCompatibleChat({
        config,
        expectJson: true,
        system:
          "You generate high-quality Moltbook post candidates for a practical OpenClaw agent. Return strict JSON only.",
        user: JSON.stringify({
          task: "Generate up to 3 Moltbook post candidates for today's automation slot.",
          slot,
          allowedSubmolts: [
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
          ],
          scoringThresholds: { relevance: 8, novelty: 7, specificity: 7 },
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
  };
}

function createApiClient({ apiKey, baseUrl = API_BASE_URL }) {
  async function request(method, endpoint, body) {
    const url = `${baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
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
  };
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
    throw error;
  }
}

async function runSlot({
  slot,
  dryRun = false,
  rootDir = path.resolve(__dirname, "..", ".."),
  now = new Date(),
  client,
  generator,
} = {}) {
  if (!SLOT_LABELS[slot]) {
    throw new Error(`Unsupported slot "${slot}"`);
  }

  const paths = resolvePaths(rootDir);
  ensureDir(paths.moltbookDir);
  ensureFile(paths.activityPath, "");

  const localDate = getLocalDateString(now, TIMEZONE);
  const credentials = readJsonIfExists(paths.credentialsPath, null);
  if (!credentials?.api_key || !credentials?.agent_name) {
    throw new Error(`Missing Moltbook credentials at ${paths.credentialsPath}`);
  }

  const currentState = normalizeStateForDate(readJsonIfExists(paths.statePath, createDefaultState(localDate)), localDate);
  writeJson(paths.statePath, currentState);

  const apiClient = client || createApiClient({ apiKey: credentials.api_key });
  const contentGenerator = generator || buildModelGenerator(rootDir);
  const report = {
    slot,
    dryRun,
    counts: { replies: 0, dms: 0, upvotes: 0, comments: 0, follows: 0 },
    post: { created: false, submolt: null, postId: null },
    notes: [],
    errors: [],
  };
  const stagedWrites = [];

  try {
    const mePayload = await apiClient.getJson("/agents/me");
    const statusPayload = await apiClient.getJson("/agents/status");
    const homePayload = await apiClient.getJson("/home");

    if (statusPayload?.status !== "claimed") {
      throw new Error(`Agent status is not claimed: ${statusPayload?.status || "unknown"}`);
    }

    const agent = mePayload?.agent || { id: null, name: credentials.agent_name };
    const activityItems = Array.isArray(homePayload?.activity_on_your_posts) ? homePayload.activity_on_your_posts : [];
    for (const item of activityItems) {
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
      const replyText = await contentGenerator.replyToPostActivity({
        agent,
        post: { id: item.post_id, title: item.post_title, submolt_name: item.submolt_name },
        comment: targetComment,
        comments,
        slot,
      });
      report.counts.replies += 1;
      if (!dryRun) {
        currentState.daily_counts.comments += 1;
        const replyResult = await maybePostJson({
          client: apiClient,
          endpoint: `/posts/${item.post_id}/comments`,
          body: { content: replyText, parent_id: targetComment.id },
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
        await maybePostJson({
          client: apiClient,
          endpoint: `/notifications/read-by-post/${item.post_id}`,
          body: {},
          dryRun,
          writes: stagedWrites,
          reportErrors: report.errors,
        });
        pushUnique(currentState.processed_notification_post_ids, item.post_id);
        pushUnique(currentState.interacted_submolts, item.submolt_name);
      }
    }

    const dmRequestsPayload = await safeGetJson(apiClient, "/agents/dm/requests", report.errors);
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

    const conversationsPayload = await safeGetJson(apiClient, "/agents/dm/conversations", report.errors);
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
      const dmText = await contentGenerator.replyToDm({
        agent,
        conversation,
        latestMessage: {
          ...latestMessage,
          message: latestMessage.message || latestMessage.content || "",
        },
        slot,
      });
      report.counts.dms += 1;
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

    if (homePayload?.latest_moltbook_announcement?.title) {
      report.notes.push(`公告：${homePayload.latest_moltbook_announcement.title}`);
    }

    const followingFeed = await safeGetJson(apiClient, "/feed?filter=following&sort=new&limit=5", report.errors);
    const feedPayload = await safeGetJson(apiClient, "/feed?sort=new&limit=12", report.errors);
    const slotSeeds = { morning: 0, afternoon: 1, evening: 2 };
    const queries = chooseSearchQueries({ daySeed: slotSeeds[slot] || 0, slot });
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
    const searchPosts = searchPayloads.flatMap((payload) => payload.results || []);
    const candidatePosts = uniqueBy([...feedPosts, ...searchPosts], (post) => post.id || post.post_id);

    const rankedPosts = [...candidatePosts].sort((left, right) => rankPostForEngagement(right) - rankPostForEngagement(left));
    const upvoteTargets = rankedPosts.slice(0, Math.min(15, rankedPosts.length));
    for (const post of upvoteTargets) {
      const postId = post.id || post.post_id;
      report.counts.upvotes += 1;
      if (!dryRun) {
        currentState.daily_counts.upvotes += 1;
        pushUnique(currentState.interacted_submolts, getSubmoltName(post));
        await maybePostJson({
          client: apiClient,
          endpoint: `/posts/${postId}/upvote`,
          body: {},
          dryRun,
          writes: stagedWrites,
          reportErrors: report.errors,
        }).catch(() => {});
      }
    }

    const commentTarget = rankedPosts.find((post) => parseCount(post.comment_count) > 0 && classifySubmolt(getSubmoltName(post)) !== "other");
    if (commentTarget) {
      const commentText = await contentGenerator.commentOnPost({
        agent,
        post: commentTarget,
        searchQueries: queries,
        followingFeed: followingFeed?.posts || [],
        slot,
      });
      report.counts.comments += 1;
      if (!dryRun) {
        currentState.daily_counts.comments += 1;
        pushUnique(currentState.interacted_submolts, getSubmoltName(commentTarget));
        const commentResult = await maybePostJson({
          client: apiClient,
          endpoint: `/posts/${commentTarget.id || commentTarget.post_id}/comments`,
          body: { content: commentText },
          dryRun,
          writes: stagedWrites,
          reportErrors: report.errors,
        });
        await completeVerification({
          client: apiClient,
          generator: contentGenerator,
          submissionResult: commentResult,
          contentType: "comment",
        }).catch((error) => {
          report.errors.push(mapErrorToSummary(error));
        });
      }
    }

    const postContext = buildPostContext(rootDir, localDate);
    const postCandidates = await contentGenerator.buildPostCandidates({
      slot,
      postContext,
      hotTopics: rankedPosts.slice(0, 5).map((post) => ({
        title: post.title,
        submolt_name: getSubmoltName(post),
      })),
    });
    const selectedCandidate = selectQualifiedPostCandidate({
      candidates: Array.isArray(postCandidates) ? postCandidates : [],
      state: currentState,
      slot,
    });

    if (selectedCandidate) {
      if (!dryRun) {
        const postResult = await maybePostJson({
          client: apiClient,
          endpoint: "/posts",
          body: {
            submolt_name: selectedCandidate.submolt_name,
            title: selectedCandidate.title,
            content: selectedCandidate.content,
          },
          dryRun,
          writes: stagedWrites,
          reportErrors: report.errors,
        });
        await completeVerification({
          client: apiClient,
          generator: contentGenerator,
          submissionResult: postResult,
          contentType: "post",
        }).catch((error) => {
          report.errors.push(mapErrorToSummary(error));
        });
        report.post = {
          created: true,
          submolt: selectedCandidate.submolt_name,
          postId: postResult?.post?.id || null,
        };
        currentState.daily_counts.posts += 1;
        currentState.posts_by_slot[slot] = parseCount(currentState.posts_by_slot[slot]) + 1;
        currentState.last_post_at = now.toISOString();
        pushUnique(currentState.recent_post_ids, postResult?.post?.id || null);
        pushUnique(currentState.interacted_submolts, selectedCandidate.submolt_name);
      } else {
        report.notes.push(`本轮可发帖候选：${selectedCandidate.title}`);
      }
    } else {
      report.notes.push("本轮无合格发帖候选");
    }
  } catch (error) {
    report.errors.push(mapErrorToSummary(error));
  }

  writeJson(paths.statePath, currentState);
  appendJsonLine(paths.activityPath, {
    ts: now.toISOString(),
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
    },
  });

  const summary = formatRunSummary(report);
  return { summary, report, state: currentState, writes: stagedWrites };
}

function main() {
  const { command, slot, dryRun, root } = parseArgs(process.argv);
  if (command !== "run") {
    console.error("Unsupported command. Use: run --slot morning|afternoon|evening [--dry-run]");
    process.exit(1);
  }
  if (!slot) {
    console.error("Missing required --slot morning|afternoon|evening");
    process.exit(1);
  }
  runSlot({ slot, dryRun, rootDir: root })
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
  createDefaultState,
  normalizeStateForDate,
  canPostInSlot,
  classifySubmolt,
  formatRunSummary,
  chooseSearchQueries,
  isSuspiciousDm,
  completeVerification,
  buildCronJobs,
  selectQualifiedPostCandidate,
  runSlot,
  createApiClient,
  parseArgs,
};
