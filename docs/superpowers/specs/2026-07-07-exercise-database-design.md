# Exercise Database — Design

**Date:** 2026-07-07
**Status:** Approved design, ready for implementation plan

## Problem

Exercise definitions (canonical name, coaching tips/commentary, whether video
exists) currently live in a Google spreadsheet. Those same exercises are then
re-typed into other spreadsheets that hold workouts — for personal use, for
workouts handed to clients, and for this workout app. There is no single source
of truth: changing an exercise's name, tip, or video status means editing it in
every place it appears, and copies go stale.

The exercise data is also wanted for **other purposes beyond this app** (client
handouts, personal use, future tooling), so the source of truth should be a
clean, reusable dataset — not an app-specific store.

## Goal

A single source of truth for exercises that:

- lets an exercise be edited once and have every consumer stay correct,
- is queryable with real SQL (hand-editing rows directly is an accepted, even
  preferred, editing workflow),
- is owned locally and version-controlled (no SaaS dependency, no server),
- exports a **subset** of the data, reshaped, to this app — through a
  deliberate boundary, so the same source can later feed other outputs.

## Approach

A **SQLite database, living in this repo**, with text `.sql` files as the
git-tracked canonical form.

- `schema.sql` + `data.sql` (hand-edited text, committed to git) are the source
  of truth. Git history shows every exercise change as a readable diff.
- A build script produces the queryable `exercises.db` from those text files.
  The `.db` is a build artifact and is **gitignored**.
- `data.sql` is edited like any other source file, then the `.db` is rebuilt to
  query it.

Rejected alternatives:

- **Structured JSON/YAML files** — great git history but tedious to hand-edit at
  150 exercises and no relational guarantees.
- **Airtable / NocoDB** — nicer grid editing, but a SaaS/hosting dependency and
  querying via their API rather than raw SQL. Not needed given direct SQL
  editing is an acceptable workflow.
- **Live `.db` as canonical (edit the binary directly)** — coarser git history
  (diff snapshots rather than readable rows). Rejected in favor of text-first.

## Data Model

Normalization is what kills the duplication: exercise identity lives in one
place; per-workout details live on the join.

```sql
CREATE TABLE exercises (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,        -- canonical name, single source of truth
  tips       TEXT,                 -- coaching note / commentary (universal default)
  video_url  TEXT                  -- NULL = no video yet (doubles as has_video)
  -- room to grow: muscle_group, equipment, modality, etc.
);

CREATE TABLE workouts (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  audiences   TEXT,                -- 'equestrian' | 'run' | 'paul' (app selection key)
  difficulty  TEXT,                -- easier | moderate | harder
  description TEXT
);

CREATE TABLE workout_exercises (
  workout_id   INTEGER NOT NULL REFERENCES workouts(id),
  exercise_id  INTEGER NOT NULL REFERENCES exercises(id),
  phase        TEXT NOT NULL,      -- 'Warm Up', 'Circuit 1', 'Core Finisher'…
  circuit_pos  INTEGER NOT NULL,   -- which circuit within the phase
  rounds       INTEGER NOT NULL,   -- circuit repeatCount
  position     INTEGER NOT NULL,   -- exercise order within the circuit
  rep_count    TEXT NOT NULL,      -- '6-8 per side', 'To Fatigue', or seconds for Rest
  tips         TEXT                -- OPTIONAL per-workout override; NULL = use exercise.tips
);
```

Placement rules:

- **`rep_count` lives on the join** — it varies per workout ("6-8" here, "8-10"
  there).
- **`name` / `tips` / `video_url` live on `exercises`** — change once, flows to
  every workout that references the exercise. This is the deduplication payoff.
- **Tips are universal by default** (`exercises.tips`), with an **optional
  per-workout override** (`workout_exercises.tips`). Most tips travel with the
  exercise; the override exists for the occasional audience-specific cue. When
  the override is NULL, consumers fall back to `exercises.tips`.

### Rest

`Rest` is a **reserved exercise** (a single row with `name = 'Rest'`). In the
join, its `rep_count` holds the number of seconds. This matches the app, where
Rest is an exercise with `name === "Rest"` and `repCount` = seconds.

## The Abstraction Layer (Export)

The export step is the boundary between the full library and any single
consumer. Only a **subset** of the library crosses it.

```
  data.sql  ──build──▶  exercises.db          ← full library (all 150, everything)
  (git source)          (queryable)
                            │
                            │  ← ABSTRACTION LAYER (export/selection query)
                            ▼
                app workout files             ← subset: only app-relevant exercises,
                (what the app reads)             reshaped into the app's format
```

- **Selection** is driven by `workouts.audiences`: only exercises referenced by
  app-bound workouts (those with an audience) ever cross the boundary. An
  exercise no app workout uses stays in the library, invisible to the app.
- **Reshaping** turns the relational rows back into the app's nested shape:
  `{ name, audiences[], difficulty, description, phases[] → circuits[]
  (repeatCount) → exercises[] ({ name, repCount, tips? }) }`, where `tips` is the
  override if present else the exercise default.

### First exporter (in scope)

One exporter that queries app-bound workouts + their exercises and regenerates
the app's workout `.js` files directly (retiring the spreadsheet→CSV hop for
workouts). Output must match the existing `.js` shape consumed by
`workouts/index.js` and `workout-app.jsx`.

The exporter **writes the `.js` files directly** from the query results — it
does not emit CSV or route through the existing `parse-csv.js` /
`generate-workout.mjs` path. The DB is the new authoritative source for
app-bound workouts, so the CSV import path is bypassed rather than reused.

### Deferred (explicitly out of scope for the first pass)

- Client-handout PDFs.
- Personal printouts.

Same DB, additional exporters later. Not built now.

## Initial Seed

Populate the DB from current data as a **two-pass, tooled** process — not blind
automation (which would silently duplicate mis-named exercises) and not pure
hand-normalization upfront (which would be guesswork before knowing what
actually mismatches).

1. **Import exercises** from the exercise spreadsheet (CSV export) as the
   canonical `exercises` set.
2. **Parse existing workout `.js` files** and attempt to link each referenced
   exercise name to the canonical set.
3. **Emit a reconciliation report** in three buckets:
   - **Exact matches** — auto-linked, nothing to do.
   - **Near matches** — differ only by case / whitespace / punctuation (or close
     fuzzy match). Listed for a human to confirm as "same exercise → alias" or
     "actually different."
   - **Unmatched** — no candidate. A human decides: real new exercise, or a typo
     to fix.
4. **Resolve the report** (via an alias/mapping file or by fixing names).
5. **Final link** — re-run to produce a clean seed with no accidental
   duplicates.

## Files (anticipated)

- `data/schema.sql` — table definitions (canonical, git-tracked).
- `data/data.sql` — exercise + workout + join rows (canonical, git-tracked,
  hand-edited).
- `data/exercises.db` — build artifact, **gitignored**.
- Build script — `sqlite3 exercises.db < schema.sql < data.sql` (or equivalent).
- Seed/import + reconciliation tooling.
- App exporter (DB → workout `.js`).

(Exact directory layout and script names to be settled in the implementation
plan.)

## Out of Scope

- Any hosted/server database, accounts, or multi-user access.
- The app reading directly from SQLite at runtime (it keeps reading `.js` files;
  the DB feeds them via export). Could be revisited later.
- Client-handout and personal-printout exporters.
- Grid/GUI editing tools.

## Success Criteria

- One canonical place to change an exercise's name, tip, or video status;
  rebuilding + re-exporting propagates the change to the app with no manual
  copy-paste.
- The full library can be queried with SQL.
- The app's workout `.js` files can be regenerated from the DB and match the
  current app behavior.
- The exercise dataset is cleanly exportable for future non-app uses.
