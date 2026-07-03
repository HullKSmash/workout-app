---
name: update-workouts
description: >-
  Use when Katie provides a workout CSV (typically exported from her spreadsheet
  template, e.g. files in ~/Downloads named like "RiderBuild1.csv") and wants to
  add it to a program or replace an existing workout in this workout-app repo.
  Trigger whenever the request involves importing/parsing a workout CSV, adding a
  new workout, or swapping out an existing workout definition — even if Katie
  doesn't mention the parser by name. Covers the whole flow: parse → add
  audiences → write the workout .js file → register in index.js → verify in the app.
---

# Updating workouts from CSV

Katie authors workouts in a spreadsheet, exports a CSV, and wants it turned into a
workout definition file the app loads. This skill captures the full pipeline,
including the non-obvious gotchas that will silently produce a broken or invisible
workout if missed.

## The data flow at a glance

```
Katie's CSV  ──parseWorkoutCsv()──▶  { name, phases }  ──add audiences/difficulty + write──▶  workouts/<slug>.js  ──register──▶  workouts/index.js
```

`workouts/parse-csv.js` exports `parseWorkoutCsv(csvString, workoutName) -> { name, phases }`.
Nothing in the repo calls it at runtime — generation is a manual, ad-hoc step. Use
the bundled script `scripts/generate-workout.mjs` to do it consistently.

## Why you can't just run the parser and stop

The parser's output is **incomplete on purpose** — it returns only `{ name, phases }`,
but the app and the existing workout files expect three more top-level fields:

1. **`audiences`.** The app filters `WORKOUTS` by audience (`workout-app.jsx`, the
   `availableWorkouts` filter). A workout with no `audiences` array shows up under
   **no** variant — it silently vanishes. Audience keys: `run`, `paul`,
   `equestrian`. "Rider" is community slang for the equestrian audience — a
   "Rider …" workout is `audiences: ["equestrian"]`.

2. **`difficulty`** (`"easier" | "moderate" | "harder"`) and **`description`**
   (a string; left `""` for Katie to fill later). Difficulty maps from the CSV
   filename color token — `green→easier`, `yellow→moderate`, `red→harder` (see
   `DIFFICULTY_COLORS` in `workout-app.jsx`). The landing screen shows this as a
   badge, so a wrong/missing value is visible.

The bundled script handles all three: it adds `audiences` from `--audience`,
infers `difficulty` from the CSV filename (override with `--difficulty`), and
writes `description: ""`. Output matches the existing workout files' shape.

**Tips stay flat.** The app reads `currentExercise.tips` directly (a flat property)
and renders it under an ℹ️ icon on the exercise screen. The parser emits `tips`
flat and omits it when the cell is blank. Do NOT nest it under a `modifications: {}`
or similar object — the app won't read it.

## CSV format reference

The parser destructures columns as
`Phase, Circuit, Rounds, Exercise, RepCount, Tips` — a **single `Tips` column**
(one coaching note per exercise). Check the CSV header line first; it tells you
the order directly.

> Historical note: an older template used two modifier columns
> (`Easier, Harder`) instead of `Tips`, and a still-older one had them reversed
> (`Harder, Easier`) which silently swapped them. Current CSVs use a single
> `Tips` column, and so does the parser. If you ever see `Easier`/`Harder` header
> columns, the CSV predates the current format — confirm with Katie before importing.

- Header row, then one row per exercise.
- `Phase` is filled only on the **first** row of each phase group (blank inherits).
- `Circuit` and `Rounds` are filled only on the **first** row of each circuit;
  `Rounds` becomes the circuit's `repeatCount`. The circuit *number* is just a
  truthy "new circuit starts here" flag — gaps in numbering (1,2,4,5…) are fine.
- A blank `Tips` cell is omitted from the exercise (no empty string).
- A `Rest` exercise (Exercise = "Rest") becomes its own single-round circuit with
  `repCount` = seconds. `RepCount` that is purely digits is parsed to a number;
  anything else (e.g. "8-10 per side", "To Fatigue") stays a string.

## Data model produced

```
Workout: { name, audiences: ["run"|"paul"|"equestrian"], difficulty, description, phases: [...] }
Phase:   { name, circuits: [...] }
Circuit: { repeatCount, exercises: [...] }
Exercise:{ name, repCount, tips? }   // repCount: string or number(seconds for Rest)
```

## Procedure

### 1. Generate the file

Run from the repo root (the script resolves `./workouts/parse-csv.js` relative to cwd):

```bash
node .claude/skills/update-workouts/scripts/generate-workout.mjs \
  --csv "/Users/katie/Downloads/RiderBuild1_Green.csv" \
  --name "Rider Build 1" \
  --audience equestrian \
  --out workouts/rider-build-1.js
```

- **Name**: match the existing convention — title case, e.g. "Rider Build 1",
  "Rider Symmetry & Balance 2". `&` is fine in display names. If Katie gives an
  explicit name, use it; if there's an obvious typo, correct it and mention it.
- **Filename**: kebab-case of the display name, e.g.
  `rider-symmetry-and-balance-1.js`. Read the spot-check output the script prints.
- **Difficulty**: inferred from the CSV filename color token (green/yellow/red).
  If the filename has no color token, pass `--difficulty easier|moderate|harder`;
  otherwise the script defaults to `moderate` and prints the value it chose —
  check it against the badge you expect.

### 2. Replacing an existing workout

If this CSV replaces an existing workout:
- Delete the old workout file (`rm workouts/<old-slug>.js`).
- Remove its import line and its entry in the `WORKOUTS` array in `index.js`.
- Then add the new one (below). If the slug changed, the old import must go or the
  build breaks.

### 3. Register in `workouts/index.js`

Add an `import` and append the variable to the `WORKOUTS` array. Variable name is
camelCase of the slug (`rider-build-1.js` → `riderBuild1`). Keep related workouts
grouped (e.g. all equestrian ones together) for readability.

### 4. Verify in the running app

Don't trust the file shape alone — confirm the workout actually appears and renders:

- Start the dev server via the preview tool, config name `app` (Vite, port 5173).
  `.claude/launch.json` defines it.
- Navigate to `http://localhost:5173/?variant=<key>` where key is `run`,
  `paul`, or `equestrian` (the `?variant=` query selects the variant locally;
  the bare URL shows the SetGo portal). Use `location.assign(url)` — a plain
  reload of the portal won't pick up the param.
- Confirm the new workout is in the list, the landing screen shows the expected
  **difficulty badge**, and the count reads a sensible "N exercises · M phases".
  Step into it (Start Workout) and confirm an exercise's **tip** renders under the
  ℹ️ icon with the right text — this is the real test that `tips` is flat and read.
- Stop the server when done.

## Quick checklist

- [ ] Checked CSV header is `…, RepCount, Tips` (single Tips column)
- [ ] Ran generate-workout.mjs with the right `--audience` (and `--difficulty` if no color token in the filename)
- [ ] Read the spot-check sample — the tip landed on the right exercise
- [ ] Confirmed the printed `difficulty` matches the expected badge
- [ ] Removed old file + its index.js entry (if replacing and the slug changed)
- [ ] Added import + WORKOUTS entry in index.js (skip if replacing in place — same slug)
- [ ] Verified in app under the correct `?variant=` (list, badge, and a tip render)
