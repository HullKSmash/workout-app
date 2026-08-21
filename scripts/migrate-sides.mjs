// Rewrites each ACTIVE workout file so exercise instances carry a canonical
// core name plus an optional `side`, instead of encoding side in the name.
// Re-serializes as pretty JSON (these files are generated JSON already).
// Run: node scripts/migrate-sides.mjs
import { readdirSync, writeFileSync } from "fs";
import { pathToFileURL } from "url";
import path from "path";
import { WORKOUTS } from "../workouts/index.js";
import { deriveCore } from "./lib/normalize-exercises.mjs";

const dir = path.resolve("workouts");
const activeNames = new Set(WORKOUTS.map((w) => w.name));
const files = readdirSync(dir).filter((f) => f.endsWith(".js") && !f.endsWith(".test.js") && f !== "index.js");

let changed = 0;
for (const f of files) {
  const mod = await import(pathToFileURL(path.join(dir, f)).href);
  const w = mod.default;
  if (!w || !Array.isArray(w.phases) || !activeNames.has(w.name)) continue;

  for (const phase of w.phases) {
    for (const circuit of phase.circuits) {
      circuit.exercises = circuit.exercises.map((ex) => {
        if (ex.name === "Rest") return ex;
        const d = deriveCore(ex.name);
        if (!d) throw new Error(`${f}: active workout uses deleted movement "${ex.name}"`);
        // Canonical field order: name, side, then the rest (repCount, tips).
        // `side` comes from the name on first migration, or the existing field on re-run.
        const side = d.side || ex.side;
        const { name: _n, side: _s, ...rest } = ex;
        return { name: d.core, ...(side ? { side } : {}), ...rest };
      });
    }
  }

  writeFileSync(path.join(dir, f), `export default ${JSON.stringify(w, null, 2)};\n`);
  changed++;
  console.log(`migrated ${f}`);
}
console.log(`Done — ${changed} active workout files rewritten.`);
