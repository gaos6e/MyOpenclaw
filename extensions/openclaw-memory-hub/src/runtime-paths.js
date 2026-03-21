import fs from "node:fs";
import path from "node:path";

function normalizePath(input) {
  return input ? path.resolve(String(input)) : null;
}

export function resolveWorkspaceDir(config, toolContext) {
  const explicit = normalizePath(toolContext?.workspaceDir);
  if (explicit) {
    return explicit;
  }
  const configured = normalizePath(config?.agents?.defaults?.workspace);
  if (configured) {
    return configured;
  }
  return path.resolve(process.cwd(), "workspace");
}

export function resolveStateDir(workspaceDir) {
  return path.dirname(workspaceDir);
}

export function resolveMemoryHubPaths({ config, pluginConfig, toolContext }) {
  const workspaceDir = resolveWorkspaceDir(config, toolContext);
  const stateDir = resolveStateDir(workspaceDir);
  const rootMemoryDir = path.join(stateDir, "memory");
  const workspaceMemoryDir = path.join(workspaceDir, "memory");
  return {
    workspaceDir,
    stateDir,
    dbPath: normalizePath(pluginConfig?.dbPath) ?? path.join(rootMemoryDir, "main.v2.sqlite"),
    manifestPath:
      normalizePath(pluginConfig?.manifestPath) ?? path.join(workspaceMemoryDir, "index-manifest.json"),
    historyPath:
      normalizePath(pluginConfig?.historyPath) ?? path.join(workspaceMemoryDir, "history.jsonl"),
    ontologyPath:
      normalizePath(pluginConfig?.ontologyPath) ?? path.join(workspaceMemoryDir, "ontology", "graph.jsonl"),
    inboxDir: normalizePath(pluginConfig?.inboxDir) ?? path.join(workspaceMemoryDir, "inbox"),
    snapshotDir: normalizePath(pluginConfig?.snapshotDir) ?? path.join(stateDir, "backup", "memory-hub"),
    transcriptBackfillLimit: Math.max(1, Number(pluginConfig?.transcriptBackfillLimit ?? 50)),
    sessionRecallWindow: Math.max(1, Number(pluginConfig?.sessionRecallWindow ?? 60)),
  };
}

export function ensureMemoryHubFiles(paths) {
  fs.mkdirSync(paths.inboxDir, { recursive: true });
  fs.mkdirSync(path.dirname(paths.ontologyPath), { recursive: true });
  fs.mkdirSync(path.dirname(paths.historyPath), { recursive: true });
  if (!fs.existsSync(paths.manifestPath)) {
    fs.writeFileSync(
      paths.manifestPath,
      JSON.stringify(
        {
          include: ["MEMORY.md", "memory/YYYY-MM-DD.md", "memory/ontology/graph.jsonl"],
          exclude: [
            "memory/README.md",
            "memory/TEMPLATE.md",
            "memory/**/*plan*.md",
            "memory/inbox/**",
          ],
        },
        null,
        2,
      ),
      "utf8",
    );
  }
  if (!fs.existsSync(paths.historyPath)) {
    fs.writeFileSync(paths.historyPath, "", "utf8");
  }
  if (!fs.existsSync(paths.ontologyPath)) {
    fs.writeFileSync(paths.ontologyPath, "", "utf8");
  }
}
