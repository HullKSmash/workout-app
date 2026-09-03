import { test } from "node:test";
import assert from "node:assert/strict";
import { openFromStrings } from "./db.mjs";

test("openFromStrings builds a queryable DB from schema + data text", () => {
  const schema = "CREATE TABLE exercises (id INTEGER PRIMARY KEY, slug TEXT NOT NULL, name TEXT);";
  const data = "INSERT INTO exercises (id, slug, name) VALUES (1, 'row', 'Row');";
  const db = openFromStrings(schema, data);
  // node:sqlite returns null-prototype row objects; spread to plain objects
  // so assert/strict's deepEqual (== deepStrictEqual) doesn't fail on
  // prototype alone.
  const rows = db.prepare("SELECT slug, name FROM exercises").all().map((row) => ({ ...row }));
  assert.deepEqual(rows, [{ slug: "row", name: "Row" }]);
  db.close();
});
