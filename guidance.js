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
          "Pick any workouts you like and aim to do 3 sessions a week. Keep in mind that the objective is to support your riding with targeted strength training, not to detract from it. Pick your weights, choose the reps that feel right today, take an adaptation that you know, change your mind whenever you want - listen to your body and adjust accordingly. Your weekly progress tracker will automatically reset every Monday.",
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
          "Pick any workouts you like and aim to do 3 sessions a week. Keep in mind that the objective is to support your running with targeted strength training, not to detract from it. Pick your weights, choose the reps that feel right today, take an adaptation that you know, change your mind whenever you want - listen to your body and adjust accordingly. Your weekly progress tracker will automatically reset every Monday.",
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
          "Pick any workouts you like and aim to do 3 sessions a week. Keep in mind that the objective is to support your life with targeted strength training, not to detract from it. Pick your weights, choose the reps that feel right today, take an adaptation that you know, change your mind whenever you want - listen to your body and adjust accordingly. Your weekly progress tracker will automatically reset every Monday.",
        ],
      },
    ],
  },
};

// Shared "how-to" sections shown on every variant's Guidance & Tips screen,
// below the variant-specific sections, as collapsible rows. Identical across
// variants, so authored once here rather than duplicated per variant.
//
// Section shape: { title, body?, stepGroups? }
//   - body: array of paragraph strings
//   - stepGroups: array of { label, steps: [{ text, image? }] }
//       image: { src, alt } — inline screenshot for a step (iOS only)
export const HOW_TO = [
  {
    title: "Saving your progress",
    body: [
      "Your weekly progress is saved locally on your device, not on a server, which means it can occasionally reset (say, if you clear your browser data or switch devices). If your weekly progress checkmarks ever disappear unexpectedly, no problem: just tap the circles at the top of the workout list to mark the sessions you've done this week.",
    ],
  },
  {
    title: "Add to your home screen",
    body: [
      "For the best experience, add SetGo to your home screen to have it conveniently accessible and open full-screen like an app.",
    ],
    stepGroups: [
      {
        label: "On an iPhone (Safari)",
        steps: [
          {
            text: "Tap the ••• menu.",
            image: {
              src: "/guidance/ios-menu.png",
              alt: "Safari toolbar with the ••• menu button highlighted",
            },
          },
          {
            text: "Tap Share.",
            image: {
              src: "/guidance/ios-share.png",
              alt: "Safari menu with Share highlighted",
            },
          },
          {
            text: "Scroll down and tap Add to Home Screen.",
            image: {
              src: "/guidance/ios-add.png",
              alt: "Share sheet with Add to Home Screen highlighted",
            },
          },
          {
            text: "Tap Add — the SetGo icon lands on your home screen.",
            image: {
              src: "/guidance/ios-confirm.png",
              alt: "Add to Home Screen dialog with the Add button highlighted",
            },
          },
        ],
      },
      {
        label: "On Android (Chrome)",
        steps: [
          { text: "Tap the ⋮ menu (top-right)." },
          { text: "Tap Add to Home screen (or Install app)." },
          { text: "Tap Add to confirm." },
        ],
      },
    ],
  },
];
