import fs from "node:fs";
import path from "node:path";

export function appendOperationLog(logPath, payload) {
  if (!logPath) {
    return;
  }
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(
    logPath,
    `${JSON.stringify({ ts: new Date().toISOString(), ...payload })}\n`,
    "utf8",
  );
}
