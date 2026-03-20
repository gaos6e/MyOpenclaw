// Simple Mem0 capture helper
// Usage: node scripts/mem0_capture.js "text to capture" --user user123
// Requires: MEM0_API_KEY in env

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

async function main() {
  const { userId, text } = parseArgs(process.argv);

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

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
