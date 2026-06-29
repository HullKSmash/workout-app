// Variant-specific "Guidance & Tips" content, keyed by variant key (same keys
// as VARIANTS in variants.js). Each entry has an ordered list of sections.
//
// Section shape: { title, body?, subsections? }
//   - body: array of paragraph strings
//   - subsections: array of the same Section shape (one level deep in practice)
//
// Variants without an entry here simply have no guidance screen (the card is
// hidden). Add runner/paul entries with the same shape when their docs exist.
export const GUIDANCE = {
  equestrian: {
    sections: [
      {
        title: "This is your workout",
        body: [
          "Above all else, these are YOUR workouts - the objective is to support improvement in your riding with targeted strength training. This involves dedicated work, but shouldn't be so hard that you're regularly too sore to ride or do other exercise. You might feel some soreness when you add in new exercises or ramp up your weights, but it shouldn't be debilitating and shouldn't happen with every workout in the long term. If you're getting too sore or tired to ride or do your regular activities, or find yourself starting to avoid strength training, you're going too hard - start easier!",
          "Further, consider every workout an opportunity to listen to your body and adjust your plan accordingly. This not only helps you hit the sweet spot of seeing progress without overdoing it; paying attention to your body will help your overall coordination, control, balance, and proprioception, all of which will help your riding. Take the chance to practice here!",
        ],
      },
      {
        title: "Reps & choosing weights",
        body: [
          "With the above in mind, consider that rep ranges are guidance for how hard each rep should be. By the last rep or two, you should be feeling like it would be hard to do more without compromising your form. If you get to the top of the range and feel like you hardly worked, pick up a heavier weight to fatigue in fewer reps (and make sure your form is correct such that you didn't take a shortcut). If you can't get to the bottom of the rep range without losing your form, use a lighter weight or only bodyweight.",
          "Your repetitions and weights may (and almost certainly will) consequently vary from day to day. If you worked hard yesterday, you might have some soreness today and choose a lighter weight to support your recovery. If you're full of energy today, it might be the day to pick up that heavier weight for the first time. Be your own coach in these moments and prioritize your long-term progress.",
        ],
        subsections: [
          {
            title: "“To Fatigue”",
            body: [
              "Some exercises are marked as “To Fatigue” instead of having a range of reps. These are generally bodyweight exercises that will have a huge variation in where you start and end up based on your specific musculoskeletal makeup and proportions. To work to fatigue, do as many as you can without compromising correct form. Over time, you'll add more reps as you get stronger (and your form will tighten up, even if it started out correct); when you can do so many that it's becoming boring or untenable for your schedule, then it's time for a harder variation.",
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
              "Moving slowly and with conscious control through your workout ensures you're working the muscles and shaping the patterns you want. It also gives you the opportunity to practice and improve your proprioception - the awareness of where your body parts are and what they're doing without looking at them, which you already know or can imagine is a foundational skill for riding. Use a mirror or record yourself to check your form and compare it to the demo videos as you're learning exercises.",
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
              "One exception to the above rule is that you generally want to keep your core and postural muscles engaged - not overly tense such that you're actively thinking about them and feeling a burn outside of focused exercises on those muscles, but enough that you maintain spinal alignment and support. If these muscles are underdeveloped, this might be hard to do at first. It gets easier with practice. As a rider, you're probably familiar with keeping your upper body tall and your core stable nearly regardless of what the rest of your body is doing.",
            ],
          },
        ],
      },
    ],
  },
};
