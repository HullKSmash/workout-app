// Validate a staged clip filename against the catalog.
// Returns { ok:true, slug, field } or { ok:false, filename, reason }.
// Convention: "<slug>.mp4" -> video ; "<slug>-alt.mp4" -> videoAlternating.
// An "-alt" clip asserts the exercise has an alternating variant: its
// videoAlternating field is created on the catalog entry if not already present.

export function parseClipName(filename, catalog) {
  const fail = (reason) => ({ ok: false, filename, reason });
  if (!filename.endsWith(".mp4")) return fail(`not an .mp4 file`);
  const stem = filename.slice(0, -".mp4".length);
  const isAlt = stem.endsWith("-alt");
  const slug = isAlt ? stem.slice(0, -"-alt".length) : stem;
  const entry = catalog[slug];
  if (!entry) return fail(`no catalog entry for slug "${slug}"`);
  return { ok: true, slug, field: isAlt ? "videoAlternating" : "video" };
}
