export const REST_DURATION = 30;

export const WORKOUTS = [
  {
    name: "Equip2Excel 1.5",
    circuits: [
      {
        phase: "Warm-Up",
        repeatCount: 2,
        exercises: [
          { name: "Superman Sweep Back", repCount: 10 },
          { name: "Side Lying Leg Lift, Left Side", repCount: 10 },
          { name: "Side Lying Leg Lift, Right Side", repCount: 10 },
        ],
      },
      {
        phase: "Warm-Up",
        repeatCount: 1,
        exercises: [{ name: "Rest", repCount: 1 }],
      },
      {
        phase: "Superset 1",
        repeatCount: 2,
        exercises: [
          { name: "Single Leg Glute Bridge Taps, Alternating", repCount: 20 },
          { name: "Twist Sit Ups, Alternating", repCount: 12 },
        ],
      },
      {
        phase: "Superset 1",
        repeatCount: 1,
        exercises: [{ name: "Rest", repCount: 1 }],
      },
      {
        phase: "Superset 2",
        repeatCount: 2,
        exercises: [
          { name: "Bird Dogs, Left Arm/Right Leg", repCount: 8 },
          { name: "Bird Dogs, Right Arm/Left Leg", repCount: 8 },
          { name: "Banded Squat/Plié Alternating", repCount: 8 },
        ],
      },
      {
        phase: "Superset 2",
        repeatCount: 1,
        exercises: [{ name: "Rest", repCount: 1 }],
      },
      {
        phase: "Superset 3",
        repeatCount: 2,
        exercises: [
          { name: "Static Lunge, Left Side", repCount: 8 },
          { name: "Static Lunge, Right Side", repCount: 8 },
          { name: "Lying Ab Leg Cross", repCount: 20 },
        ],
      },
    ],
  },
  {
    name: "Leg Day",
    circuits: [
      {
        phase: "Plyometric Warmup",
        repeatCount: 1,
        exercises: [{ name: "Jumping Jacks", repCount: 15 }],
      },
      {
        phase: "Superset 1",
        repeatCount: 3,
        exercises: [
          { name: "Fire Hydrants, Left Side", repCount: 8 },
          { name: "Fire Hydrants, Right Side", repCount: 8 },
          { name: "Mountain Climbers", repCount: 20 },
        ],
      },
      {
        phase: "Superset 1",
        repeatCount: 1,
        exercises: [{ name: "Rest", repCount: 1 }],
      },
      {
        phase: "Superset 2",
        repeatCount: 3,
        exercises: [
          { name: "Single Leg Glute Bridge, Left Side", repCount: 8 },
          { name: "Single Leg Glute Bridge, Right Side", repCount: 8 },
          { name: "Goblet Squat", repCount: 8 },
        ],
      },
      {
        phase: "Superset 2",
        repeatCount: 1,
        exercises: [{ name: "Rest", repCount: 1 }],
      },
      {
        phase: "Giant Set",
        repeatCount: 2,
        exercises: [
          { name: "Hamstring Bridge", repCount: 8 },
          { name: "Static Lunge, Left Side", repCount: 8 },
          { name: "Static Lunge, Right Side", repCount: 8 },
          { name: "Calf Raise", repCount: 12 },
        ],
      },
      {
        phase: "Giant Set",
        repeatCount: 1,
        exercises: [{ name: "Rest", repCount: 1 }],
      },
      {
        phase: "Superset 3",
        repeatCount: 2,
        exercises: [
          { name: "Deadlift", repCount: 8 },
          { name: "Knee Up, Left Side", repCount: 8 },
          { name: "Knee Up, Right Side", repCount: 8 },
        ],
      },
      {
        phase: "Superset 3",
        repeatCount: 1,
        exercises: [{ name: "Rest", repCount: 1 }],
      },
      {
        phase: "Superset 4",
        repeatCount: 2,
        exercises: [
          { name: "Curtsy Lunge, Left Side", repCount: 8 },
          { name: "Curtsy Lunge, Right Side", repCount: 8 },
          { name: "Standing Lateral Leg Lifts, Left Side", repCount: 8 },
          { name: "Standing Lateral Leg Lifts, Right Side", repCount: 8 },
        ],
      },
    ],
  },
];
