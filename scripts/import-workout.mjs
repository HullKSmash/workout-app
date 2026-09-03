#!/usr/bin/env node
// Import a workout CSV into the exercise DB, then regenerate the app files.
// New workouts reference EXISTING exercises; a movement not yet in the DB is a
// hard error (add it to data/data.sql via SQL first, then re-run).
//
//   node scripts/import-workout.mjs \
//     --csv "/path/RiderBuild1_Green.csv" \
//     --name "Rider Build 1" --slug rider-build-1 \
//     --audience equestrian [--difficulty harder]
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parseWorkoutCsv } from "../workouts/parse-csv.js";
import { openDb, buildDbFile } from "./lib/db.mjs";
import { readModel } from "./lib/read-model.mjs";
import { applyWorkout } from "./lib/import-model.mjs";
import { emitDataSql } from "./lib/emit-data-sql.mjs";
import { runExport } from "./export-app.mjs";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const csv = arg("--csv");
const name = arg("--name");
const slug = arg("--slug");
const audienceArg = arg("--audience");
let difficulty = arg("--difficulty");

if (!csv || !name || !slug || !audienceArg) {
  console.error('Missing args. Need --csv --name --slug --audience [--difficulty]\n' +
    'Example: --csv ./RiderBuild1.csv --name "Rider Build 1" --slug rider-build-1 --audience equestrian');
  process.exit(1);
}

const audiences = audienceArg.split(",").map((s) => s.trim()).filter(Boolean);
if (!difficulty) {
  const f = basename(csv).toLowerCase();
  difficulty = f.includes("green") ? "easier" : f.includes("yellow") ? "moderate" : f.includes("red") ? "harder" : "moderate";
}

const parsed = parseWorkoutCsv(readFileSync(csv, "utf8"), name);
const workout = { name: parsed.name, audiences, difficulty, phases: parsed.phases };

const db = openDb();
const model = readModel(db);
db.close();

let next;
try {
  next = applyWorkout(model, { slug, workout });
} catch (e) {
  console.error(`\n${e.message}\n\nAdd the missing exercise to data/data.sql (INSERT INTO exercises …), rebuild, and re-run.`);
  process.exit(1);
}

writeFileSync(resolve("data/data.sql"), emitDataSql(next));
buildDbFile(resolve("data/exercises.db"));
const n = runExport();

console.log(`Imported "${name}" (slug ${slug}, ${difficulty}, audiences: ${audiences.join(", ")}) → data/data.sql; re-exported ${n} workouts.`);
console.log("If this is a NEW workout, add it to workouts/index.js (import + WORKOUTS entry), then verify in the app.");
