// Regenerate the app's workout files and exercise catalog from the DB.
// Run after editing data/data.sql (or data/exercises.db). This is the ONLY
// supported way to change workouts/*.js and workouts/exercises.data.js.
// runExport() is exported so the CSV importer (Task 8) can reuse it.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { openDb } from "./lib/db.mjs";
import { exportAll } from "./lib/export-model.mjs";

export function runExport() {
  const db = openDb();
  const { files, catalogText } = exportAll(db);
  for (const { slug, text } of files) writeFileSync(path.resolve(`workouts/${slug}.js`), text);
  writeFileSync(path.resolve("workouts/exercises.data.js"), catalogText);
  db.close();
  return files.length;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`Exported ${runExport()} workouts + exercises.data.js from the DB.`);
}
