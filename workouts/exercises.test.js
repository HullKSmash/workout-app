import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, resolveExercise, formatExerciseTitle } from "./exercises.js";

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

test("resolveExercise: Left plays the single-side clip un-mirrored", () => {
  const r = resolveExercise({ name: "Forward Lunge", side: "Left" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/forward-lunge.mp4");
  assert.equal(r.mirror, false);
});

test("resolveExercise: Right mirrors the single-side clip", () => {
  const r = resolveExercise({ name: "Forward Lunge", side: "Right" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/forward-lunge.mp4");
  assert.equal(r.mirror, true);
});

test("resolveExercise: Alternating prefers the alternating clip, never mirrors", () => {
  const r = resolveExercise({ name: "Forward Lunge", side: "Alternating" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/forward-lunge-alt.mp4");
  assert.equal(r.mirror, false);
});

test("resolveExercise: Alternating falls back to single-side clip when no alt clip", () => {
  const r = resolveExercise({ name: "Single Arm Row", side: "Alternating" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/single-arm-row.mp4");
  assert.equal(r.mirror, false);
});

test("resolveExercise: missing/no video yields null src (placeholder path)", () => {
  assert.equal(resolveExercise({ name: "Sumo Squat" }, CATALOG).videoSrc, null);
  assert.equal(resolveExercise({ name: "Unknown Move" }, CATALOG).videoSrc, null);
});

test("resolveExercise: instance tips win, else catalog tips, else null", () => {
  assert.equal(resolveExercise({ name: "Forward Lunge", tips: "override" }, CATALOG).tips, "override");
  assert.equal(resolveExercise({ name: "Forward Lunge" }, CATALOG).tips, "hips square");
  assert.equal(resolveExercise({ name: "Sumo Squat" }, CATALOG).tips, null);
});

test("formatExerciseTitle appends the side", () => {
  assert.equal(formatExerciseTitle({ name: "Forward Lunge" }), "Forward Lunge");
  assert.equal(formatExerciseTitle({ name: "Forward Lunge", side: "Left" }), "Forward Lunge · Left");
  assert.equal(formatExerciseTitle({ name: "Forward Lunge", side: "Alternating" }), "Forward Lunge · Alternating");
});
