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
Katie's CSV  ──parseWorkoutCsv()──▶  { name, phases }  ──add audiences + write──▶  workouts/<slug>.js  ──register──▶  workouts/index.js
```

`workouts/parse-csv.js` exports `parseWorkoutCsv(csvString, workoutName) -> { name, phases }`.
Nothing in the repo calls it at runtime — generation is a manual, ad-hoc step. Use
the bundled script `scripts/generate-workout.mjs` to do it consistently.

## Why you can't just run the parser and stop

The parser's output is **incomplete on purpose** — two things must be handled:

1. **It does NOT emit `audiences`.** The app filters `WORKOUTS` by audience
   (`workout-app.jsx`, the `availableWorkouts` filter). A workout with no
   `audiences` array shows up under **no** variant — it silently vanishes. You
   must add it. Audience keys: `run`, `paul`, `equestrian`. "Rider" is community
   slang for the equestrian audience — a "Rider …" workout is `audiences: ["equestrian"]`.

2. **Modifiers must stay flat.** The app reads `currentExercise.easier` and
   `currentExercise.harder` directly (flat properties). The parser correctly emits
   them flat. Do NOT nest them under a `modifications: {}` object — older files did
   that, and the app never read it, so those tips silently fell back to defaults.
   The bundled script keeps them flat; don't "tidy" them into a nested shape.

The bundled script handles both: it adds `audiences` and preserves the flat
modifiers. Output matches the existing workout files' shape.

## Column-order gotcha (verify every time)

The parser destructures CSV columns as:
`Phase, Circuit, Rounds, Exercise, RepCount, Easier, Harder` — **Easier before Harder**.

Katie's older template had these two reversed (`Harder, Easier`), which makes the
parser silently **swap** the tips (your "easier" text ends up as "harder"). She
fixed the template to `Easier, Harder` (as of 2026-05), so current exports parse
correctly — but always confirm. The script prints a "Spot-check modifier mapping"
sample (first exercise that has both tips). Read it: the *easier* text should
genuinely be the easier variation. If they're swapped, the CSV's columns are in
the old order — fix the CSV header order (or swap in post) before trusting output.

Check the header line of the CSV first; it tells you the order directly.

## CSV format reference

- Header row, then one row per exercise.
- `Phase` is filled only on the **first** row of each phase group (blank inherits).
- `Circuit` and `Rounds` are filled only on the **first** row of each circuit;
  `Rounds` becomes the circuit's `repeatCount`. The circuit *number* is just a
  truthy "new circuit starts here" flag — gaps in numbering (1,2,4,5…) are fine.
- Blank `Easier`/`Harder` cells are omitted from the exercise (no empty strings).
- A `Rest` exercise (Exercise = "Rest") becomes its own single-round circuit with
  `repCount` = seconds. `RepCount` that is purely digits is parsed to a number;
  anything else (e.g. "8-10 per side") stays a string.

## Data model produced

```
Workout: { name, audiences: ["run"|"paul"|"equestrian"], phases: [...] }
Phase:   { name, circuits: [...] }
Circuit: { repeatCount, exercises: [...] }
Exercise:{ name, repCount, easier?, harder? }   // repCount: string or number(seconds for Rest)
```

## Procedure

### 1. Generate the file

Run from the repo root (the script resolves `./workouts/parse-csv.js` relative to cwd):

```bash
node .claude/skills/update-workouts/scripts/generate-workout.mjs \
  --csv "/Users/katie/Downloads/RiderBuild1.csv" \
  --name "Rider Build 1" \
  --audience equestrian \
  --out workouts/rider-build-1.js
```

- **Name**: match the existing convention — title case, e.g. "Rider Build 1",
  "Rider Symmetry & Balance 2". `&` is fine in display names. If Katie gives an
  explicit name, use it; if there's an obvious typo, correct it and mention it.
- **Filename**: kebab-case of the display name, e.g.
  `rider-symmetry-and-balance-1.js`. Read the spot-check output the script prints.

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
- Confirm the new workout is in the list with a sensible "N exercises · M phases"
  count. Optionally step into it (Start Workout → tap "Too hard? Too easy?") and
  confirm the Easier/Harder tips render with the right text — this is the real
  test that modifiers are flat and not swapped.
- Stop the server when done.

## Quick checklist

- [ ] Checked CSV header column order (Easier before Harder)
- [ ] Ran generate-workout.mjs with the right `--audience`
- [ ] Read the spot-check sample — easier/harder not swapped
- [ ] Removed old file + its index.js entry (if replacing)
- [ ] Added import + WORKOUTS entry in index.js
- [ ] Verified in app under the correct `?variant=`
