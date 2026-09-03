// Inverse of build-model's output: read the full relational model back out of a
// DB handle in the exact shape emit-data-sql consumes. Orderings are canonical
// (by id / PK), so a read -> emit round-trip reproduces data.sql unchanged.
// node:sqlite returns null-prototype row objects; `{ ...r }` normalizes each to a
// plain object so a strict deepEqual round-trip (and downstream code) behaves.
const plain = (rows) => rows.map((r) => ({ ...r }));

export function readModel(db) {
  return {
    exercises: plain(db.prepare("SELECT id, slug, name, tips, video, video_alternating FROM exercises ORDER BY id").all()),
    workouts: plain(db.prepare("SELECT id, slug, name, difficulty, description FROM workouts ORDER BY id").all()),
    workoutAudiences: plain(db.prepare("SELECT workout_id, audience FROM workout_audiences ORDER BY workout_id, audience").all()),
    workoutExercises: plain(
      db
        .prepare(
          `SELECT workout_id, exercise_id, phase_name, phase_pos, circuit_pos, rounds, exercise_pos, rep_count, side, tips
           FROM workout_exercises ORDER BY workout_id, phase_pos, circuit_pos, exercise_pos`,
        )
        .all(),
    ),
  };
}
