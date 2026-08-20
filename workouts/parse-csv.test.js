import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWorkoutCsv } from "./parse-csv.js";

const csv = [
  "Phase,Circuit,Rounds,Exercise,Side,RepCount,Tips",
  "Warm Up,1,1,Forward Lunge,L,8,keep tall",
  ",,,Sumo Squat,,10,",
  ",,,Single Arm Row,Alternating,12,",
  "Superset 1,2,2,Split Squat,Right,8,",
  ",,,Rest,,30,",
].join("\n");

test("Side column parses into a normalized side, omitted when blank", () => {
  const { phases } = parseWorkoutCsv(csv, "T");
  const c0 = phases[0].circuits[0].exercises;
  assert.equal(c0[0].side, "Left");        // "L" -> "Left"
  assert.equal(c0[1].side, undefined);     // blank -> omitted (bilateral)
  assert.equal(c0[2].side, "Alternating");
  assert.equal(phases[1].circuits[0].exercises[0].side, "Right");
});

test("Rest rows carry no side", () => {
  const { phases } = parseWorkoutCsv(csv, "T");
  const rest = phases[1].circuits[0].exercises[1]; // Rest follows Split Squat in the same circuit
  assert.equal(rest.name, "Rest");
  assert.equal(rest.side, undefined);
});

test("an unrecognized Side value throws", () => {
  const bad = "Phase,Circuit,Rounds,Exercise,Side,RepCount,Tips\nP,1,1,Forward Lunge,sideways,8,";
  assert.throws(() => parseWorkoutCsv(bad, "T"), /Unknown Side value/);
});
