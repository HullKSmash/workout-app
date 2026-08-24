import { test } from "node:test";
import assert from "node:assert/strict";
import { patchCatalog } from "./patch-catalog.mjs";

const base = {
  "bench-press": { name: "Bench Press", tips: "", video: null },
  "curtsy-lunge": { name: "Curtsy Lunge", tips: "", video: null, videoAlternating: null },
};

test("sets the video field and leaves other entries untouched", () => {
  const out = patchCatalog(base, "bench-press", "video", "https://x/bench.mp4");
  assert.equal(out["bench-press"].video, "https://x/bench.mp4");
  assert.equal(out["curtsy-lunge"].video, null);
});

test("sets the videoAlternating field", () => {
  const out = patchCatalog(base, "curtsy-lunge", "videoAlternating", "https://x/cl-alt.mp4");
  assert.equal(out["curtsy-lunge"].videoAlternating, "https://x/cl-alt.mp4");
});

test("does not mutate the input catalog", () => {
  patchCatalog(base, "bench-press", "video", "https://x/bench.mp4");
  assert.equal(base["bench-press"].video, null);
});

test("throws on an unknown slug", () => {
  assert.throws(() => patchCatalog(base, "nope", "video", "https://x/n.mp4"), /nope/);
});
