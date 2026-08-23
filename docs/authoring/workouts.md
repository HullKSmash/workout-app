# Authoring workouts

See [`README.md`](README.md) for the data model and how a workout is displayed.
This page covers the lifecycle: spreadsheet → CSV → workout file → registered
in the app.

## 1. Author in the spreadsheet template

Katie authors workouts in a spreadsheet template, then exports it to CSV
(typically landing in `~/Downloads`, named like `RiderBuild1.csv` or with a
color token in the filename — see Difficulty below).

## 2. CSV columns

`workouts/parse-csv.js` (`parseWorkoutCsv(csvString, workoutName)`) expects a
header row followed by one row per exercise, with columns in this exact order:

```
Phase, Circuit, Rounds, Exercise, Side, RepCount, Tips
```

- **Phase** — filled only on the first row of a new phase; blank rows inherit
  the current phase.
- **Circuit** / **Rounds** — filled only on the first row of a new circuit.
  `Rounds` becomes the circuit's `repeatCount`. The circuit number itself is
  just a truthy "a new circuit starts here" signal — gaps in numbering are
  fine.
- **Exercise** — the movement name. The standalone conjunction "and" is
  automatically rendered as `&` (e.g. "Nordic and Curl" → "Nordic & Curl";
  word-boundaried, so it won't touch "Standing" or "Banded"). `Exercise ===
  "Rest"` becomes its own single-round rest circuit.
- **Side** — `L` / `R` / `A` (or the full words `Left`/`Right`/`Alternating`),
  blank for a bilateral movement. Normalized to `"Left"` / `"Right"` /
  `"Alternating"`; any other value throws an error at parse time.
- **RepCount** — a plain-digit cell (e.g. a Rest row's seconds) is parsed to a
  number; anything else (`"8-10"`, `"To Fatigue"`) stays a string as-is.
- **Tips** — a single free-text coaching note per exercise. A blank cell is
  omitted from the exercise entirely (no empty-string `tips`).

> **Historical note:** an older template used two columns, `Easier, Harder`
> (and a still-older one had them reversed as `Harder, Easier`, silently
> swapping them). Current CSVs and the parser use the single `Tips` column
> only. If you're handed a CSV with `Easier`/`Harder` headers, it predates the
> current format — confirm with Katie before importing it.

Always check the CSV's actual header row before importing — it tells you the
column order directly.

## 3. What the parser gives you (and what it doesn't)

`parseWorkoutCsv()` returns only:

```
{ name, phases: [ { name, circuits: [ { repeatCount, exercises: [...] }, ... ] }, ... ] }
```

Each parsed exercise is `{ name, side?, repCount, tips? }`.

This is **intentionally incomplete** — nothing in the repo calls
`parseWorkoutCsv()` at runtime, and the app/workout files require three more
top-level fields the parser never produces:

- **`audiences`** — required for the workout to show up under any variant at
  all (see [`README.md`](README.md#gating-a-workout-to-a-variant)).
- **`difficulty`** — `"easier" | "moderate" | "harder"`, shown as a badge.
- **`description`** — a string (commonly left `""` for Katie to fill in
  later).

## 4. Generate the workout file

Use the `update-workouts` skill's bundled script, `generate-workout.mjs`,
which imports `parse-csv.js` directly (so it always stays in sync with the
parser) and adds the three missing fields:

```bash
node .claude/skills/update-workouts/scripts/generate-workout.mjs \
  --csv "/Users/katie/Downloads/RiderBuild1_Green.csv" \
  --name "Rider Build 1" \
  --audience equestrian \
  --out workouts/rider-build-1.js
```

Run from the repo root — the script resolves `./workouts/parse-csv.js`
relative to the current working directory.

Flags:

- `--csv`, `--name`, `--audience`, `--out` — required. `--audience` is one of
  `run` / `paul` / `equestrian`.
- `--difficulty easier|moderate|harder` — optional override. Without it, the
  script **infers difficulty from the CSV filename's color token** — `green` →
  `easier`, `yellow` → `moderate`, `red` → `harder` — and falls back to
  `moderate` if no color token is found (see `DIFFICULTY_COLORS` in
  `workout-app.jsx`). The script prints the difficulty it chose; check it
  against the badge you expect.

The script writes the workout file with field order `name`, `audiences`,
`difficulty`, `description`, `phases`, and prints a spot-check: the first
exercise that has a `tips` value, so you can eyeball that the `Tips` column
landed on the right exercise (or a note if none did, which may mean the
column was empty).

## 5. Register (or replace) in `workouts/index.js`

**New workout:** add an `import` line and append the variable to the
`WORKOUTS` array in `workouts/index.js`. Variable name is the camelCase of the
slug (`rider-build-1.js` → `riderBuild1`). Keep related workouts grouped (e.g.
all equestrian ones together).

**Replacing a workout in place (same slug/filename):** just overwrite the
`.js` file — no `index.js` edit needed.

**Replacing with a new slug/filename:** delete the old file, remove its
`import` and its entry in the `WORKOUTS` array, then add the new one as above.
If you skip removing the old import, the build breaks.

## 6. Regenerate the exercise catalog

A new or edited workout may reference a movement not yet in the exercise
catalog. See [`exercises.md`](exercises.md) for `node
scripts/generate-catalog.mjs` — run it after any workout content change.

## 7. Verify

Start the dev server (`?variant=run|paul|equestrian` locally) and confirm the
workout appears in the list, its difficulty badge is correct, and stepping
into it renders exercise tips correctly. See the `update-workouts` skill's
verification steps for the full checklist.
