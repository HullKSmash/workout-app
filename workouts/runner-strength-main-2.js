export default {
  name: "Runner Strength Main 2",
  audiences: ["run"],
  circuits: [
    {
      phase: "Plyometric Warm Up",
      repeatCount: 2,
      exercises: [
        { name: "Runner Hop, Left", repCount: "8-10" },
        { name: "Runner Hop, Right", repCount: "8-10" },
        { name: "Lateral Line Jumps", repCount: "8-10" },
      ],
    },
    {
      phase: "Superset 1",
      repeatCount: 2,
      exercises: [
        { name: "Unilateral Calf Raise & Curl, Left", repCount: "8-10" },
        { name: "Unilateral Calf Raise & Curl, Right", repCount: "8-10" },
        { name: "Row & Kickback", repCount: "8-10" },
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
        { name: "Side Lying Leg Lift, Left", repCount: "6-10" },
        { name: "Side Lying Leg Lift, Right", repCount: "6-10" },
        { name: "Romanian Dead Lift", repCount: "8-10" },
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
        { name: "Single Leg Glute Bridge, Left", repCount: "10-12" },
        { name: "Single Leg Glute Bridge, Right", repCount: "10-12" },
        { name: "Sumo Goblet Squat", repCount: "8-10" },
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
        { name: "Hip Dip Planks", repCount: "10-12" },
        { name: "Toe Taps", repCount: "10-12" },
        { name: "Dead Bugs", repCount: "6-10 per side" },
      ],
    },
  ],
};
