import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChecklist } from "./build-checklist.js";

const fixture = {
  name: "Test Workout",
  phases: [
    { name: "Warm Up", circuits: [{ repeatCount: 1, exercises: [{ slug: "a", repCount: "8" }, { slug: "b", repCount: "10" }] }] },
    { name: "Superset 1", circuits: [{ repeatCount: 2, exercises: [{ slug: "c", repCount: "8", tips: "keep back flat" }, { slug: "rest", repCount: 30 }, { slug: "d", repCount: "6" }] }] },
    { name: "Mini Circuits", circuits: [{ repeatCount: 1, exercises: [{ slug: "e", repCount: "12" }] }, { repeatCount: 1, exercises: [{ slug: "f", repCount: "12" }] }] },
  ],
};

test("totalItems counts checkable items, excluding Rest", () => {
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

test("Rest is excluded from items (by slug) but sets a restCaption", () => {
  const { sets } = buildChecklist(fixture);
  const round1 = sets[1].groups[0].rounds[0];
  assert.deepEqual(round1.items.map((i) => i.slug), ["c", "d"]);
  assert.equal(sets[1].restCaption, "Rest ~30s");
  assert.equal(sets[0].restCaption, null);
});

test("item ids embed phase/circuit/round/original-exercise index; instance tips carried", () => {
  const { sets } = buildChecklist(fixture);
  const round1 = sets[1].groups[0].rounds[0];
  assert.deepEqual(round1.items.map((i) => i.id), ["p1c0r1e0", "p1c0r1e2"]);
  assert.equal(round1.items[0].tips, "keep back flat"); // instance override carried through
  assert.equal(round1.items[1].tips, undefined); // no override on the instance
});

test("restCaption summarizes a single rest value vs. mixed values", () => {
  const mixed = {
    name: "W",
    phases: [{ name: "P", circuits: [{ repeatCount: 1, exercises: [
      { slug: "a", repCount: "8" }, { slug: "rest", repCount: 30 }, { slug: "b", repCount: "8" }, { slug: "rest", repCount: 60 },
    ] }] }],
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

test("build-checklist carries slug and side onto items", () => {
  const wk = {
    name: "Sided",
    phases: [{ name: "P", circuits: [{ repeatCount: 1, exercises: [
      { slug: "forward-lunge", repCount: "8", side: "Left" },
      { slug: "sumo-squat", repCount: "10" },
    ] }] }],
  };
  const { sets } = buildChecklist(wk);
  const items = sets[0].groups[0].rounds[0].items;
  assert.equal(items[0].slug, "forward-lunge");
  assert.equal(items[0].side, "Left");
  assert.equal(items[1].side, undefined);
});
