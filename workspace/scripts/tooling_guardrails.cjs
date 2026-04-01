const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function isProbablyText(buffer) {
  return !buffer.includes(0);
}

function walkFiles(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "dist"].includes(entry.name)) {
        continue;
      }
      files.push(...walkFiles(fullPath));
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseRgOutput(stdout) {
  return stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.*?):(\d+):(.*)$/);
      if (!match) {
        return null;
      }
      return {
        path: match[1],
        lineNumber: Number.parseInt(match[2], 10),
        lineText: match[3],
      };
    })
    .filter(Boolean);
}

function searchWithJsFallback(rootDir, pattern) {
  const matches = [];
  for (const filePath of walkFiles(rootDir)) {
    let buffer;
    try {
      buffer = fs.readFileSync(filePath);
    } catch {
      continue;
    }
    if (!isProbablyText(buffer)) {
      continue;
    }
    const text = buffer.toString("utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((lineText, index) => {
      if (lineText.includes(pattern)) {
        matches.push({
          path: filePath,
          lineNumber: index + 1,
          lineText,
        });
      }
    });
  }
  return matches;
}

function defaultRunRg(rootDir, pattern) {
  return spawnSync("rg", ["--line-number", "--no-heading", "--fixed-strings", pattern, rootDir], {
    encoding: "utf8",
  });
}

function findInFiles({ rootDir, pattern, runRg = defaultRunRg }) {
  try {
    const result = runRg(rootDir, pattern);
    if (result && typeof result.status === "number" && (result.status === 0 || result.status === 1)) {
      return {
        backend: "rg",
        matches: parseRgOutput(result.stdout ?? ""),
      };
    }
  } catch (error) {
    if (!["ENOENT", "EACCES"].includes(error.code)) {
      throw error;
    }
  }

  return {
    backend: "js-fallback",
    matches: searchWithJsFallback(rootDir, pattern),
  };
}

function readExistingFiles(filePaths, options = {}) {
  const maxChars = options.maxCharsPerFile ?? 4000;
  return filePaths
    .filter((filePath) => typeof filePath === "string" && fs.existsSync(filePath))
    .map((filePath) => ({
      path: filePath,
      content: fs.readFileSync(filePath, "utf8").slice(0, maxChars),
    }));
}

function shouldScriptifyPowerShell(command) {
  const text = String(command ?? "");
  const hasControlFlow = /\b(if|foreach|try|catch|switch)\b/i.test(text);
  const hasComplexPipes = (text.match(/\|/g) ?? []).length >= 1;
  const hasBackticks = text.includes("`");
  return text.length > 220 || text.includes("\n") || hasBackticks || (hasControlFlow && hasComplexPipes);
}

function hasMeaningfulValue(value) {
  if (value === undefined || value === null) {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  return String(value).trim().length > 0;
}

function validateEditPayload(payload) {
  const hasEditsProperty = Object.prototype.hasOwnProperty.call(payload, "edits");
  const hasSingleReplacement = [
    payload.oldText,
    payload.newText,
    payload.old_text,
    payload.new_text,
    payload.oldString,
    payload.newString,
    payload.old_string,
    payload.new_string,
  ].some(hasMeaningfulValue);

  if (hasEditsProperty && hasSingleReplacement) {
    return {
      ok: false,
      mode: "mixed",
      error: "Edit payload must use either edits or single replacement mode, not both.",
    };
  }
  if (hasEditsProperty) {
    return { ok: true, mode: "batch" };
  }
  if (hasSingleReplacement) {
    return { ok: true, mode: "single" };
  }
  return {
    ok: false,
    mode: "none",
    error: "Edit payload must provide either edits or old/new replacement fields.",
  };
}

function printSearchResult(result) {
  for (const match of result.matches) {
    console.log(`${match.path}:${match.lineNumber}:${match.lineText}`);
  }
}

function printExistingFiles(files) {
  for (const file of files) {
    console.log(`=== ${file.path} ===`);
    console.log(file.content);
  }
}

function main(argv = process.argv.slice(2)) {
  const command = argv[0];

  if (!command || command === "help" || command === "--help") {
    console.log([
      "Usage:",
      "  node scripts\\tooling_guardrails.cjs search --root <dir> --pattern <text>",
      "  node scripts\\tooling_guardrails.cjs read-existing <file1> <file2> ...",
      "  node scripts\\tooling_guardrails.cjs ps1-advice --command <text>",
    ].join("\n"));
    return;
  }

  if (command === "search") {
    const rootIndex = argv.indexOf("--root");
    const patternIndex = argv.indexOf("--pattern");
    if (rootIndex === -1 || patternIndex === -1) {
      throw new Error("search requires --root <dir> and --pattern <text>");
    }
    const result = findInFiles({
      rootDir: path.resolve(process.cwd(), argv[rootIndex + 1]),
      pattern: argv[patternIndex + 1],
    });
    printSearchResult(result);
    return;
  }

  if (command === "read-existing") {
    printExistingFiles(readExistingFiles(argv.slice(1).map((item) => path.resolve(process.cwd(), item))));
    return;
  }

  if (command === "ps1-advice") {
    const commandIndex = argv.indexOf("--command");
    if (commandIndex === -1) {
      throw new Error("ps1-advice requires --command <text>");
    }
    const inlineCommand = argv[commandIndex + 1] ?? "";
    console.log(shouldScriptifyPowerShell(inlineCommand) ? "script-file" : "inline-ok");
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  findInFiles,
  readExistingFiles,
  shouldScriptifyPowerShell,
  validateEditPayload,
  main,
};
