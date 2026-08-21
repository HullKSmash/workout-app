import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChecklist } from "./build-checklist.js";

const fixture = {
  name: "Test Workout",
  phases: [
    {
      name: "Warm Up",
      circuits: [
        { repeatCount: 1, exercises: [
          { name: "A", repCount: "8" },
          { name: "B", repCount: "10" },
        ] },
      ],
    },
    {
      name: "Superset 1",
      circuits: [
        { repeatCount: 2, exercises: [
          { name: "C", repCount: "8", tips: "keep back flat" },
          { name: "Rest", repCount: 30 },
          { name: "D", repCount: "6" },
        ] },
      ],
    },
    {
      name: "Mini Circuits",
      circuits: [
        { repeatCount: 1, exercises: [{ name: "E", repCount: "12" }] },
        { repeatCount: 1, exercises: [{ name: "F", repCount: "12" }] },
      ],
    },
  ],
};

test("totalItems counts checkable items, excluding Rest", () => {
  // Warm Up: 2 items × 1 round = 2
  // Superset 1: 2 items (C, D; Rest excluded) × 2 rounds = 4
  // Mini Circuits: 1 + 1 = 2
  assert.equal(buildChecklist(fixture).totalItems, 8);
});

test("one set per phase, with stable ids and names", () => {
  const { sets } = buildChecklist(fixture);
  assert.equal(sets.length, 3);
  assert.deepEqual(sets.map((s) => s.id), ["p0", "p1", "p2"]);
  assert.deepEqual(sets.map((s) => s.name), ["Warm Up", "Superset 1", "Mini Circuits"]);
});

test("single-round circuit exposes one round; multi-round flags multiRound", () => {
  const { sets } = buildChecklist(fixture);
  assert.equal(sets[0].groups[0].multiRound, false);
  assert.equal(sets[0].groups[0].rounds.length, 1);
  assert.equal(sets[1].groups[0].multiRound, true);
  assert.equal(sets[1].groups[0].rounds.length, 2);
});

test("Rest is excluded from items but sets a restCaption on the set", () => {
  const { sets } = buildChecklist(fixture);
  const round1 = sets[1].groups[0].rounds[0];
  assert.deepEqual(round1.items.map((i) => i.name), ["C", "D"]);
  assert.equal(sets[1].restCaption, "Rest ~30s");
  assert.equal(sets[0].restCaption, null);
});

test("item ids embed phase/circuit/round/original-exercise index", () => {
  const { sets } = buildChecklist(fixture);
  const round1 = sets[1].groups[0].rounds[0];
  // C is exercise index 0, D is index 2 (Rest is index 1, skipped)
  assert.deepEqual(round1.items.map((i) => i.id), ["p1c0r1e0", "p1c0r1e2"]);
  assert.equal(round1.items[0].tips, "keep back flat");
  assert.equal(round1.items[1].tips, undefined);
});

test("restCaption summarizes a single rest value vs. mixed values", () => {
  const mixed = {
    name: "W",
    phases: [
      {
        name: "P",
        circuits: [
          { repeatCount: 1, exercises: [
            { name: "A", repCount: "8" },
            { name: "Rest", repCount: 30 },
            { name: "B", repCount: "8" },
            { name: "Rest", repCount: 60 },
          ] },
        ],
      },
    ],
  };
  assert.equal(buildChecklist(mixed).sets[0].restCaption, "Rest as prescribed");
});

test("multiple circuits in a phase flag multiCircuit", () => {
  const { sets } = buildChecklist(fixture);
  assert.equal(sets[2].multiCircuit, true);
  assert.equal(sets[2].groups.length, 2);
  assert.deepEqual(sets[2].groups.map((g) => g.id), ["p2c0", "p2c1"]);
  assert.equal(sets[0].multiCircuit, false);
});

test("build-checklist carries the side onto items", () => {
  const wk = {
    name: "Sided",
    phases: [{ name: "P", circuits: [{ repeatCount: 1, exercises: [
      { name: "Forward Lunge", repCount: "8", side: "Left" },
      { name: "Sumo Squat", repCount: "10" },
    ] }] }],
  };
  const { sets } = buildChecklist(wk);
  const items = sets[0].groups[0].rounds[0].items;
  assert.equal(items[0].side, "Left");
  assert.equal(items[1].side, undefined);
});
