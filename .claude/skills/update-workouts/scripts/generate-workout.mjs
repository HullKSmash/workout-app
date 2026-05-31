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
// emit `audiences`, which the app REQUIRES to show a workout under a variant
// (workout-app.jsx filters WORKOUTS by audience). This script adds it and writes
// the file in the same shape the existing workout files use.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const csv = arg("--csv");
const name = arg("--name");
const audience = arg("--audience");
const out = arg("--out");

if (!csv || !name || !audience || !out) {
  console.error(
    "Missing args. Need --csv --name --audience --out\n" +
      "Example: --csv ./RiderBuild1.csv --name \"Rider Build 1\" --audience equestrian --out workouts/rider-build-1.js"
  );
  process.exit(1);
}

// Import the repo's parser so we always stay in sync with it.
const parserUrl = pathToFileURL(resolve(process.cwd(), "workouts/parse-csv.js"));
const { parseWorkoutCsv } = await import(parserUrl);

const parsed = parseWorkoutCsv(readFileSync(csv, "utf8"), name);
const workout = { name: parsed.name, audiences: [audience], phases: parsed.phases };

writeFileSync(out, `export default ${JSON.stringify(workout, null, 2)};\n`);

// Sanity print: first exercise that has both modifiers, so you can eyeball that
// easier/harder didn't get swapped (see SKILL.md "Column-order gotcha").
let sample;
for (const p of workout.phases)
  for (const c of p.circuits)
    for (const e of c.exercises)
      if (e.easier && e.harder && !sample) sample = { name: e.name, easier: e.easier, harder: e.harder };

console.log("Wrote", out);
console.log("Phases:", workout.phases.length, "| audience:", audience);
if (sample) console.log("Spot-check modifier mapping:", JSON.stringify(sample, null, 2));
