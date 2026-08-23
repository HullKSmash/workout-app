import { test } from "node:test";
import assert from "node:assert/strict";
import { parseClipName } from "./parse-clip-name.mjs";

const catalog = {
  "bench-press": { name: "Bench Press", tips: "", video: null },
  "curtsy-lunge": { name: "Curtsy Lunge", tips: "", video: null, videoAlternating: null },
};

test("resolves a primary clip to the video field", () => {
  assert.deepEqual(parseClipName("bench-press.mp4", catalog), { ok: true, slug: "bench-press", field: "video" });
});

test("resolves an -alt clip to the videoAlternating field", () => {
  assert.deepEqual(parseClipName("curtsy-lunge-alt.mp4", catalog), { ok: true, slug: "curtsy-lunge", field: "videoAlternating" });
});

test("rejects a non-mp4 file", () => {
  const r = parseClipName("bench-press.mov", catalog);
  assert.equal(r.ok, false);
  assert.match(r.reason, /\.mp4/);
});

test("rejects an unknown slug", () => {
  const r = parseClipName("bemch-press.mp4", catalog);
  assert.equal(r.ok, false);
  assert.match(r.reason, /no catalog entry/);
});

test("rejects an -alt clip when the entry has no alternating variant", () => {
  const r = parseClipName("bench-press-alt.mp4", catalog);
  assert.equal(r.ok, false);
  assert.match(r.reason, /alternating/);
});
