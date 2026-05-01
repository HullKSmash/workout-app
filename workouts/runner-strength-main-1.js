export default {
  name: "Runner Strength Main 1",
  circuits: [
    {
      phase: "Plyometric Warm Up",
      repeatCount: 2,
      exercises: [
        { name: "Single Leg Pogos, Left", repCount: "10-20" },
        { name: "Single Leg Pogos, Right", repCount: "10-21" },
        { name: "Squat Jumps", repCount: "8-10" },
      ],
    },
    {
      phase: "Superset 1",
      repeatCount: 2,
      exercises: [
        { name: "Bird Dogs, Left Arm/Right Leg", repCount: "8-10" },
        { name: "Bird Dogs, Right Arm/Left Leg", repCount: "8-10" },
        { name: "RDL & Row", repCount: "8-10" },
      ],
    },
    {
      phase: "Superset 1",
      repeatCount: 1,
      exercises: [{ name: "Rest", repCount: 30 }],
    },
    {
      phase: "Superset 2",
      repeatCount: 2,
      exercises: [
        { name: "Curtsy Lunge, Left", repCount: "8-10" },
        { name: "Curtsy Lunge, Right", repCount: "8-10" },
        { name: "Hamstring Bridge", repCount: "10-15" },
      ],
    },
    {
      phase: "Superset 2",
      repeatCount: 1,
      exercises: [{ name: "Rest", repCount: 30 }],
    },
    {
      phase: "Superset 3",
      repeatCount: 2,
      exercises: [
        { name: "Glute Arcs, Left", repCount: "8-10" },
        { name: "Glute Arcs, Right", repCount: "8-10" },
        { name: "Banded Crab Walks", repCount: "8-10 per side" },
      ],
    },
    {
      phase: "Superset 3",
      repeatCount: 1,
      exercises: [{ name: "Rest", repCount: 30 }],
    },
    {
      phase: "Core Finisher",
      repeatCount: 2,
      exercises: [
        { name: "Lying Adductor Crosses", repCount: "10-20" },
        { name: "Russian Twist", repCount: "10-20" },
        { name: "Plank Pike", repCount: "10-20" },
      ],
    },
  ],
};
