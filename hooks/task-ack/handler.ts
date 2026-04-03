/**
 * task-ack Hook for OpenClaw
 *
 * Sends an immediate receipt message for likely task-style inbound messages.
 */

import type { HookHandler } from "openclaw/hooks";

const IGNORE_EXACT = new Set([
  "在吗",
  "在吗?",
  "在吗？",
  "你好",
  "你好?",
  "你好？",
  "hi",
  "hello",
  "hey",
  "ok",
  "好的",
]);

const TASK_HINTS: RegExp[] = [
  /帮我/, /麻烦/, /请你/, /请帮/, /帮忙/, /执行/, /运行/, /测试/, /试下/, /验证/, /检查/, /查下/, /看看/,
  /修复/, /解决/, /迁移/, /清理/, /更新/, /配置/, /设置/, /提交/, /移除/, /整理/, /生成/, /做个/,
];

function isLikelyTask(text: string): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  if (IGNORE_EXACT.has(t) || IGNORE_EXACT.has(lower)) return false;
  // very short chatter
  if (t.length <= 2) return false;
  // questions like "在吗" already filtered; for generic greetings, don't ack
  if (/^(哈喽|嗨|早|晚安|晚好)$/.test(t)) return false;
  return TASK_HINTS.some((re) => re.test(t));
}

function excerpt(text: string, max = 18): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max) + "…";
}

const handler: HookHandler = async (event) => {
  if (!event || typeof event !== "object") return;
  if (event.type !== "message" || event.action !== "received") return;
  if (!event.context || typeof event.context !== "object") return;

  const ctx = event.context as any;
  const content: string = String(ctx.content ?? "");

  // Prefer to only ack direct chats when possible.
  // Different providers expose group flags differently; keep this defensive.
  if (ctx.isGroup === true) return;

  if (!isLikelyTask(content)) return;

  const short = excerpt(content);
  // Keep the ack factual and action-oriented so the first step is clear immediately.
  event.messages.push(`收到，我先核对现状、相关文件和约束，再开始处理「${short}」。`);
};

export default handler;
