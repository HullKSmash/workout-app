# Exercise Video Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a single-source-of-truth exercise catalog that associates one short video clip per movement, reused across every workout, with per-side reuse via horizontal mirroring.

**Architecture:** Exercises become first-class, slug-keyed entries in a generated catalog (`workouts/exercises.data.js`) holding `{ name, tips, video, videoAlternating? }`. Workout files keep their inline exercise instances but move laterality out of the name string into a `side` field (`"Left" | "Right" | "Alternating"`, omitted for bilateral). At render time a resolver looks the movement up by slug and picks the clip: the single-side clip plays as-is for Left, mirrored (`transform: scaleX(-1)`) for Right, and the dedicated alternating clip (falling back to the single-side clip) for Alternating. When no clip exists yet, the current placeholder image/`▶ demo coming soon` box shows instead. The catalog is the seed for the shelved SQLite exercise-database project.

**Tech Stack:** React 19 SPA, Vite, plain ES modules, `node --test` for unit tests (no jsdom/testing-library — component wiring is verified in the browser preview). No new dependencies.

---

## Design decisions (locked with Katie)

- **97 core movements** total (182 raw name strings collapsed). 91 are used by active (library-visible) workouts; 6 appear only in inactive foundation/week-variant files. See companion reference `docs/superpowers/specs/2026-08-19-exercise-video-catalog-movements.md`.
- **Side is an instance property, not a separate exercise.** `Forward Lunge, Left` / `Forward Lunge, Right` / `Alternating Forward Lunge` → one core `Forward Lunge` with `side` on each instance.
- **One clip per movement, mirrored for the opposite side.** `scaleX(-1)` is exact for lateral movements and correctly swaps the diagonal for bird dogs.
- **Alternating gets its own optional clip** (`videoAlternating`); 11 active cores use it. Falls back to the single-side clip if absent.
- **Default tips live in the catalog; the workout instance overrides.** Catalog `tips` ships empty (`""`) for now — Katie fills defaults later. Resolution is `instance.tips ?? catalog.tips ?? TIPS_DEFAULT`, so behavior is unchanged until she populates it.
- **Video files** live in `/public/videos/` served by Vite static (decision from the design chat); the catalog stores the URL string, so moving to external storage later is a find-and-replace.
- **Auto-play vs tap-to-play is deferred.** This plan ships auto-play muted looping clips (`autoPlay muted loop playsInline`); switching to tap-to-play is a later localized change.

## Scope

- **In scope:** the 15 active workout files (those exported by `workouts/index.js`) and the 91 core movements they use.
- **Out of scope (documented follow-up):** the inactive foundation/week-variant files and their 6 inactive-only movements. They are never imported by `index.js`, never rendered, and are left untouched. When those workouts are reactivated, re-run the generator + migrator against them (Task 2/Task 3 scripts already handle any workout you point them at).

## File structure

**New files:**
- `workouts/exercises.js` — hand-written resolver logic: `slugify`, `resolveExercise`, `formatExerciseTitle`; re-exports `EXERCISES`. (Task 1)
- `workouts/exercises.data.js` — **generated** catalog data: `export const EXERCISES = { ... }`. Hand-edited afterward to add video paths / default tips. (stub in Task 1, generated in Task 2)
- `workouts/exercises.test.js` — unit tests for the resolver + a catalog-consistency guard over active workouts. (Task 1 & Task 5)
- `workouts/parse-csv.test.js` — parser tests for the new `Side` column. (Task 8)
- `scripts/lib/normalize-exercises.mjs` — one-time transform library: `deriveCore(name)` → `{ core, side } | null`, plus the REMAP/DELETE/CANON tables. Shared by the generator and migrator so catalog keys and migrated names cannot drift apart. (Task 2)
- `scripts/lib/merge-catalog.mjs` — pure upsert function `mergeCatalog(existing, required)` → `{ merged, added, orphans }`; preserves hand-entered values, surfaces new/unused movements. Unit-tested. (Task 2)
- `scripts/generate-catalog.mjs` — **upserts** `workouts/exercises.data.js` from active workouts via `mergeCatalog`, then emits the file and logs the `added`/`orphans` it reports. (Task 2)
- `scripts/migrate-sides.mjs` — rewrites the 15 active workout files (canonical name + `side`). (Task 3)
- `scripts/exercise-coverage.mjs` — prints video coverage (informational). (Task 9)
- `docs/exercise-todo.md` — **generated** by the catalog generator: a git-tracked checklist of movements still missing a clip. (Task 2)

**Modified files:**
- `workouts/build-checklist.js` — carry `side` onto checklist items. (Task 4)
- `workouts/build-checklist.test.js` — assert `side` is carried. (Task 4)
- `workouts/parse-csv.js` — read a new `Side` column (after `Exercise`) into a normalized `side` field for future imports. (Task 8)
- `.claude/skills/update-workouts/SKILL.md` — document the `Side` column + `side` field, and add a "regenerate catalog & report new movements" step. (Task 10)
- `workout-app.jsx` — guided view: video/mirror/side/tips wiring. (Task 6)
- `ChecklistScreen.jsx` — checklist detail sheet + row: video/mirror/side/tips wiring. (Task 7)
- The 15 active workout `.js` files — canonical names + `side` (mechanical, via Task 3 script).

---

### Task 1: Resolver module + stub catalog

**Files:**
- Create: `workouts/exercises.data.js`
- Create: `workouts/exercises.js`
- Test: `workouts/exercises.test.js`

- [ ] **Step 1: Create the stub data module**

`workouts/exercises.data.js`:

```js
// GENERATED FILE — regenerate with `node scripts/generate-catalog.mjs`.
// Hand-edit only the `video`, `videoAlternating`, and `tips` values as clips
// and default coaching cues are added; keys and `name` come from the generator.
export const EXERCISES = {};
```

- [ ] **Step 2: Write the failing tests**

`workouts/exercises.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, resolveExercise, formatExerciseTitle } from "./exercises.js";

test("slugify normalizes punctuation, & and w/", () => {
  assert.equal(slugify("Calf Raise & Curl"), "calf-raise-and-curl");
  assert.equal(slugify("Forward Lunge w/ Twist"), "forward-lunge-with-twist");
  assert.equal(slugify("Standing Cat/Cow"), "standing-cat-cow");
  assert.equal(slugify("To-the-Chin Lift"), "to-the-chin-lift");
  assert.equal(slugify("RDL & Row"), "rdl-and-row");
});

const CATALOG = {
  "forward-lunge": { name: "Forward Lunge", tips: "hips square", video: "/videos/forward-lunge.mp4", videoAlternating: "/videos/forward-lunge-alt.mp4" },
  "sumo-squat": { name: "Sumo Squat", tips: "", video: null },
  "single-arm-row": { name: "Single Arm Row", tips: "", video: "/videos/single-arm-row.mp4", videoAlternating: null },
};

test("resolveExercise: Left plays the single-side clip un-mirrored", () => {
  const r = resolveExercise({ name: "Forward Lunge", side: "Left" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/forward-lunge.mp4");
  assert.equal(r.mirror, false);
});

test("resolveExercise: Right mirrors the single-side clip", () => {
  const r = resolveExercise({ name: "Forward Lunge", side: "Right" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/forward-lunge.mp4");
  assert.equal(r.mirror, true);
});

test("resolveExercise: Alternating prefers the alternating clip, never mirrors", () => {
  const r = resolveExercise({ name: "Forward Lunge", side: "Alternating" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/forward-lunge-alt.mp4");
  assert.equal(r.mirror, false);
});

test("resolveExercise: Alternating falls back to single-side clip when no alt clip", () => {
  const r = resolveExercise({ name: "Single Arm Row", side: "Alternating" }, CATALOG);
  assert.equal(r.videoSrc, "/videos/single-arm-row.mp4");
  assert.equal(r.mirror, false);
});

test("resolveExercise: missing/no video yields null src (placeholder path)", () => {
  assert.equal(resolveExercise({ name: "Sumo Squat" }, CATALOG).videoSrc, null);
  assert.equal(resolveExercise({ name: "Unknown Move" }, CATALOG).videoSrc, null);
});

test("resolveExercise: instance tips win, else catalog tips, else null", () => {
  assert.equal(resolveExercise({ name: "Forward Lunge", tips: "override" }, CATALOG).tips, "override");
  assert.equal(resolveExercise({ name: "Forward Lunge" }, CATALOG).tips, "hips square");
  assert.equal(resolveExercise({ name: "Sumo Squat" }, CATALOG).tips, null);
});

test("formatExerciseTitle appends the side", () => {
  assert.equal(formatExerciseTitle({ name: "Forward Lunge" }), "Forward Lunge");
  assert.equal(formatExerciseTitle({ name: "Forward Lunge", side: "Left" }), "Forward Lunge · Left");
  assert.equal(formatExerciseTitle({ name: "Forward Lunge", side: "Alternating" }), "Forward Lunge · Alternating");
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './exercises.js'`.

- [ ] **Step 4: Write the resolver module**

`workouts/exercises.js`:

```js
// Exercise catalog resolver. The catalog data lives in the generated
// exercises.data.js; this module owns slug + lookup + display logic.
import { EXERCISES } from "./exercises.data.js";

export { EXERCISES };

// Canonical exercise name -> stable slug key (also the video filename stem).
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

// Resolve one workout-instance exercise against the catalog.
// Returns { videoSrc, mirror, tips } — videoSrc null means "use the placeholder".
export function resolveExercise(instance, catalog = EXERCISES) {
  const { name, side, tips } = instance;
  const entry = catalog[slugify(name)] || null;
  let videoSrc = null;
  let mirror = false;
  if (entry) {
    if (side === "Alternating") {
      videoSrc = entry.videoAlternating || entry.video || null;
    } else {
      videoSrc = entry.video || null;
      mirror = side === "Right" && Boolean(videoSrc);
    }
  }
  const resolvedTips = tips || (entry && entry.tips) || null;
  return { videoSrc, mirror, tips: resolvedTips };
}

// Display title: core name plus a side suffix when the instance is sided.
export function formatExerciseTitle(instance) {
  return instance.side ? `${instance.name} · ${instance.side}` : instance.name;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all `exercises.test.js` tests green.

- [ ] **Step 6: Commit**

```bash
git add workouts/exercises.js workouts/exercises.data.js workouts/exercises.test.js
git commit -m "feat: add exercise catalog resolver (slug, side, tips, mirror)"
```

---

### Task 2: Normalization library + catalog generator (upsert)

**Files:**
- Create: `scripts/lib/normalize-exercises.mjs`
- Create: `scripts/generate-catalog.mjs`
- Test: `scripts/lib/normalize-exercises.test.mjs`
- Modify (generated): `workouts/exercises.data.js`

- [ ] **Step 1: Write the failing tests for `deriveCore`**

`scripts/lib/normalize-exercises.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveCore } from "./normalize-exercises.mjs";

test("strips sided suffixes into a side, title-cases the core", () => {
  assert.deepEqual(deriveCore("Single Leg RDL, L"), { core: "Single Leg RDL", side: "Left" });
  assert.deepEqual(deriveCore("Side lying leg lift, right"), { core: "Side Lying Leg Lift", side: "Right" });
  assert.deepEqual(deriveCore("Curtsy Lunge, Left Side"), { core: "Curtsy Lunge", side: "Left" });
});

test("Alternating prefix becomes side Alternating", () => {
  assert.deepEqual(deriveCore("Alternating forward lunge"), { core: "Forward Lunge", side: "Alternating" });
});

test("bilateral names have no side", () => {
  assert.deepEqual(deriveCore("Sumo squat"), { core: "Sumo Squat", side: null });
});

test("REMAP overrides (RDL, Deadlift, Alternating Row, Plié)", () => {
  assert.deepEqual(deriveCore("RDL"), { core: "Romanian Dead Lift", side: null });
  assert.deepEqual(deriveCore("Deadlift"), { core: "Romanian Dead Lift", side: null });
  assert.deepEqual(deriveCore("Alternating row"), { core: "Single Arm Row", side: "Alternating" });
  assert.deepEqual(deriveCore("Plié squat"), { core: "Sumo Squat", side: null });
  assert.deepEqual(deriveCore("Side lunge w/ balance press, L/R"), { core: "Side Lunge w/ Balance Press", side: "Left" });
});

test("CANON collapses & vs and / plurals / hyphenation", () => {
  assert.equal(deriveCore("Calf raise and curl").core, "Calf Raise & Curl");
  assert.equal(deriveCore("Row and kickback").core, "Row & Kickback");
  assert.equal(deriveCore("Mountain climber").core, "Mountain Climbers");
  assert.equal(deriveCore("Plank pike").core, "Plank Pikes");
  assert.equal(deriveCore("Runner Hop, Left").core, "Runner Hops");
});

test("deleted movements return null", () => {
  assert.equal(deriveCore("Lateral Line Jumps"), null);
  assert.equal(deriveCore("Jump squat stabilization"), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/lib/normalize-exercises.test.mjs`
Expected: FAIL — `Cannot find module './normalize-exercises.mjs'`.

- [ ] **Step 3: Write the normalization library**

`scripts/lib/normalize-exercises.mjs`:

```js
// One-time transform mapping a raw workout exercise name to its canonical
// core movement + side. Single source of truth shared by the catalog
// generator and the workout-file migrator so keys and names cannot drift.

const DELETE = new Set([
  "Jump squat stabilization",
  "Lateral Line Jumps",
  "Lying leg lift, left",
  "Lying leg lift, right",
]);

// exact raw name -> { core, side } ; side null means bilateral/unspecified
const REMAP = {
  "Adductor crosses": { core: "Lying Adductor Crosses", side: null },
  "Dumbbell row": { core: "Row", side: null },
  "RDL": { core: "Romanian Dead Lift", side: null },
  "Deadlift": { core: "Romanian Dead Lift", side: null },
  "Plié squat": { core: "Sumo Squat", side: null },
  "Alternating row": { core: "Single Arm Row", side: "Alternating" },
  "Weighted bird dogs, L/R": { core: "Weighted Bird Dogs", side: "Left" },
  "Weighted bird dogs, R/L": { core: "Weighted Bird Dogs", side: "Right" },
  "Side lunge w/ balance press, L/R": { core: "Side Lunge w/ Balance Press", side: "Left" },
  "Side lunge w/ balance press, R/L": { core: "Side Lunge w/ Balance Press", side: "Right" },
  "Push up (Any kind)!": { core: "Push Ups", side: null },
};

// core-level canonical merges that differ by more than casing
const CANON = {
  "calf raise and curl": "Calf Raise & Curl",
  "row and kickback": "Row & Kickback",
  "mountain climber": "Mountain Climbers",
  "plank pike": "Plank Pikes",
  "runner hop": "Runner Hops",
  "to the chin lifts": "To-the-Chin Lift",
  "to-the-chin lift": "To-the-Chin Lift",
};

const MINOR = new Set(["and", "or", "the", "to", "of", "a", "an", "w/"]);

function titleCase(s) {
  const words = s.split(/\s+/);
  return words
    .map((tok, i) => {
      if (/^[A-Z]{2,}$/.test(tok)) return tok; // acronym e.g. RDL
      const lc = tok.toLowerCase();
      if (i > 0 && MINOR.has(lc)) return lc;
      return tok
        .split("/")
        .map((seg) => (seg ? seg[0].toUpperCase() + seg.slice(1).toLowerCase() : seg))
        .join("/");
    })
    .join(" ");
}

const SUFFIXES = [
  [/,\s*left arm\/right leg$/i, "Left"],
  [/,\s*right arm\/left leg$/i, "Right"],
  [/,\s*left side$/i, "Left"],
  [/,\s*right side$/i, "Right"],
  [/,\s*left$/i, "Left"],
  [/,\s*right$/i, "Right"],
  [/,\s*l$/i, "Left"],
  [/,\s*r$/i, "Right"],
];

// Returns { core, side } or null (movement deleted). Callers must skip "Rest".
export function deriveCore(name) {
  if (DELETE.has(name)) return null;
  if (REMAP[name]) {
    const r = REMAP[name];
    return { core: titleCase(r.core), side: r.side };
  }
  let s = name;
  let side = null;
  for (const [re, val] of SUFFIXES) {
    if (re.test(s)) {
      side = val;
      s = s.replace(re, "");
      break;
    }
  }
  if (!side && /^alternating\s+/i.test(s)) {
    side = "Alternating";
    s = s.replace(/^alternating\s+/i, "");
  }
  let core = titleCase(s.trim());
  core = CANON[core.toLowerCase()] || core;
  return { core, side };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/lib/normalize-exercises.test.mjs`
Expected: PASS.

- [ ] **Step 5: Write the failing tests for `mergeCatalog`**

`scripts/lib/merge-catalog.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeCatalog } from "./merge-catalog.mjs";

test("recognizes and adds a new movement, preserving existing values", () => {
  const existing = { "sumo-squat": { name: "Sumo Squat", tips: "brace", video: "/videos/sumo-squat.mp4" } };
  const required = {
    "sumo-squat": { name: "Sumo Squat", hasAlt: false },
    "cossack-squat": { name: "Cossack Squat", hasAlt: false },
  };
  const { merged, added, orphans } = mergeCatalog(existing, required);
  assert.deepEqual(added, ["Cossack Squat"]);                              // reported as new
  assert.equal(merged["sumo-squat"].video, "/videos/sumo-squat.mp4");      // preserved
  assert.equal(merged["sumo-squat"].tips, "brace");                        // preserved
  assert.deepEqual(merged["cossack-squat"], { name: "Cossack Squat", tips: "", video: null }); // blank
  assert.deepEqual(orphans, []);
});

test("keeps entries no workout uses anymore and reports them as orphans", () => {
  const existing = { "old-move": { name: "Old Move", tips: "", video: "/videos/old-move.mp4" } };
  const required = { "sumo-squat": { name: "Sumo Squat", hasAlt: false } };
  const { merged, added, orphans } = mergeCatalog(existing, required);
  assert.deepEqual(orphans, ["old-move"]);
  assert.equal(merged["old-move"].video, "/videos/old-move.mp4");          // kept, not dropped
  assert.deepEqual(added, ["Sumo Squat"]);
});

test("includes videoAlternating only for movements with an alternating variant", () => {
  const { merged } = mergeCatalog({}, {
    "forward-lunge": { name: "Forward Lunge", hasAlt: true },
    "sumo-squat": { name: "Sumo Squat", hasAlt: false },
  });
  assert.equal("videoAlternating" in merged["forward-lunge"], true);
  assert.equal(merged["forward-lunge"].videoAlternating, null);
  assert.equal("videoAlternating" in merged["sumo-squat"], false);
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `node --test scripts/lib/merge-catalog.test.mjs`
Expected: FAIL — `Cannot find module './merge-catalog.mjs'`.

- [ ] **Step 7: Write the merge function**

`scripts/lib/merge-catalog.mjs`:

```js
// Pure upsert. `existing` = current EXERCISES object; `required` = slug ->
// { name, hasAlt } derived from active workouts. Returns the merged catalog,
// the display names of newly-added movements, and slugs no longer used.
export function mergeCatalog(existing, required) {
  const added = [];
  const merged = {};
  for (const [slug, { name, hasAlt }] of Object.entries(required)) {
    const prev = existing[slug];
    if (!prev) added.push(name);
    const entry = {
      name,
      tips: prev ? prev.tips ?? "" : "",
      video: prev ? prev.video ?? null : null,
    };
    const keepAlt = hasAlt || (prev && prev.videoAlternating != null);
    if (keepAlt) entry.videoAlternating = prev ? prev.videoAlternating ?? null : null;
    merged[slug] = entry;
  }
  const orphans = Object.keys(existing).filter((slug) => !required[slug]);
  for (const slug of orphans) merged[slug] = existing[slug];
  return { merged, added: added.sort(), orphans };
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `node --test scripts/lib/merge-catalog.test.mjs`
Expected: PASS.

- [ ] **Step 9: Write the catalog generator (upsert)**

`scripts/generate-catalog.mjs`:

```js
// Upserts workouts/exercises.data.js from the ACTIVE workouts (those exported by
// workouts/index.js) via mergeCatalog: preserves hand-entered values, ADDS + LOGS
// new movements, keeps + warns about unused ones. Safe to re-run.
// Run: node scripts/generate-catalog.mjs
import { writeFileSync, existsSync } from "fs";
import { pathToFileURL } from "url";
import path from "path";
import { WORKOUTS } from "../workouts/index.js";
import { slugify } from "../workouts/exercises.js";
import { deriveCore } from "./lib/normalize-exercises.mjs";
import { mergeCatalog } from "./lib/merge-catalog.mjs";

// 1. movements the active workouts require: slug -> { name, hasAlt }
const required = {};
for (const w of WORKOUTS) {
  for (const phase of w.phases) {
    for (const circuit of phase.circuits) {
      for (const ex of circuit.exercises) {
        if (ex.name === "Rest") continue;
        const d = deriveCore(ex.name);
        if (!d) throw new Error(`Active workout "${w.name}" uses deleted movement "${ex.name}"`);
        const slug = slugify(d.core);
        if (!required[slug]) required[slug] = { name: d.core, hasAlt: false };
        if (d.side === "Alternating") required[slug].hasAlt = true;
      }
    }
  }
}

// 2. load existing catalog + merge (upsert)
const dataPath = path.resolve("workouts/exercises.data.js");
let existing = {};
if (existsSync(dataPath)) ({ EXERCISES: existing } = await import(pathToFileURL(dataPath).href));
const { merged, added, orphans } = mergeCatalog(existing, required);

// 3. emit, sorted by display name
const emit = (e) => {
  const parts = [`name: ${JSON.stringify(e.name)}`, `tips: ${JSON.stringify(e.tips ?? "")}`, `video: ${JSON.stringify(e.video ?? null)}`];
  if ("videoAlternating" in e) parts.push(`videoAlternating: ${JSON.stringify(e.videoAlternating ?? null)}`);
  return `{ ${parts.join(", ")} }`;
};
const body = Object.entries(merged)
  .sort((a, b) => a[1].name.localeCompare(b[1].name))
  .map(([slug, e]) => `  ${JSON.stringify(slug)}: ${emit(e)},`)
  .join("\n");

writeFileSync(dataPath, `// GENERATED FILE — regenerate with \`node scripts/generate-catalog.mjs\`.
// Upsert: keys/names come from active workouts; hand-edit video/videoAlternating/tips.
export const EXERCISES = {
${body}
};
`);

// 4. write a git-tracked worklist of movements still missing a clip
const byName = (a, b) => a[1].name.localeCompare(b[1].name);
const needPrimary = Object.entries(merged).filter(([, e]) => !e.video).sort(byName);
const needAlt = Object.entries(merged)
  .filter(([, e]) => "videoAlternating" in e && !e.videoAlternating)
  .sort(byName);
writeFileSync(path.resolve("docs/exercise-todo.md"), `# Exercises still needing video

_Generated by \`scripts/generate-catalog.mjs\` — do not edit by hand._

## Missing primary clip (${needPrimary.length})

${needPrimary.map(([slug, e]) => `- [ ] ${e.name} (\`${slug}.mp4\`)`).join("\n") || "_none — all filmed 🎉_"}

## Missing alternating clip (${needAlt.length})

${needAlt.map(([slug, e]) => `- [ ] ${e.name} (\`${slug}-alt.mp4\`)`).join("\n") || "_none_"}
`);

console.log(`Wrote ${Object.keys(merged).length} exercises to workouts/exercises.data.js`);
console.log(added.length ? `  + ${added.length} new: ${added.join(", ")}` : "  no new movements");
if (orphans.length) console.log(`  ! ${orphans.length} no longer used (kept): ${orphans.map((s) => existing[s].name).sort().join(", ")}`);
console.log(`  todo → docs/exercise-todo.md (${needPrimary.length} primary, ${needAlt.length} alt still needed)`);
```

- [ ] **Step 10: Generate the catalog and verify it**

Run: `node scripts/generate-catalog.mjs`
Expected (first run, from the empty stub): `Wrote 91 exercises to workouts/exercises.data.js`, then `  + 91 new: …` (every movement is new the first time), then `  todo → docs/exercise-todo.md (91 primary, 11 alt still needed)`. The `+ N new:` / `! N no longer used` lines print to stdout each run; the same missing-clip list is also written to `docs/exercise-todo.md`.

Confirm the worklist wrote: `head -12 docs/exercise-todo.md` → the `# Exercises still needing video` header and the first few unchecked movements.

Run: `npm test`
Expected: PASS (resolver + merge tests all green against the now-populated catalog).

- [ ] **Step 11: Commit**

```bash
git add scripts/lib/normalize-exercises.mjs scripts/lib/normalize-exercises.test.mjs scripts/lib/merge-catalog.mjs scripts/lib/merge-catalog.test.mjs scripts/generate-catalog.mjs workouts/exercises.data.js docs/exercise-todo.md
git commit -m "feat: generate exercise catalog from active workouts (logging upsert + worklist)"
```

---

### Task 3: Migrate active workout files (canonical name + side)

**Files:**
- Create: `scripts/migrate-sides.mjs`
- Modify (mechanical): the 15 active workout `.js` files

- [ ] **Step 1: Write the migrator**

`scripts/migrate-sides.mjs`:

```js
// Rewrites each ACTIVE workout file so exercise instances carry a canonical
// core name plus an optional `side`, instead of encoding side in the name.
// Re-serializes as pretty JSON (these files are generated JSON already).
// Run: node scripts/migrate-sides.mjs
import { readdirSync, writeFileSync } from "fs";
import { pathToFileURL } from "url";
import path from "path";
import { WORKOUTS } from "../workouts/index.js";
import { deriveCore } from "./lib/normalize-exercises.mjs";

const dir = path.resolve("workouts");
const activeNames = new Set(WORKOUTS.map((w) => w.name));
const files = readdirSync(dir).filter((f) => f.endsWith(".js") && !f.endsWith(".test.js") && f !== "index.js");

let changed = 0;
for (const f of files) {
  const mod = await import(pathToFileURL(path.join(dir, f)).href);
  const w = mod.default;
  if (!w || !Array.isArray(w.phases) || !activeNames.has(w.name)) continue;

  for (const phase of w.phases) {
    for (const circuit of phase.circuits) {
      circuit.exercises = circuit.exercises.map((ex) => {
        if (ex.name === "Rest") return ex;
        const d = deriveCore(ex.name);
        if (!d) throw new Error(`${f}: active workout uses deleted movement "${ex.name}"`);
        const next = { ...ex, name: d.core };
        if (d.side) next.side = d.side;
        return next;
      });
    }
  }

  writeFileSync(path.join(dir, f), `export default ${JSON.stringify(w, null, 2)};\n`);
  changed++;
  console.log(`migrated ${f}`);
}
console.log(`Done — ${changed} active workout files rewritten.`);
```

- [ ] **Step 2: Run the migration**

Run: `node scripts/migrate-sides.mjs`
Expected: `migrated …` lines for the 15 active files, then `Done — 15 active workout files rewritten.`

- [ ] **Step 3: Verify no sided name survives in active files**

Run:
```bash
git diff --unified=0 -- workouts/*.js | grep -E '^\+\s*"name":' | grep -iE ', (left|right|l|r)$|, (left|right) side|^\+\s*"name": "Alternating ' || echo "clean: no sided names remain"
```
Expected: `clean: no sided names remain`

- [ ] **Step 4: Verify the whole suite still passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Eyeball one migrated file**

Run: `git diff -- workouts/rider-build-1.js`
Expected: exercise objects now read like `{ "name": "Squat and Press", "repCount": "6-8", "tips": "…" }` (bilateral, no side) and sided ones gain `"side": "Left"` etc. `Rest` entries unchanged.

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate-sides.mjs workouts/*.js
git commit -m "refactor: migrate active workouts to canonical names + side field"
```

---

### Task 4: Carry `side` through the checklist model

**Files:**
- Modify: `workouts/build-checklist.js:44-49` (the `items.push({...})` block)
- Test: `workouts/build-checklist.test.js`

- [ ] **Step 1: Write the failing test**

Add to `workouts/build-checklist.test.js` (new test; keep existing ones):

```js
test("build-checklist carries the side onto items", () => {
  const wk = {
    name: "Sided",
    phases: [{ name: "P", circuits: [{ repeatCount: 1, exercises: [
      { name: "Forward Lunge", repCount: "8", side: "Left" },
      { name: "Sumo Squat", repCount: "10" },
    ] }] }],
  };
  const { sets } = buildChecklist(wk);
  const items = sets[0].groups[0].rounds[0].items;
  assert.equal(items[0].side, "Left");
  assert.equal(items[1].side, undefined);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test workouts/build-checklist.test.js`
Expected: FAIL — `items[0].side` is `undefined`.

- [ ] **Step 3: Add `side` to the pushed item**

In `workouts/build-checklist.js`, change the `items.push` block from:

```js
          items.push({
            id: `p${phaseIndex}c${circuitIndex}r${round}e${exIndex}`,
            name: exercise.name,
            repCount: exercise.repCount,
            tips: exercise.tips,
          });
```

to:

```js
          items.push({
            id: `p${phaseIndex}c${circuitIndex}r${round}e${exIndex}`,
            name: exercise.name,
            repCount: exercise.repCount,
            tips: exercise.tips,
            side: exercise.side,
          });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test workouts/build-checklist.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add workouts/build-checklist.js workouts/build-checklist.test.js
git commit -m "feat: carry exercise side onto checklist items"
```

---

### Task 5: Catalog-consistency guard test

**Files:**
- Modify: `workouts/exercises.test.js`

- [ ] **Step 1: Write the failing test**

Append to `workouts/exercises.test.js`:

```js
import { WORKOUTS } from "./index.js";

test("every active-workout exercise resolves to a catalog entry", () => {
  const missing = new Set();
  for (const w of WORKOUTS) {
    for (const phase of w.phases) {
      for (const circuit of phase.circuits) {
        for (const ex of circuit.exercises) {
          if (ex.name === "Rest") continue;
          if (!EXERCISES[slugify(ex.name)]) missing.add(`${ex.name} (in ${w.name})`);
        }
      }
    }
  }
  assert.deepEqual([...missing], [], `unmapped exercises: ${[...missing].join("; ")}`);
});
```

Note: `EXERCISES` and `slugify` are already imported at the top of the file (extend that import to include `EXERCISES` if it is not there yet: `import { slugify, resolveExercise, formatExerciseTitle, EXERCISES } from "./exercises.js";`).

- [ ] **Step 2: Run test to verify it passes (migration already done)**

Run: `node --test workouts/exercises.test.js`
Expected: PASS — after Task 3, every active name is canonical and present. (If it FAILS, the listed names reveal a generator/migrator mismatch to fix before proceeding.)

- [ ] **Step 3: Commit**

```bash
git add workouts/exercises.test.js
git commit -m "test: guard active workouts against catalog drift"
```

---

### Task 6: Wire the guided (step-through) view

**Files:**
- Modify: `workout-app.jsx:1-20` (imports), `:382` (compute media), `:886-925` (render)

- [ ] **Step 1: Add the import**

After the existing `import { buildChecklist } ...` line (`workout-app.jsx:12`), add:

```js
import { resolveExercise, formatExerciseTitle } from "./workouts/exercises.js";
```

- [ ] **Step 2: Compute the resolved media once per render**

Find `const restDuration = currentExercise?.isRest ? currentExercise.repCount : 0;` (around `workout-app.jsx:382`) and add directly beneath it:

```js
  const exerciseMedia =
    currentExercise && !currentExercise.isRest ? resolveExercise(currentExercise) : null;
```

- [ ] **Step 3: Replace the placeholder image with video-or-placeholder**

In the exercise-display branch (`workout-app.jsx:886`), replace:

```jsx
                {/* Placeholder image area */}
                <img
                  src="/Gemini_muscle_lady.png"
                  alt="Exercise illustration"
                  style={styles.exerciseImage}
                />
```

with:

```jsx
                {/* Exercise media: catalog video (mirrored for the right side) or placeholder */}
                {exerciseMedia && exerciseMedia.videoSrc ? (
                  <video
                    src={exerciseMedia.videoSrc}
                    style={{
                      ...styles.exerciseImage,
                      transform: exerciseMedia.mirror ? "scaleX(-1)" : undefined,
                    }}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src="/Gemini_muscle_lady.png"
                    alt="Exercise illustration"
                    style={styles.exerciseImage}
                  />
                )}
```

- [ ] **Step 4: Show the side in the title**

In the same block, replace `<h2 style={styles.exerciseName}>{currentExercise.name}</h2>` with:

```jsx
                <h2 style={styles.exerciseName}>{formatExerciseTitle(currentExercise)}</h2>
```

- [ ] **Step 5: Use resolved tips**

Replace `{currentExercise.tips || TIPS_DEFAULT}` (in the tips box, `workout-app.jsx:922`) with:

```jsx
                    {(exerciseMedia && exerciseMedia.tips) || TIPS_DEFAULT}
```

- [ ] **Step 6: Verify in the browser preview**

Start the dev server (`preview_start` with the `vite` dev script — create `.claude/launch.json` with a config named `dev` running `npm` `["run","dev"]` on port 5173 if none exists), open a workout in step-through mode, advance to a sided exercise.

Check with `read_page` / `read_console_messages`:
- Title shows e.g. `Single Leg RDL · Left` then `· Right` on the next step.
- No console errors.
- The placeholder image still renders (no clips exist yet) — the `<video>` branch is dormant until `video` values are filled in.

Then temporarily prove the video path end-to-end: in `workouts/exercises.data.js` set one entry's `video` to any existing asset (e.g. `"/Gemini_muscle_lady.png"` — a still is fine to confirm wiring and the `scaleX(-1)` flip on the Right step), reload, screenshot Left vs Right to confirm the mirror, then revert the edit.

- [ ] **Step 7: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: play catalog video (mirrored for right side) in guided view"
```

---

### Task 7: Wire the checklist detail sheet + rows

**Files:**
- Modify: `ChecklistScreen.jsx:6` (import), `:169-170` (row title), `:208-215` (detail sheet)

- [ ] **Step 1: Add the import**

After `import EndWorkoutModal from "./EndWorkoutModal";` (`ChecklistScreen.jsx:7`), add:

```js
import { resolveExercise, formatExerciseTitle } from "./workouts/exercises.js";
```

- [ ] **Step 2: Show the side in the list row**

Replace the row title (`ChecklistScreen.jsx:169-170`):

```jsx
                                  {item.name}
                                  <span style={s.rowReps}> · {item.repCount}</span>
```

with:

```jsx
                                  {formatExerciseTitle(item)}
                                  <span style={s.rowReps}> · {item.repCount}</span>
```

- [ ] **Step 3: Wire media + side + tips into the detail sheet**

Replace the detail-sheet inner block (`ChecklistScreen.jsx:208-215`):

```jsx
            <div style={s.sheetMedia}>▶ demo coming soon</div>
            <div style={s.sheetName}>{detailItem.name}</div>
            <div style={s.sheetReps}>{detailItem.repCount}</div>
            <div style={s.tipBox}>
              <span style={s.tipIcon}>ℹ️</span>
              <span style={s.tipText}>{detailItem.tips || TIPS_DEFAULT}</span>
            </div>
```

with:

```jsx
            {(() => {
              const media = resolveExercise(detailItem);
              return (
                <>
                  {media.videoSrc ? (
                    <video
                      src={media.videoSrc}
                      style={{ ...s.sheetMedia, transform: media.mirror ? "scaleX(-1)" : undefined }}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <div style={s.sheetMedia}>▶ demo coming soon</div>
                  )}
                  <div style={s.sheetName}>{formatExerciseTitle(detailItem)}</div>
                  <div style={s.sheetReps}>{detailItem.repCount}</div>
                  <div style={s.tipBox}>
                    <span style={s.tipIcon}>ℹ️</span>
                    <span style={s.tipText}>{media.tips || TIPS_DEFAULT}</span>
                  </div>
                </>
              );
            })()}
```

- [ ] **Step 4: Verify in the browser preview**

With the dev server running, switch a workout to Checklist view, open a sided exercise's ⓘ detail sheet.

Check with `read_page` / `read_console_messages`:
- Row and sheet titles show the side (e.g. `Single Leg RDL · Left`).
- The `▶ demo coming soon` box still shows (no clips yet); no console errors.
- Reuse the temporary `video` edit from Task 6 Step 6 to confirm the sheet plays + mirrors, then revert.

- [ ] **Step 5: Commit**

```bash
git add ChecklistScreen.jsx
git commit -m "feat: show catalog video + side in checklist detail sheet"
```

---

### Task 8: CSV parser — `Side` column (future authoring)

Only affects **future** imports; already-generated workout files are untouched. New CSV column order: `Phase, Circuit, Rounds, Exercise, Side, RepCount, Tips` (Side sits directly after Exercise).

**Files:**
- Modify: `workouts/parse-csv.js`
- Test: `workouts/parse-csv.test.js`

- [ ] **Step 1: Write the failing tests**

`workouts/parse-csv.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWorkoutCsv } from "./parse-csv.js";

const csv = [
  "Phase,Circuit,Rounds,Exercise,Side,RepCount,Tips",
  "Warm Up,1,1,Forward Lunge,L,8,keep tall",
  ",,,Sumo Squat,,10,",
  ",,,Single Arm Row,Alternating,12,",
  "Superset 1,2,2,Split Squat,Right,8,",
  ",,,Rest,,30,",
].join("\n");

test("Side column parses into a normalized side, omitted when blank", () => {
  const { phases } = parseWorkoutCsv(csv, "T");
  const c0 = phases[0].circuits[0].exercises;
  assert.equal(c0[0].side, "Left");        // "L" -> "Left"
  assert.equal(c0[1].side, undefined);     // blank -> omitted (bilateral)
  assert.equal(c0[2].side, "Alternating");
  assert.equal(phases[1].circuits[0].exercises[0].side, "Right");
});

test("Rest rows carry no side", () => {
  const { phases } = parseWorkoutCsv(csv, "T");
  const rest = phases[1].circuits[0].exercises[1]; // Rest follows Split Squat in the same circuit
  assert.equal(rest.name, "Rest");
  assert.equal(rest.side, undefined);
});

test("an unrecognized Side value throws", () => {
  const bad = "Phase,Circuit,Rounds,Exercise,Side,RepCount,Tips\nP,1,1,Forward Lunge,sideways,8,";
  assert.throws(() => parseWorkoutCsv(bad, "T"), /Unknown Side value/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test workouts/parse-csv.test.js`
Expected: FAIL — `side` is `undefined` (the parser doesn't read the column yet).

- [ ] **Step 3: Update the parser**

In `workouts/parse-csv.js`, update the header comment's column line and output shape to include `Side` / `side?`:

```js
 * Expected CSV columns: Phase, Circuit, Rounds, Exercise, Side, RepCount, Tips
```
```js
 *           { repeatCount, exercises: [{ name, repCount, tips?, side? }, ...] },
```

Change the row destructure from:

```js
  for (const [phaseName, circuit, rounds, exercise, repCount, tips] of rows) {
```

to:

```js
  for (const [phaseName, circuit, rounds, exercise, side, repCount, tips] of rows) {
```

Update **both** `buildExercise` call sites to pass `side`:

```js
          exercises: [buildExercise(exercise, side, rep, tips)],
```
```js
      currentCircuit.exercises.push(buildExercise(exercise, side, rep, tips));
```

Replace `buildExercise` and add `normalizeSide`:

```js
/** Builds an exercise object, omitting tips/side when blank. */
function buildExercise(name, side, repCount, tips) {
  const obj = { name, repCount };
  if (tips) obj.tips = tips;
  const normalized = normalizeSide(side);
  if (normalized) obj.side = normalized;
  return obj;
}

/** Normalizes a Side cell to "Left" | "Right" | "Alternating" (blank = none). */
function normalizeSide(raw) {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (["l", "left"].includes(v)) return "Left";
  if (["r", "right"].includes(v)) return "Right";
  if (["a", "alt", "alternating"].includes(v)) return "Alternating";
  throw new Error(`Unknown Side value: "${raw}"`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test workouts/parse-csv.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add workouts/parse-csv.js workouts/parse-csv.test.js
git commit -m "feat: parse Side column into exercise side field"
```

---

### Task 9: Coverage report + docs

**Files:**
- Create: `scripts/exercise-coverage.mjs`
- Modify: `README.md` (or create `docs/exercise-catalog.md`)

- [ ] **Step 1: Write the coverage script**

`scripts/exercise-coverage.mjs`:

```js
// Prints how many catalog movements have a clip yet. Run: node scripts/exercise-coverage.mjs
import { EXERCISES } from "../workouts/exercises.data.js";

const all = Object.entries(EXERCISES);
const withVideo = all.filter(([, e]) => e.video);
const needAlt = all.filter(([, e]) => "videoAlternating" in e);
const withAlt = needAlt.filter(([, e]) => e.videoAlternating);

console.log(`Movements:            ${all.length}`);
console.log(`With single-side clip: ${withVideo.length} / ${all.length}`);
console.log(`Need an alt clip:      ${needAlt.length}  (have ${withAlt.length})`);
console.log(`\nStill missing a primary clip:`);
for (const [slug, e] of all.filter(([, e]) => !e.video)) console.log(`  - ${e.name} (${slug})`);
```

- [ ] **Step 2: Run it**

Run: `node scripts/exercise-coverage.mjs`
Expected: `With single-side clip: 0 / 91` initially, and a printed list of all 91 movements still needing a clip.

- [ ] **Step 3: Document the workflow**

Add a short section to `README.md` (create `docs/exercise-catalog.md` if the README has no natural home) describing the catalog:

```markdown
## Exercise videos

- Movements live in `workouts/exercises.data.js`, keyed by slug. Each has
  `{ name, tips, video, videoAlternating? }`.
- To add a clip: drop the file in `public/videos/` (name it `<slug>.mp4`, or
  `<slug>-alt.mp4` for the alternating version), then set the matching `video` /
  `videoAlternating` path in `workouts/exercises.data.js`.
- Right-side instances reuse the single-side clip mirrored (`scaleX(-1)`); no
  separate file needed. Alternating uses `videoAlternating`, falling back to
  `video`.
- `node scripts/exercise-coverage.mjs` reports what still needs filming (stdout),
  and `docs/exercise-todo.md` (rewritten by the generator) is the git-tracked
  checklist of the same.
- After adding/removing exercises in workouts, run `node scripts/generate-catalog.mjs`.
  It's an **upsert**: your `video`/`tips` values are preserved, new movements are
  added (and printed as `+ N new:`), and movements no longer used are kept with a
  `! N no longer used` warning. Safe to run any time.

**Authoring loop going forward:** normalize names in the spreadsheet → add a `Side`
column (`L`/`R`/`A` or blank) → export CSV → import via the update-workouts skill
(the parser emits `side`) → `node scripts/generate-catalog.mjs` (adds + logs any new
movement, keeps your clips) → `npm test` green → shoot the clip when ready. Wiring
this generator step into the update-workouts skill is a small follow-up.

- [ ] **Step 4: Commit**

```bash
git add scripts/exercise-coverage.mjs README.md
git commit -m "chore: exercise video coverage report + docs"
```

---

### Task 10: Update the update-workouts skill

The `.claude/skills/update-workouts/SKILL.md` documents the CSV import flow. Now that CSVs carry a `Side` column and each import can introduce a new catalog movement, the skill must (a) document the new format and (b) require the agent to regenerate the catalog and **report any new movement to Katie**. `scripts/generate-workout.mjs` needs **no** change — it `JSON.stringify`s the parsed object, so `side` rides through automatically.

**Files:**
- Modify: `.claude/skills/update-workouts/SKILL.md`

- [ ] **Step 1: Update the CSV format reference**

In the "CSV format reference" section, change:

```
The parser destructures columns as
`Phase, Circuit, Rounds, Exercise, RepCount, Tips` — a **single `Tips` column**
```

to:

```
The parser destructures columns as
`Phase, Circuit, Rounds, Exercise, Side, RepCount, Tips`. `Side` sits directly
after `Exercise` and holds `L` / `R` / `A` (or the full words, or blank for
bilateral); the parser normalizes it to `"Left"` / `"Right"` / `"Alternating"`
and throws on any other value. `Tips` remains a **single column**
```

And add a bullet to that section's list:

```
- A blank `Side` cell means the movement is bilateral (no `side` on the exercise).
  Sided movements use `L`/`R`; movements that alternate sides within the set use `A`.
```

- [ ] **Step 2: Update the "Data model produced" block**

Change:

```
Exercise:{ name, repCount, tips? }   // repCount: string or number(seconds for Rest)
```

to:

```
Exercise:{ name, repCount, tips?, side? }   // side: "Left"|"Right"|"Alternating" (omitted = bilateral)
```

- [ ] **Step 3: Add a catalog-regeneration step to the Procedure**

Insert a new section between "### 3. Register in `workouts/index.js`" and "### 4. Verify in the running app", and renumber Verify to `### 5.`:

```markdown
### 4. Regenerate the exercise catalog

The workout may reference a movement the catalog doesn't have yet. Regenerate it:

```bash
node scripts/generate-catalog.mjs
```

This is a safe upsert — it preserves existing clip paths and adds any new movement.
**Read its output and act on it:**

- If it prints `+ N new: …`, **tell Katie explicitly** which new movement(s) it
  added and that each needs a video clip filmed (they render the placeholder until
  then). This is the one signal she can't easily recover if you swallow it.
- If it prints `! N no longer used`, mention which movements are now orphaned (a
  possible rename/typo to double-check).
- `git diff workouts/exercises.data.js` shows the exact catalog change; the running
  checklist of unfilmed movements lives in `docs/exercise-todo.md`.
```

- [ ] **Step 4: Add checklist items**

In the "Quick checklist" section, add:

```
- [ ] Checked CSV header includes the `Side` column (`…, Exercise, Side, RepCount, Tips`)
- [ ] Ran `node scripts/generate-catalog.mjs`; reported any `+ N new:` movement(s) to Katie as needing a clip
```

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/update-workouts/SKILL.md
git commit -m "docs: update-workouts skill covers Side column + catalog regen"
```

---

## Self-review

- **Spec coverage:** catalog as source of truth (Task 1–2) ✓; side-as-modifier migration (Task 3) ✓; one-clip-mirrored + alternating clip (Task 1 resolver, Tasks 6–7 render) ✓; default-tips-with-override (resolver + render) ✓; name-consistency enforcement (Task 5 guard) ✓; placeholder fallback until clips exist (Tasks 6–7) ✓; future authoring via `Side` column (Task 8) ✓; catalog upsert with new-movement logging, unit-tested via `mergeCatalog` (Task 2) ✓; durable unfilmed-movement worklist `docs/exercise-todo.md` (Task 2) ✓; coverage auditability (Task 9) ✓; skill documents the new format + requires reporting new movements (Task 10) ✓.
- **Type/shape consistency:** `resolveExercise` returns `{ videoSrc, mirror, tips }` — used identically in Tasks 6 and 7. `deriveCore` returns `{ core, side } | null` — used identically in generator and migrator. `normalizeSide` (Task 8) and `deriveCore` (Task 2) both yield exactly `"Left" | "Right" | "Alternating"` or none, matching the `side` values the resolver and `formatExerciseTitle` expect. Catalog entry shape `{ name, tips, video, videoAlternating? }` — produced by the generator, read by the resolver.
- **Deferred correctly:** auto-play vs tap-to-play (ships auto-play), default-tip authoring (catalog `tips: ""`), inactive-file migration, wiring the generator step into the update-workouts skill.
- **Known follow-ups (not blockers):** reactivating foundation/week workouts needs a re-run of Tasks 2–3 against them (the upsert generator + migrator handle any workout you point them at).
