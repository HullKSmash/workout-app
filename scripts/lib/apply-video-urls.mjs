// Pure: set uploaded clip URLs onto the exercise rows of a DB model (as read by
// read-model.mjs). `uploads` are { slug, field, url } where `field` is the
// catalog field name ("video" | "videoAlternating"); it maps to the DB column
// (video | video_alternating). Returns a new model; does not mutate the input.
// Throws if a slug is not in the model (its exercise must reach the DB first) or
// the field is unknown.
const COLUMN = { video: "video", videoAlternating: "video_alternating" };

export function applyVideoUrls(model, uploads) {
  const exercises = model.exercises.map((e) => ({ ...e }));
  const bySlug = new Map(exercises.map((e) => [e.slug, e]));
  for (const { slug, field, url } of uploads) {
    const column = COLUMN[field];
    if (!column) throw new Error(`applyVideoUrls: unknown field "${field}"`);
    const exercise = bySlug.get(slug);
    if (!exercise) {
      throw new Error(`"${slug}" is not in the DB catalog — its exercise must be seeded/merged into data/data.sql before its video can be published.`);
    }
    exercise[column] = url;
  }
  return { ...model, exercises };
}
