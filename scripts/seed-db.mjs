// One-time bootstrap: build the relational model from the current catalog +
// active workouts, write canonical data/data.sql, and materialize the gitignored
// data/exercises.db. Do NOT re-run after the initial commit — data.sql is
// canonical thereafter and re-seeding would drop library-only exercises.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { EXERCISES } from "../workouts/exercises.js";
import { activeWorkouts } from "./lib/active-workouts.mjs";
import { buildModel } from "./lib/build-model.mjs";
import { emitDataSql } from "./lib/emit-data-sql.mjs";
import { buildDbFile } from "./lib/db.mjs";

const active = await activeWorkouts();
const model = buildModel(EXERCISES, active);

const dataPath = path.resolve("data/data.sql");
writeFileSync(dataPath, emitDataSql(model));

const dbPath = buildDbFile(path.resolve("data/exercises.db"));

console.log(`Wrote ${model.exercises.length} exercises, ${model.workouts.length} workouts, ${model.workoutExercises.length} instances → data/data.sql`);
console.log(`Built ${dbPath} (gitignored). Query it with: sqlite3 data/exercises.db`);
