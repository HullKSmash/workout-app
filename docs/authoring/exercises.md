# Authoring exercises (the video catalog)

See [`workouts.md`](workouts.md) for how a workout's exercise names get into
the app in the first place. This page covers the catalog that maps those
exercise names to display/video data, and [`videos.md`](videos.md) covers
getting actual clip files published.

## The catalog is generated, not hand-written

`workouts/exercises.data.js` is a **generated file** — regenerate it with
`node scripts/generate-catalog.mjs`, never hand-edit its structure directly
(the file itself is headed with this same warning). It exports `EXERCISES`,
an object keyed by slug:

```js
export const EXERCISES = {
  "bench-press": { name: "Bench Press", tips: "", video: null },
  "curtsy-lunge": { name: "Curtsy Lunge", tips: "", video: null, videoAlternating: null },
  ...
};
```

`workouts/exercises.js` is the hand-written module that owns the slug logic
and resolves one workout-instance exercise against this generated catalog
(`resolveExercise`, `formatExerciseTitle`) — that's the file to read/edit for
catalog *behavior*; `exercises.data.js` is just its data.

## Slug convention

`slugify(name)` in `workouts/exercises.js` turns a display name into its slug,
which is also **the video filename stem**:

```js
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/w\//g, "with ")
    .replace(/\//g, " ")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}
```

E.g. `"Curtsy Lunge"` → `curtsy-lunge`, and its clip files would be
`curtsy-lunge.mp4` / `curtsy-lunge-alt.mp4`.

## Fields on a catalog entry

- **`name`** — the display name (also used to derive the slug).
- **`tips`** — a catalog-level fallback coaching note (`""` if none). A
  workout instance's own `tips` (from the CSV `Tips` column) takes priority;
  the catalog's `tips` is only used when the instance doesn't have one
  (`resolvedTips = tips || (entry && entry.tips) || null` in
  `resolveExercise`).
- **`video`** — URL/path to the primary clip, or `null` if unfilmed (renders
  the placeholder).
- **`videoAlternating`** — only present on entries that need it (see below);
  URL/path to the alternating-side clip, or `null` if unfilmed.

## Side / Alternating handling

Whether an entry carries a `videoAlternating` field is driven by whether any
active workout instance uses that movement with `side: "Alternating"` (this is
what `hasAlt` means when the catalog is regenerated — see below), or the
catalog already had a filmed alternating clip for it, so a real clip is never
dropped just because no workout currently calls for it. At playback time,
`resolveExercise` picks the clip like this:

- `side === "Alternating"` → uses `entry.videoAlternating`, falling back to
  `entry.video` if there's no alternating clip.
- `side === "Right"` → uses `entry.video`, **mirrored** (`scaleX(-1)`) — there
  is no separate right-side clip file; one clip covers both left and
  (mirrored) right.
- `side === "Left"` or bilateral (no `side`) → uses `entry.video` unmirrored.

## Regenerating the catalog

```bash
node scripts/generate-catalog.mjs
```

This upserts `workouts/exercises.data.js` from the exercises the **active**
workouts (those actually exported by `workouts/index.js`) require:

- **Preserves** every hand-entered `tips`/`video`/`videoAlternating` value for
  movements still in use.
- **Adds** any movement referenced by an active workout that isn't in the
  catalog yet, with `video: null` (and `videoAlternating: null` if it's used
  with `side: "Alternating"`). Printed as `+ N new: <names>`.
- **Keeps, but warns about, orphans** — catalog entries no longer referenced
  by any active workout. They're left in the file untouched (in case the
  movement comes back), printed as `! N no longer used: <names>`. A sudden
  orphan is often a rename/typo worth double-checking rather than a real
  removal.

The output is re-sorted alphabetically by display name and re-serialized
(`scripts/lib/emit-catalog.mjs` is the sole owner of that generated-file
format — it's shared with the video-publish pipeline in
[`videos.md`](videos.md), so both stay in sync). The script is safe to re-run
any time; with no workout/exercise changes, the output is byte-identical.

## Coverage report

```bash
node scripts/exercise-coverage.mjs
```

Prints how many catalog movements have a primary clip, how many need an
alternating clip (and how many of those have one), and lists every movement
still missing a primary clip.

`generate-catalog.mjs` also rewrites `docs/exercise-todo.md` on every run — a
git**-ignored**, human-readable checklist of movements still needing a
primary and/or alternating clip. It's regenerated wholesale each time (don't
hand-edit it); treat it as the running to-do list for filming.
