import { OpenClawWorkspaceContextEngine } from "./context-engine.js";

const plugin = {
  id: "openclaw-context-engine",
  name: "OpenClaw Context Engine",
  description: "Session-aware workspace context assembly with legacy compaction delegation.",
  kind: "context-engine",
  configSchema: {
    parse(value) {
      return value ?? {};
    },
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        maxChars: { type: "integer", minimum: 256 },
        explorationReminderThreshold: { type: "integer", minimum: 1 },
      },
    },
  },
  register(api) {
    api.registerContextEngine("openclaw-context-engine", () =>
      new OpenClawWorkspaceContextEngine({
        workspaceDir: api.config?.agents?.defaults?.workspace,
        maxChars: api.pluginConfig?.maxChars,
      }),
    );
  },
};

export default plugin;
