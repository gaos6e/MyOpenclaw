import fs from "node:fs";
import path from "node:path";

function resolveWorkspaceDir(api, ctx) {
  return path.resolve(
    ctx?.workspaceDir
      ?? api?.config?.agents?.defaults?.workspace
      ?? path.join(process.cwd(), "workspace"),
  );
}

function guardianDir(workspaceDir) {
  return path.join(workspaceDir, ".openclaw", "checkpoint-guardian");
}

function statePath(workspaceDir) {
  return path.join(guardianDir(workspaceDir), "state.json");
}

function resetAuditPath(workspaceDir) {
  return path.join(guardianDir(workspaceDir), "resets.jsonl");
}

function ensureGuardianDir(workspaceDir) {
  fs.mkdirSync(guardianDir(workspaceDir), { recursive: true });
}

function readState(workspaceDir) {
  const filePath = statePath(workspaceDir);
  if (!fs.existsSync(filePath)) {
    return { sessions: {} };
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeState(workspaceDir, state) {
  ensureGuardianDir(workspaceDir);
  fs.writeFileSync(statePath(workspaceDir), JSON.stringify(state, null, 2), "utf8");
}

function appendJsonl(filePath, entry) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, "utf8");
}

function normalizePath(input) {
  return String(input ?? "").replace(/\\/g, "/").toLowerCase();
}

function sessionStateKey(ctx) {
  return String(ctx?.sessionKey ?? ctx?.sessionId ?? "unknown");
}

function isCheckpointFileTarget(rawPath) {
  const normalized = normalizePath(rawPath);
  return [
    "/memory.md",
    "/agents.md",
    "/tools.md",
    "/self_improve_todo.md",
    "/self_improve_status.md",
    "/self_improve_quality.md",
    "/memory/",
    "/.learnings/",
  ].some((token) => normalized.includes(token));
}

function isCheckpointCommand(command) {
  const normalized = String(command ?? "").toLowerCase();
  return /openclaw\s+memory-hub\s+(extract|promote)\b/.test(normalized);
}

function classifyToolCall(event) {
  if (!event || event.error) {
    return "none";
  }
  const toolName = String(event.toolName ?? "").toLowerCase();
  const params = event.params ?? {};

  if ((toolName === "edit" || toolName === "write") && isCheckpointFileTarget(params.path)) {
    return "checkpoint";
  }
  if (toolName === "exec" && isCheckpointCommand(params.command)) {
    return "checkpoint";
  }
  if (toolName === "memory_store" || toolName === "memory_update" || toolName === "memory_delete") {
    return "checkpoint";
  }

  if (
    toolName === "read"
    || toolName === "find"
    || toolName === "search"
    || toolName === "exec"
    || toolName === "memory_search"
    || toolName === "memory_get"
    || toolName === "session_recall_search"
    || toolName === "session_recall_get"
    || toolName.startsWith("browser")
  ) {
    return "exploration";
  }

  return "neutral";
}

function ensureSessionState(state, key) {
  if (!state.sessions[key]) {
    state.sessions[key] = {
      explorationSinceCheckpoint: 0,
      toolCallsSinceCheckpoint: 0,
      lastCheckpointAt: null,
      lastReminderAtExplorationCount: 0,
      lastUpdatedAt: null,
    };
  }
  return state.sessions[key];
}

function buildReminderText(session) {
  return [
    "Checkpoint Guardian",
    `- ${session.explorationSinceCheckpoint} exploration steps since the last durable checkpoint.`,
    "- Before continuing, persist any stable learnings to Hindsight or the local MEMORY/self_improve archive. Use memory-hub candidate tools only when you are intentionally maintaining the local archive.",
    "- If nothing is worth keeping, continue without creating a fake checkpoint.",
  ].join("\n");
}

const plugin = {
  id: "openclaw-checkpoint-guardian",
  name: "OpenClaw Checkpoint Guardian",
  description: "Injects checkpoint reminders after repeated exploration and records reset audits.",
  configSchema: {
    parse(value) {
      return value ?? {};
    },
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        explorationThreshold: { type: "integer", minimum: 1 },
        reminderCooldown: { type: "integer", minimum: 1 },
      },
    },
  },
  register(api) {
    const threshold = Math.max(1, Number(api.pluginConfig?.explorationThreshold ?? 6));
    const reminderCooldown = Math.max(1, Number(api.pluginConfig?.reminderCooldown ?? 4));

    api.on("after_tool_call", async (event, ctx) => {
      const workspaceDir = resolveWorkspaceDir(api, ctx);
      const state = readState(workspaceDir);
      const session = ensureSessionState(state, sessionStateKey(ctx));
      const classification = classifyToolCall(event);

      if (classification === "checkpoint") {
        session.explorationSinceCheckpoint = 0;
        session.toolCallsSinceCheckpoint = 0;
        session.lastReminderAtExplorationCount = 0;
        session.lastCheckpointAt = new Date().toISOString();
      } else {
        if (classification === "exploration") {
          session.explorationSinceCheckpoint += 1;
        }
        if (classification === "exploration" || classification === "neutral") {
          session.toolCallsSinceCheckpoint += 1;
        }
      }

      session.lastUpdatedAt = new Date().toISOString();
      writeState(workspaceDir, state);
    });

    api.on("before_prompt_build", async (_event, ctx) => {
      const workspaceDir = resolveWorkspaceDir(api, ctx);
      const state = readState(workspaceDir);
      const session = ensureSessionState(state, sessionStateKey(ctx));

      if (session.explorationSinceCheckpoint < threshold) {
        return;
      }
      if (
        session.lastReminderAtExplorationCount
        && session.explorationSinceCheckpoint - session.lastReminderAtExplorationCount < reminderCooldown
      ) {
        return;
      }

      session.lastReminderAtExplorationCount = session.explorationSinceCheckpoint;
      session.lastUpdatedAt = new Date().toISOString();
      writeState(workspaceDir, state);

      return {
        appendSystemContext: buildReminderText(session),
      };
    });

    api.on("before_reset", async (event, ctx) => {
      const workspaceDir = resolveWorkspaceDir(api, ctx);
      const state = readState(workspaceDir);
      const key = sessionStateKey(ctx);
      const session = ensureSessionState(state, key);

      if (session.toolCallsSinceCheckpoint > 0 || session.explorationSinceCheckpoint > 0) {
        appendJsonl(resetAuditPath(workspaceDir), {
          recordedAt: new Date().toISOString(),
          sessionKey: ctx?.sessionKey ?? null,
          sessionId: ctx?.sessionId ?? null,
          reason: event?.reason ?? null,
          explorationSinceCheckpoint: session.explorationSinceCheckpoint,
          toolCallsSinceCheckpoint: session.toolCallsSinceCheckpoint,
          lastCheckpointAt: session.lastCheckpointAt,
        });
      }

      delete state.sessions[key];
      writeState(workspaceDir, state);
    });
  },
};

export default plugin;
