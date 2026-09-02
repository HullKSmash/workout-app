import { test } from "node:test";
import assert from "node:assert/strict";
import { buildModel } from "./build-model.mjs";

const CATALOG = {
  "row": { name: "Row", tips: "Pull to hip", video: "row.mp4" },
  "curtsy-lunge": { name: "Curtsy Lunge", tips: "", video: null, videoAlternating: "cl-alt.mp4" },
};

const ACTIVE = [
  {
    slug: "demo-workout",
    workout: {
      name: "Demo Workout",
      audiences: ["run", "equestrian"],
      difficulty: "moderate",
      description: "A demo.",
      phases: [
        {
          name: "Circuit 1",
          circuits: [
            {
              repeatCount: 2,
              exercises: [
                { name: "Row", repCount: "8-10" },
                { name: "Curtsy Lunge", side: "Left", repCount: "6-8" },
                { name: "Rest", repCount: 30 },
              ],
            },
          ],
        },
      ],
    },
  },
];

test("buildModel produces exercises with Rest reserved and slug-linked joins", () => {
  const m = buildModel(CATALOG, ACTIVE);

  // exercises: 2 catalog + Rest, sorted by name, ids 1..n
  assert.deepEqual(
    m.exercises.map((e) => [e.id, e.slug, e.name, e.video, e.video_alternating]),
    [
      [1, "curtsy-lunge", "Curtsy Lunge", null, "cl-alt.mp4"],
      [2, "rest", "Rest", null, null],
      [3, "row", "Row", "row.mp4", null],
    ],
  );

  // workout + audiences
  assert.deepEqual(m.workouts, [{ id: 1, slug: "demo-workout", name: "Demo Workout", difficulty: "moderate", description: "A demo." }]);
  // audiences are sorted alphabetically for a canonical data.sql
  assert.deepEqual(m.workoutAudiences, [
    { workout_id: 1, audience: "equestrian" },
    { workout_id: 1, audience: "run" },
  ]);

  // joins: rep_count always TEXT, side preserved, exercise_id linked by slug
  assert.deepEqual(m.workoutExercises, [
    { workout_id: 1, exercise_id: 3, phase_name: "Circuit 1", phase_pos: 0, circuit_pos: 0, rounds: 2, exercise_pos: 0, rep_count: "8-10", side: null, tips: null },
    { workout_id: 1, exercise_id: 1, phase_name: "Circuit 1", phase_pos: 0, circuit_pos: 0, rounds: 2, exercise_pos: 1, rep_count: "6-8", side: "Left", tips: null },
    { workout_id: 1, exercise_id: 2, phase_name: "Circuit 1", phase_pos: 0, circuit_pos: 0, rounds: 2, exercise_pos: 2, rep_count: "30", side: null, tips: null },
  ]);
});

test("buildModel throws on an exercise name absent from the catalog", () => {
  const active = [{ slug: "x", workout: { name: "X", audiences: [], difficulty: "easier", description: "", phases: [{ name: "C1", circuits: [{ repeatCount: 1, exercises: [{ name: "Nonexistent Move", repCount: "5" }] }] }] } }];
  assert.throws(() => buildModel(CATALOG, active), /Nonexistent Move/);
});
