# Exercise Database — Design

**Date:** 2026-07-07
**Revised:** 2026-09-01 — reworked for Path A after the exercise catalog
(`workouts/exercises.data.js`, PR #52) shipped. See "What changed since the
original design" below.
**Status:** Approved design (revised), ready for implementation plan

## Problem

Exercise definitions (canonical name, coaching tips, whether video exists) and
the workouts that use them are authored in spreadsheets and then re-typed into
other places — personal use, client handouts, and this app. There is no single
source of truth: changing an exercise's name, tip, or video status means editing
it everywhere it appears, and copies go stale.

PR #52 partly closed this **for the app**: `workouts/exercises.data.js` is now a
slug-keyed catalog (`{ slug: { name, tips, video, videoAlternating } }`) that is
the single source of truth for tips and video *within the app*. But that catalog
is app-only, it lives inside the app repo, it is a plain JS object (not
queryable), and it cannot hold an exercise that no app workout references. It
does not help the other consumers, and **workout structure** (phases, circuits,
rep counts, difficulty, descriptions) still lives as one hand/CSV-authored `.js`
file per workout — still a duplication and error surface.

The exercise and workout data is wanted for **purposes beyond this app** (client
handouts, personal use, future tooling), so the source of truth should be a
clean, reusable dataset — not an app-specific store.

## Goal

A single source of truth for exercises **and workouts** that:

- lets an exercise or workout be edited once and have every consumer stay
  correct,
- is queryable with real SQL (hand-editing rows / direct SQL is an accepted,
  even preferred, editing workflow),
- is owned locally and version-controlled (no SaaS dependency, no server),
- exports a **subset** of the data, reshaped, to this app — through a deliberate
  boundary, so the same source can later feed other outputs,
- has app workouts reference exercises by a **stable canonical key (the slug)**,
  not by re-typed display name — so a typo can't silently invent a duplicate
  exercise.

## Approach

A **SQLite database, living in this repo**, with text `.sql` files as the
git-tracked canonical form.

- `schema.sql` + `data.sql` (hand-edited text, committed to git) are the source
  of truth. Git history shows every exercise/workout change as a readable diff.
- A build script produces the queryable `exercises.db` from those text files.
  The `.db` is a build artifact and is **gitignored**.
- `data.sql` is edited like any other source file (or via direct SQL against the
  `.db`, then re-emitted), and the `.db` is rebuilt to query it.
- Use **standard SQLite (libSQL-compatible) SQL** — no exotic extensions — so
  the same schema and data can later be pushed to a hosted libSQL/Turso instance
  without a rewrite (see "Backend-ready, not backend-now" below).

The DB becomes the **upstream** source. The app's `workouts/*.js` **and**
`workouts/exercises.data.js` become **generated artifacts** the exporter writes.
`scripts/generate-catalog.mjs` — which built the catalog by walking the active
workouts — was a **one-time bootstrap**; once its output seeds the DB it is
retired, not run again. Data now flows DB → app, never workouts → catalog.

### Where it runs (build-time, not hosted)

The DB is a **local authoring tool**, not runtime infrastructure. It runs on the
developer's machine, in the same category as the CSV parser: you edit `data.sql`
(or the `.db` directly), rebuild, query, and re-export. **Nothing new is hosted.**
Vercel never sees the DB; the deployed app has **no backend** and keeps importing
the static `.js` files exactly as it does today. There is no new server, no
ongoing infra, and no runtime cost. A content change reaches production the
normal way — re-export, commit the regenerated `.js`, push, Vercel redeploys.

### Backend-ready, not backend-now

The exercise-DB problem doesn't need a backend, but the product roadmap
(accounts, workout history, access gating, program scheduling) eventually does.
This design deliberately keeps that door open **without building it now**:

- **SQLite-compatible engine** — a future hosted **libSQL/Turso** instance takes
  the same `schema.sql`/`data.sql`, so today's authoring work is *not throwaway*;
  it migrates.
- **A single data-access seam** — build, query, and export all go through one
  small DB-access module, so a future runtime API can swap the source (local
  `.db` → hosted libSQL over the network) without touching its consumers.

Building the backend *now* was considered and **deferred, not rejected**: it
would mean standing up a hosted DB + API and committing to an auth/architecture
before the features that justify it are designed. When those features arrive,
the migration is a known, low-friction step rather than a rewrite.

Rejected alternatives:

- **Structured JSON/YAML files** — great git history but tedious to hand-edit at
  ~150 exercises and no relational guarantees.
- **Airtable / NocoDB** — nicer grid editing, but a SaaS/hosting dependency and
  querying via their API rather than raw SQL. Not needed given direct SQL
  editing is an acceptable workflow.
- **Live `.db` as canonical (edit the binary directly)** — coarser git history
  (diff snapshots rather than readable rows). Rejected in favor of text-first.
- **Keeping `exercises.data.js` as the catalog source and building the DB only
  for workouts/handouts (Path B)** — leaves two stores of exercise identity that
  can drift, and no single SQL-queryable library. Rejected: the DB owns exercise
  identity outright and re-emits the catalog.

## Data Model

Normalization is what kills the duplication: exercise identity lives in one
place; per-workout details live on the join.

```sql
CREATE TABLE exercises (
  id                INTEGER PRIMARY KEY,   -- compact internal join key
  slug              TEXT NOT NULL UNIQUE,  -- canonical key: catalog key + video filename stem;
                                           --   the reference that crosses the export boundary
  name              TEXT NOT NULL,         -- canonical display name, single source of truth
  tips              TEXT,                  -- coaching note / commentary (universal default)
  video             TEXT,                  -- NULL = no primary clip yet
  video_alternating TEXT                   -- NULL = no alternating clip (used when side = 'Alternating')
  -- room to grow: muscle_group, equipment, modality, etc.
);

CREATE TABLE workouts (
  id          INTEGER PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,  -- stable key = the workout .js filename stem
  name        TEXT NOT NULL,
  difficulty  TEXT,                  -- easier | moderate | harder
  description TEXT
);

CREATE TABLE workout_audiences (
  workout_id  INTEGER NOT NULL REFERENCES workouts(id),
  audience    TEXT NOT NULL,         -- 'equestrian' | 'run' | 'paul' (app selection key)
  PRIMARY KEY (workout_id, audience)
  -- a workout may target multiple audiences; none do today, but the model allows it
);

CREATE TABLE workout_exercises (
  workout_id   INTEGER NOT NULL REFERENCES workouts(id),
  exercise_id  INTEGER NOT NULL REFERENCES exercises(id),
  phase_name   TEXT NOT NULL,      -- 'Warm Up', 'Circuit 1', 'Core Finisher'…
  phase_pos    INTEGER NOT NULL,   -- phase order within the workout
  circuit_pos  INTEGER NOT NULL,   -- which circuit within the phase
  rounds       INTEGER NOT NULL,   -- circuit repeatCount
  exercise_pos INTEGER NOT NULL,   -- exercise order within the circuit
  rep_count    TEXT NOT NULL,      -- '6-8', 'To Fatigue', or seconds for Rest
  side         TEXT,               -- NULL = bilateral | 'Left' | 'Right' | 'Alternating'
  tips         TEXT                -- OPTIONAL per-workout override; NULL = use exercises.tips
);
```

Placement rules:

- **`rep_count`, `side` live on the join** — they vary per workout instance
  ("6-8" here, "8-10" there; sided vs bilateral).
- **`slug` / `name` / `tips` / `video` / `video_alternating` live on
  `exercises`** — change once, flows to every workout that references the
  exercise. This is the deduplication payoff.
- **`side` matters**: it selects the alternating clip and mirrors the Right
  clip, and it renders the title suffix. The original design omitted it; it is
  authoritative on the instance in the current app and must round-trip through
  the DB.
- **Tips are universal by default** (`exercises.tips`), with an **optional
  per-workout override** (`workout_exercises.tips`). The app resolver already
  supports this fallback (`instance.tips || catalog.tips`); PR #52 stripped all
  instance overrides, so the join seeds these as NULL, but the column is kept
  for the occasional audience-specific cue.

### Rest

`Rest` is a **reserved exercise** — one row with `slug = 'rest'`, `name =
'Rest'`. In the join its `rep_count` holds the number of seconds. This matches
the app, where Rest auto-counts down and advances. (The app's `isRest` check
moves from `name === "Rest"` to the slug.)

## The Export

This app is the **primary and only current consumer**, so the exporter's job is
simply "generate the app's files." Portability to future consumers (handouts,
personal use) is a *property of having clean relational data*, not something
engineered here. Only a **subset** of the library crosses into the app.

```
  data.sql  ──build──▶  exercises.db          ← full library (all exercises + workouts)
  (git source)          (queryable)
                            │
                            │  ← ABSTRACTION LAYER (export/selection query)
                            ▼
        workouts/*.js  +  workouts/exercises.data.js   ← subset the app reads,
        (generated)       (generated)                     reshaped into app format
```

- **Selection** is driven by `workout_audiences`: only workouts with at least
  one audience row, and only the exercises they reference, cross the boundary. An
  exercise no app workout uses stays in the library, invisible to the app. A
  multi-audience workout exports once with all its audiences in `audiences[]`.
- **Reshaping** produces two outputs:
  1. **`workouts/*.js`** — one file per app-bound workout, in the app's nested
     shape `{ name, audiences[], difficulty, description, phases[] → circuits[]
     (repeatCount) → exercises[] }`, where each exercise instance references the
     catalog **by slug** and carries `side?` and `repCount` (plus a `tips`
     override only when the join has one). Rest is emitted as the reserved
     instance.
  2. **`workouts/exercises.data.js`** — the catalog, regenerated from the
     `exercises` rows the selection reaches, in the exact shape/order the app
     imports today (`{ slug: { name, tips, video[, videoAlternating] } }`).

### App change (in scope for the plan, not built here)

Workout instances stop carrying the display name and carry the slug instead.
Touch points: `resolveExercise` looks up `catalog[instance.slug]` directly
(dropping the `slugify(name)` guess); `formatExerciseTitle` and the `isRest`
check read the resolved name / slug. This removes the last fragile coupling — a
mistyped exercise name in a workout can no longer silently miss the catalog.

### First exporter (in scope)

One exporter that queries app-bound workouts + their exercises and regenerates
both outputs above directly. It **writes the `.js` files directly** from the
query results — it does not emit CSV or route through `parse-csv.js` /
`generate-workout.mjs`. The DB is the authoritative source for app-bound
workouts, so the CSV import path is bypassed.

The regenerated `.js` are **committed to git** (not gitignored): they are what
the app imports and bundles at build time, so keeping them tracked leaves the
Vercel build unchanged and makes each data change reviewable as a plain `.js`
diff. Only the binary `.db` is gitignored.

### Deferred (explicitly out of scope for the first pass)

- **Workout CSV authoring path.** Katie will likely keep authoring workouts as
  a structured CSV/spreadsheet export. A future importer parses that file and
  **references existing exercises by name → slug**, treating an unknown name as
  an *error to fix*, never a new row (workouts reference data, they don't create
  it). New exercises are created deliberately, via direct SQL. Not engineered
  now.
- Client-handout PDFs and personal printouts — same DB, additional exporters
  later.

## Initial Seed

The seed is now a **direct import from the already-clean catalog**, not the
two-pass CSV-plus-reconciliation process the original design described. PR #52
already normalized names to singular and folded duplicate movements, so
`exercises.data.js` *is* the reconciled canonical exercise set.

1. **Seed `exercises`** from `workouts/exercises.data.js` — slug (the object
   key), name, tips, video, video_alternating map straight across. Add the
   reserved `rest` row.
2. **Seed `workouts` + `workout_exercises`** by parsing the current
   `workouts/*.js` files: workout metadata into `workouts`; each instance
   flattened into a join row
   (phase_name/phase_pos/circuit_pos/rounds/exercise_pos/rep_count/side).
3. **Link exercises by slug.** Each instance's name is slugified with the app's
   `slugify` and matched against the seeded `exercises`. Because names are
   already normalized, matches should be exact; **any unmatched slug is a hard
   error** (a typo or a missing exercise to resolve by hand), never a silent
   insert. This is the guard that keeps the seed honest — no elaborate
   near-match reconciliation report is needed.
4. **Emit `data.sql`** from the seeded model as the git-tracked canonical form.

## Files (anticipated)

- `data/schema.sql` — table definitions (canonical, git-tracked).
- `data/data.sql` — exercise + workout + join rows (canonical, git-tracked,
  hand-edited / direct-SQL-edited).
- `data/exercises.db` — build artifact, **gitignored**.
- Build script — `sqlite3 exercises.db < schema.sql < data.sql` (or equivalent).
- Seed/import tooling (catalog + workout `.js` → model → `data.sql`).
- App exporter (DB → `workouts/*.js` + `workouts/exercises.data.js`).

(Exact directory layout and script names to be settled in the implementation
plan.)

## What changed since the original design (2026-07-07)

- **Direction inverted, then re-inverted.** The original design had the DB as
  source exporting workouts. Master (PR #52) shipped the reverse — a catalog
  *derived from* workouts. Path A puts the DB back on top: `generate-catalog.mjs`
  is a spent bootstrap, and the DB now owns identity and re-emits the catalog.
- **Seed simplified.** The exercise-CSV parse and the near-match/unmatched
  reconciliation report (original Tasks 2–3) are dropped; the seed reads the
  already-deduped catalog and hard-errors on any unmatched slug.
- **Schema gained `slug`, `video_alternating`, and `side`.** The original had a
  single `video_url` and no `side`; both are load-bearing in the current app.
- **App references exercises by slug**, not by re-typed display name.
- **Catalog is now an export output.** The exporter regenerates
  `exercises.data.js` so it stays coherent with the DB.
- **Positioned as build-time, backend-ready.** Made explicit that nothing is
  hosted now and that a future backend is a migration (libSQL-compatible engine
  + a single data-access seam), not a rewrite. The app-primary framing trims the
  export from a multi-consumer abstraction down to "generate the app's files."

## Out of Scope

- Any hosted/server database, accounts, or multi-user access — **deferred, not
  precluded**: the engine and data-access seam are chosen so this becomes a
  migration when the roadmap calls for it (see "Backend-ready, not
  backend-now").
- The app reading directly from SQLite at runtime (it keeps reading `.js` files;
  the DB feeds them via export).
- The workout-CSV authoring importer (deferred, see above).
- Client-handout and personal-printout exporters.
- Grid/GUI editing tools.

## Success Criteria

- One canonical place to change an exercise's name, tip, or video status;
  rebuilding + re-exporting propagates the change to the app (both `workouts/*.js`
  and `exercises.data.js`) with no manual copy-paste.
- Workouts live in the DB and regenerate to `.js` that matches current app
  behavior; app workouts reference exercises by slug.
- The full library can be queried with SQL, and can hold exercises no app
  workout uses.
- A re-export immediately after a clean seed produces **no** git diff under
  `workouts/` (deterministic round-trip).
- The dataset is cleanly exportable for future non-app uses.
