// Pure reshaping: DB handle -> app files. Rebuilds each workout as a nested,
// slug-referenced object and the catalog as the subset of referenced exercises.
import { serializeCatalog } from "./emit-catalog.mjs";

// Rebuild one workout object in the exact shape the app imports.
export function buildWorkout(db, workoutRow) {
  const audiences = db
    .prepare("SELECT audience FROM workout_audiences WHERE workout_id = ? ORDER BY audience")
    .all(workoutRow.id)
    .map((r) => r.audience);

  const rows = db
    .prepare(
      `SELECT we.phase_name, we.phase_pos, we.circuit_pos, we.rounds, we.exercise_pos,
              we.rep_count, we.side, we.tips, e.slug AS slug
       FROM workout_exercises we JOIN exercises e ON e.id = we.exercise_id
       WHERE we.workout_id = ?
       ORDER BY we.phase_pos, we.circuit_pos, we.exercise_pos`,
    )
    .all(workoutRow.id);

  const phases = [];
  let curPhase = null;
  let curCircuit = null;
  let lastPhasePos = null;
  let lastCircuitPos = null;

  for (const r of rows) {
    if (r.phase_pos !== lastPhasePos) {
      curPhase = { name: r.phase_name, circuits: [] };
      phases.push(curPhase);
      lastPhasePos = r.phase_pos;
      lastCircuitPos = null;
    }
    if (r.circuit_pos !== lastCircuitPos) {
      curCircuit = { repeatCount: r.rounds, exercises: [] };
      curPhase.circuits.push(curCircuit);
      lastCircuitPos = r.circuit_pos;
    }
    curCircuit.exercises.push(buildInstance(r));
  }

  return { name: workoutRow.name, audiences, difficulty: workoutRow.difficulty, description: workoutRow.description ?? "", phases };
}

// Instance key order: slug, side?, repCount, tips?. Rest's repCount is numeric.
function buildInstance(r) {
  const inst = { slug: r.slug };
  if (r.side != null) inst.side = r.side;
  inst.repCount = r.slug === "rest" ? Number(r.rep_count) : r.rep_count;
  if (r.tips != null) inst.tips = r.tips;
  return inst;
}

export function renderWorkoutJs(workoutObj) {
  return `export default ${JSON.stringify(workoutObj, null, 2)};\n`;
}

// Catalog subset: exercises referenced by at least one workout, excluding Rest.
// videoAlternating key is present iff the exercise is used as Alternating OR has
// a non-null alternating URL — matching the retired generate-catalog behavior.
export function buildCatalog(db) {
  const rows = db
    .prepare(
      `SELECT e.slug, e.name, e.tips, e.video, e.video_alternating AS alt,
              EXISTS(SELECT 1 FROM workout_exercises w WHERE w.exercise_id = e.id) AS used,
              EXISTS(SELECT 1 FROM workout_exercises w WHERE w.exercise_id = e.id AND w.side = 'Alternating') AS has_alt
       FROM exercises e
       WHERE e.slug <> 'rest'
       ORDER BY e.name`,
    )
    .all();

  const catalog = {};
  for (const r of rows) {
    if (!r.used) continue; // orphans stay in the library, not the app catalog
    const entry = { name: r.name, tips: r.tips ?? "", video: r.video ?? null };
    if (r.has_alt || r.alt != null) entry.videoAlternating = r.alt ?? null;
    catalog[r.slug] = entry;
  }
  return catalog;
}

// Render all app files. Returns { files: [{ slug, text }], catalogText }.
export function exportAll(db) {
  const workoutRows = db.prepare("SELECT id, slug, name, difficulty, description FROM workouts ORDER BY id").all();
  const files = workoutRows.map((w) => ({ slug: w.slug, text: renderWorkoutJs(buildWorkout(db, w)) }));
  return { files, catalogText: serializeCatalog(buildCatalog(db)) };
}
