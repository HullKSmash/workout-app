import { test } from "node:test";
import assert from "node:assert/strict";
import { applyVideoUrls } from "./apply-video-urls.mjs";

const model = () => ({
  exercises: [
    { id: 1, slug: "row", name: "Row", tips: "", video: null, video_alternating: null },
    { id: 2, slug: "curtsy-lunge", name: "Curtsy Lunge", tips: "", video: null, video_alternating: null },
  ],
  workouts: [],
  workoutAudiences: [],
  workoutExercises: [],
});

test("applyVideoUrls sets video and video_alternating by slug", () => {
  const m = applyVideoUrls(model(), [
    { slug: "row", field: "video", url: "https://x/row.mp4" },
    { slug: "curtsy-lunge", field: "videoAlternating", url: "https://x/cl-alt.mp4" },
  ]);
  assert.equal(m.exercises.find((e) => e.slug === "row").video, "https://x/row.mp4");
  assert.equal(m.exercises.find((e) => e.slug === "curtsy-lunge").video_alternating, "https://x/cl-alt.mp4");
});

test("applyVideoUrls does not mutate the input model", () => {
  const orig = model();
  applyVideoUrls(orig, [{ slug: "row", field: "video", url: "https://x/row.mp4" }]);
  assert.equal(orig.exercises[0].video, null);
});

test("applyVideoUrls throws on an unknown slug", () => {
  assert.throws(() => applyVideoUrls(model(), [{ slug: "nope", field: "video", url: "u" }]), /nope/);
});

test("applyVideoUrls throws on an unknown field", () => {
  assert.throws(() => applyVideoUrls(model(), [{ slug: "row", field: "bogus", url: "u" }]), /bogus/);
});
