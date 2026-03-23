const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");

const {
  createDefaultState,
  normalizeStateForDate,
  canPostInSlot,
  classifySubmolt,
  formatRunSummary,
  localizeReportDetails,
  chooseSearchQueries,
  isSuspiciousDm,
  completeVerification,
  buildCronJobs,
  selectQualifiedPostCandidate,
  selectUpvoteTargets,
  normalizeVerificationAnswer,
  parseGeneratedJson,
  solveObfuscatedMathChallenge,
  ensurePublishedStatus,
  runSlot,
  createApiClient,
  resolveGenerationConfig,
  selectCommentTarget,
  resolveSiteProfile,
  getQualifiedPostCandidates,
  selectCommentTargets,
} = require("./moltbook_automation.cjs");

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "moltbook-automation-"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function createFakeClient(fixtures) {
  const reads = [];
  const writes = [];
  const clone = (value) => JSON.parse(JSON.stringify(value));
  return {
    reads,
    writes,
    async getJson(endpoint) {
      reads.push(endpoint);
      if (!(endpoint in fixtures)) {
        throw new Error(`Missing fixture for ${endpoint}`);
      }
      return clone(fixtures[endpoint]);
    },
    async postJson(endpoint, body) {
      writes.push({ method: "POST", endpoint, body });
      const key = `POST ${endpoint}`;
      if (key in fixtures) {
        return clone(fixtures[key]);
      }
      return { success: true };
    },
    async deleteJson(endpoint) {
      writes.push({ method: "DELETE", endpoint });
      const key = `DELETE ${endpoint}`;
      if (key in fixtures) {
        return clone(fixtures[key]);
      }
      return { success: true };
    },
  };
}

test("normalizeStateForDate resets daily counters but keeps suspicious agents", () => {
  const state = {
    local_date: "2026-03-20",
    daily_counts: { posts: 2, comments: 4, upvotes: 10, follows: 1 },
    posts_by_slot: { morning: 1, evening: 1 },
    suspicious_agents: {
      spammer_bot: { reason: "malicious_link", last_seen_at: "2026-03-20T10:00:00.000Z" },
    },
    interacted_submolts: ["openclaw"],
  };

  const result = normalizeStateForDate(state, "2026-03-21");

  assert.equal(result.local_date, "2026-03-21");
  assert.deepEqual(result.daily_counts, { posts: 0, comments: 0, upvotes: 0, follows: 0 });
  assert.deepEqual(result.posts_by_slot, { morning: 0, afternoon: 0, evening: 0 });
  assert.deepEqual(result.interacted_submolts, []);
  assert.equal(result.suspicious_agents.spammer_bot.reason, "malicious_link");
});

test("canPostInSlot enforces slot and daily limits", () => {
  const state = createDefaultState("2026-03-21");

  assert.equal(canPostInSlot(state, "morning").allowed, true);
  assert.equal(canPostInSlot(state, "afternoon").allowed, true);
  assert.equal(canPostInSlot(state, "evening").allowed, true);

  state.daily_counts.posts = 1;
  state.posts_by_slot.morning = 1;
  assert.equal(canPostInSlot(state, "morning").allowed, false);
  assert.equal(canPostInSlot(state, "afternoon").allowed, true);
  assert.equal(canPostInSlot(state, "evening").allowed, true);

  state.daily_counts.posts = 2;
  state.posts_by_slot.afternoon = 1;
  assert.equal(canPostInSlot(state, "afternoon").allowed, false);
  state.posts_by_slot.evening = 1;
  assert.equal(canPostInSlot(state, "evening").allowed, false);
});

test("resolveGenerationConfig reads env-backed provider api keys from openclaw config", () => {
  const rootDir = makeTempRoot();
  writeJson(path.join(rootDir, "openclaw.json"), {
    models: {
      providers: {
        qwen: {
          baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
          apiKey: { source: "env", provider: "default", id: "QWEN_API_KEY" },
          models: [{ id: "qwen3-vl-plus" }],
        },
      },
    },
  });

  const result = resolveGenerationConfig(rootDir, { QWEN_API_KEY: "qwen-test-key" });

  assert.deepEqual(result, {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: "qwen-test-key",
    model: "qwen3-vl-plus",
  });
});

test("classifySubmolt maps target communities into required buckets", () => {
  assert.equal(classifySubmolt("openclaw-explorers"), "openclaw");
  assert.equal(classifySubmolt("agentops"), "technical");
  assert.equal(classifySubmolt("todayilearned"), "general");
  assert.equal(classifySubmolt("unknown-space"), "other");
});

test("formatRunSummary renders a compact Chinese status report", () => {
  const text = formatRunSummary({
    slot: "morning",
    dryRun: false,
    counts: { replies: 2, dms: 1, upvotes: 9, comments: 3, follows: 1 },
    details: {
      replies: ['社区[introductions] 帖子《你好，Moltbook》 来自 HelperBot：欢迎你；我的回复：我专注于实用自动化。'],
      dms: ['来自 HelpfulBot：我想聊聊状态文件；我的回复：我会保持 state 简短清晰。'],
      upvotes: ['社区[openclaw-explorers] 帖子《Cron pattern》 作者 a1'],
      comments: ['社区[agentops] 帖子《Runbook》 我的评论：显式重试会让运维更稳。'],
      follows: ["关注了 a1"],
      posts: ['社区[openclaw-explorers] 标题《State files that reduced drift》 内容摘要：更短的状态文件降低了重复劳动。'],
    },
    post: { created: true, submolt: "openclaw-explorers", postId: "post-123" },
    notes: ["处理 1 个可疑私信请求"],
    errors: [],
  });

  assert.match(text, /Moltbook 早巡检/);
  assert.match(text, /统计：/);
  assert.match(text, /回复 2/);
  assert.match(text, /私信 1/);
  assert.match(text, /点赞 9/);
  assert.match(text, /评论 3/);
  assert.match(text, /关注 1/);
  assert.match(text, /发帖 1/);
  assert.match(text, /发帖详情：/);
  assert.match(text, /openclaw-explorers/);
  assert.match(text, /post-123/);
  assert.match(text, /回复内容：/);
  assert.match(text, /私信内容：/);
  assert.match(text, /点赞内容：/);
  assert.match(text, /评论内容：/);
  assert.match(text, /关注内容：/);
  assert.match(text, /发帖内容：/);
  assert.match(text, /可疑私信请求/);
});

test("localizeReportDetails uses generator translation when available", async () => {
  const translated = await localizeReportDetails(
    {
      details: {
        replies: ['Community[introductions] Post "Hello Moltbook" from xy: "Great setup" ; my reply: "Thanks"'],
        dms: [],
        upvotes: [],
        comments: [],
        follows: [],
        posts: [],
      },
    },
    {
      async translateLinesToChinese({ lines }) {
        return lines.map((line) =>
          line.replace(
            'Community[introductions] Post "Hello Moltbook" from xy: "Great setup" ; my reply: "Thanks"',
            '社区[introductions] 帖子《Hello Moltbook》 来自 xy：很棒的设置；我的回复：谢谢',
          ),
        );
      },
    },
  );

  assert.match(translated.replies[0], /社区\[introductions\]/);
  assert.match(translated.replies[0], /我的回复/);
});

test("chooseSearchQueries rotates through the fixed query pool", () => {
  const queries = chooseSearchQueries({ daySeed: 2, slot: "evening" });
  assert.equal(Array.isArray(queries), true);
  assert.equal(queries.length >= 2 && queries.length <= 4, true);
  assert.equal(new Set(queries).size, queries.length);
  assert.equal(queries.every((query) => typeof query === "string" && query.length > 0), true);
});

test("isSuspiciousDm flags malicious or empty-value requests", () => {
  assert.equal(isSuspiciousDm("Guaranteed profit, connect wallet now: https://scam.example"), true);
  assert.equal(isSuspiciousDm("click this link and share your seed phrase"), true);
  assert.equal(isSuspiciousDm("Hey, my human wants to compare OpenClaw cron setups."), false);
});

test("completeVerification solves challenge and calls /verify once", async () => {
  const calls = [];
  const client = {
    async postJson(endpoint, body) {
      calls.push({ endpoint, body });
      return { success: true, message: "Verification successful!" };
    },
  };

  const result = await completeVerification({
    client,
    generator: {
      async solveVerification({ challengeText }) {
        assert.match(challengeText, /lO\^bSt-Er/i);
        return "15.00";
      },
    },
    submissionResult: {
      success: true,
      comment: {
        id: "comment-1",
        verification_status: "pending",
        verification: {
          verification_code: "verify-123",
          challenge_text: "A] lO^bSt-Er S[wImS aT/ tW]eNn-Tyy mE^tE[rS aNd] SlO/wS bY^ fI[vE",
          instructions: "Solve and return only the number with 2 decimal places.",
        },
      },
    },
    contentType: "comment",
  });

  assert.equal(result.verified, true);
  assert.deepEqual(calls, [
    {
      endpoint: "/verify",
      body: { verification_code: "verify-123", answer: "15.00" },
    },
  ]);
});

test("normalizeVerificationAnswer extracts and formats numeric answers", () => {
  assert.equal(normalizeVerificationAnswer("15"), "15.00");
  assert.equal(normalizeVerificationAnswer("Answer: 15.5"), "15.50");
  assert.equal(normalizeVerificationAnswer("The answer is 42.00\n"), "42.00");
  assert.equal(normalizeVerificationAnswer("35.00 + 12.00 = 47.00"), "47.00");
});

test("solveObfuscatedMathChallenge handles spelled-out addition and subtraction", () => {
  assert.equal(
    solveObfuscatedMathChallenge(
      "A] LoOoBssStEr'S ClAw-FoRcE Is ThIrTy FiVe NeWtOoNs ~ AnD In A DoMiNaNcE FiGhT It GaAiInS TwElVe NeWtOoNs, HoW MuCh ToTaL FoR/cE?",
    ),
    "47.00",
  );

  assert.equal(
    solveObfuscatedMathChallenge(
      "A] lO^bSt-Er S[wImS aT/ tW]eNn-Tyy mE^tE[rS aNd] SlO/wS bY^ fI[vE, wH-aTs] ThE/ nEw^ SpE[eD?",
    ),
    "15.00",
  );
});

test("buildCronJobs emits three isolated QQ delivery jobs", () => {
  const jobs = buildCronJobs({
    agentId: "main",
    delivery: { channel: "qqbot", to: "qqbot:c2c:test-user" },
    rootDir: "C:\\Users\\20961\\.openclaw",
  });

  assert.equal(jobs.length, 3);
  assert.deepEqual(
    jobs.map((job) => job.schedule.expr),
    ["30 9 * * *", "30 14 * * *", "30 21 * * *"],
  );
  assert.equal(jobs.every((job) => job.sessionTarget === "isolated"), true);
  assert.equal(jobs.every((job) => job.payload.kind === "agentTurn"), true);
  assert.equal(jobs.every((job) => /moltbook_automation\.cjs run --slot/.test(job.payload.message)), true);
  assert.equal(jobs.every((job) => /[^\x00-\x7F]/.test(job.payload.message) === false), true);
  assert.equal(jobs.every((job) => job.delivery.to === "qqbot:c2c:test-user"), true);
});

test("buildCronJobs emits offset Moltcn jobs with site flag", () => {
  const jobs = buildCronJobs({
    agentId: "main",
    delivery: { channel: "qqbot", to: "qqbot:c2c:test-user" },
    rootDir: "C:\\Users\\20961\\.openclaw",
    site: "moltcn",
  });

  assert.equal(jobs.length, 3);
  assert.deepEqual(
    jobs.map((job) => job.schedule.expr),
    ["40 9 * * *", "40 14 * * *", "40 21 * * *"],
  );
  assert.equal(jobs.every((job) => /--site moltcn/.test(job.payload.message)), true);
  assert.equal(jobs.every((job) => job.name.startsWith("Moltcn-")), true);
});

test("createApiClient retries transient fetch failures and preserves the endpoint in errors", async () => {
  const originalFetch = global.fetch;
  let calls = 0;

  global.fetch = async () => {
    calls += 1;
    if (calls < 2) {
      throw new TypeError("fetch failed");
    }
    return new Response(JSON.stringify({ success: true, ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    };

    try {
      const client = createApiClient({ apiKey: "test-key", baseUrl: "https://example.com", env: {} });
      const payload = await client.getJson("/home");
      assert.equal(calls, 2);
      assert.equal(payload.ok, true);
    } finally {
      global.fetch = originalFetch;
    }
  });

test("createApiClient prefers curl when proxy env is present", async () => {
  let fetchCalls = 0;
  let curlCalls = 0;
  const client = createApiClient({
    apiKey: "test-key",
    baseUrl: "https://example.com",
    env: { HTTPS_PROXY: "http://127.0.0.1:7890" },
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error("fetch should not be used when proxy env is present");
    },
    curlImpl: () => {
      curlCalls += 1;
      return {
        status: 0,
        stdout: '{"success":true,"ok":true}\n__CURL_STATUS__:200',
        stderr: "",
      };
    },
  });

  const payload = await client.getJson("/home");
  assert.equal(fetchCalls, 0);
  assert.equal(curlCalls, 1);
  assert.equal(payload.ok, true);
});

test("createApiClient falls back to fetch when curl proxy request fails", async () => {
  let fetchCalls = 0;
  let curlCalls = 0;
  const client = createApiClient({
    apiKey: "test-key",
    baseUrl: "https://example.com",
    env: { HTTPS_PROXY: "http://127.0.0.1:7890" },
    fetchImpl: async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({ success: true, ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
    curlImpl: () => {
      curlCalls += 1;
      return {
        status: 35,
        stdout: "",
        stderr: "curl: (35) schannel: failed to receive handshake, SSL/TLS connection failed",
      };
    },
  });

  const payload = await client.getJson("/home");
  assert.equal(curlCalls, 1);
  assert.equal(fetchCalls, 1);
  assert.equal(payload.ok, true);
});

test("createApiClient preserves endpoint context when proxy curl and fetch both fail", async () => {
  const client = createApiClient({
    apiKey: "test-key",
    baseUrl: "https://example.com",
    env: { HTTPS_PROXY: "http://127.0.0.1:7890" },
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
    curlImpl: () => {
      return {
        status: 35,
        stdout: "",
        stderr: "curl: (35) schannel: failed to receive handshake, SSL/TLS connection failed",
      };
    },
  });

  await assert.rejects(
    () => client.getJson("/home"),
    /Network request failed for GET \/home: fetch failed; curl proxy request failed: curl: \(35\) schannel: failed to receive handshake, SSL\/TLS connection failed/i,
  );
});

test("selectQualifiedPostCandidate rejects low-quality drafts and picks the best allowed one", () => {
  const state = createDefaultState("2026-03-21");
  const lowQuality = selectQualifiedPostCandidate({
    candidates: [
      {
        title: "Too weak",
        content: "not enough",
        submolt_name: "general",
        scores: { relevance: 7, novelty: 6, specificity: 6 },
      },
    ],
    state,
    slot: "morning",
  });
  assert.equal(lowQuality, null);

  const highQuality = selectQualifiedPostCandidate({
    candidates: [
      {
        title: "Good one",
        content: "strong post",
        submolt_name: "openclaw-explorers",
        scores: { relevance: 9, novelty: 7, specificity: 8 },
      },
      {
        title: "Weaker",
        content: "still okay",
        submolt_name: "general",
        scores: { relevance: 8, novelty: 7, specificity: 7 },
      },
    ],
    state,
    slot: "morning",
  });
  assert.equal(highQuality.title, "Good one");
});

test("selectCommentTarget falls back to relevant zero-comment posts when no active thread exists", () => {
  const target = selectCommentTarget([
    {
      id: "post-1",
      title: "Fresh OpenClaw note",
      submolt: { name: "openclaw-explorers" },
      comment_count: 0,
      upvotes: 3,
    },
    {
      id: "post-2",
      title: "Off-topic",
      submolt: { name: "random" },
      comment_count: 9,
      upvotes: 100,
    },
  ]);

  assert.equal(target.id, "post-1");
});

test("selectUpvoteTargets respects per-run and daily budgets", () => {
  const state = createDefaultState("2026-03-21");
  const posts = Array.from({ length: 10 }, (_, index) => ({
    id: `post-${index}`,
    title: `Post ${index}`,
    submolt: { name: index < 3 ? "openclaw-explorers" : "general" },
    comment_count: 1,
    upvotes: 10 - index,
  }));

  const freshTargets = selectUpvoteTargets({ posts, state, siteProfile: resolveSiteProfile("moltbook") });
  assert.equal(freshTargets.length, 6);

  state.daily_counts.upvotes = 16;
  const limitedTargets = selectUpvoteTargets({ posts, state, siteProfile: resolveSiteProfile("moltbook") });
  assert.equal(limitedTargets.length, 2);
});

test("selectCommentTargets returns up to two targets and skips already engaged posts", () => {
  const targets = selectCommentTargets({
    posts: [
      { id: "p1", title: "One", submolt: { name: "openclaw-explorers" }, comment_count: 3, upvotes: 5 },
      { id: "p2", title: "Two", submolt: { name: "agentops" }, comment_count: 0, upvotes: 8 },
      { id: "p3", title: "Three", submolt: { name: "general" }, comment_count: 1, upvotes: 4 },
      { id: "p4", title: "Other", submolt: { name: "random" }, comment_count: 9, upvotes: 20 },
    ],
    state: {
      engaged_post_ids_today: ["p1"],
    },
    siteProfile: resolveSiteProfile("moltbook"),
  });

  assert.deepEqual(targets.map((post) => post.id), ["p3", "p2"]);
});

test("getQualifiedPostCandidates uses relaxed thresholds before the site reaches two daily posts", () => {
  const lowButAcceptable = getQualifiedPostCandidates({
    candidates: [
      {
        title: "Borderline candidate",
        content: "still actionable",
        submolt_name: "general",
        scores: { relevance: 6, novelty: 5, specificity: 5 },
      },
    ],
    state: {
      daily_counts: { posts: 0 },
      posts_by_slot: { morning: 0, afternoon: 0, evening: 0 },
    },
    slot: "morning",
    siteProfile: resolveSiteProfile("moltbook"),
  });

  assert.equal(lowButAcceptable.length, 1);

  const blockedAfterQuota = getQualifiedPostCandidates({
    candidates: [
      {
        title: "Borderline candidate",
        content: "still actionable",
        submolt_name: "general",
        scores: { relevance: 6, novelty: 5, specificity: 5 },
      },
    ],
    state: {
      daily_counts: { posts: 2 },
      posts_by_slot: { morning: 0, afternoon: 0, evening: 0 },
    },
    slot: "evening",
    siteProfile: resolveSiteProfile("moltbook"),
  });

  assert.equal(blockedAfterQuota.length, 0);
});

test("parseGeneratedJson repairs bad backslash escapes in model output", () => {
  const parsed = parseGeneratedJson(`
Here is the JSON:
\`\`\`json
[
  {
    "title": "Path note",
    "content": "See C:\\Users\\20961\\.openclaw\\workspace",
    "submolt_name": "openclaw-explorers",
    "scores": { "relevance": 9, "novelty": 7, "specificity": 8 }
  }
]
\`\`\`
`);

  assert.equal(Array.isArray(parsed), true);
  assert.match(parsed[0].content, /C:\\Users\\20961/);
});

test("ensurePublishedStatus treats visible Moltcn posts without verification_status as published", async () => {
  const result = await ensurePublishedStatus({
    client: {
      async getJson(endpoint) {
        assert.equal(endpoint, "/posts/post-1");
        return {
          success: true,
          data: {
            id: "post-1",
            is_deleted: false,
          },
        };
      },
    },
    postId: "post-1",
    reportErrors: [],
  });

  assert.equal(result.published, true);
  assert.equal(result.status, "visible");
});

test("ensurePublishedStatus treats failed-but-visible Moltbook posts as published", async () => {
  const result = await ensurePublishedStatus({
    client: {
      async getJson(endpoint) {
        assert.equal(endpoint, "/posts/post-1");
        return {
          success: true,
          post: {
            id: "post-1",
            verification_status: "failed",
            is_deleted: false,
          },
        };
      },
    },
    postId: "post-1",
    reportErrors: [],
  });

  assert.equal(result.published, true);
  assert.equal(result.status, "failed");
});

test("ensurePublishedStatus retries when post lookup is temporarily unavailable", async () => {
  let calls = 0;
  const reportErrors = [];
  const result = await ensurePublishedStatus({
    client: {
      async getJson(endpoint) {
        calls += 1;
        assert.equal(endpoint, "/posts/post-1");
        if (calls === 1) {
          throw new Error("GET /posts/post-1 failed (404): Not found");
        }
        return {
          success: true,
          data: {
            id: "post-1",
            is_deleted: false,
          },
        };
      },
    },
    postId: "post-1",
    reportErrors,
    attempts: 2,
    retryDelayMs: 0,
  });

  assert.equal(calls, 2);
  assert.equal(result.published, true);
  assert.deepEqual(reportErrors, []);
});

test("runSlot dry-run initializes runtime files and avoids write endpoints", async () => {
  const rootDir = makeTempRoot();
  writeJson(path.join(rootDir, "moltbook", "credentials.json"), {
    api_key: "test-key",
    agent_name: "melancholic_claw",
  });

  const client = createFakeClient({
    "/agents/me": { success: true, agent: { name: "melancholic_claw", description: "desc" } },
    "/agents/status": { success: true, status: "claimed" },
    "/home": {
      your_account: { name: "melancholic_claw", karma: 7, unread_notification_count: 0 },
      activity_on_your_posts: [],
      your_direct_messages: { pending_request_count: "0", unread_message_count: "0" },
      latest_moltbook_announcement: { title: "Home endpoint update" },
      posts_from_accounts_you_follow: { posts: [] },
    },
    "/feed?filter=following&sort=new&limit=5": { success: true, posts: [] },
    "/feed?sort=new&limit=12": {
      success: true,
      posts: [
        { id: "p1", title: "OpenClaw tip", content: "workflow", submolt: { name: "openclaw-explorers" }, author: { name: "a1" }, comment_count: 2, upvotes: 5 },
        { id: "p2", title: "AgentOps", content: "ops", submolt: { name: "agentops" }, author: { name: "a2" }, comment_count: 1, upvotes: 4 },
        { id: "p3", title: "Today I learned", content: "til", submolt: { name: "todayilearned" }, author: { name: "a3" }, comment_count: 0, upvotes: 3 },
      ],
    },
    "/agents/dm/requests": { success: true, incoming: { requests: [] }, outgoing: { requests: [] } },
    "/agents/dm/conversations": { success: true, conversations: { items: [] }, total_unread: "0" },
    "/search?q=debugging&type=posts&limit=3": { success: true, results: [] },
    "/search?q=memory&type=posts&limit=3": { success: true, results: [] },
    "/search?q=skills&type=posts&limit=3": { success: true, results: [] },
    "/search?q=workflow&type=posts&limit=3": { success: true, results: [] },
  });

  const result = await runSlot({
    slot: "evening",
    dryRun: true,
    rootDir,
    now: new Date("2026-03-21T13:30:00.000Z"),
    client,
    generator: {
      async buildPostCandidates() {
        return [];
      },
    },
  });

  assert.match(result.summary, /\[dry-run\]/);
  assert.equal(client.writes.length, 0);
  const state = JSON.parse(fs.readFileSync(path.join(rootDir, "moltbook", "state.json"), "utf8"));
  assert.equal(state.local_date, "2026-03-21");
  assert.deepEqual(state.daily_counts, { posts: 0, comments: 0, upvotes: 0, follows: 0 });
  assert.equal(fs.existsSync(path.join(rootDir, "moltbook", "activity.jsonl")), true);
});

test("runSlot uses Moltcn runtime isolation and skips unsupported DM/following features", async () => {
  const rootDir = makeTempRoot();
  writeJson(path.join(rootDir, "moltcn", "credentials.json"), {
    api_key: "test-key",
    agent_name: "little_furball",
  });

  const client = createFakeClient({
    "/agents/me": { success: true, agent: { id: "agent-cn", name: "little_furball", description: "desc" } },
    "/agents/status": { success: true, status: "claimed" },
    "/home": {
      your_account: { name: "little_furball", karma: 7, unread_notification_count: 0 },
      activity_on_your_posts: [],
      latest_moltbook_announcement: { title: "中文站公告" },
    },
    "/feed?sort=new&limit=12": {
      success: true,
      posts: [
        { id: "p1", title: "OpenClaw 中文经验", content: "workflow", submolt: { name: "agent-patterns" }, author: { name: "a1" }, comment_count: 2, upvotes: 5 },
        { id: "p2", title: "通用讨论", content: "general", submolt: { name: "general" }, author: { name: "a2" }, comment_count: 1, upvotes: 4 },
      ],
    },
    "/search?q=%E8%87%AA%E5%8A%A8%E5%8C%96&type=posts&limit=3": { success: true, results: [] },
    "/search?q=OpenClaw&type=posts&limit=3": { success: true, results: [] },
    "/search?q=Agent&type=posts&limit=3": { success: true, results: [] },
  });

  const result = await runSlot({
    slot: "morning",
    site: "moltcn",
    dryRun: true,
    rootDir,
    now: new Date("2026-03-21T01:30:00.000Z"),
    client,
    generator: {
      async buildPostCandidates() {
        return [];
      },
    },
  });

  assert.match(result.summary, /\[dry-run\]/);
  assert.deepEqual(
    client.reads,
    [
      "/agents/me",
      "/agents/status",
      "/home",
      "/feed?sort=new&limit=12",
      "/search?q=%E8%87%AA%E5%8A%A8%E5%8C%96&type=posts&limit=3",
      "/search?q=OpenClaw&type=posts&limit=3",
      "/search?q=Agent&type=posts&limit=3",
    ],
  );
  const state = JSON.parse(fs.readFileSync(path.join(rootDir, "moltcn", "state.json"), "utf8"));
  assert.equal(state.local_date, "2026-03-21");
  assert.equal(fs.existsSync(path.join(rootDir, "moltcn", "activity.jsonl")), true);
});

test("runSlot enables Moltcn probed features when the endpoints are available", async () => {
  const rootDir = makeTempRoot();
  writeJson(path.join(rootDir, "moltcn", "credentials.json"), {
    api_key: "test-key",
    agent_name: "little_furball",
  });

  const client = createFakeClient({
    "/agents/me": { success: true, agent: { id: "agent-cn", name: "little_furball", description: "desc" } },
    "/agents/status": { success: true, status: "claimed" },
    "/home": {
      your_account: { name: "little_furball", karma: 7, unread_notification_count: 0 },
      activity_on_your_posts: [],
      latest_moltbook_announcement: { title: "中文站公告" },
    },
    "/feed?filter=following&sort=new&limit=5": {
      success: true,
      posts: [
        { id: "fp1", title: "Followed post", content: "workflow", submolt: { name: "agent-patterns" }, author: { name: "FollowedAuthor" }, comment_count: 1, upvotes: 5 },
      ],
    },
    "/feed?sort=new&limit=12": {
      success: true,
      posts: [
        { id: "p1", title: "OpenClaw 中文经验", content: "workflow", submolt: { name: "agent-patterns" }, author: { name: "a1" }, comment_count: 2, upvotes: 5 },
      ],
    },
    "/agents/dm/requests": {
      success: true,
      incoming: {
        requests: [
          {
            conversation_id: "conv-req-1",
            from: { name: "HelpfulCn" },
            message_preview: "想交流一下自动化巡检。",
          },
        ],
      },
      outgoing: { requests: [] },
    },
    "/agents/dm/conversations": {
      success: true,
      total_unread: "1",
      conversations: {
        items: [
          {
            conversation_id: "conv-1",
            unread_count: 1,
            with_agent: { name: "HelpfulCn", description: "desc" },
          },
        ],
      },
    },
    "/agents/dm/conversations/conv-1": {
      success: true,
      conversation: {
        messages: [
          { sender: "HelpfulCn", message: "你怎么安排每日发帖节奏？", created_at: "2026-03-21T13:40:00.000Z" },
        ],
      },
    },
    "/search?q=%E8%87%AA%E5%8A%A8%E5%8C%96&type=posts&limit=3": { success: true, results: [] },
    "/search?q=OpenClaw&type=posts&limit=3": { success: true, results: [] },
    "/search?q=Agent&type=posts&limit=3": { success: true, results: [] },
    "POST /agents/dm/requests/conv-req-1/approve": { success: true },
    "POST /agents/dm/conversations/conv-1/send": { success: true },
    "POST /posts/p1/upvote": { success: true },
    "POST /posts/fp1/comments": { success: true, comment: { id: "comment-cn", verification_status: "verified" } },
  });

  const result = await runSlot({
    slot: "morning",
    site: "moltcn",
    dryRun: false,
    rootDir,
    now: new Date("2026-03-21T01:30:00.000Z"),
    client,
    generator: {
      async replyToDm() {
        return "我会把发帖拆到固定 slot，并保留保底候选。";
      },
      async commentOnPost() {
        return "这个拆法挺稳，适合持续运营。";
      },
      async buildPostCandidates() {
        return [];
      },
    },
  });

  assert.match(result.summary, /私信 1/);
  assert.match(result.summary, /评论 1/);
  assert.equal(
    client.writes.some((call) => call.endpoint === "/agents/dm/requests/conv-req-1/approve"),
    true,
  );
  assert.equal(
    client.writes.some((call) => call.endpoint === "/agents/dm/conversations/conv-1/send"),
    true,
  );
  const state = JSON.parse(fs.readFileSync(path.join(rootDir, "moltcn", "state.json"), "utf8"));
  assert.equal(state.feature_support_cache.dmRequests.supported, true);
  assert.equal(state.feature_support_cache.dmConversations.supported, true);
  assert.equal(state.feature_support_cache.followingFeed.supported, true);
});

test("runSlot follows one relevant author and tracks follow state", async () => {
  const rootDir = makeTempRoot();
  writeJson(path.join(rootDir, "moltbook", "credentials.json"), {
    api_key: "test-key",
    agent_name: "melancholic_claw",
  });

  const client = createFakeClient({
    "/agents/me": { success: true, agent: { id: "agent-1", name: "melancholic_claw", description: "desc" } },
    "/agents/status": { success: true, status: "claimed" },
    "/home": {
      your_account: { name: "melancholic_claw", karma: 7, unread_notification_count: 0 },
      activity_on_your_posts: [],
      your_direct_messages: { pending_request_count: "0", unread_message_count: "0" },
      latest_moltbook_announcement: { title: "Announcement" },
      posts_from_accounts_you_follow: { posts: [] },
    },
    "/feed?filter=following&sort=new&limit=5": { success: true, posts: [] },
    "/feed?sort=new&limit=12": {
      success: true,
      posts: [
        { id: "p1", title: "Tooling post", content: "workflow", submolt: { name: "tooling" }, author: { name: "Ting_Fodder" }, comment_count: 3, upvotes: 9 },
      ],
    },
    "/agents/profile?name=Ting_Fodder": {
      success: true,
      agent: {
        id: "author-1",
        name: "Ting_Fodder",
        follower_count: 320,
        following_count: 1,
        posts_count: 21,
        comments_count: 56379,
        last_active: "2026-03-23T14:04:56.901Z",
      },
      recentPosts: [{ id: "rp1" }],
      recentComments: [{ id: "rc1" }],
    },
    "/agents/profile?name=a1": {
      success: true,
      agent: { id: "a1", name: "a1", follower_count: 2, following_count: 1, posts_count: 1, comments_count: 2 },
      recentPosts: [],
      recentComments: [],
    },
    "/agents/dm/requests": { success: true, incoming: { requests: [] }, outgoing: { requests: [] } },
    "/agents/dm/conversations": { success: true, conversations: { items: [] }, total_unread: "0" },
    "/search?q=openclaw&type=posts&limit=3": { success: true, results: [] },
    "/search?q=agentops&type=posts&limit=3": { success: true, results: [] },
    "/search?q=debugging&type=posts&limit=3": { success: true, results: [] },
    "/search?q=memory&type=posts&limit=3": { success: true, results: [] },
    "/search?q=skills&type=posts&limit=3": { success: true, results: [] },
    "/search?q=workflow&type=posts&limit=3": { success: true, results: [] },
    "/search?q=automation&type=posts&limit=3": { success: true, results: [] },
    "POST /posts/p1/upvote": { success: true, author: { name: "Ting_Fodder" }, already_following: false },
    "POST /posts/p1/comments": { success: true, comment: { id: "comment-1", verification_status: "verified" } },
    "POST /agents/Ting_Fodder/follow": { success: true },
  });

  const result = await runSlot({
    slot: "morning",
    dryRun: false,
    rootDir,
    now: new Date("2026-03-21T01:30:00.000Z"),
    client,
    generator: {
      async commentOnPost() {
        return "这类工程拆解值得继续跟。";
      },
      async buildPostCandidates() {
        return [];
      },
    },
  });

  assert.match(result.summary, /关注 1/);
  assert.equal(client.writes.some((call) => call.endpoint === "/agents/Ting_Fodder/follow"), true);
  const state = JSON.parse(fs.readFileSync(path.join(rootDir, "moltbook", "state.json"), "utf8"));
  assert.deepEqual(state.followed_agent_ids_today, ["Ting_Fodder"]);
  assert.equal(state.daily_counts.follows, 1);
});

test("runSlot degrades gracefully when post candidate generation fails", async () => {
  const rootDir = makeTempRoot();
  writeJson(path.join(rootDir, "moltbook", "credentials.json"), {
    api_key: "test-key",
    agent_name: "melancholic_claw",
  });

  const client = createFakeClient({
    "/agents/me": { success: true, agent: { id: "agent-1", name: "melancholic_claw", description: "desc" } },
    "/agents/status": { success: true, status: "claimed" },
    "/home": {
      your_account: { name: "melancholic_claw", karma: 7, unread_notification_count: 0 },
      activity_on_your_posts: [],
      your_direct_messages: { pending_request_count: "0", unread_message_count: "0" },
      latest_moltbook_announcement: { title: "Home endpoint update" },
      posts_from_accounts_you_follow: { posts: [] },
    },
    "/feed?filter=following&sort=new&limit=5": { success: true, posts: [] },
    "/feed?sort=new&limit=12": { success: true, posts: [] },
    "/agents/dm/requests": { success: true, incoming: { requests: [] }, outgoing: { requests: [] } },
    "/agents/dm/conversations": { success: true, conversations: { items: [] }, total_unread: "0" },
    "/search?q=openclaw&type=posts&limit=3": { success: true, results: [] },
    "/search?q=agentops&type=posts&limit=3": { success: true, results: [] },
    "/search?q=debugging&type=posts&limit=3": { success: true, results: [] },
    "/search?q=memory&type=posts&limit=3": { success: true, results: [] },
  });

  const result = await runSlot({
    slot: "morning",
    dryRun: false,
    rootDir,
    now: new Date("2026-03-21T01:30:00.000Z"),
    client,
    generator: {
      async commentOnPost() {
        return "comment";
      },
      async replyToDm() {
        return "dm";
      },
      async replyToPostActivity() {
        return "reply";
      },
      async buildPostCandidates() {
        throw new Error("fetch failed");
      },
      async solveVerification() {
        return "1.00";
      },
    },
  });

  assert.doesNotMatch(result.summary, /fetch failed/);
  assert.match(result.summary, /本轮无合格发帖候选/);
});

test("runSlot processes replies, DMs, comments, and one qualified post in live mode", async () => {
  const rootDir = makeTempRoot();
  writeJson(path.join(rootDir, "moltbook", "credentials.json"), {
    api_key: "test-key",
    agent_name: "melancholic_claw",
  });

  const client = createFakeClient({
    "/agents/me": {
      success: true,
      agent: { id: "agent-1", name: "melancholic_claw", description: "desc" },
    },
    "/agents/status": { success: true, status: "claimed" },
    "/home": {
      your_account: { name: "melancholic_claw", karma: 7, unread_notification_count: 1 },
      activity_on_your_posts: [
        {
          post_id: "own-post",
          post_title: "hello",
          submolt_name: "introductions",
          new_notification_count: 1,
        },
      ],
      your_direct_messages: { pending_request_count: "1", unread_message_count: "1" },
      latest_moltbook_announcement: { title: "Announcement" },
      posts_from_accounts_you_follow: { posts: [] },
    },
    "/posts/own-post/comments?sort=new&limit=20": {
      success: true,
      comments: [
        {
          id: "comment-1",
          content: "What do you automate with OpenClaw?",
          author_id: "other-1",
          author: { name: "taidarilla" },
          replies: [],
          created_at: "2026-03-21T13:35:00.000Z",
        },
      ],
    },
    "/agents/dm/requests": {
      success: true,
      incoming: {
        requests: [
          {
            conversation_id: "conv-req-1",
            from: { name: "HelpfulBot" },
            message_preview: "Want to compare cron workflows?",
          },
        ],
      },
      outgoing: { requests: [] },
    },
    "/agents/dm/conversations": {
      success: true,
      total_unread: "1",
      conversations: {
        items: [
          {
            conversation_id: "conv-1",
            unread_count: 1,
            with_agent: { name: "HelpfulBot", description: "desc" },
          },
        ],
      },
    },
    "/agents/dm/conversations/conv-1": {
      success: true,
      conversation: {
        messages: [
          { sender: "HelpfulBot", message: "Any advice on state files?", created_at: "2026-03-21T13:40:00.000Z" },
        ],
      },
    },
    "/feed?filter=following&sort=new&limit=5": { success: true, posts: [] },
    "/feed?sort=new&limit=12": {
      success: true,
      posts: [
        { id: "p1", title: "OpenClaw cron trick", content: "workflow", submolt: { name: "openclaw-explorers" }, author: { name: "a1" }, comment_count: 2, upvotes: 5 },
        { id: "p2", title: "AgentOps runbook", content: "ops", submolt: { name: "agentops" }, author: { name: "a2" }, comment_count: 1, upvotes: 4 },
        { id: "p3", title: "TIL memory compaction", content: "til", submolt: { name: "todayilearned" }, author: { name: "a3" }, comment_count: 1, upvotes: 3 },
      ],
    },
    "/agents/profile?name=a1": { success: true, agent: { name: "a1", posts_count: 5, comments_count: 12, follower_count: 2 }, recentPosts: [] },
    "/search?q=openclaw&type=posts&limit=3": { success: true, results: [] },
    "/search?q=agentops&type=posts&limit=3": { success: true, results: [] },
    "/search?q=debugging&type=posts&limit=3": { success: true, results: [] },
    "POST /posts/own-post/comments": {
      success: true,
      comment: { id: "new-reply", verification_status: "verified" },
    },
    "POST /posts/p1/upvote": { success: true },
    "POST /posts/p2/upvote": { success: true },
    "POST /posts/p3/upvote": { success: true },
    "POST /posts/p1/comments": {
      success: true,
      comment: { id: "feed-comment", verification_status: "verified" },
    },
    "POST /posts": {
      success: true,
      post: { id: "new-post", verification_status: "verified" },
    },
    "/posts/new-post": {
      success: true,
      post: { id: "new-post", verification_status: "verified" },
    },
  });

  const result = await runSlot({
    slot: "morning",
    dryRun: false,
    rootDir,
    now: new Date("2026-03-21T01:30:00.000Z"),
    client,
    generator: {
      async replyToPostActivity() {
        return "Physical systems add timing and sensor failure modes.";
      },
      async replyToDm() {
        return "I track local state aggressively and keep summaries short.";
      },
      async commentOnPost() {
        return "I like the runbook framing; it makes retries less magical and more operable.";
      },
      async buildPostCandidates() {
        return [
          {
            title: "OpenClaw cron + state file pattern that reduced my Moltbook drift",
            content: "Short state files plus fixed slot routines reduced repeated work and kept interactions grounded.",
            submolt_name: "openclaw-explorers",
            scores: { relevance: 9, novelty: 7, specificity: 8 },
          },
        ];
      },
    },
  });

  assert.match(result.summary, /回复 1/);
  assert.match(result.summary, /私信 1/);
  assert.match(result.summary, /点赞 3/);
  assert.match(result.summary, /发帖 1/);
  assert.match(result.summary, /回复内容：/);
  assert.match(result.summary, /私信内容：/);
  assert.match(result.summary, /点赞内容：/);
  assert.match(result.summary, /评论内容：/);
  assert.match(result.summary, /关注内容：\n- 无/);
  assert.match(result.summary, /发帖内容：/);
  assert.match(result.summary, /What do you automate with OpenClaw/);
  assert.match(result.summary, /Any advice on state files/);
  assert.match(result.summary, /OpenClaw cron trick/);
  assert.match(result.summary, /OpenClaw cron \+ state file pattern/);
  assert.equal(
    client.writes.some((call) => call.endpoint === "/notifications/read-by-post/own-post"),
    true,
  );
  assert.equal(
    client.writes.some((call) => call.endpoint === "/agents/dm/requests/conv-req-1/approve"),
    true,
  );
  assert.equal(
    client.writes.some((call) => call.endpoint === "/agents/dm/conversations/conv-1/send"),
    true,
  );
  assert.equal(client.writes.some((call) => call.endpoint === "/posts"), true);

  const state = JSON.parse(fs.readFileSync(path.join(rootDir, "moltbook", "state.json"), "utf8"));
  assert.deepEqual(state.daily_counts, { posts: 1, comments: 2, upvotes: 3, follows: 0 });
});

test("runSlot does not count a post as published when verification stays pending", async () => {
  const rootDir = makeTempRoot();
  writeJson(path.join(rootDir, "moltbook", "credentials.json"), {
    api_key: "test-key",
    agent_name: "melancholic_claw",
  });

  const client = createFakeClient({
    "/agents/me": {
      success: true,
      agent: { id: "agent-1", name: "melancholic_claw", description: "desc" },
    },
    "/agents/status": { success: true, status: "claimed" },
    "/home": {
      your_account: { name: "melancholic_claw", karma: 7, unread_notification_count: 0 },
      activity_on_your_posts: [],
      your_direct_messages: { pending_request_count: "0", unread_message_count: "0" },
      latest_moltbook_announcement: { title: "Announcement" },
      posts_from_accounts_you_follow: { posts: [] },
    },
    "/feed?filter=following&sort=new&limit=5": { success: true, posts: [] },
    "/feed?sort=new&limit=12": { success: true, posts: [] },
    "/agents/dm/requests": { success: true, incoming: { requests: [] }, outgoing: { requests: [] } },
    "/agents/dm/conversations": { success: true, conversations: { items: [] }, total_unread: "0" },
    "/search?q=openclaw&type=posts&limit=3": { success: true, results: [] },
    "/search?q=agentops&type=posts&limit=3": { success: true, results: [] },
    "/search?q=debugging&type=posts&limit=3": { success: true, results: [] },
    "/search?q=memory&type=posts&limit=3": { success: true, results: [] },
    "/search?q=skills&type=posts&limit=3": { success: true, results: [] },
    "/search?q=workflow&type=posts&limit=3": { success: true, results: [] },
    "/search?q=automation&type=posts&limit=3": { success: true, results: [] },
    "POST /posts": {
      success: true,
      post: { id: "pending-post", verification_status: "pending" },
    },
    "/posts/pending-post": {
      success: true,
      post: { id: "pending-post", verification_status: "pending" },
    },
  });

  const result = await runSlot({
    slot: "evening",
    dryRun: false,
    rootDir,
    now: new Date("2026-03-21T13:30:00.000Z"),
    client,
    generator: {
      async buildPostCandidates() {
        return [
          {
            title: "Pending post",
            content: "content",
            submolt_name: "openclaw",
            scores: { relevance: 9, novelty: 7, specificity: 8 },
          },
        ];
      },
      async replyToPostActivity() {
        return "reply";
      },
      async replyToDm() {
        return "dm";
      },
      async commentOnPost() {
        return "comment";
      },
      async solveVerification() {
        return "47.00";
      },
    },
  });

  assert.match(result.summary, /发帖 0/);
  assert.match(result.summary, /pending/);
  const state = JSON.parse(fs.readFileSync(path.join(rootDir, "moltbook", "state.json"), "utf8"));
  assert.equal(state.daily_counts.posts, 0);
});

test("runSlot stops post retries after a verification failure creates a pending post", async () => {
  const rootDir = makeTempRoot();
  writeJson(path.join(rootDir, "moltbook", "credentials.json"), {
    api_key: "test-key",
    agent_name: "melancholic_claw",
  });

  const postWrites = [];
  const client = {
    async getJson(endpoint) {
      const fixtures = {
        "/agents/me": { success: true, agent: { id: "agent-1", name: "melancholic_claw", description: "desc" } },
        "/agents/status": { success: true, status: "claimed" },
        "/home": {
          your_account: { name: "melancholic_claw", karma: 7, unread_notification_count: 0 },
          activity_on_your_posts: [],
          your_direct_messages: { pending_request_count: "0", unread_message_count: "0" },
          latest_moltbook_announcement: { title: "Announcement" },
          posts_from_accounts_you_follow: { posts: [] },
        },
        "/feed?filter=following&sort=new&limit=5": { success: true, posts: [] },
        "/feed?sort=new&limit=12": {
          success: true,
          posts: [
            { id: "p1", title: "OpenClaw cron trick", content: "workflow", submolt: { name: "openclaw-explorers" }, author: { name: "a1" }, comment_count: 1, upvotes: 5 },
          ],
        },
        "/agents/dm/requests": { success: true, incoming: { requests: [] }, outgoing: { requests: [] } },
        "/agents/dm/conversations": { success: true, conversations: { items: [] }, total_unread: "0" },
        "/search?q=openclaw&type=posts&limit=3": { success: true, results: [] },
        "/search?q=agentops&type=posts&limit=3": { success: true, results: [] },
        "/search?q=debugging&type=posts&limit=3": { success: true, results: [] },
        "/search?q=memory&type=posts&limit=3": { success: true, results: [] },
        "/posts/p1/upvote": { success: true },
        "/posts/p1/comments": { success: true, comment: { id: "comment-1", verification_status: "verified" } },
        "/posts/pending-post": {
          success: true,
          post: { id: "pending-post", verification_status: "pending" },
        },
      };
      if (!(endpoint in fixtures)) {
        throw new Error(`Missing fixture for ${endpoint}`);
      }
      return JSON.parse(JSON.stringify(fixtures[endpoint]));
    },
    async postJson(endpoint, body) {
      postWrites.push({ endpoint, body });
      if (endpoint === "/posts") {
        return {
          success: true,
          post: {
            id: "pending-post",
            verification_status: "pending",
            verification: {
              verification_code: "verify-1",
              challenge_text: "twenty one plus six",
              instructions: "return the number with 2 decimals",
            },
          },
        };
      }
      if (endpoint === "/verify") {
        throw new Error("POST /verify failed (400): Incorrect answer");
      }
      if (endpoint === "/posts/p1/upvote") {
        return { success: true };
      }
      if (endpoint === "/posts/p1/comments") {
        return { success: true, comment: { id: "comment-1", verification_status: "verified" } };
      }
      throw new Error(`Unexpected POST ${endpoint}`);
    },
    async deleteJson(endpoint) {
      throw new Error(`Unexpected DELETE ${endpoint}`);
    },
  };

  const result = await runSlot({
    slot: "evening",
    dryRun: false,
    rootDir,
    now: new Date("2026-03-21T13:30:00.000Z"),
    client,
    generator: {
      async commentOnPost() {
        return "Useful operational note.";
      },
      async buildPostCandidates() {
        return [
          {
            title: "First candidate",
            content: "content one",
            submolt_name: "openclaw-explorers",
            scores: { relevance: 9, novelty: 8, specificity: 9 },
          },
          {
            title: "Second candidate",
            content: "content two",
            submolt_name: "agentops",
            scores: { relevance: 9, novelty: 8, specificity: 9 },
          },
        ];
      },
      async solveVerification() {
        return "99.00";
      },
    },
  });

  assert.equal(postWrites.filter((call) => call.endpoint === "/posts").length, 1);
  assert.match(result.summary, /POST \/verify failed \(400\): Incorrect answer/);
  assert.doesNotMatch(result.summary, /429/);
});

test("runSlot retries post submission with a sanitized fallback after a platform 500", async () => {
  const rootDir = makeTempRoot();
  writeJson(path.join(rootDir, "moltbook", "credentials.json"), {
    api_key: "test-key",
    agent_name: "melancholic_claw",
  });

  const reads = [];
  const postWrites = [];
  const client = {
    async getJson(endpoint) {
      reads.push(endpoint);
      const fixtures = {
        "/agents/me": { success: true, agent: { id: "agent-1", name: "melancholic_claw", description: "desc" } },
        "/agents/status": { success: true, status: "claimed" },
        "/home": {
          your_account: { name: "melancholic_claw", karma: 7, unread_notification_count: 0 },
          activity_on_your_posts: [],
          your_direct_messages: { pending_request_count: "0", unread_message_count: "0" },
          latest_moltbook_announcement: { title: "Announcement" },
          posts_from_accounts_you_follow: { posts: [] },
        },
        "/feed?filter=following&sort=new&limit=5": { success: true, posts: [] },
        "/feed?sort=new&limit=12": {
          success: true,
          posts: [
            { id: "p1", title: "OpenClaw cron trick", content: "workflow", submolt: { name: "openclaw-explorers" }, author: { name: "a1" }, comment_count: 1, upvotes: 5 },
          ],
        },
        "/agents/dm/requests": { success: true, incoming: { requests: [] }, outgoing: { requests: [] } },
        "/agents/dm/conversations": { success: true, conversations: { items: [] }, total_unread: "0" },
        "/search?q=openclaw&type=posts&limit=3": { success: true, results: [] },
        "/search?q=agentops&type=posts&limit=3": { success: true, results: [] },
        "/search?q=debugging&type=posts&limit=3": { success: true, results: [] },
        "/search?q=memory&type=posts&limit=3": { success: true, results: [] },
        "/posts/p1/comments?sort=new&limit=20": { success: true, comments: [] },
        "/posts/safe-post": {
          success: true,
          post: { id: "safe-post", verification_status: "verified" },
        },
      };
      if (!(endpoint in fixtures)) {
        throw new Error(`Missing fixture for ${endpoint}`);
      }
      return JSON.parse(JSON.stringify(fixtures[endpoint]));
    },
    async postJson(endpoint, body) {
      postWrites.push({ endpoint, body });
      if (endpoint === "/posts/p1/upvote") {
        return { success: true };
      }
      if (endpoint === "/posts/p1/comments") {
        return { success: true, comment: { id: "comment-1", verification_status: "verified" } };
      }
      if (endpoint === "/posts") {
        if (postWrites.filter((call) => call.endpoint === "/posts").length === 1) {
          throw new Error("POST /posts failed (500): Error");
        }
        return { success: true, post: { id: "safe-post", verification_status: "verified" } };
      }
      throw new Error(`Unexpected POST ${endpoint}`);
    },
    async deleteJson(endpoint) {
      throw new Error(`Unexpected DELETE ${endpoint}`);
    },
  };

  const result = await runSlot({
    slot: "evening",
    dryRun: false,
    rootDir,
    now: new Date("2026-03-21T13:30:00.000Z"),
    client,
    generator: {
      async commentOnPost() {
        return "Useful operational note.";
      },
      async buildPostCandidates() {
        return [
          {
            title: "Gateway Refactor: From `gateway.cmd` to Hidden PowerShell + TypeScript Integration",
            content:
              "Just shipped a stealthy upgrade to the OpenClaw gateway layer: replaced the brittle `gateway.cmd` with a hidden wrapper. #tooling #openclaw",
            submolt_name: "tooling",
            scores: { relevance: 9, novelty: 8, specificity: 9 },
          },
        ];
      },
    },
  });

  const postCalls = postWrites.filter((call) => call.endpoint === "/posts");
  assert.equal(postCalls.length, 2);
  assert.match(result.summary, /发帖 1/);
  assert.doesNotMatch(result.summary, /POST \/posts failed/);
  assert.equal(postCalls[0].body.title.includes("`"), true);
  assert.equal(postCalls[0].body.content.includes("#tooling"), true);
  assert.equal(postCalls[1].body.title.includes("`"), false);
  assert.equal(postCalls[1].body.content.includes("#tooling"), false);
  assert.equal(postCalls[1].body.content.includes("gateway.cmd"), true);
});

test("runSlot posts to Moltcn using submolt field", async () => {
  const rootDir = makeTempRoot();
  writeJson(path.join(rootDir, "moltcn", "credentials.json"), {
    api_key: "test-key",
    agent_name: "little_furball",
  });

  const client = createFakeClient({
    "/agents/me": {
      success: true,
      agent: { id: "agent-cn", name: "little_furball", description: "desc" },
    },
    "/agents/status": { success: true, status: "claimed" },
    "/home": {
      your_account: { name: "little_furball", karma: 7, unread_notification_count: 0 },
      activity_on_your_posts: [],
      latest_moltbook_announcement: { title: "中文站公告" },
    },
    "/feed?sort=new&limit=12": {
      success: true,
      posts: [
        { id: "p1", title: "Agent 模式", content: "workflow", submolt: { name: "agent-patterns" }, author: { name: "a1" }, comment_count: 1, upvotes: 5 },
      ],
    },
    "/search?q=%E8%87%AA%E5%8A%A8%E5%8C%96&type=posts&limit=3": { success: true, results: [] },
    "/search?q=OpenClaw&type=posts&limit=3": { success: true, results: [] },
    "/search?q=Agent&type=posts&limit=3": { success: true, results: [] },
    "/search?q=%E6%8A%80%E6%9C%AF%E6%95%99%E7%A8%8B&type=posts&limit=3": { success: true, results: [] },
    "POST /posts/p1/upvote": { success: true },
    "POST /posts/p1/comments": {
      success: true,
      comment: { id: "feed-comment", verification_status: "verified" },
    },
    "POST /posts": {
      success: true,
      post: { id: "new-post", verification_status: "verified" },
    },
    "/posts/new-post": {
      success: true,
      post: { id: "new-post", verification_status: "verified" },
    },
  });

  await runSlot({
    slot: "evening",
    site: "moltcn",
    dryRun: false,
    rootDir,
    now: new Date("2026-03-21T13:30:00.000Z"),
    client,
    generator: {
      async commentOnPost() {
        return "补充一点落地经验。";
      },
      async buildPostCandidates() {
        return [
          {
            title: "OpenClaw 中文巡检模式",
            content: "把巡检拆成固定 slot 之后，执行和复盘都更稳定。",
            submolt_name: "agent-patterns",
            scores: { relevance: 9, novelty: 8, specificity: 8 },
          },
        ];
      },
    },
  });

  const postCall = client.writes.find((call) => call.endpoint === "/posts");
  assert.deepEqual(postCall.body, {
    submolt: "agent-patterns",
    title: "OpenClaw 中文巡检模式",
    content: "把巡检拆成固定 slot 之后，执行和复盘都更稳定。",
  });
});

test("runSlot handles wrapped Moltcn payloads and post_id-only publish responses", async () => {
  const rootDir = makeTempRoot();
  writeJson(path.join(rootDir, "moltcn", "credentials.json"), {
    api_key: "test-key",
    agent_name: "little_furball",
  });

  const client = createFakeClient({
    "/agents/me": {
      success: true,
      data: { id: "agent-cn", name: "little_furball", description: "desc" },
    },
    "/agents/status": { status: "claimed" },
    "/home": {
      success: true,
      data: {
        your_account: { name: "little_furball", score: 7, status: "claimed" },
        latest_moltbook_announcement: { title: "中文站公告" },
        your_recent_posts: [],
        hot_posts: [],
        latest_posts: [],
      },
    },
    "/feed?sort=new&limit=12": {
      success: true,
      posts: [
        {
          id: "p1",
          title: "Agent 模式",
          content: "workflow",
          submolt: { name: "agent-patterns" },
          author: { name: "a1" },
          comment_count: 1,
          upvotes: 5,
        },
      ],
    },
    "/search?q=%E8%87%AA%E5%8A%A8%E5%8C%96&type=posts&limit=3": { success: true, results: [] },
    "/search?q=OpenClaw&type=posts&limit=3": { success: true, results: [] },
    "/search?q=Agent&type=posts&limit=3": { success: true, results: [] },
    "/search?q=%E6%8A%80%E6%9C%AF%E6%95%99%E7%A8%8B&type=posts&limit=3": { success: true, results: [] },
    "POST /posts/p1/upvote": { success: true },
    "POST /posts/p1/comments": {
      success: true,
      data: { id: "feed-comment" },
    },
    "POST /posts": {
      success: true,
      data: { post_id: "new-post" },
    },
    "/posts/new-post": {
      success: true,
      data: { id: "new-post", is_deleted: false },
    },
  });

  const result = await runSlot({
    slot: "evening",
    site: "moltcn",
    dryRun: false,
    rootDir,
    now: new Date("2026-03-21T13:30:00.000Z"),
    client,
    generator: {
      async commentOnPost() {
        return "补充一点落地经验。";
      },
      async buildPostCandidates() {
        return [
          {
            title: "OpenClaw 中文巡检模式",
            content: "把巡检拆成固定 slot 之后，执行和复盘都更稳定。",
            submolt_name: "agent-patterns",
            scores: { relevance: 9, novelty: 8, specificity: 8 },
          },
        ];
      },
      async solveVerification() {
        return "1.00";
      },
    },
  });

  assert.match(result.summary, /发帖 1/);
  const postCall = client.writes.find((call) => call.endpoint === "/posts");
  assert.deepEqual(postCall.body, {
    submolt: "agent-patterns",
    title: "OpenClaw 中文巡检模式",
    content: "把巡检拆成固定 slot 之后，执行和复盘都更稳定。",
  });
  const state = JSON.parse(fs.readFileSync(path.join(rootDir, "moltcn", "state.json"), "utf8"));
  assert.equal(state.daily_counts.posts, 1);
});
