import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveCore } from "./normalize-exercises.mjs";

test("strips sided suffixes into a side, title-cases the core", () => {
  assert.deepEqual(deriveCore("Single Leg RDL, L"), { core: "Single Leg RDL", side: "Left" });
  assert.deepEqual(deriveCore("Side lying leg lift, right"), { core: "Side Lying Leg Lift", side: "Right" });
  assert.deepEqual(deriveCore("Curtsy Lunge, Left Side"), { core: "Curtsy Lunge", side: "Left" });
});

test("Alternating prefix becomes side Alternating", () => {
  assert.deepEqual(deriveCore("Alternating forward lunge"), { core: "Forward Lunge", side: "Alternating" });
});

test("bilateral names have no side", () => {
  assert.deepEqual(deriveCore("Sumo squat"), { core: "Sumo Squat", side: null });
});

test("REMAP overrides (RDL, Deadlift, Alternating Row, Plié)", () => {
  assert.deepEqual(deriveCore("RDL"), { core: "Romanian Dead Lift", side: null });
  assert.deepEqual(deriveCore("Deadlift"), { core: "Romanian Dead Lift", side: null });
  assert.deepEqual(deriveCore("Alternating row"), { core: "Single Arm Row", side: "Alternating" });
  assert.deepEqual(deriveCore("Plié squat"), { core: "Sumo Squat", side: null });
  assert.deepEqual(deriveCore("Side lunge w/ balance press, L/R"), { core: "Side Lunge w/ Balance Press", side: "Left" });
});

test("CANON collapses & vs and / plurals / hyphenation", () => {
  assert.equal(deriveCore("Calf raise and curl").core, "Calf Raise & Curl");
  assert.equal(deriveCore("Row and kickback").core, "Row & Kickback");
  assert.equal(deriveCore("Mountain climber").core, "Mountain Climbers");
  assert.equal(deriveCore("Plank pike").core, "Plank Pikes");
  assert.equal(deriveCore("Runner Hop, Left").core, "Runner Hops");
});

test("deleted movements return null", () => {
  assert.equal(deriveCore("Lateral Line Jumps"), null);
  assert.equal(deriveCore("Jump squat stabilization"), null);
});

test("standalone 'and' renders as '&', substrings untouched", () => {
  assert.equal(deriveCore("Nordic and curl").core, "Nordic & Curl");
  assert.equal(deriveCore("Curl and press").core, "Curl & Press");
  assert.equal(deriveCore("Squat and press").core, "Squat & Press");
  // word-boundaried: "and" inside another word must survive
  assert.equal(deriveCore("Standing abduction").core, "Standing Abduction");
  assert.equal(deriveCore("Banded crab walks").core, "Banded Crab Walks");
});
