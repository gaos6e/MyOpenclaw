const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SECTION_HEADER_RE = /^[A-Z][A-Za-z ]+:$/;
const SYNTHETIC_COMMANDS = new Set(["help"]);
const EXECUTION_CLASSES = new Set(["auto", "confirm", "manual-only"]);

function getCodexBin() {
  return process.platform === "win32" ? "codex.cmd" : "codex";
}

function quoteCmdArg(arg) {
  if (/[\s"]/u.test(arg)) {
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return arg;
}

function normalizeNewlines(text) {
  return String(text ?? "").replace(/\r\n/g, "\n");
}

function ensureTrailingNewline(text) {
  return text.endsWith("\n") ? text : `${text}\n`;
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    check: false,
    repoRoot: path.resolve(__dirname, "..", ".."),
  };

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--check") {
      options.check = true;
      continue;
    }
    if (arg === "--repo-root") {
      const value = args.shift();
      if (!value) {
        throw new Error("--repo-root requires a path");
      }
      options.repoRoot = path.resolve(value);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function runCodex(args, options = {}) {
  const spawnArgs = process.platform === "win32"
    ? {
        command: "cmd.exe",
        args: ["/d", "/s", "/c", ["codex", ...args].map(quoteCmdArg).join(" ")],
      }
    : {
        command: getCodexBin(),
        args,
      };
  const result = spawnSync(spawnArgs.command, spawnArgs.args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const output = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw new Error(`codex ${args.join(" ")} failed: ${output || `exit ${result.status}`}`);
  }
  return normalizeNewlines(result.stdout);
}

function getCodexVersion() {
  return runCodex(["--version"]).trim();
}

function readHelp(commandParts) {
  const args = [...commandParts, "--help"];
  return runCodex(args);
}

function extractOverview(lines) {
  const collected = [];
  for (const line of lines) {
    if (line.trim().startsWith("Usage:")) {
      break;
    }
    if (line.trim() === "") {
      if (collected.length === 0) {
        continue;
      }
      collected.push("");
      continue;
    }
    collected.push(line.trim());
  }
  return collected.join("\n").trim();
}

function extractUsageLines(lines) {
  const startIndex = lines.findIndex((line) => line.trim().startsWith("Usage:"));
  if (startIndex === -1) {
    return [];
  }

  const usageLines = [lines[startIndex].trimEnd()];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (trimmed === "") {
      break;
    }
    if (!line.startsWith(" ")) {
      break;
    }
    usageLines.push(line.trimEnd());
  }
  return usageLines;
}

function extractSection(lines, sectionName) {
  const header = `${sectionName}:`;
  const startIndex = lines.findIndex((line) => line.trim() === header);
  if (startIndex === -1) {
    return [];
  }

  const sectionLines = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (trimmed === "" && sectionLines.length === 0) {
      continue;
    }
    if (trimmed !== "" && !line.startsWith(" ") && SECTION_HEADER_RE.test(trimmed)) {
      break;
    }
    sectionLines.push(line);
  }
  while (sectionLines.length > 0 && sectionLines[sectionLines.length - 1].trim() === "") {
    sectionLines.pop();
  }
  return sectionLines;
}

function parseCommandEntries(sectionLines) {
  const entries = [];
  let current = null;

  for (const line of sectionLines) {
    if (line.trim() === "") {
      continue;
    }
    const match = line.match(/^\s{2,}([a-z0-9][\w-]*)\s{2,}(.*)$/i);
    if (match) {
      current = {
        name: match[1],
        rawDescription: match[2].trim(),
      };
      entries.push(current);
      continue;
    }
    if (current && /^\s{4,}\S/.test(line)) {
      current.rawDescription = `${current.rawDescription} ${line.trim()}`.trim();
    }
  }

  return entries.map((entry) => {
    const aliasMatch = entry.rawDescription.match(/\[aliases?:\s*([^\]]+)\]\s*$/i);
    const aliases = aliasMatch
      ? aliasMatch[1].split(",").map((value) => value.trim()).filter(Boolean)
      : [];
    const description = aliasMatch
      ? entry.rawDescription.slice(0, aliasMatch.index).trim()
      : entry.rawDescription.trim();
    return {
      name: entry.name,
      description,
      aliases,
    };
  });
}

function parseOptionEntries(sectionLines) {
  const entries = [];
  let current = null;

  for (const line of sectionLines) {
    if (line.trim() === "") {
      continue;
    }
    const indent = (line.match(/^(\s*)/) || ["", ""])[1].length;
    const trimmed = line.trim();
    const isHeader = indent <= 6 && /^(-|--|\[|<)/.test(trimmed);
    if (isHeader) {
      const parts = trimmed.split(/\s{2,}/);
      const signature = parts.shift();
      current = {
        signature: signature.trim(),
        description: parts.join(" ").trim(),
      };
      entries.push(current);
      continue;
    }
    if (current && /^\s{2,}\S/.test(line)) {
      current.description = `${current.description} ${trimmed}`.trim();
    }
  }

  return entries;
}

function parseUsage(sectionLines) {
  return sectionLines.map((line) => line.trimEnd()).filter((line) => line.trim() !== "");
}

function parseHelpText(helpText) {
  const lines = normalizeNewlines(helpText).split("\n");
  return {
    overview: extractOverview(lines),
    usage: extractUsageLines(lines),
    subcommands: parseCommandEntries(extractSection(lines, "Commands"))
      .filter((entry) => !SYNTHETIC_COMMANDS.has(entry.name)),
    options: parseOptionEntries(extractSection(lines, "Options")),
  };
}

function collectCommandTree() {
  const version = getCodexVersion();
  const queue = [[]];
  const seen = new Set();
  const commands = [];

  while (queue.length > 0) {
    const commandParts = queue.shift();
    const pathString = ["codex", ...commandParts].join(" ");
    if (seen.has(pathString)) {
      continue;
    }

    const helpText = readHelp(commandParts);
    const parsed = parseHelpText(helpText);
    seen.add(pathString);

    const entry = {
      path: pathString,
      commandParts: ["codex", ...commandParts],
      overview: parsed.overview,
      usage: parsed.usage,
      subcommands: parsed.subcommands,
      options: parsed.options,
      helpText,
    };
    commands.push(entry);

    for (const subcommand of parsed.subcommands) {
      queue.push([...commandParts, subcommand.name]);
    }
  }

  commands.sort((left, right) => left.path.localeCompare(right.path));
  return { version, commands };
}

function helpRelativePath(commandPath) {
  const parts = commandPath.split(" ").slice(1);
  if (parts.length === 0) {
    return "help/codex.md";
  }
  return path.posix.join("help", ...parts.slice(0, -1), `${parts[parts.length - 1]}.md`);
}

function formatHelpSnapshot(entry, version) {
  return ensureTrailingNewline([
    `# \`${entry.path}\``,
    "",
    `Detected from local binary: \`${version}\``,
    "",
    "```text",
    entry.helpText.trimEnd(),
    "```",
  ].join("\n"));
}

function formatCommandMap(tree) {
  const lines = [
    "# Codex CLI Command Map",
    "",
    `Detected from local binary: \`${tree.version}\``,
    "",
    "Use `SKILL.md` for workflow and `execution-policy.md` before executing any Codex command.",
    "",
    "## Top-Level Routing",
    "",
  ];

  const root = tree.commands.find((entry) => entry.path === "codex");
  for (const subcommand of root?.subcommands ?? []) {
    lines.push(`- \`codex ${subcommand.name}\` — ${subcommand.description || "No description available."}`);
  }

  lines.push("", "## Public Command Tree", "");

  for (const entry of tree.commands) {
    lines.push(`### \`${entry.path}\``, "");

    if (entry.overview) {
      lines.push(entry.overview, "");
    }

    if (entry.usage.length > 0) {
      lines.push("**Usage**", "", "```text", ...entry.usage, "```", "");
    }

    if (entry.subcommands.length > 0) {
      lines.push("**Subcommands**", "");
      for (const subcommand of entry.subcommands) {
        const aliasSuffix = subcommand.aliases.length > 0
          ? ` (aliases: ${subcommand.aliases.join(", ")})`
          : "";
        lines.push(`- \`${entry.path} ${subcommand.name}\`${aliasSuffix} — ${subcommand.description || "No description available."}`);
      }
      lines.push("");
    }

    if (entry.options.length > 0) {
      lines.push("**Options**", "");
      for (const option of entry.options) {
        lines.push(`- \`${option.signature}\`${option.description ? ` — ${option.description}` : ""}`);
      }
      lines.push("");
    }

    const helpPath = helpRelativePath(entry.path);
    lines.push(`**Help Snapshot:** [\`${helpPath}\`](${helpPath})`, "");
  }

  return ensureTrailingNewline(lines.join("\n"));
}

function buildGeneratedManifest(tree) {
  return ensureTrailingNewline(JSON.stringify({
    codexVersion: tree.version,
    commands: tree.commands.map((entry) => ({
      path: entry.path,
      helpFile: helpRelativePath(entry.path),
      overview: entry.overview,
      usage: entry.usage,
      subcommands: entry.subcommands.map((subcommand) => ({
        name: subcommand.name,
        aliases: subcommand.aliases,
        description: subcommand.description,
      })),
      options: entry.options,
    })),
  }, null, 2));
}

function buildMeta(version) {
  return ensureTrailingNewline(JSON.stringify({
    owner: "local",
    slug: "codex-cli",
    source: "local-binary",
    binary: "codex",
    sourceVersion: version,
    localFirst: true,
    generatedReferences: true,
    risk: [
      "command-execution",
      "auth",
      "patch-application",
    ],
  }, null, 2));
}

function buildGeneratedFiles(tree, repoRoot) {
  const skillRoot = path.join(repoRoot, "workspace", "skills", "codex-cli");
  const referencesRoot = path.join(skillRoot, "references");
  const files = new Map();

  files.set(path.join(skillRoot, "_meta.json"), buildMeta(tree.version));
  files.set(path.join(referencesRoot, "generated-manifest.json"), buildGeneratedManifest(tree));
  files.set(path.join(referencesRoot, "command-map.md"), formatCommandMap(tree));

  for (const entry of tree.commands) {
    files.set(
      path.join(referencesRoot, helpRelativePath(entry.path)),
      formatHelpSnapshot(entry, tree.version),
    );
  }

  return files;
}

function writeFiles(fileMap) {
  for (const [filePath, content] of fileMap.entries()) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function diffGeneratedFiles(fileMap) {
  const diffs = [];
  for (const [filePath, content] of fileMap.entries()) {
    if (!fs.existsSync(filePath)) {
      diffs.push(`missing: ${filePath}`);
      continue;
    }
    const existing = normalizeNewlines(fs.readFileSync(filePath, "utf8"));
    if (existing !== content) {
      diffs.push(`stale: ${filePath}`);
    }
  }
  return diffs;
}

function parseExecutionPolicy(markdown) {
  return normalizeNewlines(markdown)
    .split("\n")
    .filter((line) => /^\|/.test(line.trim()))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 3)
    .filter((cells) => cells[0] !== "Command Path" && !/^[-:]+$/.test(cells[0]))
    .map((cells) => ({
      path: cells[0].replace(/`/g, ""),
      classification: cells[1],
      notes: cells[2],
    }));
}

function classifyCommand(policyEntries, commandPath) {
  const entry = policyEntries.find((candidate) => candidate.path === commandPath);
  if (!entry) {
    return null;
  }
  return EXECUTION_CLASSES.has(entry.classification) ? entry.classification : null;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const tree = collectCommandTree();
  const fileMap = buildGeneratedFiles(tree, options.repoRoot);

  if (options.check) {
    const diffs = diffGeneratedFiles(fileMap);
    if (diffs.length > 0) {
      console.error("Codex CLI skill references are out of sync:");
      for (const diff of diffs) {
        console.error(`- ${diff}`);
      }
      process.exitCode = 1;
      return;
    }
    console.log(`Codex CLI skill references are in sync for ${tree.version}.`);
    return;
  }

  writeFiles(fileMap);
  console.log(`Wrote Codex CLI skill references for ${tree.version}.`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  buildGeneratedFiles,
  classifyCommand,
  collectCommandTree,
  getCodexVersion,
  parseExecutionPolicy,
};
