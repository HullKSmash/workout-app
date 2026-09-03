// Add or replace a workout in a model (pure). Matches by slug: an existing slug
// is replaced in place (same id, its old rows dropped); a new slug is appended
// with the next id. Links exercises by slug via buildWorkoutRows (throws on an
// unknown movement). A previously-filled description is preserved on replace.
import { buildWorkoutRows } from "./build-model.mjs";

export function applyWorkout(model, { slug, workout }) {
  const idBySlug = new Map(model.exercises.map((e) => [e.slug, e.id]));
  const existing = model.workouts.find((w) => w.slug === slug);
  const workout_id = existing ? existing.id : Math.max(0, ...model.workouts.map((w) => w.id)) + 1;
  const description = workout.description ?? (existing ? existing.description : "");
  const { workout: wRow, audiences, joins } = buildWorkoutRows({ ...workout, description }, { slug, workout_id, idBySlug });

  const dropSelf = (rows) => rows.filter((r) => r.workout_id !== workout_id);
  return {
    exercises: model.exercises,
    workouts: model.workouts.filter((w) => w.id !== workout_id).concat(wRow).sort((a, b) => a.id - b.id),
    workoutAudiences: dropSelf(model.workoutAudiences).concat(audiences).sort((a, b) => a.workout_id - b.workout_id || a.audience.localeCompare(b.audience)),
    workoutExercises: dropSelf(model.workoutExercises).concat(joins).sort((a, b) => a.workout_id - b.workout_id || a.phase_pos - b.phase_pos || a.circuit_pos - b.circuit_pos || a.exercise_pos - b.exercise_pos),
  };
}
