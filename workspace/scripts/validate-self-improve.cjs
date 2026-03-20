#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const VALID_STATUSES = new Set(["todo", "doing", "done", "blocked", "parked"]);
const VALID_PRIORITIES = new Set(["高", "中", "低"]);

function parseArgs(argv) {
  const args = argv.slice(2);
  const workspaceIdx = args.indexOf("--workspace");
  return {
    workspace:
      workspaceIdx >= 0 && args[workspaceIdx + 1]
        ? path.resolve(args[workspaceIdx + 1])
        : path.resolve(__dirname, ".."),
  };
}

function readLines(filePath) {
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/);
}

function collectSectionLines(filePath, acceptedSections) {
  const lines = readLines(filePath);
  const collected = [];
  let currentSection = "";

  for (const line of lines) {
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    if (acceptedSections.has(currentSection)) {
      collected.push(line);
    }
  }

  return collected;
}

function validateTodo(filePath) {
  const errors = [];
  const todoLines = collectSectionLines(filePath, new Set(["待做"]));

  for (const line of todoLines) {
    if (!line.startsWith("- ")) continue;
    if (!line.includes("[") || !line.includes("]")) {
      errors.push(`TODO item missing priority tag: ${line}`);
      continue;
    }
    const match = line.match(/^- \[([高中低])\] .+ -> .+/);
    if (!match || !VALID_PRIORITIES.has(match[1])) {
      errors.push(`TODO item must use "- [高|中|低] 动作 -> 价值" format: ${line}`);
    }
  }
  return errors;
}

function validateStatus(filePath) {
  const errors = [];
  const statusLines = collectSectionLines(filePath, new Set(["事项列表"]));

  for (const line of statusLines) {
    if (!line.startsWith("- ")) continue;
    const match = line.match(/^- ([a-z_]+) \| .+ \| \d{4}-\d{2}-\d{2}(?: \| .+)?$/);
    if (!match) {
      errors.push(`Status item must use "- status | title | YYYY-MM-DD [| note]" format: ${line}`);
      continue;
    }
    if (!VALID_STATUSES.has(match[1])) {
      errors.push(`Invalid status "${match[1]}" in: ${line}`);
    }
  }
  return errors;
}

function validateQuality(filePath) {
  const errors = [];
  const qualityLines = collectSectionLines(filePath, new Set(["记录"]));

  for (const line of qualityLines) {
    if (!line.startsWith("- ")) continue;
    if (!/^- \d{4}-\d{2}-\d{2} \| /.test(line)) {
      continue;
    }
    const parts = line.slice(2).split(" | ");
    if (parts.length < 6) {
      errors.push(`Quality record must use 6 fields: ${line}`);
      continue;
    }
    const priority = parts[4];
    if (!VALID_PRIORITIES.has(priority)) {
      errors.push(`Quality record priority must be 高/中/低: ${line}`);
    }
  }
  return errors;
}

function main() {
  const { workspace } = parseArgs(process.argv);
  const files = {
    todo: path.join(workspace, "self_improve_todo.md"),
    status: path.join(workspace, "self_improve_status.md"),
    quality: path.join(workspace, "self_improve_quality.md"),
  };

  const missing = Object.values(files).filter((filePath) => !fs.existsSync(filePath));
  if (missing.length > 0) {
    console.error(`Validation failed: missing required files: ${missing.join(", ")}`);
    process.exit(1);
  }

  const errors = [
    ...validateTodo(files.todo),
    ...validateStatus(files.status),
    ...validateQuality(files.quality),
  ];

  if (errors.length > 0) {
    console.error("Validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Validation passed for ${workspace}`);
}

main();
