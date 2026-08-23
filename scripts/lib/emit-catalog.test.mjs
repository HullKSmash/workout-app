import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeCatalog } from "./emit-catalog.mjs";

test("emits the generated-file header and export", () => {
  const out = serializeCatalog({ "sumo-squat": { name: "Sumo Squat", tips: "", video: null } });
  assert.match(out, /^\/\/ GENERATED FILE — regenerate with `node scripts\/generate-catalog\.mjs`\./);
  assert.match(out, /export const EXERCISES = \{/);
  assert.match(out, /\n\};\n$/);
});

test("sorts entries by display name and emits exact line format", () => {
  const out = serializeCatalog({
    "sumo-squat": { name: "Sumo Squat", tips: "", video: null },
    "bench-press": { name: "Bench Press", tips: "brace", video: "https://x/bench.mp4" },
  });
  assert.ok(out.indexOf('"bench-press"') < out.indexOf('"sumo-squat"'));
  assert.match(out, /  "bench-press": \{ name: "Bench Press", tips: "brace", video: "https:\/\/x\/bench\.mp4" \},/);
  assert.match(out, /  "sumo-squat": \{ name: "Sumo Squat", tips: "", video: null \},/);
});

test("includes videoAlternating only when the entry has that key", () => {
  const out = serializeCatalog({
    "forward-lunge": { name: "Forward Lunge", tips: "", video: null, videoAlternating: "https://x/fl-alt.mp4" },
    "sumo-squat": { name: "Sumo Squat", tips: "", video: null },
  });
  assert.match(out, /"forward-lunge": \{ name: "Forward Lunge", tips: "", video: null, videoAlternating: "https:\/\/x\/fl-alt\.mp4" \},/);
  assert.doesNotMatch(out, /"sumo-squat":[^\n]*videoAlternating/);
});
