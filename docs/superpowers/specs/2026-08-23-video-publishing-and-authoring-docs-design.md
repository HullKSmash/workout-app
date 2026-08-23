# Design: Exercise video publishing + authoring documentation

**Date:** 2026-08-23
**Status:** Approved (brainstorm), pending implementation plan

## Problem

The merged exercise video catalog (PR #23) settled how a video is *referenced* — each
catalog entry in `workouts/exercises.data.js` carries a `video` (and optional
`videoAlternating`) string that is handed straight to a `<video src>` element. It did
**not** settle where the video bytes physically live, nor how a finished clip gets from
Katie's hands into the catalog.

Two gaps to close:

1. **Storage + publish flow.** Real clips are about to exist. They need a home that keeps
   the git repo and the Vercel deploy bundle lean, and a low-ceremony way to get a clip
   from a staging area into the catalog and in front of users.
2. **Authoring documentation.** The knowledge of how to add/edit workouts and exercises
   currently lives in Katie's head and is periodically re-derived in conversation. It
   should be captured as durable, version-tracked reference docs.

## Non-goals

- No backend/compute. Serving an `.mp4` is static file delivery; the catalog already
  abstracts the location as an opaque string. Nothing moves off the front end.
- No file watcher / daemon. Publishing is a deliberate, manually-invoked command.
- No change to the runtime resolve logic (`resolveExercise`, mirroring, placeholder
  fallback) — that already works.

## Decisions (from brainstorm)

- **Storage:** Vercel Blob (already on Vercel; least-friction managed object store).
- **Trigger:** manual `npm run publish-videos`, run when clips are staged. No watcher.
- **Git target:** auto-commit the catalog change to a `video-drops` branch and open/update
  a PR; Katie merges to deploy. Keeps `master` clean per the "never commit directly to
  master" convention.
- **Staging location:** `~/exercise-clips` — **outside** the repo, so raw/curated clips
  never risk entering git and the repo stays lean.
- **Docs home:** `docs/authoring/` — a tracked folder (new `.gitignore` exception), able
  to grow into multiple focused pages.

---

## Component A — Video publish pipeline

### Storage

Vercel Blob store, **public access**. Clips are uploaded with `access: 'public'` and
served to the browser as a plain `<video src>` with no auth header — the no-backend design
requires publicly-readable URLs (a private store would need a backend to mint signed URLs).
The URLs carry an unguessable random suffix; this is the same posture as the existing
static-asset placeholder. `BLOB_READ_WRITE_TOKEN` is a **write** credential used only by
the publish script at publish time — it is not a read gate and never ships to the client.

One-time manual setup (Katie, account-level):

1. Create a **public** Blob store in the Vercel dashboard.
2. `vercel env pull` its `BLOB_READ_WRITE_TOKEN` into `.env.local` (already the gitignored
   secrets pattern in this repo).

`@vercel/blob` is added as a dependency.

### Staging

`~/exercise-clips/` (outside the repo). Katie drops **curated, correctly-named** clips
there. The deliberate act — placing an intentionally-named file into this folder — is the
control point; the command just mechanizes what follows.

Naming convention (already the catalog/`exercise-todo.md` convention — slug is the
filename stem):

- Primary clip: `<slug>.mp4` — e.g. `bench-press.mp4`
- Alternating variant: `<slug>-alt.mp4` — e.g. `curtsy-lunge-alt.mp4`

### `scripts/publish-videos.mjs`

Per run, for each staged clip:

1. **Validate** filename → slug. Strip an optional `-alt` suffix to decide
   primary vs `videoAlternating`. The slug **must** exist in the catalog; an unknown slug
   (typo, renamed exercise) is skipped with a loud warning so a mistyped name never
   silently creates a dead entry. An `-alt` clip whose catalog entry has no
   `videoAlternating` field is also flagged (the exercise isn't marked alternating).
2. **Upload** to Blob at a deterministic pathname (`exercises/<slug>.mp4`) with overwrite
   enabled, so re-dropping a better take replaces the file and keeps the URL stable.
3. **Patch** `workouts/exercises.data.js`: set `video` / `videoAlternating` for that slug
   to the returned Blob URL.
4. **Open/update PR:** commit only the catalog change to a `video-drops` branch, push, and
   open or update its PR. Runs in an **isolated git worktree** so Katie's main checkout and
   current branch are never disturbed — she can be mid-edit elsewhere. Uses the `gh` CLI
   (confirmed available, v2.94.0).
5. **Clear** processed clips from staging so the next run starts clean.

`npm run publish-videos` wraps the script. The flow end to end: stage clips →
`npm run publish-videos` → merge the PR → Vercel deploys → clips live.

### Shared serializer

The catalog-file writer currently lives inline in `scripts/generate-catalog.mjs`. Extract
it into a shared lib (e.g. `scripts/lib/emit-catalog.mjs`) so `generate-catalog.mjs` and
`publish-videos.mjs` write `exercises.data.js` identically — no formatting churn, no drift
between the two entry points.

### Idempotency & safety

- Re-running with the same clips: Blob overwrite + same URL → catalog unchanged → no-op
  commit (nothing to PR).
- Unknown/invalid filenames never mutate the catalog.
- Git work is quarantined to a worktree; the main working tree is untouched.
- The video **file** is live in Blob on upload, but the app only *points* at it via the
  bundled catalog, so nothing is user-visible until the PR merges and Vercel deploys — a
  natural review gate.

---

## Component B — Authoring guide (`docs/authoring/`)

New tracked folder (`.gitignore` gains `!docs/authoring/`). Focused pages covering all
four requested areas:

- **`README.md`** — the mental model and index: variants/audiences, the
  `Workout → Phase → Circuit → Exercise` data model, key files, how a workout reaches a
  user, and a glossary (Foundation/Build/Symmetry taxonomy; "rider" vs "Equestrian").
- **`workouts.md`** — the CSV lifecycle: spreadsheet template → export CSV → parse/generate
  (`generate-workout.mjs` / `parse-csv.js`) → audiences + difficulty → register in
  `workouts/index.js` → add-vs-replace-in-place.
- **`exercises.md`** — the catalog: slug convention, tips, side/alternating handling,
  regenerating `exercises.data.js` (`generate-catalog.mjs`), orphan-vs-new movements, the
  coverage report (`exercise-coverage.mjs`).
- **`videos.md`** — Component A: Blob store + token setup, clip naming, staging folder,
  `publish-videos`, the PR/deploy step.

### Relationship to the `update-workouts` skill

The `update-workouts` SKILL.md stays as the operational checklist Claude executes, but is
pointed at these docs as the canonical prose. The human guide is the source of truth; the
skill executes against it. This keeps the two from drifting.

---

## Files touched

**New**
- `scripts/publish-videos.mjs`
- `scripts/lib/emit-catalog.mjs` (extracted serializer)
- `docs/authoring/README.md`, `workouts.md`, `exercises.md`, `videos.md`

**Modified**
- `package.json` — add `@vercel/blob` dep + `publish-videos` script
- `scripts/generate-catalog.mjs` — use the shared serializer
- `.gitignore` — `!docs/authoring/` exception
- `.claude/skills/update-workouts/SKILL.md` — cross-reference the authoring docs

**Not tracked / manual**
- `~/exercise-clips/` staging folder (outside repo)
- Vercel Blob store + `BLOB_READ_WRITE_TOKEN` in `.env.local`

## Open prerequisites (Katie, one-time)

- Create the Vercel Blob store and pull its token — account-level, cannot be scripted here.

## Testing

- Unit-test the shared serializer and the filename→slug validation (pure functions),
  following the existing `scripts/lib/*.test.mjs` pattern.
- The Blob upload and `gh`/git steps are integration side effects — exercise via a dry-run
  mode or manual verification rather than mocking in unit tests.
