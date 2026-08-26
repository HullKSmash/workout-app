import { test } from "node:test";
import assert from "node:assert/strict";
import { WORKOUTS } from "../../workouts/index.js";
import { collectRequired } from "./collect-required.mjs";

// Minimal workout shape helper: one phase, one circuit, the given exercises.
const wk = (name, exercises) => ({ name, phases: [{ circuits: [{ exercises }] }] });

test("maps each active movement to { name, hasAlt }, excluding Rest", () => {
  const r = collectRequired([
    wk("W", [
      { name: "Bench Press" },
      { name: "Rest", repCount: 30 },
    ]),
  ]);
  assert.deepEqual(Object.keys(r), ["bench-press"]);
  assert.equal(r["bench-press"].name, "Bench Press");
  assert.equal(r["bench-press"].hasAlt, false);
});

test("hasAlt is true when any instance of a movement has side 'Alternating'", () => {
  const r = collectRequired([
    wk("W", [
      { name: "Row" }, // bilateral instance
      { name: "Row", side: "Alternating" }, // alternating instance -> flips hasAlt
      { name: "Shoulder Press" }, // never alternating
    ]),
  ]);
  assert.equal(r["row"].hasAlt, true);
  assert.equal(r["shoulder-press"].hasAlt, false);
});

test("throws when a workout uses a deleted movement", () => {
  assert.throws(() => collectRequired([wk("Bad", [{ name: "Lateral Line Jumps" }])]), /deleted movement/);
});

// Integration smoke test: the real workouts collect without throwing and every
// entry is well-formed. Deliberately no assertion on the count or the exact set
// of alternating movements — both grow as workouts and clips are added.
test("real workouts collect into well-formed entries", () => {
  const r = collectRequired(WORKOUTS);
  assert.ok(Object.keys(r).length > 0);
  for (const v of Object.values(r)) {
    assert.equal(typeof v.name, "string");
    assert.ok(v.name.length > 0);
    assert.equal(typeof v.hasAlt, "boolean");
  }
});
