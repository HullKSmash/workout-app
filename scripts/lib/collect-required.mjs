// Build the { slug: { name, hasAlt } } map the catalog generator needs from the
// active workouts. hasAlt reads the instance's `side` field (post-migration
// authoritative source), NOT the exercise name.
import { slugify } from "../../workouts/exercises.js";
import { deriveCore } from "./normalize-exercises.mjs";

export function collectRequired(workouts) {
  const required = {};
  for (const w of workouts) {
    for (const phase of w.phases) {
      for (const circuit of phase.circuits) {
        for (const ex of circuit.exercises) {
          if (ex.name === "Rest") continue;
          const d = deriveCore(ex.name);
          if (!d) throw new Error(`Active workout "${w.name}" uses deleted movement "${ex.name}"`);
          const slug = slugify(d.core);
          if (!required[slug]) required[slug] = { name: d.core, hasAlt: false };
          if (ex.side === "Alternating") required[slug].hasAlt = true;
        }
      }
    }
  }
  return required;
}
