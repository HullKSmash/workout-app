// Sole owner of the workouts/exercises.data.js generated-file format.
// Used by the DB exporter (scripts/lib/export-model.mjs) to render the catalog
// from the exercise DB (data/data.sql).

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
  return `// GENERATED FILE — regenerate with \`npm run db:export\`.
// Source of truth is the exercise DB (data/data.sql); edit there, not here.
export const EXERCISES = {
${body}
};
`;
}
