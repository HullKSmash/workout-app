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
  let added = false;
  let pushed = false;
  try {
    git(["worktree", "add", wt, "-B", BRANCH, remoteHas ? `origin/${BRANCH}` : "origin/master"]);
    added = true;

    // 4. Patch the worktree's catalog and write it.
    let wtCatalog = await loadCatalog(wt);
    for (const u of uploads) {
      if (!wtCatalog[u.slug]) {
        throw new Error(
          `"${u.slug}" is not in the ${BRANCH} base catalog. Its workout/exercise must be merged to master before its video can be published.`
        );
      }
      wtCatalog = patchCatalog(wtCatalog, u.slug, u.field, u.url);
    }
    writeFileSync(path.join(wt, "workouts/exercises.data.js"), serializeCatalog(wtCatalog));

    // 5. Commit + push. No-op safely if nothing changed.
    if (git(["status", "--porcelain"], wt) === "") {
      console.log("Catalog already up to date; nothing to commit.");
    } else {
      const names = uploads.map((u) => u.slug).join(", ");
      git(["add", "workouts/exercises.data.js"], wt);
      git(["commit", "-m", `feat: add exercise clips (${names})`], wt);
      git(["push", "-u", "origin", BRANCH], wt);
      pushed = true;
    }
  } finally {
    if (added) {
      try { git(["worktree", "remove", wt, "--force"]); }
      catch (e) { console.warn(`  (could not remove worktree ${wt}: ${e.message})`); }
    }
  }

  // 6. Ensure a PR exists (idempotent) and clear staging — only if the branch is on the remote.
  if (!remoteHas && !pushed) {
    console.log("\nCatalog already current on master; nothing to publish. Staging left untouched.");
    return;
  }
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
