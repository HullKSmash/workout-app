import { test } from "node:test";
import assert from "node:assert/strict";
import { emitDataSql } from "./emit-data-sql.mjs";

const MODEL = {
  exercises: [
    { id: 1, slug: "row", name: "Row", tips: "Don't 'cheat'", video: "row.mp4", video_alternating: null },
    { id: 2, slug: "rest", name: "Rest", tips: null, video: null, video_alternating: null },
  ],
  workouts: [{ id: 1, slug: "demo", name: "Demo", difficulty: "moderate", description: "A demo." }],
  workoutAudiences: [{ workout_id: 1, audience: "run" }],
  workoutExercises: [
    { workout_id: 1, exercise_id: 1, phase_name: "C1", phase_pos: 0, circuit_pos: 0, rounds: 2, exercise_pos: 0, rep_count: "8-10", side: "Left", tips: null },
  ],
};

test("emitDataSql escapes quotes, emits NULL, and orders sections", () => {
  const sql = emitDataSql(MODEL);
  assert.match(sql, /INSERT INTO exercises \(id, slug, name, tips, video, video_alternating\) VALUES \(1, 'row', 'Row', 'Don''t ''cheat''', 'row.mp4', NULL\);/);
  assert.match(sql, /INSERT INTO exercises .* VALUES \(2, 'rest', 'Rest', NULL, NULL, NULL\);/);
  assert.match(sql, /INSERT INTO workouts \(id, slug, name, difficulty, description\) VALUES \(1, 'demo', 'Demo', 'moderate', 'A demo\.'\);/);
  assert.match(sql, /INSERT INTO workout_audiences \(workout_id, audience\) VALUES \(1, 'run'\);/);
  assert.match(sql, /INSERT INTO workout_exercises \(workout_id, exercise_id, phase_name, phase_pos, circuit_pos, rounds, exercise_pos, rep_count, side, tips\) VALUES \(1, 1, 'C1', 0, 0, 2, 0, '8-10', 'Left', NULL\);/);
  // exercises section precedes workouts section
  assert.ok(sql.indexOf("INTO exercises") < sql.indexOf("INTO workouts"));
});
