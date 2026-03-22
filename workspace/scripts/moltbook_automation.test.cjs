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
  assert.equal(canPostInSlot(state, "afternoon").allowed, false);

  state.daily_counts.posts = 1;
  state.posts_by_slot.morning = 1;
  assert.equal(canPostInSlot(state, "morning").allowed, false);
  assert.equal(canPostInSlot(state, "evening").allowed, true);

  state.daily_counts.posts = 2;
  state.posts_by_slot.evening = 1;
  assert.equal(canPostInSlot(state, "evening").allowed, false);
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

test("selectUpvoteTargets respects per-run and daily budgets", () => {
  const state = createDefaultState("2026-03-21");
  const posts = Array.from({ length: 10 }, (_, index) => ({
    id: `post-${index}`,
    title: `Post ${index}`,
    submolt: { name: index < 3 ? "openclaw-explorers" : "general" },
    comment_count: 1,
    upvotes: 10 - index,
  }));

  const freshTargets = selectUpvoteTargets({ posts, state });
  assert.equal(freshTargets.length, 5);

  state.daily_counts.upvotes = 10;
  const limitedTargets = selectUpvoteTargets({ posts, state });
  assert.equal(limitedTargets.length, 2);
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
