import { test } from "node:test";
import assert from "node:assert/strict";
import { openFromStrings } from "./db.mjs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildWorkout, renderWorkoutJs, buildCatalog } from "./export-model.mjs";

const schema = readFileSync(path.resolve("data/schema.sql"), "utf8");
const data = `
INSERT INTO exercises (id, slug, name, tips, video, video_alternating) VALUES
  (1, 'row', 'Row', 'Pull to hip', 'row.mp4', NULL),
  (2, 'curtsy-lunge', 'Curtsy Lunge', '', NULL, 'cl-alt.mp4'),
  (3, 'side-lunge', 'Side Lunge', 'Go slow', NULL, NULL),
  (4, 'rest', 'Rest', NULL, NULL, NULL),
  (5, 'orphan-move', 'Orphan Move', 'unused', NULL, NULL);
INSERT INTO workouts (id, slug, name, difficulty, description) VALUES
  (1, 'demo', 'Demo', 'moderate', 'A demo.');
INSERT INTO workout_audiences (workout_id, audience) VALUES (1, 'run'), (1, 'equestrian');
INSERT INTO workout_exercises (workout_id, exercise_id, phase_name, phase_pos, circuit_pos, rounds, exercise_pos, rep_count, side, tips) VALUES
  (1, 1, 'C1', 0, 0, 2, 0, '8-10', NULL, NULL),
  (1, 2, 'C1', 0, 0, 2, 1, '6-8', 'Left', NULL),
  (1, 3, 'C1', 0, 0, 2, 2, '10 per side', 'Alternating', NULL),
  (1, 4, 'C1', 0, 0, 2, 3, '30', NULL, NULL);
`;

test("buildWorkout produces a slug-shaped nested workout object", () => {
  const db = openFromStrings(schema, data);
  const w = buildWorkout(db, { id: 1, slug: "demo", name: "Demo", difficulty: "moderate", description: "A demo." });
  assert.deepEqual(w, {
    name: "Demo",
    audiences: ["equestrian", "run"],
    difficulty: "moderate",
    description: "A demo.",
    phases: [
      {
        name: "C1",
        circuits: [
          {
            repeatCount: 2,
            exercises: [
              { slug: "row", repCount: "8-10" },
              { slug: "curtsy-lunge", side: "Left", repCount: "6-8" },
              { slug: "side-lunge", side: "Alternating", repCount: "10 per side" },
              { slug: "rest", repCount: 30 },
            ],
          },
        ],
      },
    ],
  });
  db.close();
});

test("renderWorkoutJs matches the export-default JSON format", () => {
  const text = renderWorkoutJs({ name: "X", audiences: ["run"], difficulty: "easier", description: "", phases: [] });
  assert.equal(text, `export default ${JSON.stringify({ name: "X", audiences: ["run"], difficulty: "easier", description: "", phases: [] }, null, 2)};\n`);
});

test("buildCatalog emits referenced non-rest exercises with the videoAlternating key rule", () => {
  const db = openFromStrings(schema, data);
  const cat = buildCatalog(db);
  // orphan-move (unused) and rest are excluded
  assert.deepEqual(Object.keys(cat).sort(), ["curtsy-lunge", "row", "side-lunge"]);
  // row: no alt use, no alt url -> no key
  assert.equal("videoAlternating" in cat["row"], false);
  // curtsy-lunge: has an alt url -> key present with url
  assert.equal(cat["curtsy-lunge"].videoAlternating, "cl-alt.mp4");
  // side-lunge: used as Alternating but no url -> key present, null
  assert.equal("videoAlternating" in cat["side-lunge"], true);
  assert.equal(cat["side-lunge"].videoAlternating, null);
  // tips null-coalesces to ""
  assert.equal(cat["side-lunge"].tips, "Go slow");
  db.close();
});
