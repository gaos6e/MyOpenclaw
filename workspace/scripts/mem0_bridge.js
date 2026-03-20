// Mem0 bridge: extract memories and append to daily log
// Usage: node scripts/mem0_bridge.js "conversation chunk" --user xiaogao

import { MemoryClient } from 'mem0ai';
import fs from 'fs';
import path from 'path';

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

// Append summary to daily log
const now = new Date();
const yyyy = now.getFullYear();
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');
const dailyPath = path.join(process.cwd(), 'memory', `${yyyy}-${mm}-${dd}.md`);

const header = `# ${yyyy}-${mm}-${dd}\n\n`;
if (!fs.existsSync(path.dirname(dailyPath))) {
  fs.mkdirSync(path.dirname(dailyPath), { recursive: true });
}
if (!fs.existsSync(dailyPath)) {
  fs.writeFileSync(dailyPath, header, 'utf8');
}

const line = `- [Mem0] ${JSON.stringify(res)}\n`;
fs.appendFileSync(dailyPath, line, 'utf8');

console.log(JSON.stringify({ ok: true, dailyPath }, null, 2));
