// Pair each ACTIVE workout (exported by workouts/index.js) with its filename
// stem, which is the workout's canonical slug. Dormant files (present but not in
// WORKOUTS, e.g. the hidden foundation set) are excluded.
import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { WORKOUTS } from "../../workouts/index.js";

// Non-workout modules that live in workouts/ and must never be treated as data.
const INFRA = new Set(["index.js", "exercises.js", "exercises.data.js", "parse-csv.js"]);

export async function activeWorkouts(dir = path.resolve("workouts")) {
  const active = new Set(WORKOUTS);
  const out = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".js") || file.endsWith(".test.js") || INFRA.has(file)) continue;
    const mod = await import(pathToFileURL(path.join(dir, file)).href);
    if (active.has(mod.default)) out.push({ slug: file.replace(/\.js$/, ""), workout: mod.default });
  }
  return out;
}
