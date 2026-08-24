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
