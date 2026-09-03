#!/usr/bin/env node
// DEPRECATED — the exercise DB is now the source of truth for workouts.
// Use the importer, which writes to the DB and regenerates the app files:
//   node scripts/import-workout.mjs --csv <file> --name "<Name>" --slug <slug> --audience <key>[,<key>] [--difficulty <d>]
console.error("generate-workout.mjs is retired. Use: node scripts/import-workout.mjs (see .claude/skills/update-workouts/SKILL.md).");
process.exit(1);
