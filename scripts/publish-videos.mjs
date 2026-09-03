// scripts/publish-videos.mjs
// Publish staged exercise clips: upload to Vercel Blob (public), patch the catalog
// on a `video-drops` branch via an isolated worktree, and open/update its PR.
//
// Usage:
//   npm run publish-videos            # real run
//   npm run publish-videos -- --dry-run   # validate + show plan, no uploads/git
//
// Staging dir: $EXERCISE_CLIPS_DIR, else an `exercise-clips` folder alongside the
// repo (its sibling, e.g. ~/code/exercise-clips). Clips must be named
// "<slug>.mp4" (primary) or "<slug>-alt.mp4" (alternating variant).
import { readFileSync, readdirSync, writeFileSync, rmSync, mkdtempSync, existsSync } from "fs";
import { pathToFileURL } from "url";
import { execFileSync } from "child_process";
import { tmpdir } from "os";
import path from "path";
import { put } from "@vercel/blob";
import { parseClipName } from "./lib/parse-clip-name.mjs";
import { openDb } from "./lib/db.mjs";
import { readModel } from "./lib/read-model.mjs";
import { emitDataSql } from "./lib/emit-data-sql.mjs";
import { applyVideoUrls } from "./lib/apply-video-urls.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const STAGING = process.env.EXERCISE_CLIPS_DIR || path.resolve(REPO, "..", "exercise-clips");
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

    // 4. Write the URLs into the worktree's DB source, then re-export the catalog
    //    from it. exercises.data.js is a generated file — the URL must live in
    //    data/data.sql or the next `db:export` would wipe it.
    const dataSqlPath = path.join(wt, "data/data.sql");
    if (!existsSync(dataSqlPath)) {
      throw new Error(
        `${BRANCH} base has no data/data.sql — the exercise DB must be on master before videos can be published. Merge the exercise-database branch first.`
      );
    }
    const db = openDb({ schemaPath: path.join(wt, "data/schema.sql"), dataPath: dataSqlPath });
    // applyVideoUrls throws if a slug is absent — the exercise must be merged first.
    const model = applyVideoUrls(readModel(db), uploads);
    db.close();
    writeFileSync(dataSqlPath, emitDataSql(model));
    execFileSync("node", ["scripts/export-app.mjs"], { cwd: wt, stdio: "inherit" });

    // 5. Commit + push. No-op safely if nothing changed.
    if (git(["status", "--porcelain"], wt) === "") {
      console.log("Catalog already up to date; nothing to commit.");
    } else {
      const names = uploads.map((u) => u.slug).join(", ");
      git(["add", "data/data.sql", "workouts/exercises.data.js"], wt);
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
