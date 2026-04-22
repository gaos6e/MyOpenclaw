/**
 * OneBot 配置解析
 */

import fs from "node:fs";
import path from "node:path";
import type {
  OneBotAccountConfig,
  OneBotAccountInput,
  OneBotGroupReplyPolicy,
  ResolvedOneBotAccount,
} from "./types.js";

export const DEFAULT_ONEBOT_ACCOUNT_ID = "default";

const DEFAULT_GROUP_REPLY_POLICY = "@always-reply-plus-contextual";
const DEFAULT_PROACTIVE_COOLDOWN_MS = 10 * 60 * 1000;
const MIN_PROACTIVE_COOLDOWN_MS = 5_000;
const DEFAULT_MAX_PROACTIVE_REPLIES_PER_HOUR = 3;
const DEFAULT_PROACTIVE_INTERJECT_CHANCE_PERCENT = 30;

interface OneBotChannelConfig extends OneBotAccountInput {
  accounts?: Record<string, OneBotAccountInput>;
}

function normalizeFilePath(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (!value) {
    return "";
  }
  if (value.startsWith("~")) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    if (homeDir) {
      return path.resolve(value.replace(/^~(?=[\\/]|$)/, homeDir));
    }
  }
  return path.resolve(value);
}

function readAccessTokenFromFile(filePath: unknown): string {
  const resolvedPath = normalizeFilePath(filePath);
  if (!resolvedPath) {
    return "";
  }
  try {
    return fs.readFileSync(resolvedPath, "utf8").trim();
  } catch {
    return "";
  }
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return Array.from(new Set(
    input
      .map((item) => String(item ?? "").trim())
      .filter(Boolean),
  ));
}

function parseWsUrl(rawUrl: string): { type: "forward-websocket" | "backward-websocket"; host: string; port: number; path: string; wsUrl: string } | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    const type = url.searchParams.get("mode") === "backward-websocket"
      ? "backward-websocket"
      : "forward-websocket";
    const port = url.port ? Number(url.port) : (url.protocol === "wss:" ? 443 : 80);
    if (!url.hostname || !Number.isFinite(port)) {
      return null;
    }
    return {
      type,
      host: url.hostname,
      port,
      path: url.pathname && url.pathname !== "/" ? url.pathname : "/onebot/v11/ws",
      wsUrl: trimmed,
    };
  } catch {
    return null;
  }
}

function resolveRawAccountInput(cfg: any, accountId?: string | null): { accountId: string; input: OneBotAccountInput } {
  const resolvedAccountId = accountId ?? DEFAULT_ONEBOT_ACCOUNT_ID;
  const channel = cfg?.channels?.onebot as OneBotChannelConfig | undefined;

  if (resolvedAccountId !== DEFAULT_ONEBOT_ACCOUNT_ID) {
    const namedAccount = channel?.accounts?.[resolvedAccountId];
    return { accountId: resolvedAccountId, input: namedAccount ?? {} };
  }

  if (channel?.wsUrl || channel?.accessToken || channel?.accessTokenFile) {
    return { accountId: resolvedAccountId, input: channel ?? {} };
  }

  const accountIds = listAccountIds(cfg);
  if (accountIds.length > 0) {
    const fallbackAccountId = accountIds[0];
    return {
      accountId: fallbackAccountId,
      input: channel?.accounts?.[fallbackAccountId] ?? {},
    };
  }

  return { accountId: resolvedAccountId, input: {} };
}

export function resolveGroupReplyPolicy(input: OneBotAccountInput | undefined) {
  const mode = input?.groupReplyPolicy === "@mentions-only"
    || input?.groupReplyPolicy === "@always-reply-plus-random-interject"
    || input?.groupReplyPolicy === "@always-reply-plus-contextual"
    ? input.groupReplyPolicy
    : DEFAULT_GROUP_REPLY_POLICY;

  const proactiveCooldownMs = typeof input?.proactiveCooldownMs === "number" && Number.isFinite(input.proactiveCooldownMs)
    ? Math.max(MIN_PROACTIVE_COOLDOWN_MS, Math.round(input.proactiveCooldownMs))
    : DEFAULT_PROACTIVE_COOLDOWN_MS;

  const maxProactiveRepliesPerHour = typeof input?.maxProactiveRepliesPerHour === "number" && Number.isFinite(input.maxProactiveRepliesPerHour)
    ? Math.max(1, Math.round(input.maxProactiveRepliesPerHour))
    : DEFAULT_MAX_PROACTIVE_REPLIES_PER_HOUR;

  const proactiveInterjectChancePercent = typeof input?.proactiveInterjectChancePercent === "number" && Number.isFinite(input.proactiveInterjectChancePercent)
    ? Math.max(0, Math.min(100, Math.round(input.proactiveInterjectChancePercent)))
    : DEFAULT_PROACTIVE_INTERJECT_CHANCE_PERCENT;

  return {
    mode,
    proactiveCooldownMs,
    maxProactiveRepliesPerHour,
    proactiveInterjectChancePercent,
  };
}

export function resolveOneBotAccount(cfg: any, accountId?: string | null): ResolvedOneBotAccount {
  const { accountId: resolvedAccountId, input } = resolveRawAccountInput(cfg, accountId);
  const wsUrl = String(input?.wsUrl ?? process.env.ONEBOT_WS_URL ?? "").trim();
  const parsed = parseWsUrl(wsUrl);
  const accessToken = input?.accessToken
    ? String(input.accessToken)
    : input?.accessTokenFile
      ? readAccessTokenFromFile(input.accessTokenFile)
      : String(process.env.ONEBOT_WS_ACCESS_TOKEN ?? "");
  const secretSource: ResolvedOneBotAccount["secretSource"] = input?.accessToken
    ? "config"
    : input?.accessTokenFile
      ? "file"
      : process.env.ONEBOT_WS_ACCESS_TOKEN
        ? "env"
        : "none";

  return {
    accountId: resolvedAccountId,
    enabled: input?.enabled !== false,
    selfId: String(input?.selfId ?? process.env.ONEBOT_SELF_ID ?? ""),
    wsUrl: parsed?.wsUrl ?? wsUrl,
    accessToken: accessToken.trim(),
    secretSource,
    config: {
      ...input,
      systemPrompt: typeof input?.systemPrompt === "string" ? input.systemPrompt : undefined,
      aliases: normalizeStringArray(input?.aliases),
      groupReplyPolicy: resolveGroupReplyPolicy(input).mode,
      proactiveCooldownMs: resolveGroupReplyPolicy(input).proactiveCooldownMs,
      maxProactiveRepliesPerHour: resolveGroupReplyPolicy(input).maxProactiveRepliesPerHour,
      proactiveInterjectChancePercent: resolveGroupReplyPolicy(input).proactiveInterjectChancePercent,
      accessTokenFile: input?.accessTokenFile ? normalizeFilePath(input.accessTokenFile) : undefined,
    },
    type: parsed?.type ?? "forward-websocket",
    host: parsed?.host ?? "",
    port: parsed?.port ?? 0,
    path: parsed?.path ?? "/onebot/v11/ws",
  };
}

export function getOneBotConfig(apiOrCfg: any, accountId?: string): OneBotAccountConfig | null {
  const cfg = apiOrCfg?.config ?? apiOrCfg ?? (globalThis as any).__onebotGatewayConfig;
  const account = resolveOneBotAccount(cfg, accountId);
  if (!account.wsUrl || !account.host || !account.port) {
    return null;
  }
  return {
    accountId: account.accountId,
    enabled: account.enabled,
    selfId: account.selfId,
    wsUrl: account.wsUrl,
    accessToken: account.accessToken || undefined,
    accessTokenFile: account.config.accessTokenFile,
    systemPrompt: account.config.systemPrompt,
    aliases: account.config.aliases,
    groupReplyPolicy: account.config.groupReplyPolicy,
    proactiveCooldownMs: account.config.proactiveCooldownMs,
    maxProactiveRepliesPerHour: account.config.maxProactiveRepliesPerHour,
    proactiveInterjectChancePercent: account.config.proactiveInterjectChancePercent,
    renderMarkdownToPlain: account.config.renderMarkdownToPlain,
    collapseDoubleNewlines: account.config.collapseDoubleNewlines,
    whitelistUserIds: account.config.whitelistUserIds,
    blacklistUserIds: account.config.blacklistUserIds,
    longMessageMode: account.config.longMessageMode,
    longMessageThreshold: account.config.longMessageThreshold,
    thinkingEmojiId: account.config.thinkingEmojiId,
    type: account.type,
    host: account.host,
    port: account.port,
    path: account.path,
  };
}

export function listAccountIds(apiOrCfg: any): string[] {
  const cfg = apiOrCfg?.config ?? apiOrCfg ?? (globalThis as any).__onebotGatewayConfig;
  const channel = cfg?.channels?.onebot as OneBotChannelConfig | undefined;
  const ids = Object.keys(channel?.accounts ?? {});
  if (ids.length > 0) {
    return ids;
  }
  if (channel?.wsUrl) {
    return [DEFAULT_ONEBOT_ACCOUNT_ID];
  }
  return [];
}

export function getRenderMarkdownToPlain(cfg: any, accountId?: string): boolean {
  const account = resolveOneBotAccount(cfg, accountId);
  const value = account.config.renderMarkdownToPlain;
  return value === undefined ? true : Boolean(value);
}

export function getCollapseDoubleNewlines(cfg: any, accountId?: string): boolean {
  const account = resolveOneBotAccount(cfg, accountId);
  const value = account.config.collapseDoubleNewlines;
  return value === undefined ? true : Boolean(value);
}

function getFiniteNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(min, Math.min(max, Math.round(value)));
  }
  return fallback;
}

export function getNormalModeFlushIntervalMs(cfg: any): number {
  return getFiniteNumber(cfg?.channels?.onebot?.normalModeFlushIntervalMs, 1200, 200, 5000);
}

export function getNormalModeFlushChars(cfg: any): number {
  return getFiniteNumber(cfg?.channels?.onebot?.normalModeFlushChars, 160, 20, 2000);
}

export function getWhitelistUserIds(cfg: any, accountId?: string): number[] {
  const account = resolveOneBotAccount(cfg, accountId);
  return Array.isArray(account.config.whitelistUserIds)
    ? account.config.whitelistUserIds.filter((value) => Number.isFinite(Number(value))).map((value) => Number(value))
    : [];
}

export function getBlacklistUserIds(cfg: any, accountId?: string): number[] {
  const account = resolveOneBotAccount(cfg, accountId);
  return Array.isArray(account.config.blacklistUserIds)
    ? account.config.blacklistUserIds.filter((value) => Number.isFinite(Number(value))).map((value) => Number(value))
    : [];
}

export function getOgImageRenderTheme(cfg: any): "default" | "dust" | string {
  const v = cfg?.channels?.onebot?.ogImageRenderTheme;
  const cssPath = String(cfg?.channels?.onebot?.ogImageRenderThemePath ?? "").trim();
  if (v === "dust") return "dust";
  if (v === "custom" && cssPath) return cssPath;
  return "default";
}

export function getAliases(cfg: any, accountId?: string): string[] {
  const account = resolveOneBotAccount(cfg, accountId);
  return normalizeStringArray(account.config.aliases);
}

export function getTriggerKeywords(cfg: any, accountId?: string): string[] {
  const channelKeywords = cfg?.channels?.onebot?.triggerKeywords;
  if (Array.isArray(channelKeywords) && channelKeywords.length > 0) {
    return normalizeStringArray(channelKeywords);
  }
  return getAliases(cfg, accountId);
}

export function getTriggerMode(cfg: any): "prefix" | "contains" {
  const v = cfg?.channels?.onebot?.triggerMode;
  return v === "prefix" ? "prefix" : "contains";
}

export function getReplyWhenWhitelistDenied(cfg: any): boolean {
  const v = cfg?.channels?.onebot?.replyWhenWhitelistDenied;
  return v === undefined ? true : Boolean(v);
}
