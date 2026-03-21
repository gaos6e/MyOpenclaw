// Deprecated experimental bridge.
// This script is retained for compatibility/manual experiments only.
// Canonical self-improvement memory flow is:
//   openclaw memory-hub extract -> candidates -> promote
// Usage: node scripts/mem0_bridge.js "conversation chunk" --user xiaogao

const fs = require("node:fs");
const path = require("node:path");

function parseArgs(argv) {
  const args = argv.slice(2);
  const userIdx = args.indexOf("--user");
  const userId = userIdx >= 0 ? args[userIdx + 1] : "default";
  const text = args
    .filter((_, index) => index !== userIdx && index !== userIdx + 1)
    .join(" ")
    .trim();

  return { userId, text };
}

function formatDateParts(now) {
  return {
    yyyy: now.getFullYear(),
    mm: String(now.getMonth() + 1).padStart(2, "0"),
    dd: String(now.getDate()).padStart(2, "0"),
    stamp: now.toISOString().replace("T", " ").slice(0, 19),
  };
}

function ensureDailyFile(dailyPath, title) {
  const directory = path.dirname(dailyPath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  if (!fs.existsSync(dailyPath)) {
    fs.writeFileSync(
      dailyPath,
      [
        `# ${title}`,
        "",
        "## Facts",
        "",
        "## Decisions",
        "",
        "## Preferences",
        "",
        "## Actions",
        "",
        "## Follow-ups",
        "",
      ].join("\n"),
      "utf8",
    );
  }
}

function summarizeMem0Result(result) {
  if (result == null) {
    return "No memory extracted.";
  }

  if (Array.isArray(result) && result.length > 0) {
    return `Extracted ${result.length} memory item(s).`;
  }

  if (Array.isArray(result?.results) && result.results.length > 0) {
    return `Extracted ${result.results.length} memory item(s).`;
  }

  if (typeof result === "object") {
    const keys = Object.keys(result);
    return keys.length > 0
      ? `Mem0 response keys: ${keys.slice(0, 6).join(", ")}`
      : "Mem0 returned an empty object.";
  }

  return `Mem0 returned: ${String(result)}`;
}

function buildEntry(now, userId, text, result) {
  const summary = summarizeMem0Result(result);
  const compactResult = JSON.stringify(result);

  return [
    `- [Mem0 ${now}] user=${userId}`,
    `  - Input: ${text}`,
    `  - Summary: ${summary}`,
    `  - Raw: ${compactResult}`,
    "",
  ].join("\n");
}

async function main() {
  const { userId, text } = parseArgs(process.argv);

  console.error(
    "[deprecated] mem0_bridge.js is no longer part of the default self-improvement flow. Prefer `openclaw memory-hub extract`.",
  );

  if (!process.env.MEM0_API_KEY) {
    console.error("MEM0_API_KEY not set");
    process.exit(1);
  }
  if (!text) {
    console.error("No text provided");
    process.exit(1);
  }

  const { MemoryClient } = await import("mem0ai");
  const client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });
  const messages = [{ role: "user", content: text }];
  const result = await client.add(messages, { user_id: userId });

  const now = new Date();
  const { yyyy, mm, dd, stamp } = formatDateParts(now);
  const dailyPath = path.join(process.cwd(), "memory", `${yyyy}-${mm}-${dd}.md`);
  ensureDailyFile(dailyPath, `${yyyy}-${mm}-${dd}`);
  fs.appendFileSync(dailyPath, buildEntry(stamp, userId, text, result), "utf8");

  console.log(JSON.stringify({ ok: true, dailyPath, summary: summarizeMem0Result(result) }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
