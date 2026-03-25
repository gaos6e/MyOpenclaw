const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const MODULE_PATH = path.join(__dirname, "control_ui_localization.cjs");

function loadModule() {
  assert.equal(
    fs.existsSync(MODULE_PATH),
    true,
    "expected control_ui_localization.cjs to exist",
  );
  return require(MODULE_PATH);
}

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("injectOverlayIntoIndex appends the stable overlay asset exactly once", () => {
  const { injectOverlayIntoIndex, OVERLAY_ASSET_NAME } = loadModule();
  const original = `<!doctype html>
<html lang="en">
  <head>
    <script type="module" crossorigin src="./assets/index-main.js"></script>
  </head>
  <body>
    <openclaw-app></openclaw-app>
  </body>
</html>`;

  const injected = injectOverlayIntoIndex(original, `./assets/${OVERLAY_ASSET_NAME}?v=test-hash`);
  const overlayTag = `<script defer src="./assets/${OVERLAY_ASSET_NAME}?v=test-hash" data-openclaw-zh-cn-overlay></script>`;

  assert.match(injected, new RegExp(OVERLAY_ASSET_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(injected.includes(overlayTag), true);
  assert.equal(injected.indexOf(overlayTag), injected.lastIndexOf(overlayTag));

  const reinjected = injectOverlayIntoIndex(injected);
  assert.equal(reinjected, injected);
});

test("translate helpers only localize known chrome strings", () => {
  const { translateExactText, translateUiAttributeValue } = loadModule();

  assert.equal(translateExactText("Overview"), "概览");
  assert.equal(translateExactText("WebSocket URL"), "WebSocket 地址");
  assert.equal(
    translateExactText(
      "unauthorized: gateway token missing (open the dashboard URL and paste the token in Control UI settings)",
    ),
    "未授权：缺少网关令牌（请打开仪表盘地址，并将令牌粘贴到 Control UI 设置中）",
  );
  assert.equal(translateExactText(" Save "), " 保存 ");
  assert.equal(translateExactText("Workspace paths and identity metadata."), "工作区路径与身份元数据。");
  assert.equal(translateExactText("Primary model"), "主模型");
  assert.equal(translateExactText("(default)"), "（默认）");
  assert.equal(translateExactText("Default model"), "默认模型");
  assert.equal(
    translateExactText("Default (gpt-5.2-codex · openai-codex)"),
    "默认（gpt-5.2-codex · openai-codex）",
  );
  assert.equal(translateExactText("Reload"), "重新加载");
  assert.equal(translateExactText("QQ Bot"), "QQ 机器人");
  assert.equal(translateExactText("Cron"), "Cron 表达式");
  assert.equal(
    translateExactText("Cron 0 */2 * * * (Asia/Shanghai)"),
    "Cron：0 */2 * * * (Asia/Shanghai)",
  );
  assert.equal(translateExactText("No changes"), "无更改");
  assert.equal(translateExactText("Form"), "表单");
  assert.equal(translateExactText("Raw"), "原始");
  assert.equal(translateExactText("Settings"), "设置");
  assert.equal(translateExactText("Environment"), "环境");
  assert.equal(translateExactText("Authentication"), "身份验证");
  assert.equal(translateExactText("Updates"), "更新");
  assert.equal(translateExactText("Meta"), "元数据");
  assert.equal(translateExactText("Logging"), "日志");
  assert.equal(translateExactText("Diagnostics"), "诊断");
  assert.equal(translateExactText("Secrets"), "机密");
  assert.equal(translateExactText("Auto-update settings and release channel"), "自动更新设置与发布通道");
  assert.equal(translateExactText("Auto"), "自动");
  assert.equal(translateExactText("Auto Update Beta Check Interval (hours)"), "自动更新 Beta 检查间隔（小时）");
  assert.equal(
    translateExactText("How often beta-channel checks run in hours (default: 1)."),
    "Beta 通道检查的运行频率（单位：小时，默认：1）。",
  );
  assert.equal(translateExactText("performance"), "性能");
  assert.equal(translateExactText("Auto Update Enabled"), "自动更新已启用");
  assert.equal(
    translateExactText("Enable background auto-update for package installs (default: false)."),
    "为软件包安装启用后台自动更新（默认：false）。",
  );
  assert.equal(translateExactText("Auto Update Stable Delay (hours)"), "自动更新稳定通道延迟（小时）");
  assert.equal(
    translateExactText("Minimum delay before stable-channel auto-apply starts (default: 6)."),
    "稳定通道自动应用开始前的最小延迟（默认：6）。",
  );
  assert.equal(translateExactText("Auto Update Stable Jitter (hours)"), "自动更新稳定通道抖动（小时）");
  assert.equal(
    translateExactText("Extra stable-channel rollout spread window in hours (default: 12)."),
    "稳定通道发布扩散窗口增加时长（单位：小时，默认：12）。",
  );
  assert.equal(translateExactText("Update Channel"), "更新通道");
  assert.equal(translateExactText("Update Check on Start"), "启动时检查更新");
  assert.equal(
    translateExactText("Check for npm updates when the gateway starts (default: true)."),
    "网关启动时检查 npm 更新（默认：true）。",
  );
  assert.equal(translateExactText("random"), "随机");
  assert.equal(translateExactText("off"), "关闭");
  assert.equal(
    translateExactText('Update channel for git + npm installs ("stable", "beta", or "dev").'),
    "用于 git + npm 安装的更新通道（“stable”“beta”或“dev”）。",
  );
  assert.equal(translateExactText("CLI banner and startup behavior"), "CLI 横幅与启动行为");
  assert.equal(translateExactText("CLI Banner"), "CLI 横幅");
  assert.equal(
    translateExactText(
      'CLI startup banner controls for title/version line and tagline style behavior. Keep banner enabled for fast version/context checks, then tune tagline mode to your preferred noise level.',
    ),
    "用于控制 CLI 启动横幅的标题/版本行与标语显示方式。建议保持横幅开启以便快速确认版本和上下文，再按你偏好的信息密度调整标语模式。",
  );
  assert.equal(
    translateExactText(
      'Controls tagline style in the CLI startup banner: "random" (default) picks from the rotating tagline pool, "default" always shows the neutral default tagline, and "off" hides tagline text while keeping the banner version line.',
    ),
    "控制 CLI 启动横幅中的标语显示方式：`random`（默认）从轮换标语池中随机选择，`default` 始终显示中性的默认标语，`off` 则隐藏标语文本但保留版本行。",
  );
  assert.equal(translateExactText("Diagnostics"), "诊断");
  assert.equal(
    translateExactText("Instrumentation, OpenTelemetry, and cache-trace settings"),
    "监控埋点、OpenTelemetry 和缓存跟踪设置",
  );
  assert.equal(translateExactText("Cache Trace"), "缓存跟踪");
  assert.equal(
    translateExactText(
      "Cache-trace logging settings for observing cache decisions and payload context in embedded runs. Enable this temporarily for debugging and disable afterward to reduce sensitive log footprint.",
    ),
    "用于观察嵌入式运行中缓存决策和载荷上下文的缓存跟踪日志设置。建议仅在调试时临时启用，完成后关闭以减少敏感日志暴露。",
  );
  assert.equal(translateExactText("Cache Trace Enabled"), "缓存跟踪已启用");
  assert.equal(translateExactText("Cache Trace File Path"), "缓存跟踪文件路径");
  assert.equal(translateExactText("Cache Trace Include Messages"), "缓存跟踪包含消息");
  assert.equal(translateExactText("Cache Trace Include Prompt"), "缓存跟踪包含提示词");
  assert.equal(translateExactText("Cache Trace Include System"), "缓存跟踪包含系统提示");
  assert.equal(
    translateExactText("Log cache trace snapshots for embedded agent runs (default: false)."),
    "记录嵌入式代理运行的缓存跟踪快照（默认：false）。",
  );
  assert.equal(
    translateExactText("Include full message payloads in trace output (default: true)."),
    "在跟踪输出中包含完整消息载荷（默认：true）。",
  );
  assert.equal(
    translateExactText("Include prompt text in trace output (default: true)."),
    "在跟踪输出中包含提示词文本（默认：true）。",
  );
  assert.equal(
    translateExactText("Include system prompt in trace output (default: true)."),
    "在跟踪输出中包含系统提示词（默认：true）。",
  );
  assert.equal(
    translateExactText("JSONL output path for cache trace logs (default: $OPENCLAW_STATE_DIR/logs/cache-trace.jsonl)."),
    "缓存跟踪日志的 JSONL 输出路径（默认：$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl）。",
  );
  assert.equal(translateExactText("Diagnostics Flags"), "诊断标记");
  assert.equal(
    translateExactText(
      'Enable targeted diagnostics logs by flag (e.g. ["telegram.http"]). Supports wildcards like "telegram.*" or "*".',
    ),
    "按标记启用定向诊断日志（例如 `[\"telegram.http\"]`）。支持如 `telegram.*` 或 `*` 这样的通配符。",
  );
  assert.equal(translateExactText("OpenTelemetry Endpoint"), "OpenTelemetry 端点");
  assert.equal(translateExactText("OpenTelemetry Headers"), "OpenTelemetry 请求头");
  assert.equal(translateExactText("OpenTelemetry Enabled"), "OpenTelemetry 已启用");
  assert.equal(translateExactText("OpenTelemetry Logs Enabled"), "OpenTelemetry 日志已启用");
  assert.equal(translateExactText("OpenTelemetry Metrics Enabled"), "OpenTelemetry 指标已启用");
  assert.equal(translateExactText("OpenTelemetry Protocol"), "OpenTelemetry 协议");
  assert.equal(translateExactText("OpenTelemetry Trace Sample Rate"), "OpenTelemetry 追踪采样率");
  assert.equal(translateExactText("OpenTelemetry Service Name"), "OpenTelemetry 服务名称");
  assert.equal(translateExactText("OpenTelemetry Traces Enabled"), "OpenTelemetry 追踪已启用");
  assert.equal(
    translateExactText(
      "Master toggle for diagnostics instrumentation output in logs and telemetry wiring paths. Keep enabled for normal observability, and disable only in tightly constrained environments.",
    ),
    "用于控制日志与遥测链路中诊断埋点输出的总开关。正常可观测性场景建议保持启用，仅在资源或合规要求非常严格的环境下再关闭。",
  );
  assert.equal(
    translateExactText(
      "Enables OpenTelemetry export pipeline for traces, metrics, and logs based on configured endpoint/protocol settings. Keep disabled unless your collector endpoint and auth are fully configured.",
    ),
    "根据已配置的端点和协议设置启用 OpenTelemetry 的追踪、指标和日志导出链路。只有在采集器端点和鉴权都配置完成后再启用。",
  );
  assert.equal(
    translateExactText(
      "Enable log signal export through OpenTelemetry in addition to local logging sinks. Use this when centralized log correlation is required across services and agents.",
    ),
    "除了本地日志输出外，同时通过 OpenTelemetry 导出日志信号。在需要跨服务和代理进行集中式日志关联时启用。",
  );
  assert.equal(
    translateExactText(
      "OpenTelemetry export settings for traces, metrics, and logs emitted by gateway components. Use this when integrating with centralized observability backends and distributed tracing pipelines.",
    ),
    "用于配置网关组件导出的追踪、指标和日志的 OpenTelemetry 设置。在接入集中式可观测性后端和分布式追踪链路时使用。",
  );
  assert.equal(
    translateExactText(
      "Collector endpoint URL used for OpenTelemetry export transport, including scheme and port. Use a reachable, trusted collector endpoint and monitor ingestion errors after rollout.",
    ),
    "用于 OpenTelemetry 导出的采集器端点 URL，包含协议和端口。请使用可达且可信的采集器端点，并在启用后关注数据接收错误。",
  );
  assert.equal(
    translateExactText(
      "Interval in milliseconds for periodic telemetry flush from buffers to the collector. Increase to reduce export chatter, or lower for faster visibility during active incident response.",
    ),
    "定期将遥测数据从缓冲区刷新到采集器的间隔时间（毫秒）。调大可减少导出频率，调小则能在故障处理中更快看到数据。",
  );
  assert.equal(
    translateExactText(
      "Additional HTTP/gRPC metadata headers sent with OpenTelemetry export requests, often used for tenant auth or routing. Keep secrets in env-backed values and avoid unnecessary header sprawl.",
    ),
    "随 OpenTelemetry 导出请求一起发送的额外 HTTP/gRPC 元数据请求头，通常用于租户鉴权或路由。请把敏感值放在环境变量中，并避免无必要地扩张请求头。",
  );
  assert.equal(
    translateExactText(
      'OTel transport protocol for telemetry export: "http/protobuf" or "grpc" depending on collector support. Use the protocol your observability backend expects to avoid dropped telemetry payloads.',
    ),
    "遥测导出的 OTel 传输协议，可根据采集器支持情况选择 `http/protobuf` 或 `grpc`。请使用你的可观测性后端所要求的协议，避免遥测数据被丢弃。",
  );
  assert.equal(translateExactText("Environment Variables"), "环境变量");
  assert.equal(translateExactText("Environment variables passed to the gateway process"), "传递给网关进程的环境变量");
  assert.equal(translateExactText("Shell Environment Import"), "Shell 环境导入");
  assert.equal(translateExactText("Shell Environment Import Enabled"), "Shell 环境导入已启用");
  assert.equal(translateExactText("Shell Environment Import Timeout (ms)"), "Shell 环境导入超时（毫秒）");
  assert.equal(translateExactText("Environment Variable Overrides"), "环境变量覆盖");
  assert.equal(translateExactText("Metadata"), "元数据");
  assert.equal(translateExactText("Gateway metadata and version information"), "网关元数据与版本信息");
  assert.equal(translateExactText("Logging"), "日志");
  assert.equal(translateExactText("Log levels and output configuration"), "日志级别与输出配置");
  assert.equal(translateExactText("Console Log Level"), "控制台日志级别");
  assert.equal(translateExactText("Select..."), "请选择...");
  assert.equal(translateExactText("warn"), "警告");
  assert.equal(translateExactText("error"), "错误");
  assert.equal(translateExactText("debug"), "调试");
  assert.equal(translateExactText("trace"), "追踪");
  assert.equal(translateExactText("Open"), "打开");
  assert.equal(translateExactText("Apply"), "应用");
  assert.equal(translateExactText("Update"), "更新");
  assert.equal(translateExactText("Automation"), "自动化");
  assert.equal(translateExactText("Commands"), "命令");
  assert.equal(translateExactText("Approvals"), "审批");
  assert.equal(translateExactText("Exec Approval Forwarding"), "执行审批转发");
  assert.equal(translateExactText("Approval Agent Filter"), "审批代理筛选");
  assert.equal(translateExactText("0 items"), "0 项");
  assert.equal(translateExactText("Add"), "添加");
  assert.equal(translateExactText('No items yet. Click "Add" to create one.'), '暂无条目。点击“添加”来创建。');
  assert.equal(translateExactText("Forward Exec Approvals"), "转发执行审批");
  assert.equal(translateExactText("Approval Forwarding Mode"), "审批转发模式");
  assert.equal(
    translateExactText(
      "Groups exec-approval forwarding behavior including enablement, routing mode, filters, and explicit targets. Configure here when approval prompts must reach operational channels instead of only the origin thread.",
    ),
    "用于配置执行审批转发行为，包括启用状态、路由模式、筛选条件和显式目标。当审批提示需要发送到运维频道而不仅是原始线程时，请在这里设置。",
  );
  assert.equal(
    translateExactText(
      'Optional allowlist of agent IDs eligible for forwarded approvals, for example `[\"primary\", \"ops-agent\"]`. Use this to limit forwarding blast radius and avoid notifying channels for unrelated agents.',
    ),
    "可选的代理 ID 白名单，只有这些代理的审批可被转发，例如 `[\"primary\", \"ops-agent\"]`。用它来限制转发范围，避免为无关代理通知频道。",
  );
  assert.equal(
    translateExactText(
      "Enables forwarding of exec approval requests to configured delivery destinations (default: false). Keep disabled in low-risk setups and enable only when human approval responders need channel-visible prompts.",
    ),
    "启用后会把执行审批请求转发到已配置的投递目标（默认：false）。在低风险场景下建议保持关闭，仅在需要人工审批响应者通过频道可见提示处理时启用。",
  );
  assert.equal(
    translateExactText(
      'Controls where approval prompts are sent: \"session\" uses origin chat, \"targets\" uses configured targets, and \"both\" sends to both paths. Use \"session\" as baseline and expand only when operational workflow requires redundancy.',
    ),
    "控制审批提示发送到哪里：`session` 使用原始聊天，`targets` 使用已配置目标，`both` 同时发送到两条路径。建议默认使用 `session`，仅在运维流程确实需要冗余时再扩展。",
  );
  assert.equal(translateExactText("Key bindings and shortcuts"), "按键绑定与快捷方式");
  assert.equal(translateExactText("Custom slash commands"), "自定义斜杠命令");
  assert.equal(
    translateExactText(
      'Optional session-key filters matched as substring or regex-style patterns, for example `[\"discord:\", \"^agent:ops:\"]`. Use narrow patterns so only intended approval contexts are forwarded to shared destinations.',
    ),
    "可选的会话键筛选规则，可按子串或类正则模式匹配，例如 `[\"discord:\", \"^agent:ops:\"]`。请尽量使用更窄的模式，确保只把预期的审批上下文转发到共享目标。",
  );
  assert.equal(
    translateExactText(
      "Explicit delivery targets used when forwarding mode includes targets, each with channel and destination details. Keep target lists least-privilege and validate each destination before enabling broad forwarding.",
    ),
    "当转发模式包含 targets 时，这里定义显式投递目标，每项都包含频道和目标明细。请保持目标列表最小权限，并在启用广泛转发前逐一验证目标是否正确。",
  );
  assert.equal(
    translateExactText(
      "Top-level binding rules for routing and persistent ACP conversation ownership. Use type=route for normal routing and type=acp for persistent ACP harness bindings.",
    ),
    "用于路由和持久化 ACP 会话归属的顶层绑定规则。普通路由使用 `type=route`，持久化 ACP 控制链路使用 `type=acp`。",
  );
  assert.equal(
    translateExactText(
      "Defines elevated command allow rules by channel and sender for owner-level command surfaces. Use narrow provider-specific identities so privileged commands are not exposed to broad chat audiences.",
    ),
    "按频道和发送者定义提权命令的允许规则，用于 owner 级命令入口。请使用更窄的 provider 身份范围，避免高权限命令暴露给过宽的聊天对象。",
  );
  assert.equal(translateExactText("session"), "会话");
  assert.equal(translateExactText("targets"), "目标");
  assert.equal(translateExactText("both"), "两者");
  assert.equal(translateExactText("advanced"), "高级");
  assert.equal(translateExactText("Running"), "运行中");
  assert.equal(translateExactText("Configured"), "已配置");
  assert.equal(translateExactText("Last inbound"), "最后入站");
  assert.equal(translateExactText("Schedule"), "调度");
  assert.equal(translateExactText("Last run"), "上次运行");
  assert.equal(translateExactText("Reset"), "重置");
  assert.equal(translateExactText("Run if due"), "到点则运行");
  assert.equal(translateExactText("Channel status and configuration."), "频道状态与配置。");
  assert.equal(translateExactText("Channel health"), "频道健康");
  assert.equal(translateExactText("Channel status snapshots from the gateway."), "来自网关的频道状态快照。");
  assert.equal(translateExactText("21m ago"), "21 分钟前");
  assert.equal(translateExactText("in 2m"), "2 分钟后");
  assert.equal(translateExactText("in <1m"), "少于 1 分钟后");
  assert.equal(
    translateExactText("周二, 2026/3/24 16:02:27 (in 1h)"),
    "周二, 2026/3/24 16:02:27（1 小时后）",
  );
  assert.equal(translateExactText("just now"), "刚刚");
  assert.equal(
    translateExactText("announce (qqbot -> qqbot:c2c:123456)"),
    "发布（qqbot -> qqbot:c2c:123456）",
  );
  assert.equal(translateExactText("isolated"), "隔离");
  assert.equal(translateExactText("now"), "立即");
  assert.equal(
    translateExactText("Unsupported type: . Use Raw mode."),
    "不支持的类型：。请使用原始模式。",
  );
  assert.equal(translateExactText("OpenClaw Control"), "OpenClaw 控制台");
  assert.equal(translateExactText("openai-codex/gpt-5.2-codex"), "openai-codex/gpt-5.2-codex");
  assert.equal(translateUiAttributeValue("aria-label", "Toggle token visibility"), "切换令牌可见性");
  assert.equal(translateUiAttributeValue("aria-label", "Color mode"), "颜色模式");
  assert.equal(translateUiAttributeValue("title", "Delete message"), "删除消息");
  assert.equal(translateUiAttributeValue("title", "Open Files tab"), "打开文件标签");
  assert.equal(translateUiAttributeValue("title", "Settings"), "设置");
  assert.equal(translateUiAttributeValue("title", "Updates"), "更新");
  assert.equal(translateUiAttributeValue("title", "Environment"), "环境");
  assert.equal(translateUiAttributeValue("title", "Authentication"), "身份验证");
  assert.equal(translateUiAttributeValue("title", "Cli"), "CLI");
  assert.equal(translateUiAttributeValue("title", "Form view can't safely edit some fields"), "表单视图无法安全编辑某些字段");
  assert.equal(translateUiAttributeValue("placeholder", "Search settings..."), "搜索设置...");
  assert.equal(translateUiAttributeValue("aria-label", "Settings sections"), "设置分区");
  assert.equal(translateUiAttributeValue("title", "Automation"), "自动化");
  assert.equal(translateUiAttributeValue("title", "Commands"), "命令");
  assert.equal(translateUiAttributeValue("title", "Approvals"), "审批");
  assert.equal(translateUiAttributeValue("title", "Remove entry"), "删除条目");
  assert.equal(translateUiAttributeValue("title", "Reset to default"), "重置为默认值");
  assert.equal(translateUiAttributeValue("placeholder", "Key"), "键");
  assert.equal(
    translateUiAttributeValue("aria-label", "Message 小毛毛 (Enter to send)"),
    "给 小毛毛 发消息（回车发送）",
  );
});

test("syncControlUi rebuilds the local target from upstream and injects overlay assets", () => {
  const { OVERLAY_ASSET_NAME, syncControlUi } = loadModule();
  const sourceDir = makeTempDir("openclaw-control-ui-source-");
  const targetDir = makeTempDir("openclaw-control-ui-target-");

  fs.mkdirSync(path.join(sourceDir, "assets"), { recursive: true });
  fs.writeFileSync(
    path.join(sourceDir, "index.html"),
    `<!doctype html>
<html>
  <head>
    <script type="module" crossorigin src="./assets/index-main.js"></script>
  </head>
  <body>
    <openclaw-app></openclaw-app>
  </body>
</html>`,
  );
  fs.writeFileSync(path.join(sourceDir, "assets", "index-main.js"), "console.log('upstream');");
  fs.writeFileSync(path.join(sourceDir, "assets", "zh-CN.js"), "export const zh_CN = {};");
  fs.mkdirSync(path.join(targetDir, "assets"), { recursive: true });
  fs.writeFileSync(path.join(targetDir, "stale.txt"), "remove me");

  syncControlUi({ sourceDir, targetDir });

  assert.equal(fs.existsSync(path.join(targetDir, "stale.txt")), false);
  assert.equal(fs.existsSync(path.join(targetDir, "assets", "index-main.js")), true);
  assert.equal(fs.existsSync(path.join(targetDir, "assets", OVERLAY_ASSET_NAME)), true);

  const targetIndex = fs.readFileSync(path.join(targetDir, "index.html"), "utf8");
  assert.match(
    targetIndex,
    new RegExp(`${OVERLAY_ASSET_NAME.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\?v=`),
  );

  const overlaySource = fs.readFileSync(path.join(targetDir, "assets", OVERLAY_ASSET_NAME), "utf8");
  assert.match(overlaySource, /MutationObserver/);
  assert.match(overlaySource, /Toggle token visibility/);
  assert.match(overlaySource, /characterData:\s*true/);
  assert.match(overlaySource, /setTimeout/);
});
