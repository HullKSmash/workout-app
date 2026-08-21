import { test } from "node:test";
import assert from "node:assert/strict";
import { WORKOUTS } from "../../workouts/index.js";
import { collectRequired } from "./collect-required.mjs";

test("maps 91 active movements", () => {
  assert.equal(Object.keys(collectRequired(WORKOUTS)).length, 91);
});

test("hasAlt comes from the instance side field (matches migrated data)", () => {
  const r = collectRequired(WORKOUTS);
  const alt = Object.entries(r).filter(([, v]) => v.hasAlt).map(([s]) => s).sort();
  assert.deepEqual(alt, ["curtsy-lunge","flexor-lifts","forward-lunge","knee-assist-plank","reverse-fly","reverse-lunge","row-with-top-hold","side-lunge","single-arm-row","standing-abduction"]);
  assert.equal(r["shoulder-press"].hasAlt, false);
});
