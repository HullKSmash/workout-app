import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, resolveExercise, formatExerciseTitle, EXERCISES } from "./exercises.js";
import { WORKOUTS } from "./index.js";

test("slugify normalizes punctuation, & and w/", () => {
  assert.equal(slugify("Calf Raise & Curl"), "calf-raise-and-curl");
  assert.equal(slugify("Forward Lunge w/ Twist"), "forward-lunge-with-twist");
  assert.equal(slugify("Standing Cat/Cow"), "standing-cat-cow");
  assert.equal(slugify("To-the-Chin Lift"), "to-the-chin-lift");
  assert.equal(slugify("RDL & Row"), "rdl-and-row");
});

const CATALOG = {
  "forward-lunge": { name: "Forward Lunge", tips: "hips square", video: "/videos/forward-lunge.mp4", videoAlternating: "/videos/forward-lunge-alt.mp4" },
  "sumo-squat": { name: "Sumo Squat", tips: "", video: null },
  "single-arm-row": { name: "Single Arm Row", tips: "", video: "/videos/single-arm-row.mp4", videoAlternating: null },
};

test("resolveExercise: looks up by slug and returns the resolved name", () => {
  assert.equal(resolveExercise({ slug: "forward-lunge" }, CATALOG).name, "Forward Lunge");
});

test("resolveExercise: Left plays the single-side clip un-mirrored", () => {
  const r = resolveExercise({ slug: "forward-lunge", side: "Left" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/forward-lunge.mp4");
  assert.equal(r.mirror, false);
});

test("resolveExercise: Right mirrors the single-side clip", () => {
  const r = resolveExercise({ slug: "forward-lunge", side: "Right" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/forward-lunge.mp4");
  assert.equal(r.mirror, true);
});

test("resolveExercise: Alternating prefers the alternating clip, never mirrors", () => {
  const r = resolveExercise({ slug: "forward-lunge", side: "Alternating" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/forward-lunge-alt.mp4");
  assert.equal(r.mirror, false);
});

test("resolveExercise: Alternating falls back to single-side clip when no alt clip", () => {
  const r = resolveExercise({ slug: "single-arm-row", side: "Alternating" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/single-arm-row.mp4");
  assert.equal(r.mirror, false);
});

test("resolveExercise: missing/no video yields null src (placeholder path)", () => {
  assert.equal(resolveExercise({ slug: "sumo-squat" }, CATALOG).videoSrc, null);
  assert.equal(resolveExercise({ slug: "unknown-move" }, CATALOG).videoSrc, null);
});

test("resolveExercise: instance tips win, else catalog tips, else null", () => {
  assert.equal(resolveExercise({ slug: "forward-lunge", tips: "override" }, CATALOG).tips, "override");
  assert.equal(resolveExercise({ slug: "forward-lunge" }, CATALOG).tips, "hips square");
  assert.equal(resolveExercise({ slug: "sumo-squat" }, CATALOG).tips, null);
});

test("formatExerciseTitle appends the side", () => {
  assert.equal(formatExerciseTitle({ slug: "forward-lunge" }, CATALOG), "Forward Lunge");
  assert.equal(formatExerciseTitle({ slug: "forward-lunge", side: "Left" }, CATALOG), "Forward Lunge · Left");
  assert.equal(formatExerciseTitle({ slug: "forward-lunge", side: "Alternating" }, CATALOG), "Forward Lunge · Alternating");
});

// Integration: valid only AFTER the DB export reshapes workout files to slug refs
// (Step 9). It reads instance.slug, so it fails while files are still name-shaped.
test("every active-workout exercise resolves to a catalog entry", () => {
  const missing = new Set();
  for (const w of WORKOUTS) {
    for (const phase of w.phases) {
      for (const circuit of phase.circuits) {
        for (const ex of circuit.exercises) {
          if (ex.slug === "rest") continue;
          if (!EXERCISES[ex.slug]) missing.add(`${ex.slug} (in ${w.name})`);
        }
      }
    }
  }
  assert.deepEqual([...missing], [], `unmapped exercises: ${[...missing].join("; ")}`);
});
