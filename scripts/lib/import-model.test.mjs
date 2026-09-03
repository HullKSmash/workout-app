import { test } from "node:test";
import assert from "node:assert/strict";
import { buildModel } from "./build-model.mjs";
import { applyWorkout } from "./import-model.mjs";

const CATALOG = {
  "row": { name: "Row", tips: "", video: null },
  "curtsy-lunge": { name: "Curtsy Lunge", tips: "", video: null, videoAlternating: null },
};
const base = buildModel(CATALOG, [
  { slug: "a", workout: { name: "A", audiences: ["run"], difficulty: "easier", description: "", phases: [{ name: "C1", circuits: [{ repeatCount: 1, exercises: [{ name: "Row", repCount: "8" }] }] }] } },
]);

test("applyWorkout appends a new workout with the next id", () => {
  const newWorkout = { name: "B", audiences: ["equestrian"], difficulty: "harder", phases: [{ name: "C1", circuits: [{ repeatCount: 2, exercises: [{ name: "Curtsy Lunge", side: "Left", repCount: "6-8" }] }] }] };
  const m = applyWorkout(base, { slug: "b", workout: newWorkout });
  assert.equal(m.workouts.length, 2);
  const b = m.workouts.find((w) => w.slug === "b");
  assert.equal(b.id, 2);
  assert.equal(m.workoutExercises.filter((j) => j.workout_id === 2).length, 1);
  assert.deepEqual(m.workoutAudiences.filter((a) => a.workout_id === 2), [{ workout_id: 2, audience: "equestrian" }]);
});

test("applyWorkout replaces an existing slug in place, reusing its id and dropping old rows", () => {
  const replacement = { name: "A2", audiences: ["run", "equestrian"], difficulty: "moderate", phases: [{ name: "C1", circuits: [{ repeatCount: 3, exercises: [{ name: "Curtsy Lunge", side: "Right", repCount: "10" }] }] }] };
  const m = applyWorkout(base, { slug: "a", workout: replacement });
  assert.equal(m.workouts.length, 1);
  assert.equal(m.workouts[0].id, 1);
  assert.equal(m.workouts[0].name, "A2");
  const joins = m.workoutExercises.filter((j) => j.workout_id === 1);
  assert.equal(joins.length, 1);
  assert.equal(joins[0].side, "Right");
});

test("applyWorkout throws on an unknown exercise", () => {
  const bad = { name: "C", audiences: [], difficulty: "easier", phases: [{ name: "C1", circuits: [{ repeatCount: 1, exercises: [{ name: "Nope", repCount: "5" }] }] }] };
  assert.throws(() => applyWorkout(base, { slug: "c", workout: bad }), /Nope/);
});
