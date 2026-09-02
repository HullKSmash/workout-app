import { test } from "node:test";
import assert from "node:assert/strict";
import { WORKOUTS } from "../../workouts/index.js";
import { activeWorkouts } from "./active-workouts.mjs";

test("activeWorkouts pairs every active workout with its filename slug", async () => {
  const active = await activeWorkouts();
  // one entry per exported workout, no more (dormant files excluded)
  assert.equal(active.length, WORKOUTS.length);
  // slugs are unique, non-empty, and .js-free
  const slugs = active.map((a) => a.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(slugs.every((s) => s && !s.endsWith(".js")));
  // every paired object is one of the exported workouts
  const set = new Set(WORKOUTS);
  assert.ok(active.every((a) => set.has(a.workout)));
  // a known file maps to a known name
  const slb1 = active.find((a) => a.slug === "runner-single-leg-sandwiches-1");
  assert.equal(slb1.workout.name, "Single Leg Sandwiches 1");
});
