/**
 * OneBot 协议与配置类型定义
 */

export type OneBotGroupReplyPolicy =
  | "@mentions-only"
  | "@always-reply-plus-contextual"
  | "@always-reply-plus-random-interject";

export interface OneBotMessageSegment {
  type: string;
  data?: Record<string, unknown>;
}

export interface OneBotMessage {
  post_type: string;
  message_type?: "private" | "group";
  notice_type?: string;
  message_id?: number;
  user_id?: number;
  group_id?: number;
  message?: OneBotMessageSegment[];
  raw_message?: string;
  self_id?: number;
  time?: number;
  sender?: {
    user_id?: number;
    nickname?: string;
    card?: string;
  };
  [key: string]: unknown;
}

export interface OneBotAccountInput {
  enabled?: boolean;
  selfId?: string;
  wsUrl?: string;
  accessToken?: string;
  accessTokenFile?: string;
  systemPrompt?: string;
  aliases?: string[];
  groupReplyPolicy?: OneBotGroupReplyPolicy;
  proactiveCooldownMs?: number;
  maxProactiveRepliesPerHour?: number;
  proactiveInterjectChancePercent?: number;
  renderMarkdownToPlain?: boolean;
  collapseDoubleNewlines?: boolean;
  whitelistUserIds?: number[];
  blacklistUserIds?: number[];
  longMessageMode?: "normal" | "og_image" | "forward";
  longMessageThreshold?: number;
  thinkingEmojiId?: number;
}

export interface OneBotAccountConfig extends OneBotAccountInput {
  accountId: string;
  type: "forward-websocket" | "backward-websocket";
  host: string;
  port: number;
  path: string;
}

export interface ResolvedOneBotAccount {
  accountId: string;
  enabled: boolean;
  selfId: string;
  wsUrl: string;
  accessToken: string;
  secretSource: "config" | "file" | "env" | "none";
  config: OneBotAccountInput;
  type: "forward-websocket" | "backward-websocket";
  host: string;
  port: number;
  path: string;
}
