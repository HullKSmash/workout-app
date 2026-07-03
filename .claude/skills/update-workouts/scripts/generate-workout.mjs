#!/usr/bin/env node
// Generate a workout .js file from a CSV using the repo's own parser.
//
// Run from the repo root (so ./workouts/parse-csv.js resolves):
//   node .claude/skills/update-workouts/scripts/generate-workout.mjs \
//     --csv "/path/to/Workout.csv" \
//     --name "Rider Build 1" \
//     --audience equestrian \
//     --out workouts/rider-build-1.js
//
// Why this exists: parseWorkoutCsv() returns only { name, phases }. It does NOT
// emit `audiences` (which the app REQUIRES to show a workout under a variant —
// workout-app.jsx filters WORKOUTS by audience), nor the `difficulty`/`description`
// fields the existing workout files carry. This script adds all three and writes
// the file in the same shape the existing workout files use.

import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const csv = arg("--csv");
const name = arg("--name");
const audience = arg("--audience");
const out = arg("--out");
let difficulty = arg("--difficulty"); // easier | moderate | harder (optional)

if (!csv || !name || !audience || !out) {
  console.error(
    "Missing args. Need --csv --name --audience --out [--difficulty]\n" +
      "Example: --csv ./RiderBuild1.csv --name \"Rider Build 1\" --audience equestrian --out workouts/rider-build-1.js"
  );
  process.exit(1);
}

// Difficulty maps from the CSV filename color token (see DIFFICULTY_COLORS in
// workout-app.jsx): green->easier, yellow->moderate, red->harder. Infer it from
// the filename when --difficulty isn't given; fall back to "moderate".
if (!difficulty) {
  const lower = basename(csv).toLowerCase();
  difficulty = lower.includes("green")
    ? "easier"
    : lower.includes("yellow")
    ? "moderate"
    : lower.includes("red")
    ? "harder"
    : "moderate";
}

// Import the repo's parser so we always stay in sync with it.
const parserUrl = pathToFileURL(resolve(process.cwd(), "workouts/parse-csv.js"));
const { parseWorkoutCsv } = await import(parserUrl);

const parsed = parseWorkoutCsv(readFileSync(csv, "utf8"), name);
// Field order matches the existing workout files: name, audiences, difficulty,
// description, phases. `description` is left "" for Katie to fill in later.
const workout = {
  name: parsed.name,
  audiences: [audience],
  difficulty,
  description: "",
  phases: parsed.phases,
};

writeFileSync(out, `export default ${JSON.stringify(workout, null, 2)};\n`);

// Sanity print: first exercise that has a `tips` string, so you can eyeball that
// the Tips column parsed onto exercises (see SKILL.md "CSV format reference").
let sample;
for (const p of workout.phases)
  for (const c of p.circuits)
    for (const e of c.exercises)
      if (e.tips && !sample) sample = { name: e.name, tips: e.tips };

console.log("Wrote", out);
console.log("Phases:", workout.phases.length, "| audience:", audience, "| difficulty:", difficulty);
if (sample) console.log("Spot-check tip mapping:", JSON.stringify(sample, null, 2));
else console.log("Spot-check: no exercise has a tip (Tips column empty?) — confirm that's expected.");
