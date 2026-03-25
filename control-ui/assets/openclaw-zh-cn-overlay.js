(() => {
  const config = {"localeStorageKey":"openclaw.i18n.locale","ignoreTextSelector":"code,pre,textarea,input,.mono,[data-no-translate],[role='log'],.chat-thread,.chat-msg,.chat-bubble,.chat-line","exactTextTranslations":{"Agent":"代理","Overview":"概览","Files":"文件","Tools":"工具","Skills":"技能","Channels":"频道","Cron Jobs":"定时任务","Refresh":"刷新","Save":"保存","Export":"导出","Workspace":"工作区","Primary Model":"主模型","Skills Filter":"技能筛选","all skills":"全部技能","Model Selection":"模型选择","Fallbacks":"回退模型","Reload Config":"重新加载配置","WebSocket URL":"WebSocket 地址","unauthorized: gateway token missing (open the dashboard URL and paste the token in Control UI settings)":"未授权：缺少网关令牌（请打开仪表盘地址，并将令牌粘贴到 Control UI 设置中）","Connected":"已连接","Last connect":"上次连接","Yes":"是","No":"否","Loading":"加载中","Loading…":"加载中…","Saving":"保存中","Saving…":"保存中…","Search":"搜索","System":"跟随系统","Light":"浅色","Dark":"深色","Primary model":"主模型","Default model":"默认模型","(default)":"（默认）","Workspace paths and identity metadata.":"工作区路径与身份元数据。","OpenClaw Control":"OpenClaw 控制台","Reload":"重新加载","Running":"运行中","Configured":"已配置","Last inbound":"最后入站","Schedule":"调度","Last run":"上次运行","Reset":"重置","Run if due":"到点则运行","Channel status and configuration.":"频道状态与配置。","Channel health":"频道健康","Channel status snapshots from the gateway.":"来自网关的频道状态快照。","QQ Bot":"QQ 机器人","Cron":"Cron 表达式","No changes":"无更改","Form":"表单","Raw":"原始","Settings":"设置","Environment":"环境","Authentication":"身份验证","Updates":"更新","Meta":"元数据","Logging":"日志","Diagnostics":"诊断","Secrets":"机密","Auto-update settings and release channel":"自动更新设置与发布通道","Auto":"自动","Auto Update Beta Check Interval (hours)":"自动更新 Beta 检查间隔（小时）","How often beta-channel checks run in hours (default: 1).":"Beta 通道检查的运行频率（单位：小时，默认：1）。","performance":"性能","Auto Update Enabled":"自动更新已启用","Enable background auto-update for package installs (default: false).":"为软件包安装启用后台自动更新（默认：false）。","Auto Update Stable Delay (hours)":"自动更新稳定通道延迟（小时）","Minimum delay before stable-channel auto-apply starts (default: 6).":"稳定通道自动应用开始前的最小延迟（默认：6）。","Auto Update Stable Jitter (hours)":"自动更新稳定通道抖动（小时）","Extra stable-channel rollout spread window in hours (default: 12).":"稳定通道发布扩散窗口增加时长（单位：小时，默认：12）。","Update Channel":"更新通道","Update Check on Start":"启动时检查更新","Check for npm updates when the gateway starts (default: true).":"网关启动时检查 npm 更新（默认：true）。","random":"随机","off":"关闭","Update channel for git + npm installs (\"stable\", \"beta\", or \"dev\").":"用于 git + npm 安装的更新通道（“stable”“beta”或“dev”）。","CLI banner and startup behavior":"CLI 横幅与启动行为","CLI Banner":"CLI 横幅","CLI startup banner controls for title/version line and tagline style behavior. Keep banner enabled for fast version/context checks, then tune tagline mode to your preferred noise level.":"用于控制 CLI 启动横幅的标题/版本行与标语显示方式。建议保持横幅开启以便快速确认版本和上下文，再按你偏好的信息密度调整标语模式。","Controls tagline style in the CLI startup banner: \"random\" (default) picks from the rotating tagline pool, \"default\" always shows the neutral default tagline, and \"off\" hides tagline text while keeping the banner version line.":"控制 CLI 启动横幅中的标语显示方式：`random`（默认）从轮换标语池中随机选择，`default` 始终显示中性的默认标语，`off` 则隐藏标语文本但保留版本行。","Instrumentation, OpenTelemetry, and cache-trace settings":"监控埋点、OpenTelemetry 和缓存跟踪设置","Cache Trace":"缓存跟踪","Cache-trace logging settings for observing cache decisions and payload context in embedded runs. Enable this temporarily for debugging and disable afterward to reduce sensitive log footprint.":"用于观察嵌入式运行中缓存决策和载荷上下文的缓存跟踪日志设置。建议仅在调试时临时启用，完成后关闭以减少敏感日志暴露。","Cache Trace Enabled":"缓存跟踪已启用","Cache Trace File Path":"缓存跟踪文件路径","Cache Trace Include Messages":"缓存跟踪包含消息","Cache Trace Include Prompt":"缓存跟踪包含提示词","Cache Trace Include System":"缓存跟踪包含系统提示","Log cache trace snapshots for embedded agent runs (default: false).":"记录嵌入式代理运行的缓存跟踪快照（默认：false）。","Include full message payloads in trace output (default: true).":"在跟踪输出中包含完整消息载荷（默认：true）。","Include prompt text in trace output (default: true).":"在跟踪输出中包含提示词文本（默认：true）。","Include system prompt in trace output (default: true).":"在跟踪输出中包含系统提示词（默认：true）。","JSONL output path for cache trace logs (default: $OPENCLAW_STATE_DIR/logs/cache-trace.jsonl).":"缓存跟踪日志的 JSONL 输出路径（默认：$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl）。","Diagnostics Flags":"诊断标记","Enable targeted diagnostics logs by flag (e.g. [\"telegram.http\"]). Supports wildcards like \"telegram.*\" or \"*\".":"按标记启用定向诊断日志（例如 `[\"telegram.http\"]`）。支持如 `telegram.*` 或 `*` 这样的通配符。","OpenTelemetry Endpoint":"OpenTelemetry 端点","OpenTelemetry Headers":"OpenTelemetry 请求头","OpenTelemetry Enabled":"OpenTelemetry 已启用","OpenTelemetry Logs Enabled":"OpenTelemetry 日志已启用","OpenTelemetry Metrics Enabled":"OpenTelemetry 指标已启用","OpenTelemetry Protocol":"OpenTelemetry 协议","OpenTelemetry Trace Sample Rate":"OpenTelemetry 追踪采样率","OpenTelemetry Service Name":"OpenTelemetry 服务名称","OpenTelemetry Traces Enabled":"OpenTelemetry 追踪已启用","Master toggle for diagnostics instrumentation output in logs and telemetry wiring paths. Keep enabled for normal observability, and disable only in tightly constrained environments.":"用于控制日志与遥测链路中诊断埋点输出的总开关。正常可观测性场景建议保持启用，仅在资源或合规要求非常严格的环境下再关闭。","Enables OpenTelemetry export pipeline for traces, metrics, and logs based on configured endpoint/protocol settings. Keep disabled unless your collector endpoint and auth are fully configured.":"根据已配置的端点和协议设置启用 OpenTelemetry 的追踪、指标和日志导出链路。只有在采集器端点和鉴权都配置完成后再启用。","Enable log signal export through OpenTelemetry in addition to local logging sinks. Use this when centralized log correlation is required across services and agents.":"除了本地日志输出外，同时通过 OpenTelemetry 导出日志信号。在需要跨服务和代理进行集中式日志关联时启用。","OpenTelemetry export settings for traces, metrics, and logs emitted by gateway components. Use this when integrating with centralized observability backends and distributed tracing pipelines.":"用于配置网关组件导出的追踪、指标和日志的 OpenTelemetry 设置。在接入集中式可观测性后端和分布式追踪链路时使用。","Collector endpoint URL used for OpenTelemetry export transport, including scheme and port. Use a reachable, trusted collector endpoint and monitor ingestion errors after rollout.":"用于 OpenTelemetry 导出的采集器端点 URL，包含协议和端口。请使用可达且可信的采集器端点，并在启用后关注数据接收错误。","Interval in milliseconds for periodic telemetry flush from buffers to the collector. Increase to reduce export chatter, or lower for faster visibility during active incident response.":"定期将遥测数据从缓冲区刷新到采集器的间隔时间（毫秒）。调大可减少导出频率，调小则能在故障处理中更快看到数据。","Additional HTTP/gRPC metadata headers sent with OpenTelemetry export requests, often used for tenant auth or routing. Keep secrets in env-backed values and avoid unnecessary header sprawl.":"随 OpenTelemetry 导出请求一起发送的额外 HTTP/gRPC 元数据请求头，通常用于租户鉴权或路由。请把敏感值放在环境变量中，并避免无必要地扩张请求头。","OTel transport protocol for telemetry export: \"http/protobuf\" or \"grpc\" depending on collector support. Use the protocol your observability backend expects to avoid dropped telemetry payloads.":"遥测导出的 OTel 传输协议，可根据采集器支持情况选择 `http/protobuf` 或 `grpc`。请使用你的可观测性后端所要求的协议，避免遥测数据被丢弃。","Environment Variables":"环境变量","Environment variables passed to the gateway process":"传递给网关进程的环境变量","Shell Environment Import":"Shell 环境导入","Shell Environment Import Enabled":"Shell 环境导入已启用","Shell Environment Import Timeout (ms)":"Shell 环境导入超时（毫秒）","Environment Variable Overrides":"环境变量覆盖","Metadata":"元数据","Gateway metadata and version information":"网关元数据与版本信息","Log levels and output configuration":"日志级别与输出配置","Console Log Level":"控制台日志级别","Select...":"请选择...","warn":"警告","error":"错误","debug":"调试","trace":"追踪","Open":"打开","Apply":"应用","Update":"更新","Automation":"自动化","Commands":"命令","Hooks":"钩子","Bindings":"绑定","Approvals":"审批","Plugins":"插件","Exec Approval Forwarding":"执行审批转发","Approval Agent Filter":"审批代理筛选","0 items":"0 项","Add":"添加","No items yet. Click \"Add\" to create one.":"暂无条目。点击“添加”来创建。","Forward Exec Approvals":"转发执行审批","Approval Forwarding Mode":"审批转发模式","Groups exec-approval forwarding behavior including enablement, routing mode, filters, and explicit targets. Configure here when approval prompts must reach operational channels instead of only the origin thread.":"用于配置执行审批转发行为，包括启用状态、路由模式、筛选条件和显式目标。当审批提示需要发送到运维频道而不仅是原始线程时，请在这里设置。","Optional allowlist of agent IDs eligible for forwarded approvals, for example `[\"primary\", \"ops-agent\"]`. Use this to limit forwarding blast radius and avoid notifying channels for unrelated agents.":"可选的代理 ID 白名单，只有这些代理的审批可被转发，例如 `[\"primary\", \"ops-agent\"]`。用它来限制转发范围，避免为无关代理通知频道。","Enables forwarding of exec approval requests to configured delivery destinations (default: false). Keep disabled in low-risk setups and enable only when human approval responders need channel-visible prompts.":"启用后会把执行审批请求转发到已配置的投递目标（默认：false）。在低风险场景下建议保持关闭，仅在需要人工审批响应者通过频道可见提示处理时启用。","Controls where approval prompts are sent: \"session\" uses origin chat, \"targets\" uses configured targets, and \"both\" sends to both paths. Use \"session\" as baseline and expand only when operational workflow requires redundancy.":"控制审批提示发送到哪里：`session` 使用原始聊天，`targets` 使用已配置目标，`both` 同时发送到两条路径。建议默认使用 `session`，仅在运维流程确实需要冗余时再扩展。","Key bindings and shortcuts":"按键绑定与快捷方式","Custom slash commands":"自定义斜杠命令","Optional session-key filters matched as substring or regex-style patterns, for example `[\"discord:\", \"^agent:ops:\"]`. Use narrow patterns so only intended approval contexts are forwarded to shared destinations.":"可选的会话键筛选规则，可按子串或类正则模式匹配，例如 `[\"discord:\", \"^agent:ops:\"]`。请尽量使用更窄的模式，确保只把预期的审批上下文转发到共享目标。","Explicit delivery targets used when forwarding mode includes targets, each with channel and destination details. Keep target lists least-privilege and validate each destination before enabling broad forwarding.":"当转发模式包含 targets 时，这里定义显式投递目标，每项都包含频道和目标明细。请保持目标列表最小权限，并在启用广泛转发前逐一验证目标是否正确。","Top-level binding rules for routing and persistent ACP conversation ownership. Use type=route for normal routing and type=acp for persistent ACP harness bindings.":"用于路由和持久化 ACP 会话归属的顶层绑定规则。普通路由使用 `type=route`，持久化 ACP 控制链路使用 `type=acp`。","Defines elevated command allow rules by channel and sender for owner-level command surfaces. Use narrow provider-specific identities so privileged commands are not exposed to broad chat audiences.":"按频道和发送者定义提权命令的允许规则，用于 owner 级命令入口。请使用更窄的 provider 身份范围，避免高权限命令暴露给过宽的聊天对象。","session":"会话","targets":"目标","both":"两者","advanced":"高级","Approval Session Filter":"审批会话筛选","storage":"存储","Approval Forwarding Targets":"审批转发目标","Scheduled tasks and automation":"定时任务与自动化","Failure Alert":"失败告警","Account Id":"账户 ID","After":"触发阈值","Cooldown Ms":"冷却毫秒","Enabled":"已启用","Mode":"模式","webhook":"Webhook","Failure Destination":"失败投递目标","Channel":"频道","To":"收件人","Remove entry":"删除条目","Remove item":"删除项目","Custom entries":"自定义条目","Add Entry":"添加条目","No custom entries.":"暂无自定义条目。","Command Elevated Access Rules":"命令提权访问规则","access":"访问","Allow Bash Chat Command":"允许 Bash 聊天命令","Bash Foreground Window (ms)":"Bash 前台窗口（毫秒）","Allow /config":"允许 /config","Allow /debug":"允许 /debug","Allow /mcp":"允许 /mcp","Native Commands":"原生命令","Native Skill Commands":"原生技能命令","Command Owners":"命令所有者","Owner ID Hash Secret":"所有者 ID 哈希密钥","Allow /plugins":"允许 /plugins","Allow Restart":"允许重启","Text Commands":"文本命令","Use Access Groups":"使用访问组","Cron：Enabled":"Cron：已启用","Cron：Retry Policy":"Cron：重试策略","Cron：Retry Backoff (ms)":"Cron：重试退避（毫秒）","Cron：Retry Max Attempts":"Cron：最大重试次数","Cron：Retry Error Types":"Cron：重试错误类型","Cron：Run Log Pruning":"Cron：运行日志清理","Cron：Run Log Keep Lines":"Cron：运行日志保留行数","isolated":"隔离","now":"立即","default":"默认"},"exactAttributeTranslations":{"Toggle token visibility":"切换令牌可见性","Toggle password visibility":"切换密码可见性","Open command palette":"打开命令面板","Search or jump to… (⌘K)":"搜索或跳转…（⌘K）","Color mode":"颜色模式","Chat settings":"聊天设置","Toggle tool calls and tool results":"切换工具调用与工具结果显示","Attach file":"附加文件","Voice input":"语音输入","New session":"新建会话","Delete message":"删除消息","Delete":"删除","Read aloud":"朗读","Open in canvas":"在画布中打开","Copy as markdown":"复制为 Markdown","Open Files tab":"打开文件标签","Gateway status: 在线":"网关状态：在线","文档 (opens in new tab)":"文档（在新标签页打开）","Chat model":"聊天模型","Settings sections":"设置分区","Search settings...":"搜索设置...","Automation":"自动化","Commands":"命令","Approvals":"审批","Settings":"设置","Updates":"更新","Environment":"环境","Authentication":"身份验证","Cli":"CLI","Form view can't safely edit some fields":"表单视图无法安全编辑某些字段","Remove entry":"删除条目","Reset to default":"重置为默认值","Key":"键","Send":"发送","Export":"导出","System":"跟随系统","Light":"浅色","Dark":"深色"},"textRegexRules":[{"source":"^Default \\((.+)\\)$","flags":"i","template":"(_match, value) => `默认（${value}）`"},{"source":"^announce \\((.+)\\)$","flags":"i","template":"(_match, value) => `发布（${value}）`"},{"source":"^(\\d+)([smhd]) ago$","flags":"i","template":"(_match, count, unit) =>\n      `${count} ${({ s: \"秒\", m: \"分钟\", h: \"小时\", d: \"天\" })[unit.toLowerCase()] || unit}前`"},{"source":"^in (\\d+)([smhd])$","flags":"i","template":"(_match, count, unit) =>\n      `${count} ${({ s: \"秒\", m: \"分钟\", h: \"小时\", d: \"天\" })[unit.toLowerCase()] || unit}后`"},{"source":"^in <(\\d+)([smhd])$","flags":"i","template":"(_match, count, unit) =>\n      `少于 ${count} ${({ s: \"秒\", m: \"分钟\", h: \"小时\", d: \"天\" })[unit.toLowerCase()] || unit}后`"},{"source":"^(.*)\\s+\\(in (\\d+)([smhd])\\)$","flags":"i","template":"(_match, prefix, count, unit) =>\n      `${prefix}（${count} ${({ s: \"秒\", m: \"分钟\", h: \"小时\", d: \"天\" })[unit.toLowerCase()] || unit}后）`"},{"source":"^(.*)\\s+\\(in <(\\d+)([smhd])\\)$","flags":"i","template":"(_match, prefix, count, unit) =>\n      `${prefix}（少于 ${count} ${({ s: \"秒\", m: \"分钟\", h: \"小时\", d: \"天\" })[unit.toLowerCase()] || unit}后）`"},{"source":"^Cron (.+)$","flags":"i","template":"(_match, value) => `Cron：${value}`"},{"source":"^just now$","flags":"i","template":"() => \"刚刚\""},{"source":"^Unsupported type:\\s*(.*)\\.\\s*Use Raw mode\\.$","flags":"i","template":"(_match, value) => `不支持的类型：${value}。请使用原始模式。`"},{"source":"^(\\d+)\\s+selected$","flags":"i","template":"(_match, count) => `${count} 项已选`"},{"source":"^Accounts \\((\\d+)\\)$","flags":"i","template":"(_match, count) => `账号（${count}）`"},{"source":"^Last refresh:\\s+(.+)$","flags":"i","template":"(_match, value) => `上次刷新：${value}`"}],"attributeRegexRules":[{"attrs":["placeholder","aria-label","title"],"source":"^Message\\s+(.+)\\s+\\(Enter to send\\)$","flags":"i","template":"(_match, name) => `给 ${name} 发消息（回车发送）`"},{"attrs":["aria-label","title"],"source":"^Color mode:\\s*(System|Light|Dark)$","flags":"i","template":"(_match, mode) =>\n      `颜色模式：${{ System: \"跟随系统\", Light: \"浅色\", Dark: \"深色\" }[mode] ?? mode}`"}]};
  const textRegexRules = [
    { pattern: /^Default \((.+)\)$/i, replace: (_match, value) => `默认（${value}）` },
    { pattern: /^announce \((.+)\)$/i, replace: (_match, value) => `发布（${value}）` },
    {
      pattern: /^(\d+)([smhd]) ago$/i,
      replace: (_match, count, unit) => `${count} ${({ s: "秒", m: "分钟", h: "小时", d: "天" })[unit.toLowerCase()] || unit}前`,
    },
    {
      pattern: /^in (\d+)([smhd])$/i,
      replace: (_match, count, unit) => `${count} ${({ s: "秒", m: "分钟", h: "小时", d: "天" })[unit.toLowerCase()] || unit}后`,
    },
    {
      pattern: /^in <(\d+)([smhd])$/i,
      replace: (_match, count, unit) => `少于 ${count} ${({ s: "秒", m: "分钟", h: "小时", d: "天" })[unit.toLowerCase()] || unit}后`,
    },
    {
      pattern: /^(.*)\s+\(in (\d+)([smhd])\)$/i,
      replace: (_match, prefix, count, unit) => `${prefix}（${count} ${({ s: "秒", m: "分钟", h: "小时", d: "天" })[unit.toLowerCase()] || unit}后）`,
    },
    {
      pattern: /^(.*)\s+\(in <(\d+)([smhd])\)$/i,
      replace: (_match, prefix, count, unit) => `${prefix}（少于 ${count} ${({ s: "秒", m: "分钟", h: "小时", d: "天" })[unit.toLowerCase()] || unit}后）`,
    },
    {
      pattern: /^Cron (.+)$/i,
      replace: (_match, value) => `Cron：${value}`,
    },
    { pattern: /^just now$/i, replace: () => "刚刚" },
    {
      pattern: /^Unsupported type:\s*(.*)\.\s*Use Raw mode\.$/i,
      replace: (_match, value) => `不支持的类型：${value}。请使用原始模式。`,
    },
    { pattern: /^(\d+)\s+selected$/i, replace: (_match, count) => `${count} 项已选` },
    { pattern: /^Accounts \((\d+)\)$/i, replace: (_match, count) => `账号（${count}）` },
    { pattern: /^Last refresh:\s+(.+)$/i, replace: (_match, value) => `上次刷新：${value}` },
  ];
  const attributeRegexRules = [
    {
      attrs: ["placeholder", "aria-label", "title"],
      pattern: /^Message\s+(.+)\s+\(Enter to send\)$/i,
      replace: (_match, name) => `给 ${name} 发消息（回车发送）`,
    },
    {
      attrs: ["aria-label", "title"],
      pattern: /^Color mode:\s*(System|Light|Dark)$/i,
      replace: (_match, mode) => `颜色模式：${({ System: "跟随系统", Light: "浅色", Dark: "深色" })[mode] ?? mode}`,
    },
  ];

  function preserveWhitespace(original, translatedCore) {
    const match = /^(\s*)(.*?)(\s*)$/su.exec(original);
    if (!match) return translatedCore;
    return `${match[1]}${translatedCore}${match[3]}`;
  }

  function translateTextValue(value) {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    const exact = config.exactTextTranslations[trimmed];
    if (exact) return preserveWhitespace(value, exact);
    for (const rule of textRegexRules) {
      const match = rule.pattern.exec(trimmed);
      if (match) return preserveWhitespace(value, rule.replace(...match));
    }
    return value;
  }

  function translateAttributeValue(attributeName, value) {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    const exact = config.exactAttributeTranslations[trimmed] ?? config.exactTextTranslations[trimmed];
    if (exact) return preserveWhitespace(value, exact);
    for (const rule of attributeRegexRules) {
      if (!rule.attrs.includes(attributeName)) continue;
      const match = rule.pattern.exec(trimmed);
      if (match) return preserveWhitespace(value, rule.replace(...match));
    }
    return value;
  }

  function isZhCnActive() {
    try {
      return (window.localStorage.getItem(config.localeStorageKey) || "").toLowerCase() === "zh-cn";
    } catch (_error) {
      return false;
    }
  }

  function shouldSkipTextNode(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    return !!parent.closest(config.ignoreTextSelector);
  }

  function processTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const queue = [];
    while (walker.nextNode()) {
      queue.push(walker.currentNode);
    }
    for (const node of queue) {
      if (shouldSkipTextNode(node)) continue;
      const translated = translateTextValue(node.nodeValue);
      if (translated !== node.nodeValue) {
        node.nodeValue = translated;
      }
    }
  }

  function processWholeElementText(root) {
    const elements = root instanceof Element ? [root, ...root.querySelectorAll("*")] : [];
    for (const element of elements) {
      if (element.childElementCount !== 0) continue;
      if (element.matches(config.ignoreTextSelector) || element.closest(config.ignoreTextSelector)) continue;
      const textNodes = Array.from(element.childNodes).filter(
        (node) => node.nodeType === Node.TEXT_NODE && node.nodeValue && node.nodeValue.trim(),
      );
      if (textNodes.length === 0) continue;
      const current = textNodes.map((node) => node.nodeValue).join("");
      if (!current || !current.trim()) continue;
      const translated = translateTextValue(current);
      if (translated !== current) {
        textNodes[0].nodeValue = translated;
        for (let index = 1; index < textNodes.length; index += 1) {
          textNodes[index].nodeValue = "";
        }
      }
    }
  }

  function processAttributes(root) {
    const elements = root instanceof Element ? [root, ...root.querySelectorAll("*")] : [];
    for (const element of elements) {
      for (const attributeName of ["aria-label", "title", "placeholder"]) {
        const current = element.getAttribute(attributeName);
        if (!current) continue;
        const translated = translateAttributeValue(attributeName, current);
        if (translated !== current) {
          element.setAttribute(attributeName, translated);
        }
      }
    }
  }

  let scheduled = false;
  function processRoot(root) {
    if (!isZhCnActive()) return;
    document.documentElement.lang = "zh-CN";
    document.title = translateTextValue(document.title);
    processAttributes(root);
    processTextNodes(root);
    processWholeElementText(root);
  }

  function scheduleProcess(root = document.body) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (root) processRoot(root);
    });
  }

  function boot() {
    if (!document.body || !isZhCnActive()) return;
    processRoot(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          processAttributes(mutation.target);
          continue;
        }
        if (mutation.type === "characterData" && mutation.target?.parentElement) {
          processRoot(mutation.target.parentElement);
          continue;
        }
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            processRoot(node);
          }
        }
      }
      scheduleProcess(document.body);
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "title", "placeholder"],
    });
    window.addEventListener("storage", () => scheduleProcess(document.body));
    window.addEventListener("popstate", () => scheduleProcess(document.body));
    for (const delay of [300, 1200, 3000]) {
      window.setTimeout(() => scheduleProcess(document.body), delay);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
