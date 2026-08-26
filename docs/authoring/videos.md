# Publishing exercise videos

See [`exercises.md`](exercises.md) for the catalog and slug convention this
pipeline plugs into. This page covers getting a filmed clip from Katie's
hands into the catalog and in front of users.

There's no backend: a clip is served to the browser as a plain `<video src>`,
so it needs a publicly-reachable URL. `scripts/publish-videos.mjs` (run via
`npm run publish-videos`) uploads staged clips to Vercel Blob and opens a PR
with the catalog change.

## One-time setup

1. Create a **public-access** Vercel Blob store in the Vercel dashboard.
   Public access is required because the app has no backend to mint signed
   URLs — clips are played directly via `<video src>`, so the store must serve
   them without auth.
2. `vercel env pull` its `BLOB_READ_WRITE_TOKEN` into `.env.local` (the
   repo's existing gitignored-secrets pattern — `*.local`/`.env*` are already
   in `.gitignore`).

`BLOB_READ_WRITE_TOKEN` is a **write** credential used only by the publish
script at publish time. It is never shipped to the client and it is not a
read gate — anyone with a clip's URL can already view it, the same posture as
any other static asset.

`npm run publish-videos` loads it via `node --env-file=.env.local
scripts/publish-videos.mjs` (see the `publish-videos` script in
`package.json`) — no need to export it into your shell manually.

## Staging a clip

Drop finished, correctly-named `.mp4` files into the staging folder:

- Default: an `exercise-clips/` folder alongside the repo — its sibling, i.e.
  `../exercise-clips` (for this checkout, `~/code/exercise-clips/`). Kept outside
  the repo so raw/curated footage never risks entering git.
- Override with the `EXERCISE_CLIPS_DIR` environment variable if you want a
  different location.

**Naming** (the slug is the same one from [`exercises.md`](exercises.md) —
the filename stem):

- Primary clip: `<slug>.mp4` — e.g. `bench-press.mp4`
- Alternating-side clip: `<slug>-alt.mp4` — e.g. `curtsy-lunge-alt.mp4`. The
  `-alt` suffix declares the exercise as alternating; the catalog entry's
  `videoAlternating` field is created on publish if it doesn't exist yet.

Placing an intentionally-named file in this folder is the actual control
point; the command below just mechanizes what happens next.

## Running the publish

```bash
npm run publish-videos              # real run: uploads + opens/updates a PR
npm run publish-videos -- --dry-run # validates + prints the plan, no uploads/git
```

For every file in the staging folder, `publish-videos.mjs`:

1. **Validates** the filename against the current catalog
   (`scripts/lib/parse-clip-name.mjs`): it must end in `.mp4` and its slug
   (minus an optional `-alt` suffix) must exist as a catalog key. An `-alt`
   file asserts the exercise has an alternating variant — its
   `videoAlternating` field is created on the catalog entry if it isn't
   already present, so you don't need to pre-add the field before publishing
   an alternating clip. Anything that fails is **skipped with a
   `SKIP <filename>: <reason>` warning** — an unknown or mis-typed slug never
   blocks the rest of the run. If nothing in the folder validates, the run
   aborts with an error.
2. **Uploads** each valid clip to Blob at a deterministic path
   (`exercises/<slug>.mp4` or `exercises/<slug>-alt.mp4`), public access,
   `allowOverwrite: true` — re-publishing the same slug replaces its blob
   rather than accumulating duplicates.
3. On a real run (not `--dry-run`), sets up an isolated git worktree on a
   `video-drops` branch (based on the existing remote branch if a PR is
   already open, otherwise fresh off `origin/master`), patches
   `workouts/exercises.data.js` there with the new URLs, commits, and pushes
   — **your main working tree is never touched**. If a clip's slug isn't in
   the `video-drops` base catalog, the run errors out rather than adding an
   unknown entry — that workout/exercise change needs to be merged to
   `master` first.
4. Opens a PR (`gh pr create --base master --head video-drops`) if one isn't
   already open for that branch, titled "Exercise video drops"; if one is
   already open, the new commit is just added to it. **`video-drops` is
   long-lived** — successive publish runs keep adding commits to the same PR
   until you merge it, after which the next run rebases fresh off
   `origin/master`.
5. Clears the staging folder of the files it just published (successfully
   validated + uploaded), and prints how many clips were published.

`--dry-run` does everything through validation and prints what it *would*
upload and which catalog fields it would set, but performs no upload and no
git/worktree/PR operations, and does not touch the staging folder.

## Deploying

Review and merge the `video-drops` PR to deploy — merging to `master` is what
actually ships the new clip URLs to users (standard Vercel deploy-on-merge).
