(() => {
  const config = {"localeStorageKey":"openclaw.i18n.locale","ignoreTextSelector":"code,pre,textarea,input,.mono,[data-no-translate],[role='log'],.chat-thread,.chat-msg,.chat-bubble,.chat-line","exactTextTranslations":{"Agent":"代理","Overview":"概览","Files":"文件","Tools":"工具","Skills":"技能","Channels":"频道","Cron Jobs":"定时任务","Refresh":"刷新","Save":"保存","Export":"导出","Workspace":"工作区","Primary Model":"主模型","Skills Filter":"技能筛选","all skills":"全部技能","Model Selection":"模型选择","Fallbacks":"回退模型","Reload Config":"重新加载配置","WebSocket URL":"WebSocket 地址","Connected":"已连接","Last connect":"上次连接","Yes":"是","No":"否","Loading":"加载中","Loading…":"加载中…","Saving":"保存中","Saving…":"保存中…","Search":"搜索","System":"跟随系统","Light":"浅色","Dark":"深色","Primary model":"主模型","Default model":"默认模型","(default)":"（默认）","Workspace paths and identity metadata.":"工作区路径与身份元数据。","OpenClaw Control":"OpenClaw 控制台","Reload":"重新加载","Running":"运行中","Configured":"已配置","Last inbound":"最后入站","Schedule":"调度","Last run":"上次运行","Reset":"重置","Run if due":"到点则运行","Channel status and configuration.":"频道状态与配置。","Channel health":"频道健康","Channel status snapshots from the gateway.":"来自网关的频道状态快照。","QQ Bot":"QQ 机器人","Cron":"Cron 表达式","isolated":"隔离","now":"立即","default":"默认"},"exactAttributeTranslations":{"Toggle token visibility":"切换令牌可见性","Toggle password visibility":"切换密码可见性","Open command palette":"打开命令面板","Search or jump to… (⌘K)":"搜索或跳转…（⌘K）","Color mode":"颜色模式","Chat settings":"聊天设置","Toggle tool calls and tool results":"切换工具调用与工具结果显示","Attach file":"附加文件","Voice input":"语音输入","New session":"新建会话","Delete message":"删除消息","Delete":"删除","Read aloud":"朗读","Open in canvas":"在画布中打开","Copy as markdown":"复制为 Markdown","Open Files tab":"打开文件标签","Gateway status: 在线":"网关状态：在线","文档 (opens in new tab)":"文档（在新标签页打开）","Chat model":"聊天模型","Send":"发送","Export":"导出","System":"跟随系统","Light":"浅色","Dark":"深色"},"textRegexRules":[{"source":"^Default \\((.+)\\)$","flags":"i","template":"(_match, value) => `默认（${value}）`"},{"source":"^announce \\((.+)\\)$","flags":"i","template":"(_match, value) => `发布（${value}）`"},{"source":"^(\\d+)([smhd]) ago$","flags":"i","template":"(_match, count, unit) =>\n      `${count} ${({ s: \"秒\", m: \"分钟\", h: \"小时\", d: \"天\" })[unit.toLowerCase()] || unit}前`"},{"source":"^in (\\d+)([smhd])$","flags":"i","template":"(_match, count, unit) =>\n      `${count} ${({ s: \"秒\", m: \"分钟\", h: \"小时\", d: \"天\" })[unit.toLowerCase()] || unit}后`"},{"source":"^in <(\\d+)([smhd])$","flags":"i","template":"(_match, count, unit) =>\n      `少于 ${count} ${({ s: \"秒\", m: \"分钟\", h: \"小时\", d: \"天\" })[unit.toLowerCase()] || unit}后`"},{"source":"^(.*)\\s+\\(in (\\d+)([smhd])\\)$","flags":"i","template":"(_match, prefix, count, unit) =>\n      `${prefix}（${count} ${({ s: \"秒\", m: \"分钟\", h: \"小时\", d: \"天\" })[unit.toLowerCase()] || unit}后）`"},{"source":"^(.*)\\s+\\(in <(\\d+)([smhd])\\)$","flags":"i","template":"(_match, prefix, count, unit) =>\n      `${prefix}（少于 ${count} ${({ s: \"秒\", m: \"分钟\", h: \"小时\", d: \"天\" })[unit.toLowerCase()] || unit}后）`"},{"source":"^Cron (.+)$","flags":"i","template":"(_match, value) => `Cron：${value}`"},{"source":"^just now$","flags":"i","template":"() => \"刚刚\""},{"source":"^Unsupported type:\\s*(.*)\\.\\s*Use Raw mode\\.$","flags":"i","template":"(_match, value) => `不支持的类型：${value}。请使用原始模式。`"},{"source":"^(\\d+)\\s+selected$","flags":"i","template":"(_match, count) => `${count} 项已选`"},{"source":"^Accounts \\((\\d+)\\)$","flags":"i","template":"(_match, count) => `账号（${count}）`"},{"source":"^Last refresh:\\s+(.+)$","flags":"i","template":"(_match, value) => `上次刷新：${value}`"}],"attributeRegexRules":[{"attrs":["placeholder","aria-label","title"],"source":"^Message\\s+(.+)\\s+\\(Enter to send\\)$","flags":"i","template":"(_match, name) => `给 ${name} 发消息（回车发送）`"},{"attrs":["aria-label","title"],"source":"^Color mode:\\s*(System|Light|Dark)$","flags":"i","template":"(_match, mode) =>\n      `颜色模式：${{ System: \"跟随系统\", Light: \"浅色\", Dark: \"深色\" }[mode] ?? mode}`"}]};
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
      const current = element.textContent;
      if (!current || !current.trim()) continue;
      const translated = translateTextValue(current);
      if (translated !== current) {
        element.textContent = translated;
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
