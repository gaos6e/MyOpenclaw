/**
 * task-ack Hook for OpenClaw
 *
 * Sends an immediate receipt message for likely task-style inbound messages.
 */

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

const TASK_HINTS = [
  /帮我/, /麻烦/, /请你/, /请帮/, /帮忙/, /执行/, /运行/, /测试/, /试下/, /验证/, /检查/, /查下/, /看看/,
  /修复/, /解决/, /迁移/, /清理/, /更新/, /配置/, /设置/, /提交/, /移除/, /整理/, /生成/, /做个/,
];

function isLikelyTask(text) {
  const t = String(text ?? "").trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  if (IGNORE_EXACT.has(t) || IGNORE_EXACT.has(lower)) return false;
  if (t.length <= 2) return false;
  if (/^(哈喽|嗨|早|晚安|晚好)$/.test(t)) return false;
  return TASK_HINTS.some((re) => re.test(t));
}

function excerpt(text, max = 18) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max) + "…";
}

const handler = async (event) => {
  if (!event || typeof event !== "object") return;
  if (event.type !== "message" || event.action !== "received") return;
  if (!event.context || typeof event.context !== "object") return;

  const ctx = event.context;
  const content = String(ctx.content ?? "");
  if (ctx.isGroup === true) return;

  if (!isLikelyTask(content)) return;

  const short = excerpt(content);
  event.messages.push(`收到，我先核对现状、相关文件和约束，再开始处理「${short}」。`);
};

module.exports = handler;
module.exports.default = handler;
