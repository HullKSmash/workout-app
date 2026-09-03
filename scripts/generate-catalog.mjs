// DEPRECATED — retired 2026-09-02. This was the one-time bootstrap that derived
// workouts/exercises.data.js from the active workouts. The exercise DB is now
// the source of truth: edit data/data.sql (or data/exercises.db) and run
// `npm run db:export`. Running this script would crash on slug-shaped instances.
console.error("generate-catalog.mjs is retired. Use `npm run db:export` (source: data/data.sql).");
process.exit(1);
