export default {
  name: "Runner Strength 1A",
  circuits: [
    {
      phase: "Plyometric Warmup",
      repeatCount: 1,
      exercises: [
        { name: "Single Leg Pogos, Left Side", repCount: "10-20" },
        { name: "Single Leg Pogos, Right Side", repCount: "10-20" },
        { name: "Lateral Line Jumps", repCount: "10-20" },
      ],
    },
    {
      phase: "Superset 1/4",
      repeatCount: 2,
      exercises: [
        { name: "Superman Sweep Back", repCount: 10 },
        { name: "Side Lying Leg Lift, Left Side", repCount: 10 },
        { name: "Side Lying Leg Lift, Right Side", repCount: 10 },
      ],
    },
    {
      phase: "Superset 1/4",
      repeatCount: 1,
      exercises: [{ name: "Rest", repCount: 30 }],
    },
    {
      phase: "Superset 2/4",
      repeatCount: 2,
      exercises: [
        { name: "Single Leg Glute Bridge Taps, Alternating", repCount: 20 },
        { name: "Twist Sit Ups, Alternating", repCount: 12 },
      ],
    },
    {
      phase: "Superset 2/4",
      repeatCount: 1,
      exercises: [{ name: "Rest", repCount: 30 }],
    },
    {
      phase: "Superset 3/4",
      repeatCount: 2,
      exercises: [
        { name: "Bird Dogs, Left Arm/Right Leg", repCount: 8 },
        { name: "Bird Dogs, Right Arm/Left Leg", repCount: 8 },
        { name: "Banded Squat", repCount: 8 },
      ],
    },
    {
      phase: "Superset 3/4",
      repeatCount: 1,
      exercises: [{ name: "Rest", repCount: 30 }],
    },
    {
      phase: "Superset 4/4",
      repeatCount: 2,
      exercises: [
        { name: "Static Lunge, Left Side", repCount: 8 },
        { name: "Static Lunge, Right Side", repCount: 8 },
        { name: "Lying Ab Leg Cross", repCount: 20 },
      ],
    },
  ],
};
