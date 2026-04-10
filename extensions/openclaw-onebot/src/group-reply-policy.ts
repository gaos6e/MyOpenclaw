import type { OneBotGroupReplyPolicy } from "./types.js";

export interface GroupReplyPolicyState {
  lastBotReplyAt: number;
  proactiveReplyTimestamps: number[];
}

export interface ResolvedGroupReplyPolicy {
  mode: OneBotGroupReplyPolicy;
  proactiveCooldownMs: number;
  maxProactiveRepliesPerHour: number;
  proactiveInterjectChancePercent: number;
}

export interface GroupReplyDecisionInput {
  messageId?: number;
  text: string;
  isAtMentioned: boolean;
  aliasMatched: boolean;
  keywordMatched: boolean;
  contextualMatched: boolean;
  policy: ResolvedGroupReplyPolicy;
  state: GroupReplyPolicyState;
  now: number;
}

export interface GroupReplyDecision {
  shouldReply: boolean;
  reason: "" | "mention" | "alias" | "keyword" | "reply-to-bot" | "context-follow-up" | "proactive";
  proactive: boolean;
}

const LOW_SIGNAL_PATTERNS = [
  /^(嗯+|恩+|啊+|额+|呃+|哦+|噢+|喔+)$/i,
  /^(好+|好的|好吧|行+|行吧|收到|知道了|ok|okk+|okay|kk+)$/i,
  /^(哈+|哈哈+|呵+|呵呵+|嘿+|嘻嘻+|笑死|6+|草+)$/i,
  /^[?？!！~～.。]+$/i,
];

function normalizeLowSignalText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, "")
    .replace(/[，,、；;：:“”"'‘’【】\[\]()（）<>《》]/g, "");
}

export function isLowSignalGroupUtterance(text: string): boolean {
  const normalized = normalizeLowSignalText(text);
  if (!normalized) return true;
  if (normalized.length > 8) return false;
  return LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function matchesDeterministicChance(messageId: number | undefined, text: string, chancePercent: number): boolean {
  const normalizedChance = Math.max(0, Math.min(100, Math.round(chancePercent)));
  if (normalizedChance <= 0) return false;
  if (normalizedChance >= 100) return true;
  const seed = Number(messageId ?? 0) || Array.from(text).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return Math.abs(seed) % 100 < normalizedChance;
}

export function canProactivelyInterject(input: Pick<GroupReplyDecisionInput, "messageId" | "text" | "policy" | "state" | "now">): boolean {
  const text = input.text.trim();
  if (!text) return false;
  if (isLowSignalGroupUtterance(text)) return false;
  if (input.state.lastBotReplyAt > 0 && input.now - input.state.lastBotReplyAt < input.policy.proactiveCooldownMs) {
    return false;
  }
  if (input.state.proactiveReplyTimestamps.length >= input.policy.maxProactiveRepliesPerHour) {
    return false;
  }
  return matchesDeterministicChance(input.messageId, text, input.policy.proactiveInterjectChancePercent);
}

export function decideGroupReplyTrigger(input: GroupReplyDecisionInput): GroupReplyDecision {
  if (input.policy.mode === "@mentions-only") {
    if (!input.isAtMentioned) {
      return { shouldReply: false, reason: "", proactive: false };
    }
    return { shouldReply: true, reason: "mention", proactive: false };
  }

  if (input.isAtMentioned) {
    return { shouldReply: true, reason: "mention", proactive: false };
  }

  if (input.aliasMatched) {
    return { shouldReply: true, reason: "alias", proactive: false };
  }

  if (input.keywordMatched) {
    return { shouldReply: true, reason: "keyword", proactive: false };
  }

  if (input.contextualMatched) {
    return {
      shouldReply: true,
      reason: /^那|所以|然后|继续|还有|另外|顺便|要不|能不能|怎么|为什么|咋|是否|[?？]/.test(input.text.trim())
        ? "context-follow-up"
        : "reply-to-bot",
      proactive: false,
    };
  }

  if (
    input.policy.mode === "@always-reply-plus-random-interject"
    && canProactivelyInterject(input)
  ) {
    return { shouldReply: true, reason: "proactive", proactive: true };
  }

  return { shouldReply: false, reason: "", proactive: false };
}
