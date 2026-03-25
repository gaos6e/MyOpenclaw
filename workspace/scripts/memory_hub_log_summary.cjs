#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    date: new Date().toISOString().slice(0, 10),
    json: false,
    log: path.join(path.resolve(__dirname, "..", ".."), "logs", "memory-hub.jsonl"),
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--json") {
      result.json = true;
      continue;
    }
    if (token === "--date" && args[index + 1]) {
      result.date = args[index + 1];
      index += 1;
      continue;
    }
    if (token === "--log" && args[index + 1]) {
      result.log = path.resolve(args[index + 1]);
      index += 1;
      continue;
    }
  }

  return result;
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function sortCountEntries(map, keyName) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key, count]) => ({ [keyName]: key, count }));
}

function buildSummary(entries, date) {
  const extractionEntries = entries.filter(
    (entry) => entry?.event === "memory_extract_candidates" && String(entry?.ts ?? "").startsWith(date),
  );
  const missTypes = new Map();
  const schemaHits = new Map();
  const totals = {
    runs: 0,
    texts: 0,
    segments: 0,
    eligibleSegments: 0,
    candidates: 0,
    schemaHits: 0,
    heuristicHits: 0,
    hitRate: 0,
  };

  for (const entry of extractionEntries) {
    const stats = entry.stats ?? {};
    totals.runs += 1;
    totals.texts += Number(stats.textsTotal ?? 0);
    totals.segments += Number(stats.segmentsTotal ?? 0);
    totals.candidates += Number(entry.candidateCount ?? stats.candidatesTotal ?? 0);
    totals.schemaHits += Number(stats.schemaHits ?? 0);
    totals.heuristicHits += Number(stats.heuristicHits ?? 0);
    totals.eligibleSegments += Math.max(
      0,
      Number(stats.segmentsTotal ?? 0) -
        Number(stats.droppedTooShort ?? 0) -
        Number(stats.droppedTooLong ?? 0) -
        Number(stats.droppedTooling ?? 0),
    );

    for (const [type, count] of Object.entries(stats.missBuckets ?? {})) {
      increment(missTypes, type, Number(count ?? 0));
    }

    const matchedBySchema = stats.matchedBySchema ?? null;
    if (matchedBySchema && Object.keys(matchedBySchema).length > 0) {
      for (const [key, count] of Object.entries(matchedBySchema)) {
        increment(schemaHits, key, Number(count ?? 0));
      }
      continue;
    }

    for (const key of entry.schemaKeys ?? []) {
      increment(schemaHits, key, 1);
    }
  }

  totals.hitRate = totals.eligibleSegments > 0 ? totals.candidates / totals.eligibleSegments : 0;
  const sortedMissTypes = sortCountEntries(missTypes, "type");
  const recommendations = [];
  if (sortedMissTypes[0]?.type) {
    recommendations.push(
      `Top miss bucket \`${sortedMissTypes[0].type}\` suggests adding or refining canonical extractors for this rule family.`,
    );
  }
  if (totals.eligibleSegments > 0 && totals.hitRate < 0.5) {
    recommendations.push(
      "Hit rate is below 0.5; review unmatched segments before expanding schema coverage further.",
    );
  }

  return {
    date,
    logPath: null,
    totals,
    commonMissTypes: sortedMissTypes,
    schemaHits: sortCountEntries(schemaHits, "key"),
    recommendations,
  };
}

function formatSummary(summary) {
  const lines = [
    `date: ${summary.date}`,
    `runs: ${summary.totals.runs}`,
    `texts: ${summary.totals.texts}`,
    `segments: ${summary.totals.segments}`,
    `eligibleSegments: ${summary.totals.eligibleSegments}`,
    `candidates: ${summary.totals.candidates}`,
    `hitRate: ${summary.totals.hitRate.toFixed(3)}`,
    `schemaHits: ${summary.totals.schemaHits}`,
    `heuristicHits: ${summary.totals.heuristicHits}`,
  ];

  lines.push("commonMissTypes:");
  for (const item of summary.commonMissTypes.slice(0, 5)) {
    lines.push(`- ${item.type}: ${item.count}`);
  }

  lines.push("topSchemaHits:");
  for (const item of summary.schemaHits.slice(0, 10)) {
    lines.push(`- ${item.key}: ${item.count}`);
  }

  return lines.join("\n");
}

function main() {
  const options = parseArgs(process.argv);
  const entries = readJsonl(options.log);
  const summary = buildSummary(entries, options.date);
  summary.logPath = options.log;

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  console.log(formatSummary(summary));
}

main();
