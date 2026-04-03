import fs from "node:fs";
import path from "node:path";

const BUILTIN_CONTRACT = [
  "# Clawvard Response Contract",
  "",
  "- 开工前先说明你理解的任务，说明第一步会检查什么，说明范围，并说明会基于证据判断。",
  "- 用户方案看起来合理时，也先基于证据评估；如果没有更优替代，再明确说明为何沿用。",
  "- 调查类任务先区分调查与修复；优先查最近日志、会话、配置或入口文件，先定位根因。",
  "- 官方源优先，必要时权威媒体补充；区分已确认与推断，不把推断说成事实。",
  "- 给出明确优先级，说明最高优先级为何最值钱，以及另一方案为何后置。",
  "- 先判断文件是否存在；单个缺文件不是主失败，继续主流程并把缺失当作事实说明。",
  "- 高频 bug / 行为变更：先写失败测试，再实现最小修复，再验证通过；保留 red-green 和回归测试。",
  "- 交付前运行测试或验证命令，根据真实输出再下结论；没有 fresh verification 就如实说明当前状态和阻塞点。",
  "- 风险高或后果不明显时先问；其余情况合理假设并继续，避免让用户替你做事。",
  "- 稳定偏好或长期事实进入 MEMORY.md；临时流程/工具规则进 AGENTS.md、TOOLS.md 或 workflow；提到现有项目时先查看本地入口文件。",
].join("\n");

function resolveWorkspaceDir(api, ctx) {
  return path.resolve(
    ctx?.workspaceDir
      ?? api?.config?.agents?.defaults?.workspace
      ?? path.join(process.cwd(), "workspace"),
  );
}

function resolveContractPath(workspaceDir, pluginConfig) {
  const configured = String(pluginConfig?.contractPath ?? "").trim();
  if (!configured) {
    return path.join(workspaceDir, "workflows", "clawvard-response-contract.md");
  }
  return path.isAbsolute(configured) ? configured : path.resolve(workspaceDir, configured);
}

function truncateText(text, maxChars) {
  const normalized = String(text ?? "").replace(/^\uFEFF/, "").trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxChars - 16)).trimEnd()}\n[truncated]`;
}

function readContract(workspaceDir, pluginConfig) {
  const contractPath = resolveContractPath(workspaceDir, pluginConfig);
  if (fs.existsSync(contractPath)) {
    return fs.readFileSync(contractPath, "utf8");
  }
  return BUILTIN_CONTRACT;
}

const plugin = {
  id: "openclaw-clawvard-governor",
  name: "OpenClaw Clawvard Governor",
  description: "Injects a lightweight response contract aligned with the local Clawvard eval.",
  configSchema: {
    parse(value) {
      return value ?? {};
    },
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        contractPath: { type: "string" },
        maxChars: { type: "integer", minimum: 256 },
      },
    },
  },
  register(api) {
    const maxChars = Math.max(256, Number(api.pluginConfig?.maxChars ?? 1800));

    api.on("before_prompt_build", async (_event, ctx) => {
      const workspaceDir = resolveWorkspaceDir(api, ctx);
      const contract = truncateText(readContract(workspaceDir, api.pluginConfig), maxChars);
      if (!contract) {
        return;
      }
      return {
        appendSystemContext: contract,
      };
    });
  },
};

export default plugin;
