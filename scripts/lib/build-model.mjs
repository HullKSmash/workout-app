// Pure transform: (catalog object, active-workout list) -> relational rows for
// the four tables. Reused normalizers keep exercise identity consistent with
// the app: slug = slugify(deriveCore(name).core). Rest is a reserved exercise.
// buildExerciseRows and buildWorkoutRows are exported so the CSV importer
// (Task 8) can reuse them.
import { slugify } from "../../workouts/exercises.js";
import { deriveCore } from "./normalize-exercises.mjs";

const REST = { slug: "rest", name: "Rest", tips: null, video: null, video_alternating: null };

// Exercise rows: catalog entries + reserved Rest, sorted by name, ids 1..n.
export function buildExerciseRows(catalog) {
  const rows = Object.entries(catalog).map(([slug, e]) => ({
    slug,
    name: e.name,
    tips: e.tips ?? null,
    video: e.video ?? null,
    video_alternating: e.videoAlternating ?? null,
  }));
  rows.push({ ...REST });
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows.map((r, i) => ({ id: i + 1, ...r }));
}

// One workout's rows: { workout, audiences, joins }. Links each instance to an
// exercise by slug; an unknown movement is a hard error. Audiences are sorted so
// data.sql is canonical (stable across importer round-trips).
export function buildWorkoutRows(workout, { slug, workout_id, idBySlug }) {
  const workoutRow = { id: workout_id, slug, name: workout.name, difficulty: workout.difficulty ?? null, description: workout.description ?? "" };
  const audiences = [...(workout.audiences ?? [])].sort().map((audience) => ({ workout_id, audience }));
  const joins = [];
  workout.phases.forEach((phase, phase_pos) => {
    phase.circuits.forEach((circuit, circuit_pos) => {
      circuit.exercises.forEach((ex, exercise_pos) => {
        const exSlug = ex.name === "Rest" ? "rest" : slugify(deriveCore(ex.name).core);
        const exercise_id = idBySlug.get(exSlug);
        if (!exercise_id) throw new Error(`Workout "${workout.name}" references unknown exercise "${ex.name}" (slug "${exSlug}") — fix the name or add the exercise.`);
        joins.push({
          workout_id,
          exercise_id,
          phase_name: phase.name,
          phase_pos,
          circuit_pos,
          rounds: circuit.repeatCount,
          exercise_pos,
          rep_count: String(ex.repCount),
          side: ex.side ?? null,
          tips: ex.tips ?? null,
        });
      });
    });
  });
  return { workout: workoutRow, audiences, joins };
}

export function buildModel(catalog, active) {
  const exercises = buildExerciseRows(catalog);
  const idBySlug = new Map(exercises.map((e) => [e.slug, e.id]));
  const workouts = [];
  const workoutAudiences = [];
  const workoutExercises = [];
  active.forEach(({ slug, workout }, wi) => {
    const { workout: w, audiences, joins } = buildWorkoutRows(workout, { slug, workout_id: wi + 1, idBySlug });
    workouts.push(w);
    workoutAudiences.push(...audiences);
    workoutExercises.push(...joins);
  });
  return { exercises, workouts, workoutAudiences, workoutExercises };
}
