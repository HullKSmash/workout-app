# Authoring guide

SetGo is a React + Vite single-page app, deployed on Vercel with no backend. This
guide is the reference for the content-authoring side of the app: workouts,
exercises, and their videos. It doesn't cover app code/UI changes — just how to
get a new or updated workout, exercise, or video clip in front of users.

Topic pages:

- [`workouts.md`](workouts.md) — the CSV → workout-file pipeline
- [`exercises.md`](exercises.md) — the exercise/video catalog
- [`videos.md`](videos.md) — publishing video clips

## Audience variants

The app serves three audiences from one codebase: **Runner Strength**, **Paul
Strength**, and **Equestrian Strength** (plus a `default` "SetGo" portal variant
that just links out to the other three). Each is configured in `variants.js` as
an entry in `VARIANTS`, keyed `run`, `paul`, `equestrian` (and `default`).

`resolveVariant()` (also in `variants.js`) picks the active variant at load time,
in this order:

1. A `?variant=<key>` query param, if it names a known variant — this is how you
   preview a variant locally (e.g. `http://localhost:5173/?variant=equestrian`).
2. The hostname prefix — `run.`, `paul.`, or `equestrian.` — for the deployed
   subdomains.
3. Otherwise, `VARIANTS.default` (the portal).

## Gating a workout to a variant

Every workout object carries an `audiences` array, e.g. `["equestrian"]`. A
variant only shows workouts whose `audiences` includes its own key (see the
`visibleWorkouts` filter in `workout-app.jsx`, which checks
`w.audiences?.some((a) => variant.audiences.includes(a))`). **A workout with no
`audiences` field shows up under no variant at all** — it silently disappears
from every variant's list. See [`workouts.md`](workouts.md) for how this field
gets set.

"Rider" is casual community shorthand for the equestrian audience — you'll see
workout names like "Rider Build 1" that map to `audiences: ["equestrian"]`. The
unambiguous brand name is "Equestrian" (as in "Equestrian Strength"); both terms
coexist intentionally in workout names vs. brand copy.

## Data model

```
Workout: { name, audiences[], difficulty, description, phases[] }
Phase:   { name, circuits[] }
Circuit: { repeatCount, exercises[] }
Exercise:{ name, side?, repCount, tips? }
```

- `Exercise.side` is `"Left"`, `"Right"`, or `"Alternating"` — omitted entirely
  for a bilateral (two-sided-at-once) movement.
- `Exercise.repCount` is a string (e.g. `"8-10"`, `"To Fatigue"`) or, for a
  `Rest` step, a number of seconds.
- `Exercise.tips` is a flat string, optional — the app reads it directly and
  shows it under an info icon on the exercise screen. It is **not** nested
  under any wrapper object.
- **Rest** is just an exercise with `name === "Rest"` and `repCount` = seconds.
  The workout screen renders it as a countdown ring and auto-advances when it
  hits zero, instead of showing exercise media.

Field order in the actual workout files follows the shape above: `name`,
`audiences`, `difficulty`, `description`, `phases`, and within each exercise
`name`, `side?`, `repCount`, `tips?`.

## Key files

- `workout-app.jsx` — the entire UI + logic (inline styles, no CSS modules).
  Resolves the variant, filters workouts by audience, and drives the
  library/landing/workout/complete screens.
- `variants.js` — the `VARIANTS` config and `resolveVariant()`.
- `workouts/index.js` — imports every workout file and exports the flat
  `WORKOUTS` array the app reads. A workout not imported/listed here doesn't
  exist as far as the app is concerned, even if its `.js` file is on disk.
- `workouts/*.js` — one file per workout, each `export default`-ing a `Workout`
  object in the shape above.
- `workouts/exercises.data.js` — the generated exercise/video catalog (slug →
  `{ name, tips, video, videoAlternating? }`). See
  [`exercises.md`](exercises.md).

## How a workout reaches a user

The core progression is:

**select workout → landing (details) → workout (step through exercises) →
complete.**

Concretely: the app's default screen for `run`/`paul`/`equestrian` (all three
have `library: true`) is a self-directed **library** list of that variant's
workouts, filterable by difficulty; tapping one goes to the **landing** screen
(name, description, difficulty badge, exercise/phase counts), then **Start
Workout** enters the **workout** screen, which steps through each exercise (or
a checklist view, depending on the user's view-mode preference) with a
segmented per-phase progress bar, and finishes on the **complete** screen.
Equestrian additionally exposes a secondary 12-week **schedule** view
(`schedule: true`) alongside the library. None of this — library, schedule, or
view-mode — changes how you author a workout; it's just how the same `Workout`
object gets displayed.

There is no backend and no persistence of workout *content* — the app reads
straight from `WORKOUTS`. (Per-user progress like the weekly count and
checklist state is saved to `localStorage`, which is a runtime concern, not an
authoring one.)

## Glossary

- **Foundation** — foundational full-body compound strength; the most frequent
  workout type.
- **Symmetry & Balance** — symmetry/balance-focused workouts.
- **Build** — hypertrophy-focused workouts.
- Newer workout families use descriptive names instead of this taxonomy, e.g.
  "Unilateral Sandwiches", "Mini Circuits", "Alternating Supersets".
- **Difficulty** (`easier` | `moderate` | `harder`) — shown as a colored badge
  on the landing screen; see [`workouts.md`](workouts.md) for how it's set.
- **Rider** — casual community term for an equestrian-audience workout (e.g.
  "Rider Build 1"). **Equestrian** — the brand name (e.g. "Equestrian
  Strength"). Both are used deliberately, in different contexts.
