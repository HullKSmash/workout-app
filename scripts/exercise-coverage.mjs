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
