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
