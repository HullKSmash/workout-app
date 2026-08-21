import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeCatalog } from "./merge-catalog.mjs";

test("recognizes and adds a new movement, preserving existing values", () => {
  const existing = { "sumo-squat": { name: "Sumo Squat", tips: "brace", video: "/videos/sumo-squat.mp4" } };
  const required = {
    "sumo-squat": { name: "Sumo Squat", hasAlt: false },
    "cossack-squat": { name: "Cossack Squat", hasAlt: false },
  };
  const { merged, added, orphans } = mergeCatalog(existing, required);
  assert.deepEqual(added, ["Cossack Squat"]);                              // reported as new
  assert.equal(merged["sumo-squat"].video, "/videos/sumo-squat.mp4");      // preserved
  assert.equal(merged["sumo-squat"].tips, "brace");                        // preserved
  assert.deepEqual(merged["cossack-squat"], { name: "Cossack Squat", tips: "", video: null }); // blank
  assert.deepEqual(orphans, []);
});

test("keeps entries no workout uses anymore and reports them as orphans", () => {
  const existing = { "old-move": { name: "Old Move", tips: "", video: "/videos/old-move.mp4" } };
  const required = { "sumo-squat": { name: "Sumo Squat", hasAlt: false } };
  const { merged, added, orphans } = mergeCatalog(existing, required);
  assert.deepEqual(orphans, ["old-move"]);
  assert.equal(merged["old-move"].video, "/videos/old-move.mp4");          // kept, not dropped
  assert.deepEqual(added, ["Sumo Squat"]);
});

test("includes videoAlternating only for movements with an alternating variant", () => {
  const { merged } = mergeCatalog({}, {
    "forward-lunge": { name: "Forward Lunge", hasAlt: true },
    "sumo-squat": { name: "Sumo Squat", hasAlt: false },
  });
  assert.equal("videoAlternating" in merged["forward-lunge"], true);
  assert.equal(merged["forward-lunge"].videoAlternating, null);
  assert.equal("videoAlternating" in merged["sumo-squat"], false);
});

test("preserves a hand-entered alternating clip even when no longer flagged alternating", () => {
  const existing = { "forward-lunge": { name: "Forward Lunge", tips: "", video: "/videos/forward-lunge.mp4", videoAlternating: "/videos/forward-lunge-alt.mp4" } };
  const required = { "forward-lunge": { name: "Forward Lunge", hasAlt: false } };
  const { merged } = mergeCatalog(existing, required);
  assert.equal(merged["forward-lunge"].videoAlternating, "/videos/forward-lunge-alt.mp4");
  assert.equal(merged["forward-lunge"].video, "/videos/forward-lunge.mp4");
});
