// Simple Mem0 capture helper
// Usage: node scripts/mem0_capture.js "text to capture" --user user123
// Requires: MEM0_API_KEY in env

import { MemoryClient } from 'mem0ai';

const args = process.argv.slice(2);
const userIdx = args.indexOf('--user');
const userId = userIdx >= 0 ? args[userIdx + 1] : 'default';
const text = args.filter((a, i) => i !== userIdx && i !== userIdx + 1).join(' ').trim();

if (!process.env.MEM0_API_KEY) {
  console.error('MEM0_API_KEY not set');
  process.exit(1);
}
if (!text) {
  console.error('No text provided');
  process.exit(1);
}

const client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });

const messages = [{ role: 'user', content: text }];
const res = await client.add(messages, { user_id: userId });
console.log(JSON.stringify(res, null, 2));
