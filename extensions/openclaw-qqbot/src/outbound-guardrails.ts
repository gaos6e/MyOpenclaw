import { isSuppressedInternalQQMessage } from "./utils/text-parsing.js";

export interface QQOutboundTextDecision {
  action: "allow" | "replace" | "drop";
  text: string;
  reason?: string;
}

interface PendingProgressSend<T> {
  timer: ReturnType<typeof setTimeout>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

const INTERNAL_CONTEXT_MARKERS = [
  "OpenClaw runtime context (internal):",
  "[Internal task completion event]",
  "<<<BEGIN_UNTRUSTED_CHILD_RESULT>>>",
  "A completed subagent task is ready for user delivery.",
];

const INTERNAL_SCRATCHPAD_HEADINGS = [
  "Assessing",
  "Planning",
  "Considering",
  "Reviewing",
  "Evaluating",
  "Working on",
];

const INTERNAL_SCRATCHPAD_MARKERS = [
  "AGENTS.md",
  "TOOLS.md",
  "ERRORS.md",
  "HEARTBEAT.md",
  "self_improve_quality.md",
  "heartbeat checklist",
  "daily memory",
  "cron jobs",
];

const FINAL_UPDATE_MARKERS = [
  "已完成",
  "最终",
  "结果",
  "grade",
  "report",
  "token",
  "统计：",
  "当前天气",
  "国际大事",
  "Moltbook",
  "Moltcn",
  "异常：",
  "失败：",
  "错误：",
  "/status",
];

const EXEC_POLICY_ERROR_PATTERNS = [
  /^exec denied: allowlist miss\.?$/i,
  /^exec 运行被拦截：\s*`?exec denied: allowlist miss\.?`?$/i,
  /^exec denied \([^)]*allowlist miss[^)]*\)\.?$/i,
];

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function trimInternalRuntimeContext(text: string): { text: string; changed: boolean } {
  let working = normalizeLineEndings(text);
  let changed = false;

  for (const marker of INTERNAL_CONTEXT_MARKERS) {
    const idx = working.indexOf(marker);
    if (idx >= 0) {
      working = working.slice(0, idx).trimEnd();
      changed = true;
    }
  }

  const stripped = changed ? working.replace(/\n{3,}/g, "\n\n").trim() : working;
  return {
    text: stripped,
    changed,
  };
}

function countInternalScratchpadMarkers(text: string): number {
  let count = 0;
  for (const marker of INTERNAL_SCRATCHPAD_MARKERS) {
    if (text.includes(marker)) {
      count++;
    }
  }
  return count;
}

export function looksLikeInternalScratchpad(text: string): boolean {
  const normalized = normalizeLineEndings(text).trim();
  if (normalized.length < 120) {
    return false;
  }

  const headingPattern = new RegExp(`(?:^|\\n)\\*\\*(?:${INTERNAL_SCRATCHPAD_HEADINGS.join("|")})\\b`, "i");
  if (!headingPattern.test(normalized)) {
    return false;
  }

  if (!/\b(I need to|I should|Let's|First, I'll|I can enhance|I need to structure my approach)\b/i.test(normalized)) {
    return false;
  }

  return countInternalScratchpadMarkers(normalized) >= 2;
}

export function sanitizeQQOutboundText(text: string): QQOutboundTextDecision {
  if (!text) {
    return { action: "allow", text };
  }

  const normalized = normalizeLineEndings(text).trim();
  if (EXEC_POLICY_ERROR_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      action: "replace",
      text: "这次执行请求被当前安全策略拦截了。需要我继续执行的话，你先给这次操作授权，我再继续。",
      reason: "exec-policy-error",
    };
  }

  if (isSuppressedInternalQQMessage(text)) {
    return {
      action: "replace",
      text: "这次执行请求被安全策略拦截，内部命令内容已隐藏。我会换更安全的方式继续处理。",
      reason: "exec-approval-followup",
    };
  }

  if (looksLikeInternalScratchpad(text)) {
    return {
      action: "replace",
      text: "我正在处理中，整理成面向你的结论后再发你。",
      reason: "internal-scratchpad",
    };
  }

  const trimmed = trimInternalRuntimeContext(text);
  if (trimmed.changed) {
    if (!trimmed.text) {
      return {
        action: "drop",
        text: "",
        reason: "internal-runtime-context",
      };
    }
    return {
      action: "allow",
      text: trimmed.text,
      reason: "internal-runtime-context-trimmed",
    };
  }

  return { action: "allow", text };
}

export function isLikelyInterimProgressUpdate(text: string): boolean {
  const normalized = normalizeLineEndings(text).trim();
  if (!normalized || normalized.length > 240) {
    return false;
  }

  const compact = normalized.replace(/^哥哥～\s*/, "");
  if (FINAL_UPDATE_MARKERS.some((marker) => compact.includes(marker))) {
    return false;
  }

  return /^(开始|继续|正在|在做|处理中|我先|我继续|我正在|我这边已经|刚才|刚刚|有路了|快结束了|被限流了一下|出了一次|还没处理好|不太正常|先查|先读|先核|先跑|先整理)/.test(compact);
}

export function createQQInterimMessageCoalescer<T>(waitMs = 1200) {
  const pendingByKey = new Map<string, PendingProgressSend<T>>();

  const clearPending = (key: string, value: T): void => {
    const pending = pendingByKey.get(key);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timer);
    pendingByKey.delete(key);
    pending.resolve(value);
  };

  return {
    send(
      key: string,
      text: string,
      suppressedValue: T,
      performSend: () => Promise<T>,
    ): Promise<T> {
      if (!isLikelyInterimProgressUpdate(text)) {
        clearPending(key, suppressedValue);
        return performSend();
      }

      clearPending(key, suppressedValue);

      return new Promise<T>((resolve, reject) => {
        let timer: ReturnType<typeof setTimeout>;
        timer = setTimeout(() => {
          pendingByKey.delete(key);
          void performSend().then(resolve, reject);
        }, waitMs);

        pendingByKey.set(key, {
          timer,
          resolve,
          reject,
        });
      });
    },
  };
}
