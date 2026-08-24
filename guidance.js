// Variant-specific "Guidance & Tips" content, keyed by variant key (same keys
// as VARIANTS in variants.js). Each entry has an ordered list of sections.
//
// Section shape: { title, body?, subsections? }
//   - body: array of paragraph strings
//   - subsections: array of the same Section shape (one level deep in practice)
//
// Variants without an entry here simply have no guidance screen (the card is
// hidden). "paul" uses its own bespoke copy.
export const GUIDANCE = {
  equestrian: {
    sections: [
      {
        title: "Strength training for riders!",
        body: [
          "These workouts are optimized to hit the muscles and movements you need for effective riding: core strength and control, unilateral isolation for symmetry, light plyometrics for soft impact absorption, proprioception and balance for subtle and responsive body control, and postural strength for strong but relaxed equitation.",
          "Pick any workouts you like and aim to do 3 sessions a week. Keep in mind that the objective is to support your riding with targeted strength training, not to detract from it. Pick your weights, choose the reps that feel right today, take an adaptation that you know, change your mind whenever you want - listen to your body and adjust accordingly.",
        ],
      },
    ],
  },
  run: {
    sections: [
      {
        title: "Strength training for runners!",
        body: [
          "These workouts are designed to hit the muscles and movements you need to optimize your running: posterior chain strength, unilateral isolation for symmetry, plyometrics for impact absorption, proprioception and balance for efficient movement, and overall strength for postural endurance.",
          "Pick any workouts you like and aim to do 3 sessions a week. Keep in mind that the objective is to support your running with targeted strength training, not to detract from it. Pick your weights, choose the reps that feel right today, take an adaptation that you know, change your mind whenever you want - listen to your body and adjust accordingly.",
        ],
      },
    ],
  },
  paul: {
    sections: [
      {
        title: "Strength training for Paul!",
        body: [
          "These workouts are all of Paul's favorite exercises.",
          "Pick any workouts you like and aim to do 3 sessions a week. Keep in mind that the objective is to support your life with targeted strength training, not to detract from it. Pick your weights, choose the reps that feel right today, take an adaptation that you know, change your mind whenever you want - listen to your body and adjust accordingly.",
        ],
      },
    ],
  },
};
