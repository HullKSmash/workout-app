export default {
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
      exercises: [{ name: "Rest", repCount: 30 }],
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
      exercises: [{ name: "Rest", repCount: 30 }],
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
      exercises: [{ name: "Rest", repCount: 30 }],
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
      exercises: [{ name: "Rest", repCount: 30 }],
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
};
