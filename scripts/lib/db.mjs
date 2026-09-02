// The single data-access seam for the exercise DB. Today it builds an
// in-memory SQLite database from the git-tracked text sources. When the roadmap
// calls for a backend, swap THIS module for a hosted libSQL client and its
// consumers (seed/export) keep working unchanged.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";

const SCHEMA_PATH = path.resolve("data/schema.sql");
const DATA_PATH = path.resolve("data/data.sql");

// Build an in-memory DB from raw SQL strings. Used by tests and the exporter.
export function openFromStrings(schemaSql, dataSql) {
  const db = new DatabaseSync(":memory:");
  db.exec(schemaSql);
  if (dataSql) db.exec(dataSql);
  return db;
}

// Build an in-memory DB from the canonical text files.
export function openDb({ schemaPath = SCHEMA_PATH, dataPath = DATA_PATH } = {}) {
  return openFromStrings(readFileSync(schemaPath, "utf8"), readFileSync(dataPath, "utf8"));
}

// Materialize the gitignored .db build artifact for ad-hoc `sqlite3` querying.
export function buildDbFile(outPath, { schemaPath = SCHEMA_PATH, dataPath = DATA_PATH } = {}) {
  rmSync(outPath, { force: true });
  const db = new DatabaseSync(outPath);
  db.exec(readFileSync(schemaPath, "utf8"));
  db.exec(readFileSync(dataPath, "utf8"));
  db.close();
  return outPath;
}
