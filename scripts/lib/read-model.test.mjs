import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { openFromStrings } from "./db.mjs";
import { buildModel } from "./build-model.mjs";
import { emitDataSql } from "./emit-data-sql.mjs";
import { readModel } from "./read-model.mjs";

const schema = readFileSync(path.resolve("data/schema.sql"), "utf8");

test("readModel(emitDataSql(model)) reproduces the model exactly", () => {
  const model = buildModel(
    { "row": { name: "Row", tips: "Pull", video: "row.mp4" } },
    [{ slug: "a", workout: { name: "A", audiences: ["equestrian", "run"], difficulty: "easier", description: "", phases: [{ name: "C1", circuits: [{ repeatCount: 2, exercises: [{ name: "Row", side: "Left", repCount: "8-10" }, { name: "Rest", repCount: 30 }] }] }] } }],
  );
  const db = openFromStrings(schema, emitDataSql(model));
  assert.deepEqual(readModel(db), model);
  db.close();
});
