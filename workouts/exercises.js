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

// Resolve one workout-instance exercise (keyed by slug) against the catalog.
// Returns { name, videoSrc, mirror, tips } — videoSrc null means "placeholder".
export function resolveExercise(instance, catalog = EXERCISES) {
  const { slug, side } = instance;
  const entry = catalog[slug] || null;
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
  const name = entry ? entry.name : slug;
  const tips = (instance.tips ?? null) || (entry && entry.tips) || null;
  return { name, videoSrc, mirror, tips };
}

// Display title: catalog name plus a side suffix when the instance is sided.
export function formatExerciseTitle(instance, catalog = EXERCISES) {
  const entry = catalog[instance.slug];
  const name = entry ? entry.name : instance.slug;
  return instance.side ? `${name} · ${instance.side}` : name;
}
