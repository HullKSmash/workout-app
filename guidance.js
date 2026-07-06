// Variant-specific "Guidance & Tips" content, keyed by variant key (same keys
// as VARIANTS in variants.js). Each entry has an ordered list of sections.
//
// Section shape: { title, body?, subsections? }
//   - body: array of paragraph strings
//   - subsections: array of the same Section shape (one level deep in practice)
//
// Variants without an entry here simply have no guidance screen (the card is
// hidden). "paul" uses the generic (sport-agnostic) copy.
export const GUIDANCE = {
  equestrian: {
    sections: [
      {
        title: "This is your workout",
        body: [
          "Above all else, these are YOUR workouts - the objective is to support your riding with targeted strength training, not to detract from it. Change your weights, change your reps, take an adaptation that you know - listen to your body and adjust accordingly. This not only helps you get a more effective workout; paying attention to your body will help your overall coordination, control, balance, and proprioception, all of which will help your riding. Take the chance to practice here!",
        ],
      },
      {
        title: "Reps & choosing weights",
        body: [
          "A single rep generally means movement from the starting position, through the exercise, and back to the starting position. If an exercise involves working one side at a time, make sure to work both sides evenly.",
          "Rep ranges are guidance for how hard each rep should be. By the last rep or two, you should feel like you can't do more without compromising correct form. If a given range is too easy, pick up a heavier weight (or do more reps - it's your workout!). If it's too hard, use a lighter weight.",
        ],
        subsections: [
          {
            title: "“To Fatigue”",
            body: [
              "Some exercises are marked as “To Fatigue” instead of having a range of reps. To work to fatigue, do as many as you can without compromising correct form.",
            ],
          },
          {
            title: "Soreness",
            body: [
              "These workouts aren't meant to burn you out. If you find yourself getting really sore or tired from them, you're going too hard - start easier! Use lighter weights and fewer reps until it's too easy.",
            ],
          },
        ],
      },
      {
        title: "Technique",
        subsections: [
          {
            title: "Go slow",
            body: [
              "Strength training is an opportunity to shape habitual movement patterns by intentionally engaging and building the muscles we want to do the heavy lifting while ensuring smaller, stabilizing muscles get attention and neural activation. Moving slowly and with conscious control through your workout ensures you're working the muscles and shaping the patterns you want. It also gives you the opportunity to practice and improve your proprioception - a foundational skill for riding.",
            ],
          },
          {
            title: "Relax non-working muscles",
            body: [
              "When performing an exercise, make a point to relax the parts of your body that aren't working. This is how you practice that strong but relaxed position in the saddle, where you can be using your leg while keeping your hand soft. Key body parts that tend to tense when other parts are working are your face, neck, shoulders, hands, and feet. Use your breath to relax on each exhale.",
            ],
          },
          {
            title: "Maintain your posture",
            body: [
              "One exception to the above rule is that you generally want to keep your core and postural muscles engaged enough that you maintain spinal alignment and support. This builds a habit of keeping your upper body tall (as you would in the saddle) and your core stable nearly regardless of what the rest of your body is doing.",
            ],
          },
        ],
      },
    ],
  },
  run: {
    sections: [
      {
        title: "This is your workout",
        body: [
          "Above all else, these are YOUR workouts - the objective is to support your running with targeted strength training, not to detract from it. Change your weights, change your reps, take an adaptation that you know - listen to your body and adjust accordingly. This not only helps you get a more effective workout; paying attention to your body will help your overall coordination, control, balance, and proprioception, all of which will help your running. Take the chance to practice here!",
        ],
      },
      {
        title: "Reps & choosing weights",
        body: [
          "A single rep generally means movement from the starting position, through the exercise, and back to the starting position. If an exercise involves working one side at a time, make sure to work both sides evenly.",
          "Rep ranges are guidance for how hard each rep should be. By the last rep or two, you should feel like you can't do more without compromising correct form. If a given range is too easy, pick up a heavier weight (or do more reps - it's your workout!). If it's too hard, use a lighter weight.",
        ],
        subsections: [
          {
            title: "“To Fatigue”",
            body: [
              "Some exercises are marked as “To Fatigue” instead of having a range of reps. To work to fatigue, do as many as you can without compromising correct form.",
            ],
          },
          {
            title: "Soreness",
            body: [
              "These workouts aren't meant to burn you out. If you find yourself getting really sore or tired from them, you're going too hard - start easier! Use lighter weights and fewer reps until it's too easy.",
            ],
          },
        ],
      },
      {
        title: "Technique",
        subsections: [
          {
            title: "Go slow",
            body: [
              "Strength training is an opportunity to shape habitual movement patterns by intentionally engaging and building the muscles we want to do the heavy lifting while ensuring smaller, stabilizing muscles get attention and neural activation. Moving slowly and with conscious control through your workout ensures you're working the muscles and shaping the patterns you want. It also gives you the opportunity to practice and improve your proprioception, which will also help you be able to achieve and maintain effective form while running.",
            ],
          },
          {
            title: "Relax non-working muscles",
            body: [
              "When performing an exercise, make a point to relax the parts of your body that aren't working, just as you conserve energy by avoiding unnecessary tension while running. Key body parts that tend to tense when other parts are working are your face, neck, shoulders, hands, and feet. Use your breath to relax on each exhale.",
            ],
          },
          {
            title: "Maintain your posture",
            body: [
              "One exception to the above rule is that you generally want to keep your core and postural muscles engaged enough that you maintain spinal alignment and support. Strengthening these muscles and making good posture second nature will help you maintain good running form and conserve energy late in your runs when you get tired.",
            ],
          },
        ],
      },
    ],
  },
  paul: {
    sections: [
      {
        title: "This is your workout",
        body: [
          "Above all else, these are YOUR workouts - the objective is to support your primary sport with targeted strength training, not to detract from it. Change your weights, change your reps, take an adaptation that you know - listen to your body and adjust accordingly. This not only helps you get a more effective workout; paying attention to your body will help your overall coordination, control, balance, and proprioception, all of which will help your athleticism. Take the chance to practice here!",
        ],
      },
      {
        title: "Reps & choosing weights",
        body: [
          "A single rep generally means movement from the starting position, through the exercise, and back to the starting position. If an exercise involves working one side at a time, make sure to work both sides evenly.",
          "Rep ranges are guidance for how hard each rep should be. By the last rep or two, you should feel like you can't do more without compromising correct form. If a given range is too easy, pick up a heavier weight (or do more reps - it's your workout!). If it's too hard, use a lighter weight.",
        ],
        subsections: [
          {
            title: "“To Fatigue”",
            body: [
              "Some exercises are marked as “To Fatigue” instead of having a range of reps. To work to fatigue, do as many as you can without compromising correct form.",
            ],
          },
          {
            title: "Soreness",
            body: [
              "These workouts aren't meant to burn you out. If you find yourself getting really sore or tired from them, you're going too hard - start easier! Use lighter weights and fewer reps until it's too easy.",
            ],
          },
        ],
      },
      {
        title: "Technique",
        subsections: [
          {
            title: "Go slow",
            body: [
              "Strength training is an opportunity to shape habitual movement patterns by intentionally engaging and building the muscles we want to do the heavy lifting while ensuring smaller, stabilizing muscles get attention and neural activation. Moving slowly and with conscious control through your workout ensures you're working the muscles and shaping the patterns you want. It also gives you the opportunity to practice and improve your proprioception - a foundational skill for many sports.",
            ],
          },
          {
            title: "Relax non-working muscles",
            body: [
              "When performing an exercise, make a point to relax the parts of your body that aren't working. This is how you practice strong but relaxed and efficient movement. Key body parts that tend to tense when other parts are working are your face, neck, shoulders, hands, and feet. Use your breath to relax on each exhale.",
            ],
          },
          {
            title: "Maintain your posture",
            body: [
              "One exception to the above rule is that you generally want to keep your core and postural muscles engaged enough that you maintain spinal alignment and support. This builds a habit of keeping your upper body tall and your core stable nearly regardless of what the rest of your body is doing.",
            ],
          },
        ],
      },
    ],
  },
};
