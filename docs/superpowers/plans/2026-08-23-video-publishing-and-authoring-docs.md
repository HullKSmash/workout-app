# Video Publishing + Authoring Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual `npm run publish-videos` pipeline that uploads staged exercise clips to a public Vercel Blob store, patches the catalog, and opens a `video-drops` PR — plus a tracked `docs/authoring/` guide capturing how to add/edit workouts, exercises, and videos.

**Architecture:** Pure, unit-tested helpers (serialize catalog, parse clip filename, patch catalog entry) are shared between the existing `generate-catalog.mjs` and the new `publish-videos.mjs`. The publish script orchestrates Blob upload + a git-worktree commit/PR so the user's working tree is never touched. Docs are prose reference; the `update-workouts` skill cross-references them.

**Tech Stack:** Node ESM scripts, `node:test`, `@vercel/blob`, `gh` CLI (v2.94.0, confirmed), git worktrees.

---

## File structure

**New**
- `scripts/lib/emit-catalog.mjs` — `serializeCatalog(catalog)` → full `exercises.data.js` file string. Sole owner of the generated-file format.
- `scripts/lib/emit-catalog.test.mjs`
- `scripts/lib/parse-clip-name.mjs` — `parseClipName(filename, catalog)` → validated `{ ok, slug, field }` or `{ ok:false, reason }`.
- `scripts/lib/parse-clip-name.test.mjs`
- `scripts/lib/patch-catalog.mjs` — `patchCatalog(catalog, slug, field, url)` → new catalog with the field set (immutable).
- `scripts/lib/patch-catalog.test.mjs`
- `scripts/publish-videos.mjs` — orchestration (Blob upload + worktree commit/PR).
- `docs/authoring/README.md`, `workouts.md`, `exercises.md`, `videos.md`

**Modified**
- `scripts/generate-catalog.mjs` — use `serializeCatalog` instead of inline emit.
- `package.json` — add `@vercel/blob` dep + `publish-videos` script.
- `.gitignore` — `!docs/authoring/` exception.
- `.claude/skills/update-workouts/SKILL.md` — cross-reference the authoring docs.

---

## Task 1: Extract the catalog serializer

Move the inline `emit`/`body`/`writeFileSync` format out of `generate-catalog.mjs` into a shared, tested helper so `publish-videos.mjs` writes the file identically.

**Files:**
- Create: `scripts/lib/emit-catalog.mjs`
- Test: `scripts/lib/emit-catalog.test.mjs`
- Modify: `scripts/generate-catalog.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/emit-catalog.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeCatalog } from "./emit-catalog.mjs";

test("emits the generated-file header and export", () => {
  const out = serializeCatalog({ "sumo-squat": { name: "Sumo Squat", tips: "", video: null } });
  assert.match(out, /^\/\/ GENERATED FILE — regenerate with `node scripts\/generate-catalog\.mjs`\./);
  assert.match(out, /export const EXERCISES = \{/);
  assert.match(out, /\n\};\n$/);
});

test("sorts entries by display name and emits exact line format", () => {
  const out = serializeCatalog({
    "sumo-squat": { name: "Sumo Squat", tips: "", video: null },
    "bench-press": { name: "Bench Press", tips: "brace", video: "https://x/bench.mp4" },
  });
  assert.ok(out.indexOf('"bench-press"') < out.indexOf('"sumo-squat"'));
  assert.match(out, /  "bench-press": \{ name: "Bench Press", tips: "brace", video: "https:\/\/x\/bench\.mp4" \},/);
  assert.match(out, /  "sumo-squat": \{ name: "Sumo Squat", tips: "", video: null \},/);
});

test("includes videoAlternating only when the entry has that key", () => {
  const out = serializeCatalog({
    "forward-lunge": { name: "Forward Lunge", tips: "", video: null, videoAlternating: "https://x/fl-alt.mp4" },
    "sumo-squat": { name: "Sumo Squat", tips: "", video: null },
  });
  assert.match(out, /"forward-lunge": \{ name: "Forward Lunge", tips: "", video: null, videoAlternating: "https:\/\/x\/fl-alt\.mp4" \},/);
  assert.doesNotMatch(out, /"sumo-squat":[^\n]*videoAlternating/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/emit-catalog.test.mjs`
Expected: FAIL — `Cannot find module './emit-catalog.mjs'`.

- [ ] **Step 3: Write the implementation**

```js
// scripts/lib/emit-catalog.mjs
// Sole owner of the workouts/exercises.data.js generated-file format.
// Shared by generate-catalog.mjs (upsert) and publish-videos.mjs (video URLs).

function emitEntry(e) {
  const parts = [
    `name: ${JSON.stringify(e.name)}`,
    `tips: ${JSON.stringify(e.tips ?? "")}`,
    `video: ${JSON.stringify(e.video ?? null)}`,
  ];
  if ("videoAlternating" in e) parts.push(`videoAlternating: ${JSON.stringify(e.videoAlternating ?? null)}`);
  return `{ ${parts.join(", ")} }`;
}

export function serializeCatalog(catalog) {
  const body = Object.entries(catalog)
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([slug, e]) => `  ${JSON.stringify(slug)}: ${emitEntry(e)},`)
    .join("\n");
  return `// GENERATED FILE — regenerate with \`node scripts/generate-catalog.mjs\`.
// Upsert: keys/names come from active workouts; hand-edit video/videoAlternating/tips.
export const EXERCISES = {
${body}
};
`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/emit-catalog.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Refactor `generate-catalog.mjs` to use it**

In `scripts/generate-catalog.mjs`, add the import near the other lib imports:

```js
import { serializeCatalog } from "./lib/emit-catalog.mjs";
```

Delete the local `const emit = …`, the `const body = …`, and replace the `writeFileSync(dataPath, \`// GENERATED FILE …\`)` call (the block that writes `dataPath`) with:

```js
writeFileSync(dataPath, serializeCatalog(merged));
```

Leave the `docs/exercise-todo.md` writing and all console logging untouched.

- [ ] **Step 6: Verify the refactor produces a byte-identical catalog**

Run: `node scripts/generate-catalog.mjs && git diff --stat workouts/exercises.data.js`
Expected: no diff to `workouts/exercises.data.js` (the regenerated file is identical to the committed one).

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: PASS (all existing tests plus the 3 new ones).

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/emit-catalog.mjs scripts/lib/emit-catalog.test.mjs scripts/generate-catalog.mjs
git commit -m "refactor: extract shared catalog serializer"
```

---

## Task 2: Parse + validate a clip filename

`parseClipName(filename, catalog)` turns a staged filename into a validated `{ slug, field }`, rejecting typos and non-video files so the catalog is never corrupted.

**Files:**
- Create: `scripts/lib/parse-clip-name.mjs`
- Test: `scripts/lib/parse-clip-name.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/parse-clip-name.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseClipName } from "./parse-clip-name.mjs";

const catalog = {
  "bench-press": { name: "Bench Press", tips: "", video: null },
  "curtsy-lunge": { name: "Curtsy Lunge", tips: "", video: null, videoAlternating: null },
};

test("resolves a primary clip to the video field", () => {
  assert.deepEqual(parseClipName("bench-press.mp4", catalog), { ok: true, slug: "bench-press", field: "video" });
});

test("resolves an -alt clip to the videoAlternating field", () => {
  assert.deepEqual(parseClipName("curtsy-lunge-alt.mp4", catalog), { ok: true, slug: "curtsy-lunge", field: "videoAlternating" });
});

test("rejects a non-mp4 file", () => {
  const r = parseClipName("bench-press.mov", catalog);
  assert.equal(r.ok, false);
  assert.match(r.reason, /\.mp4/);
});

test("rejects an unknown slug", () => {
  const r = parseClipName("bemch-press.mp4", catalog);
  assert.equal(r.ok, false);
  assert.match(r.reason, /no catalog entry/);
});

test("rejects an -alt clip when the entry has no alternating variant", () => {
  const r = parseClipName("bench-press-alt.mp4", catalog);
  assert.equal(r.ok, false);
  assert.match(r.reason, /alternating/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/parse-clip-name.test.mjs`
Expected: FAIL — `Cannot find module './parse-clip-name.mjs'`.

- [ ] **Step 3: Write the implementation**

```js
// scripts/lib/parse-clip-name.mjs
// Validate a staged clip filename against the catalog.
// Returns { ok:true, slug, field } or { ok:false, filename, reason }.
// Convention: "<slug>.mp4" -> video ; "<slug>-alt.mp4" -> videoAlternating.

export function parseClipName(filename, catalog) {
  const fail = (reason) => ({ ok: false, filename, reason });
  if (!filename.endsWith(".mp4")) return fail(`not an .mp4 file`);
  const stem = filename.slice(0, -".mp4".length);
  const isAlt = stem.endsWith("-alt");
  const slug = isAlt ? stem.slice(0, -"-alt".length) : stem;
  const entry = catalog[slug];
  if (!entry) return fail(`no catalog entry for slug "${slug}"`);
  if (isAlt && !("videoAlternating" in entry)) {
    return fail(`"${entry.name}" has no alternating variant (its catalog entry has no videoAlternating field)`);
  }
  return { ok: true, slug, field: isAlt ? "videoAlternating" : "video" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/parse-clip-name.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/parse-clip-name.mjs scripts/lib/parse-clip-name.test.mjs
git commit -m "feat: validate exercise clip filenames against catalog"
```

---

## Task 3: Patch a catalog entry with a URL

`patchCatalog(catalog, slug, field, url)` returns a new catalog with one entry's video field set — immutable, so the orchestrator can fold multiple clips.

**Files:**
- Create: `scripts/lib/patch-catalog.mjs`
- Test: `scripts/lib/patch-catalog.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/patch-catalog.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { patchCatalog } from "./patch-catalog.mjs";

const base = {
  "bench-press": { name: "Bench Press", tips: "", video: null },
  "curtsy-lunge": { name: "Curtsy Lunge", tips: "", video: null, videoAlternating: null },
};

test("sets the video field and leaves other entries untouched", () => {
  const out = patchCatalog(base, "bench-press", "video", "https://x/bench.mp4");
  assert.equal(out["bench-press"].video, "https://x/bench.mp4");
  assert.equal(out["curtsy-lunge"].video, null);
});

test("sets the videoAlternating field", () => {
  const out = patchCatalog(base, "curtsy-lunge", "videoAlternating", "https://x/cl-alt.mp4");
  assert.equal(out["curtsy-lunge"].videoAlternating, "https://x/cl-alt.mp4");
});

test("does not mutate the input catalog", () => {
  patchCatalog(base, "bench-press", "video", "https://x/bench.mp4");
  assert.equal(base["bench-press"].video, null);
});

test("throws on an unknown slug", () => {
  assert.throws(() => patchCatalog(base, "nope", "video", "https://x/n.mp4"), /nope/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/patch-catalog.test.mjs`
Expected: FAIL — `Cannot find module './patch-catalog.mjs'`.

- [ ] **Step 3: Write the implementation**

```js
// scripts/lib/patch-catalog.mjs
// Immutably set one catalog entry's video field to a URL.

export function patchCatalog(catalog, slug, field, url) {
  if (!catalog[slug]) throw new Error(`patchCatalog: unknown slug "${slug}"`);
  return { ...catalog, [slug]: { ...catalog[slug], [field]: url } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/patch-catalog.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/patch-catalog.mjs scripts/lib/patch-catalog.test.mjs
git commit -m "feat: immutable catalog video-field patch helper"
```

---

## Task 4: The `publish-videos` orchestration script

Wires the helpers together: read staged clips → validate → upload to Blob → patch the catalog on a `video-drops` worktree → commit, push, open/update PR → clear staging. Side-effectful; verified via `--dry-run` and a real run, not unit tests.

**Files:**
- Create: `scripts/publish-videos.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add the dependency and npm script**

Run: `npm install @vercel/blob`

Then in `package.json`, add to `"scripts"`:

```json
    "publish-videos": "node --env-file=.env.local scripts/publish-videos.mjs"
```

(`--env-file` loads `BLOB_READ_WRITE_TOKEN` from the gitignored `.env.local` that `vercel env pull` writes.)

- [ ] **Step 2: Write the script**

```js
// scripts/publish-videos.mjs
// Publish staged exercise clips: upload to Vercel Blob (public), patch the catalog
// on a `video-drops` branch via an isolated worktree, and open/update its PR.
//
// Usage:
//   npm run publish-videos            # real run
//   npm run publish-videos -- --dry-run   # validate + show plan, no uploads/git
//
// Staging dir: $EXERCISE_CLIPS_DIR or ~/exercise-clips. Clips must be named
// "<slug>.mp4" (primary) or "<slug>-alt.mp4" (alternating variant).
import { readFileSync, readdirSync, writeFileSync, rmSync, mkdtempSync } from "fs";
import { pathToFileURL } from "url";
import { execFileSync } from "child_process";
import { homedir, tmpdir } from "os";
import path from "path";
import { put } from "@vercel/blob";
import { parseClipName } from "./lib/parse-clip-name.mjs";
import { patchCatalog } from "./lib/patch-catalog.mjs";
import { serializeCatalog } from "./lib/emit-catalog.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const STAGING = process.env.EXERCISE_CLIPS_DIR || path.join(homedir(), "exercise-clips");
const BRANCH = "video-drops";
const git = (args, cwd = REPO) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

async function loadCatalog(dir) {
  const mod = await import(pathToFileURL(path.join(dir, "workouts/exercises.data.js")).href + `?t=${Date.now()}`);
  return mod.EXERCISES;
}

async function main() {
  // 1. Gather + validate staged clips against the current catalog.
  const files = readdirSync(STAGING).filter((f) => !f.startsWith("."));
  if (files.length === 0) {
    console.log(`No clips in ${STAGING}. Nothing to publish.`);
    return;
  }
  const catalog = await loadCatalog(REPO);
  const valid = [];
  for (const filename of files) {
    const parsed = parseClipName(filename, catalog);
    if (!parsed.ok) {
      console.warn(`  SKIP ${filename}: ${parsed.reason}`);
      continue;
    }
    valid.push({ filename, ...parsed });
  }
  if (valid.length === 0) {
    console.error("No valid clips to publish (see warnings above). Aborting.");
    process.exitCode = 1;
    return;
  }

  // 2. Upload each valid clip to Blob (deterministic path, overwrite, public).
  const uploads = [];
  for (const clip of valid) {
    const pathname = `exercises/${clip.slug}${clip.field === "videoAlternating" ? "-alt" : ""}.mp4`;
    if (DRY_RUN) {
      console.log(`  would upload ${clip.filename} -> ${pathname} (${clip.slug}.${clip.field})`);
      uploads.push({ ...clip, url: `https://<blob>/${pathname}` });
      continue;
    }
    const body = readFileSync(path.join(STAGING, clip.filename));
    const blob = await put(pathname, body, {
      access: "public",
      contentType: "video/mp4",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    console.log(`  uploaded ${clip.filename} -> ${blob.url}`);
    uploads.push({ ...clip, url: blob.url });
  }

  if (DRY_RUN) {
    console.log("\nDry run: no git changes made. Planned catalog edits:");
    for (const u of uploads) console.log(`  ${u.slug}.${u.field} = ${u.url}`);
    return;
  }

  // 3. Set up an isolated worktree on video-drops (based on latest master, or the
  //    existing remote branch if a PR is already open) — never touches the main tree.
  git(["fetch", "origin"]);
  const wt = mkdtempSync(path.join(tmpdir(), "video-drops-"));
  const remoteHas = git(["ls-remote", "--heads", "origin", BRANCH]) !== "";
  try {
    if (remoteHas) {
      git(["worktree", "add", wt, "-B", BRANCH, `origin/${BRANCH}`]);
    } else {
      git(["worktree", "add", wt, "-B", BRANCH, "origin/master"]);
    }

    // 4. Patch the worktree's catalog and write it.
    let wtCatalog = await loadCatalog(wt);
    for (const u of uploads) wtCatalog = patchCatalog(wtCatalog, u.slug, u.field, u.url);
    writeFileSync(path.join(wt, "workouts/exercises.data.js"), serializeCatalog(wtCatalog));

    // 5. Commit + push. No-op safely if nothing changed.
    if (git(["status", "--porcelain"], wt) === "") {
      console.log("Catalog already up to date; nothing to commit.");
    } else {
      const names = uploads.map((u) => u.slug).join(", ");
      git(["add", "workouts/exercises.data.js"], wt);
      git(["commit", "-m", `feat: add exercise clips (${names})`], wt);
      git(["push", "-u", "origin", BRANCH], wt);
    }
  } finally {
    git(["worktree", "remove", wt, "--force"]);
  }

  // 6. Ensure a PR exists (idempotent) and clear staging.
  try {
    execFileSync("gh", ["pr", "view", BRANCH], { cwd: REPO, stdio: "ignore" });
  } catch {
    execFileSync("gh", ["pr", "create", "--base", "master", "--head", BRANCH,
      "--title", "Exercise video drops", "--body", "Auto-generated by `npm run publish-videos`. Merge to deploy."],
      { cwd: REPO, stdio: "inherit" });
  }
  for (const clip of valid) rmSync(path.join(STAGING, clip.filename));
  console.log(`\nPublished ${uploads.length} clip(s). Review + merge the ${BRANCH} PR to deploy.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
```

- [ ] **Step 3: Verify the dry run with a fake clip (no Blob, no git)**

```bash
mkdir -p ~/exercise-clips
# pick a real catalog slug that currently has no video:
touch ~/exercise-clips/bench-press.mp4
npm run publish-videos -- --dry-run
rm ~/exercise-clips/bench-press.mp4
```

Expected output includes: `would upload bench-press.mp4 -> exercises/bench-press.mp4 (bench-press.video)` and `Dry run: no git changes made.` No files change (`git status` clean).

- [ ] **Step 4: Verify validation rejects a bad name**

```bash
touch ~/exercise-clips/not-a-real-exercise.mp4
npm run publish-videos -- --dry-run
rm ~/exercise-clips/not-a-real-exercise.mp4
```

Expected: `SKIP not-a-real-exercise.mp4: no catalog entry for slug "not-a-real-exercise"` and, since no valid clips remain, `No valid clips to publish`.

- [ ] **Step 5: Commit**

```bash
git add scripts/publish-videos.mjs package.json package-lock.json
git commit -m "feat: publish-videos pipeline (Blob upload + video-drops PR)"
```

> A real end-to-end run (actual upload + PR) is deferred to the manual verification task — it needs the Blob store + token the user sets up.

---

## Task 5: Authoring documentation

Create the tracked `docs/authoring/` guide covering all four areas, add the `.gitignore` exception, and point the `update-workouts` skill at it.

**Files:**
- Modify: `.gitignore`
- Create: `docs/authoring/README.md`, `docs/authoring/workouts.md`, `docs/authoring/exercises.md`, `docs/authoring/videos.md`
- Modify: `.claude/skills/update-workouts/SKILL.md`

- [ ] **Step 1: Add the `.gitignore` exception**

In `.gitignore`, directly below the existing `!docs/superpowers/` line, add:

```
!docs/authoring/
```

- [ ] **Step 2: Write `docs/authoring/README.md`**

Cover, in prose: the three audience variants and how a variant is resolved (subdomain / `?variant=`); the `audiences[]` field that gates a workout to variants; the data model `Workout → Phase → Circuit → Exercise` (with the `Exercise` fields `name, side?, repCount, tips?` and the `Rest` convention); the key files (`workout-app.jsx`, `variants.js`, `workouts/index.js`, `workouts/*.js`, `workouts/exercises.data.js`); how a workout reaches a user (select → landing → workout → complete); and a glossary (Foundation/Symmetry & Balance/Build taxonomy; "rider" casual vs "Equestrian" brand). Link to the three topic pages. Draw the specifics from `variants.js`, `workout-app.jsx`, and the existing memory notes — verify each file/field reference against the current code before writing it.

- [ ] **Step 3: Write `docs/authoring/workouts.md`**

Document the CSV lifecycle end to end: authoring in the spreadsheet template; the CSV columns (`Phase,Circuit,Rounds,Exercise,RepCount,Tips` plus the `Side` column); exporting; running the `update-workouts` skill's `generate-workout.mjs` (which wraps `parse-csv.js`) and the `--audience` / `--difficulty` flags; that the parser alone omits `audiences`/`difficulty`/`description`; difficulty inferred from the filename color token (green→easier / yellow→moderate / red→harder); registering the workout in `workouts/index.js`; and add-vs-replace-in-place (same slug/filename needs no index edit). Verify column names and flags against `workouts/parse-csv.js` and `.claude/skills/update-workouts/SKILL.md` before writing.

- [ ] **Step 4: Write `docs/authoring/exercises.md`**

Document the catalog: that `exercises.data.js` is generated; the slug convention (`slugify` in `workouts/exercises.js`, slug = video filename stem); the `tips` / `side` / `Alternating` handling and the `videoAlternating` field; regenerating with `node scripts/generate-catalog.mjs` (upsert: preserves hand-entered values, adds new, keeps + warns on orphans); orphan-vs-new movements; and the coverage report (`scripts/exercise-coverage.mjs`) plus the gitignored `docs/exercise-todo.md` worklist. Verify against `workouts/exercises.js` and `scripts/generate-catalog.mjs`.

- [ ] **Step 5: Write `docs/authoring/videos.md`**

Document the pipeline from Task 4: one-time setup (create a **public** Vercel Blob store, `vercel env pull` the `BLOB_READ_WRITE_TOKEN` into `.env.local`; note the token is a write credential, never shipped to the client); clip naming (`<slug>.mp4` / `<slug>-alt.mp4`, slug from `exercises.md`); the staging folder (`~/exercise-clips`, outside the repo); running `npm run publish-videos` (and `-- --dry-run`); and that it opens a `video-drops` PR you merge to deploy. Note that unknown/mis-typed filenames are skipped with a warning.

- [ ] **Step 6: Cross-reference the docs from the skill**

In `.claude/skills/update-workouts/SKILL.md`, add a short pointer near the top noting that the canonical human-facing authoring guide lives in `docs/authoring/` (workouts, exercises, videos) and that the skill is the operational checklist executing against it. Keep the existing skill steps intact.

- [ ] **Step 7: Commit**

```bash
git add .gitignore docs/authoring .claude/skills/update-workouts/SKILL.md
git commit -m "docs: authoring guide for workouts, exercises, and videos"
```

---

## Task 6: Full verification

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: PASS — all existing tests plus the new `emit-catalog`, `parse-clip-name`, and `patch-catalog` tests.

- [ ] **Step 2: Confirm the catalog is still byte-identical after regeneration**

Run: `node scripts/generate-catalog.mjs && git diff --stat workouts/exercises.data.js`
Expected: no diff.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors from the added files.

- [ ] **Step 4: Manual end-to-end (after user sets up the Blob store)**

Once the user has created the public Blob store and pulled the token: stage one real clip in `~/exercise-clips`, run `npm run publish-videos`, and confirm (a) the clip is uploaded (URL printed), (b) a `video-drops` PR is opened with the catalog change, (c) the staging file is cleared, and (d) the main working tree is untouched (`git status` clean on the current branch). This step requires the manual prerequisite and is expected to be run by/with the user.

---

## Notes for the implementer

- **Prerequisite (user, one-time, not scriptable here):** create a **public** Vercel Blob store and `vercel env pull` its `BLOB_READ_WRITE_TOKEN` into `.env.local`. Tasks 1–3 and 5 need none of this; Task 4 Steps 3–4 (dry-run) need none of it; only the real run (Task 6 Step 4) does.
- `gh` CLI is confirmed installed (v2.94.0) and assumed authenticated for the current repo.
- The `video-drops` branch is long-lived: successive runs add commits to the same PR until it's merged. After a merge, the next run re-bases it on fresh `origin/master`.
