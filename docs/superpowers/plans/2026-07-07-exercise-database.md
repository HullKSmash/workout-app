# Exercise Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a local, build-time SQLite database the single source of truth for exercises and workouts, seeded from today's catalog, and regenerate the app's `workouts/*.js` + `workouts/exercises.data.js` from it — with app workouts referencing exercises by slug.

**Architecture:** Text `data/schema.sql` + `data/data.sql` are canonical (git-tracked); a gitignored `data/exercises.db` is a build artifact. A one-time **seed** builds the model from `exercises.data.js` (exercises) and the active `workouts/*.js` (workout structure) and writes `data.sql`. An **exporter** reads the DB back and regenerates the app files. A CSV **importer** preserves the existing authoring flow — it parses a workout CSV, links exercises by slug, splices the workout into the DB, and re-exports. All DB access goes through one seam (`scripts/lib/db.mjs`) so a future hosted libSQL backend is a migration, not a rewrite. Nothing is hosted; the deployed app stays a static SPA reading `.js`.

**Tech Stack:** Node 24 built-in `node:sqlite` (`DatabaseSync`), ESM, `node --test` + `node:assert`. No new dependencies. Reuses existing `workouts/exercises.js` (`slugify`) and `scripts/lib/normalize-exercises.mjs` (`deriveCore`) for name→slug linking, and `scripts/lib/emit-catalog.mjs` (`serializeCatalog`) for the catalog file format.

**Design decisions locked in the spec** ([2026-07-07-exercise-database-design.md](../specs/2026-07-07-exercise-database-design.md)):
- The **seed is a one-time bootstrap.** After Task 5 commits `data.sql`, that file (or the `.db`) is edited directly; the seed is not re-run (re-running would re-derive from `exercises.data.js` and drop the 4 library-only exercises).
- Exercise instances in exported workouts carry **`slug`**, not display name. The app resolves name/tips/video from the catalog by slug.
- `Rest` is a reserved exercise (`slug='rest'`) in the DB; it is **excluded** from the app catalog and short-circuits in the app.
- Only **active** workouts (those exported by `workouts/index.js`) are seeded/exported. Dormant foundation files are left untouched (a follow-up when reactivated).
- CSV workout authoring stays supported via a **CSV → DB importer** (Task 8): new/replaced workouts that reuse existing exercises. New *exercises* are a deliberate SQL insert; the importer hard-errors on an unknown movement. The old direct-to-`.js` generator (`generate-workout.mjs`) is retired.
- `scripts/generate-catalog.mjs` was the bootstrap that built `exercises.data.js`; it is **retired** here (neutralized to a deprecation stub) because it would crash on slug-shaped instances.

---

## File Structure

**Created:**
- `data/schema.sql` — table DDL (canonical, git-tracked).
- `data/data.sql` — INSERT rows (canonical, git-tracked). **Generated once by Task 5.**
- `data/exercises.db` — build artifact, **gitignored** (Task 1).
- `scripts/lib/db.mjs` — the data-access seam: build an in-memory (or file) SQLite DB from the text sources.
- `scripts/lib/active-workouts.mjs` — enumerate active workout files → `[{ slug, workout }]`.
- `scripts/lib/build-model.mjs` — pure: `(EXERCISES, active) → { exercises, workouts, workoutAudiences, workoutExercises }`.
- `scripts/lib/emit-data-sql.mjs` — pure: model → `data.sql` text (+ SQL escaping helpers).
- `scripts/lib/export-model.mjs` — pure: `db` → workout objects (slug-shaped) + catalog object + renderers.
- `scripts/lib/read-model.mjs` — DB → model (inverse of `emit-data-sql`; used by the importer).
- `scripts/lib/import-model.mjs` — pure: add/replace a workout in a model (`applyWorkout`).
- `scripts/seed-db.mjs` — CLI: build model → write `data.sql` → build `.db`.
- `scripts/export-app.mjs` — CLI + exported `runExport()`: open DB → write `workouts/*.js` + `workouts/exercises.data.js`.
- `scripts/import-workout.mjs` — CLI: parse CSV → splice into DB → re-export.
- Test files: `scripts/lib/*.test.mjs` alongside each lib module.

**Modified:**
- `.gitignore` — add `data/exercises.db`.
- `package.json` — add `db:seed`, `db:export`, `db:import` scripts.
- `workouts/exercises.js` — `resolveExercise`/`formatExerciseTitle` resolve by `instance.slug`.
- `workout-app.jsx` — `isRest` keys off `slug === "rest"`.
- `workouts/*.js` (all 16 active) — regenerated to slug-shaped instances by Task 7.
- `scripts/generate-catalog.mjs` — neutralized to a deprecation stub.
- `scripts/lib/emit-catalog.mjs` — header comment points at the new exporter.
- `.claude/skills/update-workouts/` — `SKILL.md` + `scripts/generate-workout.mjs` updated to the `db:import` flow.

---

## Task 1: Schema, the DB seam, and gitignore

**Files:**
- Create: `data/schema.sql`
- Create: `scripts/lib/db.mjs`
- Create: `scripts/lib/db.test.mjs`
- Modify: `.gitignore`

- [ ] **Step 1: Write `data/schema.sql`**

```sql
-- Exercise + workout library. Standard SQLite (libSQL-compatible): no
-- extensions, so this schema ports to a hosted libSQL/Turso instance unchanged.

CREATE TABLE exercises (
  id                INTEGER PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  tips              TEXT,
  video             TEXT,
  video_alternating TEXT
);

CREATE TABLE workouts (
  id          INTEGER PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  difficulty  TEXT,
  description TEXT
);

CREATE TABLE workout_audiences (
  workout_id INTEGER NOT NULL REFERENCES workouts(id),
  audience   TEXT NOT NULL,
  PRIMARY KEY (workout_id, audience)
);

CREATE TABLE workout_exercises (
  workout_id   INTEGER NOT NULL REFERENCES workouts(id),
  exercise_id  INTEGER NOT NULL REFERENCES exercises(id),
  phase_name   TEXT NOT NULL,
  phase_pos    INTEGER NOT NULL,
  circuit_pos  INTEGER NOT NULL,
  rounds       INTEGER NOT NULL,
  exercise_pos INTEGER NOT NULL,
  rep_count    TEXT NOT NULL,
  side         TEXT,
  tips         TEXT,
  PRIMARY KEY (workout_id, phase_pos, circuit_pos, exercise_pos)
);
```

- [ ] **Step 2: Add the build artifact to `.gitignore`**

Append to `.gitignore`:

```
# Exercise DB build artifact (canonical source is data/data.sql)
data/exercises.db
```

- [ ] **Step 3: Write the failing test for the seam**

Create `scripts/lib/db.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { openFromStrings } from "./db.mjs";

test("openFromStrings builds a queryable DB from schema + data text", () => {
  const schema = "CREATE TABLE exercises (id INTEGER PRIMARY KEY, slug TEXT NOT NULL, name TEXT);";
  const data = "INSERT INTO exercises (id, slug, name) VALUES (1, 'row', 'Row');";
  const db = openFromStrings(schema, data);
  const rows = db.prepare("SELECT slug, name FROM exercises").all();
  assert.deepEqual(rows, [{ slug: "row", name: "Row" }]);
  db.close();
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `node --test scripts/lib/db.test.mjs`
Expected: FAIL — `openFromStrings` is not exported / module not found.

- [ ] **Step 5: Implement `scripts/lib/db.mjs`**

```js
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
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node --test scripts/lib/db.test.mjs`
Expected: PASS (1 test). A `node:sqlite` ExperimentalWarning may print — it is benign.

- [ ] **Step 7: Commit**

```bash
git add data/schema.sql scripts/lib/db.mjs scripts/lib/db.test.mjs .gitignore
git commit -m "feat(db): add exercise DB schema and data-access seam"
```

---

## Task 2: Enumerate active workouts with their slugs

The seed needs each active workout paired with its filename stem (the slug). `workouts/index.js` exports the objects but not their filenames, so we match each file's default export against the `WORKOUTS` array by identity.

**Files:**
- Create: `scripts/lib/active-workouts.mjs`
- Create: `scripts/lib/active-workouts.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { WORKOUTS } from "../../workouts/index.js";
import { activeWorkouts } from "./active-workouts.mjs";

test("activeWorkouts pairs every active workout with its filename slug", async () => {
  const active = await activeWorkouts();
  // one entry per exported workout, no more (dormant files excluded)
  assert.equal(active.length, WORKOUTS.length);
  // slugs are unique, non-empty, and .js-free
  const slugs = active.map((a) => a.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(slugs.every((s) => s && !s.endsWith(".js")));
  // every paired object is one of the exported workouts
  const set = new Set(WORKOUTS);
  assert.ok(active.every((a) => set.has(a.workout)));
  // a known file maps to a known name
  const slb1 = active.find((a) => a.slug === "runner-single-leg-sandwiches-1");
  assert.equal(slb1.workout.name, "Single Leg Sandwiches 1");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/lib/active-workouts.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scripts/lib/active-workouts.mjs`**

```js
// Pair each ACTIVE workout (exported by workouts/index.js) with its filename
// stem, which is the workout's canonical slug. Dormant files (present but not in
// WORKOUTS, e.g. the hidden foundation set) are excluded.
import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { WORKOUTS } from "../../workouts/index.js";

// Non-workout modules that live in workouts/ and must never be treated as data.
const INFRA = new Set(["index.js", "exercises.js", "exercises.data.js", "parse-csv.js"]);

export async function activeWorkouts(dir = path.resolve("workouts")) {
  const active = new Set(WORKOUTS);
  const out = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".js") || INFRA.has(file)) continue;
    const mod = await import(pathToFileURL(path.join(dir, file)).href);
    if (active.has(mod.default)) out.push({ slug: file.replace(/\.js$/, ""), workout: mod.default });
  }
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/lib/active-workouts.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/active-workouts.mjs scripts/lib/active-workouts.test.mjs
git commit -m "feat(db): enumerate active workouts with their slugs"
```

---

## Task 3: Build the relational model from catalog + workouts

Pure transform: given the catalog object and the active-workout list, produce the four tables' rows. Exercise ids are assigned by sorted display name for determinism; `Rest` is appended as a reserved exercise. Each workout instance is linked to an exercise by `slugify(deriveCore(name).core)`; an unmatched slug is a hard error.

**Files:**
- Create: `scripts/lib/build-model.mjs`
- Create: `scripts/lib/build-model.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildModel } from "./build-model.mjs";

const CATALOG = {
  "row": { name: "Row", tips: "Pull to hip", video: "row.mp4" },
  "curtsy-lunge": { name: "Curtsy Lunge", tips: "", video: null, videoAlternating: "cl-alt.mp4" },
};

const ACTIVE = [
  {
    slug: "demo-workout",
    workout: {
      name: "Demo Workout",
      audiences: ["run", "equestrian"],
      difficulty: "moderate",
      description: "A demo.",
      phases: [
        {
          name: "Circuit 1",
          circuits: [
            {
              repeatCount: 2,
              exercises: [
                { name: "Row", repCount: "8-10" },
                { name: "Curtsy Lunge", side: "Left", repCount: "6-8" },
                { name: "Rest", repCount: 30 },
              ],
            },
          ],
        },
      ],
    },
  },
];

test("buildModel produces exercises with Rest reserved and slug-linked joins", () => {
  const m = buildModel(CATALOG, ACTIVE);

  // exercises: 2 catalog + Rest, sorted by name, ids 1..n
  assert.deepEqual(
    m.exercises.map((e) => [e.id, e.slug, e.name, e.video, e.video_alternating]),
    [
      [1, "curtsy-lunge", "Curtsy Lunge", null, "cl-alt.mp4"],
      [2, "rest", "Rest", null, null],
      [3, "row", "Row", "row.mp4", null],
    ],
  );

  // workout + audiences
  assert.deepEqual(m.workouts, [{ id: 1, slug: "demo-workout", name: "Demo Workout", difficulty: "moderate", description: "A demo." }]);
  // audiences are sorted alphabetically for a canonical data.sql
  assert.deepEqual(m.workoutAudiences, [
    { workout_id: 1, audience: "equestrian" },
    { workout_id: 1, audience: "run" },
  ]);

  // joins: rep_count always TEXT, side preserved, exercise_id linked by slug
  assert.deepEqual(m.workoutExercises, [
    { workout_id: 1, exercise_id: 3, phase_name: "Circuit 1", phase_pos: 0, circuit_pos: 0, rounds: 2, exercise_pos: 0, rep_count: "8-10", side: null, tips: null },
    { workout_id: 1, exercise_id: 1, phase_name: "Circuit 1", phase_pos: 0, circuit_pos: 0, rounds: 2, exercise_pos: 1, rep_count: "6-8", side: "Left", tips: null },
    { workout_id: 1, exercise_id: 2, phase_name: "Circuit 1", phase_pos: 0, circuit_pos: 0, rounds: 2, exercise_pos: 2, rep_count: "30", side: null, tips: null },
  ]);
});

test("buildModel throws on an exercise name absent from the catalog", () => {
  const active = [{ slug: "x", workout: { name: "X", audiences: [], difficulty: "easier", description: "", phases: [{ name: "C1", circuits: [{ repeatCount: 1, exercises: [{ name: "Nonexistent Move", repCount: "5" }] }] }] } }];
  assert.throws(() => buildModel(CATALOG, active), /Nonexistent Move/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/lib/build-model.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scripts/lib/build-model.mjs`**

```js
// Pure transform: (catalog object, active-workout list) -> relational rows for
// the four tables. Reused normalizers keep exercise identity consistent with
// the app: slug = slugify(deriveCore(name).core). Rest is a reserved exercise.
// buildExerciseRows and buildWorkoutRows are exported so the CSV importer
// (Task 8) can reuse them.
import { slugify } from "../../workouts/exercises.js";
import { deriveCore } from "./normalize-exercises.mjs";

const REST = { slug: "rest", name: "Rest", tips: null, video: null, video_alternating: null };

// Exercise rows: catalog entries + reserved Rest, sorted by name, ids 1..n.
export function buildExerciseRows(catalog) {
  const rows = Object.entries(catalog).map(([slug, e]) => ({
    slug,
    name: e.name,
    tips: e.tips ?? null,
    video: e.video ?? null,
    video_alternating: e.videoAlternating ?? null,
  }));
  rows.push({ ...REST });
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows.map((r, i) => ({ id: i + 1, ...r }));
}

// One workout's rows: { workout, audiences, joins }. Links each instance to an
// exercise by slug; an unknown movement is a hard error. Audiences are sorted so
// data.sql is canonical (stable across importer round-trips).
export function buildWorkoutRows(workout, { slug, workout_id, idBySlug }) {
  const workoutRow = { id: workout_id, slug, name: workout.name, difficulty: workout.difficulty ?? null, description: workout.description ?? "" };
  const audiences = [...(workout.audiences ?? [])].sort().map((audience) => ({ workout_id, audience }));
  const joins = [];
  workout.phases.forEach((phase, phase_pos) => {
    phase.circuits.forEach((circuit, circuit_pos) => {
      circuit.exercises.forEach((ex, exercise_pos) => {
        const exSlug = ex.name === "Rest" ? "rest" : slugify(deriveCore(ex.name).core);
        const exercise_id = idBySlug.get(exSlug);
        if (!exercise_id) throw new Error(`Workout "${workout.name}" references unknown exercise "${ex.name}" (slug "${exSlug}") — fix the name or add the exercise.`);
        joins.push({
          workout_id,
          exercise_id,
          phase_name: phase.name,
          phase_pos,
          circuit_pos,
          rounds: circuit.repeatCount,
          exercise_pos,
          rep_count: String(ex.repCount),
          side: ex.side ?? null,
          tips: ex.tips ?? null,
        });
      });
    });
  });
  return { workout: workoutRow, audiences, joins };
}

export function buildModel(catalog, active) {
  const exercises = buildExerciseRows(catalog);
  const idBySlug = new Map(exercises.map((e) => [e.slug, e.id]));
  const workouts = [];
  const workoutAudiences = [];
  const workoutExercises = [];
  active.forEach(({ slug, workout }, wi) => {
    const { workout: w, audiences, joins } = buildWorkoutRows(workout, { slug, workout_id: wi + 1, idBySlug });
    workouts.push(w);
    workoutAudiences.push(...audiences);
    workoutExercises.push(...joins);
  });
  return { exercises, workouts, workoutAudiences, workoutExercises };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/lib/build-model.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/build-model.mjs scripts/lib/build-model.test.mjs
git commit -m "feat(db): build relational model from catalog and workouts"
```

---

## Task 4: Emit `data.sql` from the model

Pure serializer: model → deterministic INSERT statements. SQL string values escape single quotes by doubling; nulls emit as `NULL`.

**Files:**
- Create: `scripts/lib/emit-data-sql.mjs`
- Create: `scripts/lib/emit-data-sql.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { emitDataSql } from "./emit-data-sql.mjs";

const MODEL = {
  exercises: [
    { id: 1, slug: "row", name: "Row", tips: "Don't 'cheat'", video: "row.mp4", video_alternating: null },
    { id: 2, slug: "rest", name: "Rest", tips: null, video: null, video_alternating: null },
  ],
  workouts: [{ id: 1, slug: "demo", name: "Demo", difficulty: "moderate", description: "A demo." }],
  workoutAudiences: [{ workout_id: 1, audience: "run" }],
  workoutExercises: [
    { workout_id: 1, exercise_id: 1, phase_name: "C1", phase_pos: 0, circuit_pos: 0, rounds: 2, exercise_pos: 0, rep_count: "8-10", side: "Left", tips: null },
  ],
};

test("emitDataSql escapes quotes, emits NULL, and orders sections", () => {
  const sql = emitDataSql(MODEL);
  assert.match(sql, /INSERT INTO exercises \(id, slug, name, tips, video, video_alternating\) VALUES \(1, 'row', 'Row', 'Don''t ''cheat''', 'row.mp4', NULL\);/);
  assert.match(sql, /INSERT INTO exercises .* VALUES \(2, 'rest', 'Rest', NULL, NULL, NULL\);/);
  assert.match(sql, /INSERT INTO workouts \(id, slug, name, difficulty, description\) VALUES \(1, 'demo', 'Demo', 'moderate', 'A demo\.'\);/);
  assert.match(sql, /INSERT INTO workout_audiences \(workout_id, audience\) VALUES \(1, 'run'\);/);
  assert.match(sql, /INSERT INTO workout_exercises \(workout_id, exercise_id, phase_name, phase_pos, circuit_pos, rounds, exercise_pos, rep_count, side, tips\) VALUES \(1, 1, 'C1', 0, 0, 2, 0, '8-10', 'Left', NULL\);/);
  // exercises section precedes workouts section
  assert.ok(sql.indexOf("INTO exercises") < sql.indexOf("INTO workouts"));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/lib/emit-data-sql.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scripts/lib/emit-data-sql.mjs`**

```js
// Pure serializer: relational model -> canonical data.sql text. Deterministic:
// rows are emitted in model order, which the seed builds deterministically.

const sqlStr = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const sqlNum = (v) => (v == null ? "NULL" : String(v));

function insert(table, cols, rows, cell) {
  if (!rows.length) return `-- (no ${table} rows)\n`;
  return rows.map((r) => `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cell(r).join(", ")});`).join("\n") + "\n";
}

export function emitDataSql(model) {
  const header = "-- GENERATED by scripts/seed-db.mjs (one-time bootstrap).\n-- Canonical source hereafter: edit this file (or data/exercises.db) directly.\n\n";

  const exercises = insert(
    "exercises",
    ["id", "slug", "name", "tips", "video", "video_alternating"],
    model.exercises,
    (e) => [sqlNum(e.id), sqlStr(e.slug), sqlStr(e.name), sqlStr(e.tips), sqlStr(e.video), sqlStr(e.video_alternating)],
  );

  const workouts = insert(
    "workouts",
    ["id", "slug", "name", "difficulty", "description"],
    model.workouts,
    (w) => [sqlNum(w.id), sqlStr(w.slug), sqlStr(w.name), sqlStr(w.difficulty), sqlStr(w.description)],
  );

  const audiences = insert(
    "workout_audiences",
    ["workout_id", "audience"],
    model.workoutAudiences,
    (a) => [sqlNum(a.workout_id), sqlStr(a.audience)],
  );

  const joins = insert(
    "workout_exercises",
    ["workout_id", "exercise_id", "phase_name", "phase_pos", "circuit_pos", "rounds", "exercise_pos", "rep_count", "side", "tips"],
    model.workoutExercises,
    (j) => [sqlNum(j.workout_id), sqlNum(j.exercise_id), sqlStr(j.phase_name), sqlNum(j.phase_pos), sqlNum(j.circuit_pos), sqlNum(j.rounds), sqlNum(j.exercise_pos), sqlStr(j.rep_count), sqlStr(j.side), sqlStr(j.tips)],
  );

  return header + [exercises, workouts, audiences, joins].join("\n");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/lib/emit-data-sql.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/emit-data-sql.mjs scripts/lib/emit-data-sql.test.mjs
git commit -m "feat(db): serialize model to canonical data.sql"
```

---

## Task 5: Seed CLI + run the one-time bootstrap

Wire the pure pieces into a CLI that writes `data/data.sql` and materializes `data/exercises.db`, then run it for real and commit the canonical text.

**Files:**
- Create: `scripts/seed-db.mjs`
- Modify: `package.json` (add `db:seed`)
- Generated + committed: `data/data.sql`

- [ ] **Step 1: Implement `scripts/seed-db.mjs`**

```js
// One-time bootstrap: build the relational model from the current catalog +
// active workouts, write canonical data/data.sql, and materialize the gitignored
// data/exercises.db. Do NOT re-run after the initial commit — data.sql is
// canonical thereafter and re-seeding would drop library-only exercises.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { EXERCISES } from "../workouts/exercises.js";
import { activeWorkouts } from "./lib/active-workouts.mjs";
import { buildModel } from "./lib/build-model.mjs";
import { emitDataSql } from "./lib/emit-data-sql.mjs";
import { buildDbFile } from "./lib/db.mjs";

const active = await activeWorkouts();
const model = buildModel(EXERCISES, active);

const dataPath = path.resolve("data/data.sql");
writeFileSync(dataPath, emitDataSql(model));

const dbPath = buildDbFile(path.resolve("data/exercises.db"));

console.log(`Wrote ${model.exercises.length} exercises, ${model.workouts.length} workouts, ${model.workoutExercises.length} instances → data/data.sql`);
console.log(`Built ${dbPath} (gitignored). Query it with: sqlite3 data/exercises.db`);
```

- [ ] **Step 2: Add the npm script**

In `package.json` `"scripts"`, add:

```json
    "db:seed": "node scripts/seed-db.mjs",
```

- [ ] **Step 3: Run the seed**

Run: `npm run db:seed`
Expected output (counts): `Wrote 90 exercises, 16 workouts, <N> instances → data/data.sql` (89 catalog + Rest = 90 exercises; 16 active workouts).

- [ ] **Step 4: Verify the DB is queryable and the 4 library-only exercises are present**

Run:

```bash
sqlite3 data/exercises.db "SELECT slug FROM exercises WHERE slug NOT IN (SELECT DISTINCT e.slug FROM workout_exercises we JOIN exercises e ON e.id=we.exercise_id) AND slug<>'rest' ORDER BY slug;"
```

Expected (the orphans that live only in the library):

```
banded-crab-walk
curl-and-press
runner-hop
superman-pull-down
```

- [ ] **Step 5: Verify referential integrity (no dangling exercise refs)**

Run:

```bash
sqlite3 data/exercises.db "SELECT count(*) FROM workout_exercises we LEFT JOIN exercises e ON e.id=we.exercise_id WHERE e.id IS NULL;"
```

Expected: `0`.

- [ ] **Step 6: Commit the canonical seed**

```bash
git add scripts/seed-db.mjs package.json data/data.sql
git commit -m "feat(db): seed canonical data.sql from catalog and workouts"
```

Note: `data/exercises.db` is gitignored and intentionally not committed.

---

## Task 6: Reshape DB rows into app files (export model)

Pure functions over a `node:sqlite` handle: rebuild each workout as a nested, **slug-shaped** object and render its `.js`; rebuild the catalog object (subset: referenced non-rest exercises) with the exact `videoAlternating` key rule, then render it via the existing `serializeCatalog`.

**Files:**
- Create: `scripts/lib/export-model.mjs`
- Create: `scripts/lib/export-model.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/lib/export-model.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scripts/lib/export-model.mjs`**

```js
// Pure reshaping: DB handle -> app files. Rebuilds each workout as a nested,
// slug-referenced object and the catalog as the subset of referenced exercises.
import { serializeCatalog } from "./emit-catalog.mjs";

// Rebuild one workout object in the exact shape the app imports.
export function buildWorkout(db, workoutRow) {
  const audiences = db
    .prepare("SELECT audience FROM workout_audiences WHERE workout_id = ? ORDER BY audience")
    .all(workoutRow.id)
    .map((r) => r.audience);

  const rows = db
    .prepare(
      `SELECT we.phase_name, we.phase_pos, we.circuit_pos, we.rounds, we.exercise_pos,
              we.rep_count, we.side, we.tips, e.slug AS slug
       FROM workout_exercises we JOIN exercises e ON e.id = we.exercise_id
       WHERE we.workout_id = ?
       ORDER BY we.phase_pos, we.circuit_pos, we.exercise_pos`,
    )
    .all(workoutRow.id);

  const phases = [];
  let curPhase = null;
  let curCircuit = null;
  let lastPhasePos = null;
  let lastCircuitPos = null;

  for (const r of rows) {
    if (r.phase_pos !== lastPhasePos) {
      curPhase = { name: r.phase_name, circuits: [] };
      phases.push(curPhase);
      lastPhasePos = r.phase_pos;
      lastCircuitPos = null;
    }
    if (r.circuit_pos !== lastCircuitPos) {
      curCircuit = { repeatCount: r.rounds, exercises: [] };
      curPhase.circuits.push(curCircuit);
      lastCircuitPos = r.circuit_pos;
    }
    curCircuit.exercises.push(buildInstance(r));
  }

  return { name: workoutRow.name, audiences, difficulty: workoutRow.difficulty, description: workoutRow.description ?? "", phases };
}

// Instance key order: slug, side?, repCount, tips?. Rest's repCount is numeric.
function buildInstance(r) {
  const inst = { slug: r.slug };
  if (r.side != null) inst.side = r.side;
  inst.repCount = r.slug === "rest" ? Number(r.rep_count) : r.rep_count;
  if (r.tips != null) inst.tips = r.tips;
  return inst;
}

export function renderWorkoutJs(workoutObj) {
  return `export default ${JSON.stringify(workoutObj, null, 2)};\n`;
}

// Catalog subset: exercises referenced by at least one workout, excluding Rest.
// videoAlternating key is present iff the exercise is used as Alternating OR has
// a non-null alternating URL — matching the retired generate-catalog behavior.
export function buildCatalog(db) {
  const rows = db
    .prepare(
      `SELECT e.slug, e.name, e.tips, e.video, e.video_alternating AS alt,
              EXISTS(SELECT 1 FROM workout_exercises w WHERE w.exercise_id = e.id) AS used,
              EXISTS(SELECT 1 FROM workout_exercises w WHERE w.exercise_id = e.id AND w.side = 'Alternating') AS has_alt
       FROM exercises e
       WHERE e.slug <> 'rest'
       ORDER BY e.name`,
    )
    .all();

  const catalog = {};
  for (const r of rows) {
    if (!r.used) continue; // orphans stay in the library, not the app catalog
    const entry = { name: r.name, tips: r.tips ?? "", video: r.video ?? null };
    if (r.has_alt || r.alt != null) entry.videoAlternating = r.alt ?? null;
    catalog[r.slug] = entry;
  }
  return catalog;
}

// Render all app files. Returns { files: [{ slug, text }], catalogText }.
export function exportAll(db) {
  const workoutRows = db.prepare("SELECT id, slug, name, difficulty, description FROM workouts ORDER BY id").all();
  const files = workoutRows.map((w) => ({ slug: w.slug, text: renderWorkoutJs(buildWorkout(db, w)) }));
  return { files, catalogText: serializeCatalog(buildCatalog(db)) };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/lib/export-model.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/export-model.mjs scripts/lib/export-model.test.mjs
git commit -m "feat(db): reshape DB rows into slug-shaped app files"
```

---

## Task 7: Export CLI, the app slug-reference change, and the real export

Land the exporter CLI, switch the app to resolve exercises by slug, run the export for real (rewriting all 16 active workout files + the catalog), retire the bootstrap script, and verify the app renders.

**Files:**
- Create: `scripts/export-app.mjs`
- Modify: `package.json` (add `db:export`)
- Modify: `workouts/exercises.js` (resolve by slug; return name)
- Modify: `workouts/exercises.test.js` (existing — rewrite to slug)
- Modify: `workouts/build-checklist.js` (resolve name/tips/Rest via catalog by slug)
- Modify: `workouts/build-checklist.test.js` (existing — rewrite to slug + catalog fixture)
- Modify: `workout-app.jsx` (isRest by slug)
- Modify: `scripts/lib/emit-catalog.mjs` (header text)
- Modify: `scripts/generate-catalog.mjs` (neutralize to a stub)
- Regenerated: `workouts/*.js` (16 files) + `workouts/exercises.data.js`

**Full app-side blast radius of the slug switch** (verified against the codebase): instances change from `{ name, side?, repCount }` to `{ slug, side?, repCount }`, so every reader of instance `.name`/`.tips`/`"Rest"` must change. Those are exactly: `workout-app.jsx:88` (isRest), `workouts/exercises.js` (resolver — the app's other name/tips reads all go through it), and `workouts/build-checklist.js` (the checklist feature; reads `exercise.name`/`.tips` and Rest). Their two existing test files (`exercises.test.js`, `build-checklist.test.js`) assert the old name-based API and must be rewritten. Other `workouts/` modules (`checklist-progress.js`, `progress.js`, `weekly-progress.js`) key off item ids, not instance names — untouched.

- [ ] **Step 1: Implement `scripts/export-app.mjs`**

```js
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
```

- [ ] **Step 2: Add the npm script**

In `package.json` `"scripts"`, add:

```json
    "db:export": "node scripts/export-app.mjs",
```

- [ ] **Step 3: Rewrite the existing `workouts/exercises.test.js` to the slug API**

Overwrite `workouts/exercises.test.js` (it currently asserts the old `name`-based resolver) with:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, resolveExercise, formatExerciseTitle, EXERCISES } from "./exercises.js";
import { WORKOUTS } from "./index.js";

test("slugify normalizes punctuation, & and w/", () => {
  assert.equal(slugify("Calf Raise & Curl"), "calf-raise-and-curl");
  assert.equal(slugify("Forward Lunge w/ Twist"), "forward-lunge-with-twist");
  assert.equal(slugify("Standing Cat/Cow"), "standing-cat-cow");
  assert.equal(slugify("To-the-Chin Lift"), "to-the-chin-lift");
  assert.equal(slugify("RDL & Row"), "rdl-and-row");
});

const CATALOG = {
  "forward-lunge": { name: "Forward Lunge", tips: "hips square", video: "/videos/forward-lunge.mp4", videoAlternating: "/videos/forward-lunge-alt.mp4" },
  "sumo-squat": { name: "Sumo Squat", tips: "", video: null },
  "single-arm-row": { name: "Single Arm Row", tips: "", video: "/videos/single-arm-row.mp4", videoAlternating: null },
};

test("resolveExercise: looks up by slug and returns the resolved name", () => {
  assert.equal(resolveExercise({ slug: "forward-lunge" }, CATALOG).name, "Forward Lunge");
});

test("resolveExercise: Left plays the single-side clip un-mirrored", () => {
  const r = resolveExercise({ slug: "forward-lunge", side: "Left" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/forward-lunge.mp4");
  assert.equal(r.mirror, false);
});

test("resolveExercise: Right mirrors the single-side clip", () => {
  const r = resolveExercise({ slug: "forward-lunge", side: "Right" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/forward-lunge.mp4");
  assert.equal(r.mirror, true);
});

test("resolveExercise: Alternating prefers the alternating clip, never mirrors", () => {
  const r = resolveExercise({ slug: "forward-lunge", side: "Alternating" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/forward-lunge-alt.mp4");
  assert.equal(r.mirror, false);
});

test("resolveExercise: Alternating falls back to single-side clip when no alt clip", () => {
  const r = resolveExercise({ slug: "single-arm-row", side: "Alternating" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/single-arm-row.mp4");
  assert.equal(r.mirror, false);
});

test("resolveExercise: missing/no video yields null src (placeholder path)", () => {
  assert.equal(resolveExercise({ slug: "sumo-squat" }, CATALOG).videoSrc, null);
  assert.equal(resolveExercise({ slug: "unknown-move" }, CATALOG).videoSrc, null);
});

test("resolveExercise: instance tips win, else catalog tips, else null", () => {
  assert.equal(resolveExercise({ slug: "forward-lunge", tips: "override" }, CATALOG).tips, "override");
  assert.equal(resolveExercise({ slug: "forward-lunge" }, CATALOG).tips, "hips square");
  assert.equal(resolveExercise({ slug: "sumo-squat" }, CATALOG).tips, null);
});

test("formatExerciseTitle appends the side", () => {
  assert.equal(formatExerciseTitle({ slug: "forward-lunge" }, CATALOG), "Forward Lunge");
  assert.equal(formatExerciseTitle({ slug: "forward-lunge", side: "Left" }, CATALOG), "Forward Lunge · Left");
  assert.equal(formatExerciseTitle({ slug: "forward-lunge", side: "Alternating" }, CATALOG), "Forward Lunge · Alternating");
});

// Integration: valid only AFTER the DB export reshapes workout files to slug refs
// (Step 9). It reads instance.slug, so it fails while files are still name-shaped.
test("every active-workout exercise resolves to a catalog entry", () => {
  const missing = new Set();
  for (const w of WORKOUTS) {
    for (const phase of w.phases) {
      for (const circuit of phase.circuits) {
        for (const ex of circuit.exercises) {
          if (ex.slug === "rest") continue;
          if (!EXERCISES[ex.slug]) missing.add(`${ex.slug} (in ${w.name})`);
        }
      }
    }
  }
  assert.deepEqual([...missing], [], `unmapped exercises: ${[...missing].join("; ")}`);
});
```

- [ ] **Step 4: Run the resolver unit tests to verify they fail**

Run only the fixture-based tests (the integration test needs the post-export file shape, so exclude it here):

Run: `node --test --test-name-pattern="slugify|resolveExercise|formatExerciseTitle" workouts/exercises.test.js`
Expected: FAIL — the old `resolveExercise` slugifies `instance.name` (now undefined) and returns no `name`.

- [ ] **Step 5: Update `workouts/exercises.js`**

Replace `resolveExercise` and `formatExerciseTitle` with:

```js
// Resolve one workout-instance exercise (keyed by slug) against the catalog.
// Returns { name, videoSrc, mirror, tips } — videoSrc null means "placeholder".
export function resolveExercise(instance, catalog = EXERCISES) {
  const { slug, side } = instance;
  const entry = catalog[slug] || null;
  let videoSrc = null;
  let mirror = false;
  if (entry) {
    if (side === "Alternating") {
      videoSrc = entry.videoAlternating || entry.video || null;
    } else {
      videoSrc = entry.video || null;
      mirror = side === "Right" && Boolean(videoSrc);
    }
  }
  const name = entry ? entry.name : slug;
  const tips = (instance.tips ?? null) || (entry && entry.tips) || null;
  return { name, videoSrc, mirror, tips };
}

// Display title: catalog name plus a side suffix when the instance is sided.
export function formatExerciseTitle(instance, catalog = EXERCISES) {
  const entry = catalog[instance.slug];
  const name = entry ? entry.name : instance.slug;
  return instance.side ? `${name} · ${instance.side}` : name;
}
```

`slugify` itself stays (used by the seed/build-model) — keep it exported unchanged.

- [ ] **Step 6: Run the resolver unit tests to verify they pass**

Run: `node --test --test-name-pattern="slugify|resolveExercise|formatExerciseTitle" workouts/exercises.test.js`
Expected: PASS. (The `every active-workout…` integration test is excluded here — it runs in the full suite at Step 12, after the export.)

- [ ] **Step 7: Update `workouts/build-checklist.js` to resolve via the catalog**

The checklist reads `exercise.name`/`.tips` and detects Rest by name — all of which move to slug + catalog resolution. Change the imports and the inner loop so it (a) detects Rest by `slug === "rest"`, (b) resolves display `name`/`tips` from the catalog via `resolveExercise`. Add near the top:

```js
import { resolveExercise } from "./exercises.js";
```

Change the signature to accept an optional catalog:

```js
export function buildChecklist(workout, catalog) {
```

Replace the `circuit.exercises.forEach(...)` body's Rest check and item push with:

```js
        circuit.exercises.forEach((exercise, exIndex) => {
          if (exercise.slug === "rest") {
            if (typeof exercise.repCount === "number") {
              restSeconds.push(exercise.repCount);
            }
            return;
          }
          const { name, tips } = resolveExercise(exercise, catalog);
          items.push({
            id: `p${phaseIndex}c${circuitIndex}r${round}e${exIndex}`,
            name,
            repCount: exercise.repCount,
            tips,
            side: exercise.side,
          });
          totalItems += 1;
        });
```

(When `catalog` is undefined — the app calls `buildChecklist(selectedWorkout)` with no second arg — `resolveExercise` falls back to the real `EXERCISES`, so the app call site is unchanged.)

- [ ] **Step 8: Rewrite `workouts/build-checklist.test.js` to slug + a catalog fixture**

Overwrite it with:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChecklist } from "./build-checklist.js";

const CATALOG = {
  a: { name: "A", tips: "", video: null },
  b: { name: "B", tips: "", video: null },
  c: { name: "C", tips: "", video: null },
  d: { name: "D", tips: "", video: null },
  e: { name: "E", tips: "", video: null },
  f: { name: "F", tips: "", video: null },
  "forward-lunge": { name: "Forward Lunge", tips: "", video: null },
  "sumo-squat": { name: "Sumo Squat", tips: "", video: null },
};

const fixture = {
  name: "Test Workout",
  phases: [
    { name: "Warm Up", circuits: [{ repeatCount: 1, exercises: [{ slug: "a", repCount: "8" }, { slug: "b", repCount: "10" }] }] },
    { name: "Superset 1", circuits: [{ repeatCount: 2, exercises: [{ slug: "c", repCount: "8", tips: "keep back flat" }, { slug: "rest", repCount: 30 }, { slug: "d", repCount: "6" }] }] },
    { name: "Mini Circuits", circuits: [{ repeatCount: 1, exercises: [{ slug: "e", repCount: "12" }] }, { repeatCount: 1, exercises: [{ slug: "f", repCount: "12" }] }] },
  ],
};

test("totalItems counts checkable items, excluding Rest", () => {
  assert.equal(buildChecklist(fixture, CATALOG).totalItems, 8);
});

test("one set per phase, with stable ids and names", () => {
  const { sets } = buildChecklist(fixture, CATALOG);
  assert.equal(sets.length, 3);
  assert.deepEqual(sets.map((s) => s.id), ["p0", "p1", "p2"]);
  assert.deepEqual(sets.map((s) => s.name), ["Warm Up", "Superset 1", "Mini Circuits"]);
});

test("single-round circuit exposes one round; multi-round flags multiRound", () => {
  const { sets } = buildChecklist(fixture, CATALOG);
  assert.equal(sets[0].groups[0].multiRound, false);
  assert.equal(sets[0].groups[0].rounds.length, 1);
  assert.equal(sets[1].groups[0].multiRound, true);
  assert.equal(sets[1].groups[0].rounds.length, 2);
});

test("Rest is excluded from items but sets a restCaption on the set", () => {
  const { sets } = buildChecklist(fixture, CATALOG);
  const round1 = sets[1].groups[0].rounds[0];
  assert.deepEqual(round1.items.map((i) => i.name), ["C", "D"]);
  assert.equal(sets[1].restCaption, "Rest ~30s");
  assert.equal(sets[0].restCaption, null);
});

test("item ids embed phase/circuit/round/original-exercise index; tips resolve", () => {
  const { sets } = buildChecklist(fixture, CATALOG);
  const round1 = sets[1].groups[0].rounds[0];
  assert.deepEqual(round1.items.map((i) => i.id), ["p1c0r1e0", "p1c0r1e2"]);
  assert.equal(round1.items[0].tips, "keep back flat"); // instance override wins
  assert.equal(round1.items[1].tips, null); // no override, empty catalog tips -> null
});

test("restCaption summarizes a single rest value vs. mixed values", () => {
  const mixed = {
    name: "W",
    phases: [{ name: "P", circuits: [{ repeatCount: 1, exercises: [
      { slug: "a", repCount: "8" }, { slug: "rest", repCount: 30 }, { slug: "b", repCount: "8" }, { slug: "rest", repCount: 60 },
    ] }] }],
  };
  assert.equal(buildChecklist(mixed, CATALOG).sets[0].restCaption, "Rest as prescribed");
});

test("multiple circuits in a phase flag multiCircuit", () => {
  const { sets } = buildChecklist(fixture, CATALOG);
  assert.equal(sets[2].multiCircuit, true);
  assert.equal(sets[2].groups.length, 2);
  assert.deepEqual(sets[2].groups.map((g) => g.id), ["p2c0", "p2c1"]);
  assert.equal(sets[0].multiCircuit, false);
});

test("build-checklist carries the side onto items", () => {
  const wk = {
    name: "Sided",
    phases: [{ name: "P", circuits: [{ repeatCount: 1, exercises: [
      { slug: "forward-lunge", repCount: "8", side: "Left" },
      { slug: "sumo-squat", repCount: "10" },
    ] }] }],
  };
  const { sets } = buildChecklist(wk, CATALOG);
  const items = sets[0].groups[0].rounds[0].items;
  assert.equal(items[0].side, "Left");
  assert.equal(items[1].side, undefined);
});
```

Run: `node --test workouts/build-checklist.test.js`
Expected: PASS (this file's fixtures are self-contained, independent of the export).

- [ ] **Step 8b: Update the app's Rest check in `workout-app.jsx`**

At `workout-app.jsx:88`, change `isRest: exercise.name === "Rest",` to `isRest: exercise.slug === "rest",`.

- [ ] **Step 9: Point the catalog header at the new exporter**

In `scripts/lib/emit-catalog.mjs`, change the two header comment lines inside `serializeCatalog` from the `generate-catalog.mjs` wording to:

```js
  return `// GENERATED FILE — regenerate with \`npm run db:export\`.
// Source of truth is the exercise DB (data/data.sql); edit there, not here.
export const EXERCISES = {
```

- [ ] **Step 10: Run the real export**

Run: `npm run db:export`
Expected: `Exported 16 workouts + exercises.data.js from the DB.`

- [ ] **Step 11: Inspect the reshape diff**

Run: `git status --short workouts/`
Expected: all 16 active `workouts/*.js` modified (instances now `{ slug, side?, repCount }`) plus `workouts/exercises.data.js` modified (the 4 orphans removed: banded-crab-walk, curl-and-press, runner-hop, superman-pull-down).

Run:

```bash
git diff workouts/exercises.data.js | grep '^-' | grep -E 'banded-crab-walk|curl-and-press|runner-hop|superman-pull-down' | wc -l
```

Expected: `4` (each orphan line removed).

- [ ] **Step 12: Neutralize the retired bootstrap `scripts/generate-catalog.mjs`**

Replace the entire file contents with a stub that fails loudly (it would otherwise crash on slug-shaped instances):

```js
// DEPRECATED — retired 2026-09-02. This was the one-time bootstrap that derived
// workouts/exercises.data.js from the active workouts. The exercise DB is now
// the source of truth: edit data/data.sql (or data/exercises.db) and run
// `npm run db:export`. Running this script would crash on slug-shaped instances.
console.error("generate-catalog.mjs is retired. Use `npm run db:export` (source: data/data.sql).");
process.exit(1);
```

- [ ] **Step 13: Run the whole test suite (integration test now valid post-export)**

Run: `npm test`
Expected: all `node --test` files pass — including the `every active-workout exercise resolves` integration test in `workouts/exercises.test.js`, which is correct only now that the workout files are slug-shaped.

- [ ] **Step 14: Verify the app builds and renders**

Run: `npm run build`
Expected: Vite build succeeds with no unresolved-import or reference errors.

Then start the dev server and confirm a workout steps through exercises with names, tips, and video/placeholder; that the **checklist view** lists items with names (Rest excluded, shown as a caption); and that Rest still counts down in the runner. Use the preview tools (`preview_start` with the dev config, name `app`, then navigate to `http://localhost:5173/?variant=equestrian`), load a workout, and read the exercise title + tips off the page.

- [ ] **Step 15: Commit**

```bash
git add scripts/export-app.mjs package.json workouts/exercises.js workouts/exercises.test.js workouts/build-checklist.js workouts/build-checklist.test.js workout-app.jsx scripts/lib/emit-catalog.mjs scripts/generate-catalog.mjs workouts/*.js
git commit -m "feat(db): export app files from the DB; app references exercises by slug"
```

---

## Task 8: CSV → DB workout importer

Keep CSV authoring working end to end. The importer parses a workout CSV, links its exercises to existing DB rows **by slug** (an unknown movement is a hard error — add it via SQL first), splices the workout into the model (add, or replace an existing slug in place), rewrites `data/data.sql`, rebuilds the `.db`, and re-exports the app files. New *exercises* stay a deliberate SQL insert; new *workouts* stay a CSV drop.

**Files:**
- Create: `scripts/lib/read-model.mjs`
- Create: `scripts/lib/read-model.test.mjs`
- Create: `scripts/lib/import-model.mjs`
- Create: `scripts/lib/import-model.test.mjs`
- Create: `scripts/import-workout.mjs`
- Modify: `package.json` (add `db:import`)
- Modify: `.claude/skills/update-workouts/scripts/generate-workout.mjs` (deprecate)
- Modify: `.claude/skills/update-workouts/SKILL.md` (new flow)

- [ ] **Step 1: Write the failing test for `readModel` (DB → model round-trip)**

Create `scripts/lib/read-model.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/lib/read-model.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scripts/lib/read-model.mjs`**

```js
// Inverse of build-model's output: read the full relational model back out of a
// DB handle in the exact shape emit-data-sql consumes. Orderings are canonical
// (by id / PK), so a read -> emit round-trip reproduces data.sql unchanged.
export function readModel(db) {
  return {
    exercises: db.prepare("SELECT id, slug, name, tips, video, video_alternating FROM exercises ORDER BY id").all(),
    workouts: db.prepare("SELECT id, slug, name, difficulty, description FROM workouts ORDER BY id").all(),
    workoutAudiences: db.prepare("SELECT workout_id, audience FROM workout_audiences ORDER BY workout_id, audience").all(),
    workoutExercises: db
      .prepare(
        `SELECT workout_id, exercise_id, phase_name, phase_pos, circuit_pos, rounds, exercise_pos, rep_count, side, tips
         FROM workout_exercises ORDER BY workout_id, phase_pos, circuit_pos, exercise_pos`,
      )
      .all(),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/lib/read-model.test.mjs`
Expected: PASS.

- [ ] **Step 5: Write the failing test for `applyWorkout` (splice add/replace)**

Create `scripts/lib/import-model.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildModel } from "./build-model.mjs";
import { applyWorkout } from "./import-model.mjs";

const CATALOG = {
  "row": { name: "Row", tips: "", video: null },
  "curtsy-lunge": { name: "Curtsy Lunge", tips: "", video: null, videoAlternating: null },
};
const base = buildModel(CATALOG, [
  { slug: "a", workout: { name: "A", audiences: ["run"], difficulty: "easier", description: "", phases: [{ name: "C1", circuits: [{ repeatCount: 1, exercises: [{ name: "Row", repCount: "8" }] }] }] } },
]);

test("applyWorkout appends a new workout with the next id", () => {
  const newWorkout = { name: "B", audiences: ["equestrian"], difficulty: "harder", phases: [{ name: "C1", circuits: [{ repeatCount: 2, exercises: [{ name: "Curtsy Lunge", side: "Left", repCount: "6-8" }] }] }] };
  const m = applyWorkout(base, { slug: "b", workout: newWorkout });
  assert.equal(m.workouts.length, 2);
  const b = m.workouts.find((w) => w.slug === "b");
  assert.equal(b.id, 2);
  assert.equal(m.workoutExercises.filter((j) => j.workout_id === 2).length, 1);
  assert.deepEqual(m.workoutAudiences.filter((a) => a.workout_id === 2), [{ workout_id: 2, audience: "equestrian" }]);
});

test("applyWorkout replaces an existing slug in place, reusing its id and dropping old rows", () => {
  const replacement = { name: "A2", audiences: ["run", "equestrian"], difficulty: "moderate", phases: [{ name: "C1", circuits: [{ repeatCount: 3, exercises: [{ name: "Curtsy Lunge", side: "Right", repCount: "10" }] }] }] };
  const m = applyWorkout(base, { slug: "a", workout: replacement });
  assert.equal(m.workouts.length, 1);
  assert.equal(m.workouts[0].id, 1);
  assert.equal(m.workouts[0].name, "A2");
  const joins = m.workoutExercises.filter((j) => j.workout_id === 1);
  assert.equal(joins.length, 1);
  assert.equal(joins[0].side, "Right");
});

test("applyWorkout throws on an unknown exercise", () => {
  const bad = { name: "C", audiences: [], difficulty: "easier", phases: [{ name: "C1", circuits: [{ repeatCount: 1, exercises: [{ name: "Nope", repCount: "5" }] }] }] };
  assert.throws(() => applyWorkout(base, { slug: "c", workout: bad }), /Nope/);
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `node --test scripts/lib/import-model.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `scripts/lib/import-model.mjs`**

```js
// Add or replace a workout in a model (pure). Matches by slug: an existing slug
// is replaced in place (same id, its old rows dropped); a new slug is appended
// with the next id. Links exercises by slug via buildWorkoutRows (throws on an
// unknown movement). A previously-filled description is preserved on replace.
import { buildWorkoutRows } from "./build-model.mjs";

export function applyWorkout(model, { slug, workout }) {
  const idBySlug = new Map(model.exercises.map((e) => [e.slug, e.id]));
  const existing = model.workouts.find((w) => w.slug === slug);
  const workout_id = existing ? existing.id : Math.max(0, ...model.workouts.map((w) => w.id)) + 1;
  const description = workout.description ?? (existing ? existing.description : "");
  const { workout: wRow, audiences, joins } = buildWorkoutRows({ ...workout, description }, { slug, workout_id, idBySlug });

  const dropSelf = (rows) => rows.filter((r) => r.workout_id !== workout_id);
  return {
    exercises: model.exercises,
    workouts: model.workouts.filter((w) => w.id !== workout_id).concat(wRow).sort((a, b) => a.id - b.id),
    workoutAudiences: dropSelf(model.workoutAudiences).concat(audiences).sort((a, b) => a.workout_id - b.workout_id || a.audience.localeCompare(b.audience)),
    workoutExercises: dropSelf(model.workoutExercises).concat(joins).sort((a, b) => a.workout_id - b.workout_id || a.phase_pos - b.phase_pos || a.circuit_pos - b.circuit_pos || a.exercise_pos - b.exercise_pos),
  };
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `node --test scripts/lib/import-model.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 9: Implement the CLI `scripts/import-workout.mjs` and add the npm script**

```js
#!/usr/bin/env node
// Import a workout CSV into the exercise DB, then regenerate the app files.
// New workouts reference EXISTING exercises; a movement not yet in the DB is a
// hard error (add it to data/data.sql via SQL first, then re-run).
//
//   node scripts/import-workout.mjs \
//     --csv "/path/RiderBuild1_Green.csv" \
//     --name "Rider Build 1" --slug rider-build-1 \
//     --audience equestrian [--difficulty harder]
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parseWorkoutCsv } from "../workouts/parse-csv.js";
import { openDb, buildDbFile } from "./lib/db.mjs";
import { readModel } from "./lib/read-model.mjs";
import { applyWorkout } from "./lib/import-model.mjs";
import { emitDataSql } from "./lib/emit-data-sql.mjs";
import { runExport } from "./export-app.mjs";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const csv = arg("--csv");
const name = arg("--name");
const slug = arg("--slug");
const audienceArg = arg("--audience");
let difficulty = arg("--difficulty");

if (!csv || !name || !slug || !audienceArg) {
  console.error('Missing args. Need --csv --name --slug --audience [--difficulty]\n' +
    'Example: --csv ./RiderBuild1_Green.csv --name "Rider Build 1" --slug rider-build-1 --audience equestrian');
  process.exit(1);
}

const audiences = audienceArg.split(",").map((s) => s.trim()).filter(Boolean);
if (!difficulty) {
  const f = basename(csv).toLowerCase();
  difficulty = f.includes("green") ? "easier" : f.includes("yellow") ? "moderate" : f.includes("red") ? "harder" : "moderate";
}

const parsed = parseWorkoutCsv(readFileSync(csv, "utf8"), name);
const workout = { name: parsed.name, audiences, difficulty, phases: parsed.phases };

const db = openDb();
const model = readModel(db);
db.close();

let next;
try {
  next = applyWorkout(model, { slug, workout });
} catch (e) {
  console.error(`\n${e.message}\n\nAdd the missing exercise to data/data.sql (INSERT INTO exercises …), rebuild, and re-run.`);
  process.exit(1);
}

writeFileSync(resolve("data/data.sql"), emitDataSql(next));
buildDbFile(resolve("data/exercises.db"));
const n = runExport();

console.log(`Imported "${name}" (slug ${slug}, ${difficulty}, audiences: ${audiences.join(", ")}) → data/data.sql; re-exported ${n} workouts.`);
console.log("If this is a NEW workout, add it to workouts/index.js (import + WORKOUTS entry), then verify in the app.");
```

In `package.json` `"scripts"`, add:

```json
    "db:import": "node scripts/import-workout.mjs",
```

(Invoke as `npm run db:import -- --csv … --name … --slug … --audience …`.)

- [ ] **Step 10: Deprecate the old generator `.claude/skills/update-workouts/scripts/generate-workout.mjs`**

Replace the entire file contents with:

```js
#!/usr/bin/env node
// DEPRECATED — the exercise DB is now the source of truth for workouts.
// Use the importer, which writes to the DB and regenerates the app files:
//   node scripts/import-workout.mjs --csv <file> --name "<Name>" --slug <slug> --audience <key>[,<key>] [--difficulty <d>]
console.error("generate-workout.mjs is retired. Use: node scripts/import-workout.mjs (see .claude/skills/update-workouts/SKILL.md).");
process.exit(1);
```

- [ ] **Step 11: Update `.claude/skills/update-workouts/SKILL.md` to the DB flow**

Make these concrete edits:

1. Replace the data-flow diagram (the fenced block under "## The data flow at a glance") with:

```
Katie's CSV ──parseWorkoutCsv()──▶ { name, phases } ──import-workout.mjs──▶ data/data.sql (DB) ──db:export──▶ workouts/<slug>.js + exercises.data.js ──register──▶ workouts/index.js
```

   And replace the sentence beginning "Nothing in the repo calls it at runtime…" with: "The exercise DB (`data/data.sql`) is the source of truth. `scripts/import-workout.mjs` parses the CSV, links exercises by slug, writes the workout into the DB, and re-exports the app files. New exercises are a deliberate SQL insert; the importer errors on any movement not already in the DB."

2. Replace the "### 1. Generate the file" command block with:

```bash
npm run db:import -- \
  --csv "/Users/katie/Downloads/RiderBuild1_Green.csv" \
  --name "Rider Build 1" \
  --slug rider-build-1 \
  --audience equestrian
```

   Note under it: `--slug` is the workout's stable key / filename stem (e.g. `runner-single-leg-sandwiches-1`) — it is **not** always `slugify(name)` because of the audience prefix, so pass it explicitly. Multiple audiences: `--audience run,equestrian`.

3. Replace section "### 4. Regenerate the exercise catalog" (the `generate-catalog.mjs` block and its bullets) with:

```markdown
### 4. New movements

The importer **errors** if the CSV uses a movement not already in the DB (it will
not invent an exercise). If that happens, add the exercise to `data/data.sql`
(`INSERT INTO exercises (id, slug, name, tips, video, video_alternating) VALUES …`
— next free id, slug via the app's `slugify`), then re-run the import. The
exporter regenerates `workouts/exercises.data.js` (the app catalog) automatically;
a new exercise with `video` NULL renders the placeholder until a clip is filmed —
tell Katie which movement(s) need one. `docs/exercise-todo.md` no longer applies.
```

4. In "### 2. Replacing an existing workout", note that replacing **in place** (same slug) needs no file delete and no `index.js` change — `npm run db:import` with the existing `--slug` overwrites the DB rows and re-exports. Only a slug *change* needs the old `index.js` entry removed.

5. In the Quick checklist, replace the two lines mentioning `generate-workout.mjs` and `generate-catalog.mjs` with:
   - `[ ] Ran npm run db:import with the right --slug and --audience (and --difficulty if no color token)`
   - `[ ] If the importer errored on an unknown movement, added the exercise to data/data.sql and reported the needed clip to Katie`

- [ ] **Step 12: Run the importer tests and commit**

Run: `node --test scripts/lib/read-model.test.mjs scripts/lib/import-model.test.mjs`
Expected: PASS.

```bash
git add scripts/lib/read-model.mjs scripts/lib/read-model.test.mjs scripts/lib/import-model.mjs scripts/lib/import-model.test.mjs scripts/import-workout.mjs package.json .claude/skills/update-workouts/scripts/generate-workout.mjs .claude/skills/update-workouts/SKILL.md
git commit -m "feat(db): add CSV→DB workout importer; retire direct .js generation"
```

---

## Task 9: End-to-end determinism and final verification

Prove the export is a deterministic fixpoint, the importer round-trips through the DB, and single-source edits propagate — then a final full check.

**Files:** none created; verification only.

- [ ] **Step 1: Verify a second export is a no-op (deterministic fixpoint)**

Run:

```bash
npm run db:export && git status --short workouts/
```

Expected: **empty output** — re-exporting from the same DB changes nothing. A non-empty diff means the exporter is non-deterministic; investigate before proceeding.

- [ ] **Step 2: Verify the gitignored `.db` rebuilds and is queryable**

`openDb()` (used by the exporter) always builds the DB in-memory from `data/schema.sql` + `data/data.sql`, so every export is a fresh rebuild. Confirm the ad-hoc `.db` artifact also rebuilds cleanly from the committed text:

```bash
node -e "import('./scripts/lib/db.mjs').then(({buildDbFile})=>buildDbFile('data/exercises.db'))"
sqlite3 data/exercises.db "SELECT count(*) FROM exercises;"
```

Expected: `90` (89 catalog + Rest). Do **not** run `npm run db:seed` here — post–Task 7 it would re-derive `data.sql` from the now-85-entry `exercises.data.js` and drop the 4 library-only exercises.

- [ ] **Step 3: Verify exercise-identity single-source propagates end to end**

Edit the canonical `data/data.sql` (change the `row` exercise's `tips` value to `ROUNDTRIP TEST`), re-export, and confirm the change reaches the app catalog:

```bash
npm run db:export
grep -c 'ROUNDTRIP TEST' workouts/exercises.data.js
```

Expected: `1` — one edit in the canonical source flowed to the app with no manual copy-paste. Then revert:

```bash
git checkout -- data/data.sql workouts/exercises.data.js
```

- [ ] **Step 4: Smoke-test the CSV importer against existing exercises**

Build a throwaway CSV that reuses movements already in the DB, import it under a temporary slug, and confirm it lands in `data.sql` and exports a working slug-shaped file:

```bash
printf 'Phase,Circuit,Rounds,Exercise,Side,RepCount,Tips\nWarm Up,1,2,Jump Squat,,8-10,\n,,,Rest,,30,\n' > /tmp/ztest.csv
npm run db:import -- --csv /tmp/ztest.csv --name "ZZ Import Test" --slug zz-import-test --audience run --difficulty easier
```

Expected: prints `Imported "ZZ Import Test" … re-exported N workouts.` Then verify the generated file references by slug and Rest is numeric:

```bash
grep -E '"slug": "jump-squat"|"slug": "rest"' workouts/zz-import-test.js
```

Expected: both lines present. Then confirm a re-import is idempotent (same CSV → no further diff):

```bash
npm run db:import -- --csv /tmp/ztest.csv --name "ZZ Import Test" --slug zz-import-test --audience run --difficulty easier
git status --short data/data.sql
```

Expected: **empty** (the second import changed nothing). Then revert the smoke test:

```bash
rm -f workouts/zz-import-test.js /tmp/ztest.csv
git checkout -- data/data.sql workouts/exercises.data.js
node -e "import('./scripts/lib/db.mjs').then(({buildDbFile})=>buildDbFile('data/exercises.db'))"
```

Also confirm the importer's unknown-exercise guard fires:

```bash
printf 'Phase,Circuit,Rounds,Exercise,Side,RepCount,Tips\nWarm Up,1,1,Totally Fake Move,,10,\n' > /tmp/zbad.csv
npm run db:import -- --csv /tmp/zbad.csv --name "ZZ Bad" --slug zz-bad --audience run; echo "exit=$?"
rm -f /tmp/zbad.csv && git checkout -- data/data.sql 2>/dev/null; true
```

Expected: a clear "unknown exercise" error and a non-zero exit; `data/data.sql` unchanged.

- [ ] **Step 5: Final full verification**

Run: `npm test && npm run lint && npm run build`
Expected: tests pass, lint clean, build succeeds.

- [ ] **Step 6: Confirm nothing stale references the retired scripts**

Run: `grep -rn "generate-catalog\|generate-workout" package.json scripts/ workouts/ .claude/skills/`
Expected: only the two deprecation stubs (`scripts/generate-catalog.mjs`, `.claude/skills/update-workouts/scripts/generate-workout.mjs`) — no `package.json` script and no live caller. The `update-workouts` SKILL.md should reference `db:import`, not the old scripts.

- [ ] **Step 7: Commit any verification-driven fixes**

```bash
git add -A
git commit -m "chore(db): verify deterministic export, importer round-trip, and single-source propagation"
```

---

## Notes for the implementer

- **`node:sqlite` is experimental** in Node 24 and prints an `ExperimentalWarning` on import. It is benign; do not add flags to silence it in committed scripts unless a test's output assertions require it.
- **The seed is a one-time bootstrap.** After Task 5, `data/data.sql` is canonical. Editing exercises/workouts means editing `data/data.sql` (or `data/exercises.db` then re-emitting) and running `npm run db:export` — never re-running `db:seed`, which re-derives from `exercises.data.js` and would drop the 4 library-only exercises.
- **`data/exercises.db` is gitignored.** Rebuild it any time with `node -e "import('./scripts/lib/db.mjs').then(({buildDbFile})=>buildDbFile('data/exercises.db'))"` or `npm run db:seed`.
- **Backend-ready seam:** all DB access goes through `scripts/lib/db.mjs`. A future hosted libSQL backend swaps that module; seed/export consumers are unaffected. Keep SQL standard (no SQLite-only extensions).
- **Known follow-ups (out of scope here):**
  - `scripts/publish-videos.mjs` currently writes video URLs into `exercises.data.js` directly; under the DB model it should update `data/data.sql` (the `video`/`video_alternating` columns) and re-export. Left as-is for now — existing URLs are already seeded, so nothing breaks until the next new clip is published.
  - The CSV importer (Task 8) covers new/replaced *workouts* that reuse existing exercises. Creating a new *exercise* is a deliberate `data/data.sql` SQL insert (the importer errors on an unknown movement, by design). A guided/tooled exercise-creation flow is a possible later convenience, not built here.
  - Dormant foundation `workouts/*.js` files are untouched and keep the old name-shaped format; reactivating one requires importing it into the DB (or seeding it) and re-exporting.
  - `scripts/lib/collect-required.mjs` and `scripts/lib/merge-catalog.mjs` are now unused (they served the retired generator); leave them or remove in a separate cleanup.
```
