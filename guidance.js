// Variant-specific "Guidance & Tips" content, keyed by variant key (same keys
// as VARIANTS in variants.js). Each entry has an ordered list of sections.
//
// Section shape: { title, body?, subsections? }
//   - body: array of paragraph strings
//   - subsections: array of the same Section shape (one level deep in practice)
//
// Variants without an entry here simply have no guidance screen (the card is
// hidden). Add paul entry with the same shape when its doc exists.
export const GUIDANCE = {
  equestrian: {
    sections: [
      {
        title: "This is your workout",
        body: [
          "Above all else, these are YOUR workouts - the objective is to support your riding with targeted strength training, not to detract from it. Consider every workout an opportunity to listen to your body and adjust your plan accordingly. This not only helps you hit the sweet spot of seeing progress without overdoing it; paying attention to your body will help your overall coordination, control, balance, and proprioception, all of which will help your riding. Take the chance to practice here!",
        ],
      },
      {
        title: "Reps & choosing weights",
        body: [
          "With the above in mind, consider that rep ranges are guidance for how hard each rep should be. By the last rep or two, you should be feeling like you can't do more without compromising correct form. If you get to the top of the range and feel like you hardly worked, pick up a heavier weight to fatigue in fewer reps (and make sure your form is correct such that you didn't take a shortcut). If you can't get to the bottom of the rep range without losing your form, use a lighter weight or only bodyweight.",
        ],
        subsections: [
          {
            title: "“To Fatigue”",
            body: [
              "Some exercises are marked as “To Fatigue” instead of having a range of reps. These are generally bodyweight exercises that will have a wide variation in where you fatigue based on your specific musculoskeletal makeup and proportions. To work to fatigue, do as many as you can without compromising correct form.",
            ],
          },
          {
            title: "Soreness",
            body: [
              "These workouts aren't meant to regularly burn you out. If you find yourself getting too sore or tired to ride effectively, or find yourself avoiding strength training to avoid soreness, you're going too hard - start easier! Choose lighter weights and fewer reps until it's too easy.",
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
              "Over time of moving through the world and riding, we all develop unconscious movement patterns that favor certain muscles at the expense of others. Strength training is an opportunity to shape these patterns by intentionally engaging and building the muscles we want to do the heavy lifting while ensuring smaller, stabilizing muscles get attention and neural activation.",
              "Moving slowly and with conscious control through your workout ensures you're working the muscles and shaping the patterns you want. It also gives you the opportunity to practice and improve your proprioception - the awareness of where your body parts are and what they're doing without looking at them, which you already know or can imagine is a foundational skill for riding.",
            ],
          },
          {
            title: "Relax non-working muscles",
            body: [
              "When performing an exercise, make a point to relax the parts of your body that aren't working. This is how you practice that strong but relaxed position in the saddle, where you can be using your leg while keeping your hand soft. Key body parts that tend to tense when other parts are working are your face, neck, shoulders, hands, and feet. Finding an intentional but natural breathing rhythm can help you here - make a point to relax on each exhale.",
            ],
          },
          {
            title: "Maintain your posture",
            body: [
              "One exception to the above rule is that you generally want to keep your core and postural muscles engaged enough that you maintain spinal alignment and support. This might require conscious attention at first, but it gets easier with practice. This builds a habit of keeping your upper body tall (as you would in the saddle) and your core stable nearly regardless of what the rest of your body is doing.",
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
          "Above all else, these are YOUR workouts - the objective is to support your running with targeted strength training, not to detract from it. Consider every workout an opportunity to listen to your body and adjust your plan accordingly. This not only helps you hit the sweet spot of seeing progress without overdoing it; paying attention to your body will help your overall coordination, control, balance, and proprioception, all of which will help your running. Take the chance to practice here!",
        ],
      },
      {
        title: "Reps & choosing weights",
        body: [
          "With the above in mind, consider that rep ranges are guidance for how hard each rep should be. By the last rep or two, you should be feeling like you can't do more without compromising correct form. If you get to the top of the range and feel like you hardly worked, pick up a heavier weight to fatigue in fewer reps (and make sure your form is correct such that you didn't take a shortcut). If you can't get to the bottom of the rep range without losing your form, use a lighter weight or only bodyweight.",
        ],
        subsections: [
          {
            title: "“To Fatigue”",
            body: [
              "Some exercises are marked as “To Fatigue” instead of having a range of reps. These are generally bodyweight exercises that will have a wide variation in where you fatigue based on your specific musculoskeletal makeup and proportions. To work to fatigue, do as many as you can without compromising correct form.",
            ],
          },
          {
            title: "Soreness",
            body: [
              "These workouts aren't meant to regularly burn you out. If you find yourself getting too sore or tired to run, or find yourself avoiding strength training to avoid soreness, you're going too hard - start easier! Choose lighter weights and fewer reps until it's too easy, and take care not to stack a hard running workout too close to a significant lift.",
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
              "Over time of moving through the world and running, we all develop unconscious movement patterns that favor certain muscles at the expense of others. Strength training is an opportunity to shape these patterns by intentionally engaging and building the muscles we want to do the heavy lifting while ensuring smaller, stabilizing muscles get attention and neural activation.",
              "Moving slowly and with conscious control through your workout ensures you're working the muscles and shaping the patterns you want.",
            ],
          },
          {
            title: "Relax non-working muscles",
            body: [
              "When performing an exercise, make a point to relax the parts of your body that aren't working, just as you conserve energy by avoiding unnecessary tension while running. Key body parts that tend to tense when other parts are working are your face, neck, shoulders, hands, and feet. Finding an intentional but natural breathing rhythm can help you here - make a point to relax on each exhale.",
            ],
          },
          {
            title: "Maintain your posture",
            body: [
              "One exception to the above rule is that you generally want to keep your core and postural muscles engaged enough that you maintain spinal alignment and support. This might require conscious attention at first, but it gets easier with practice. Strengthening these muscles and making good posture second nature will help you maintain good running form and conserve energy late in your runs when you get tired.",
            ],
          },
        ],
      },
    ],
  },
};
