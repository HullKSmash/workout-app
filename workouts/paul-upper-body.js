export default {
  name: "Paul Upper Body",
  audiences: ["paul"],
  difficulty: "moderate",
  description: "Key upper body exercises - push, pull, and press for chest, shoulders, back, and biceps.",
  phases: [
    {
      name: "Circuit",
      circuits: [
        {
          repeatCount: 3,
          exercises: [
            { name: "Pull Ups", repCount: "5-10" },
            { name: "Bicep Curls", repCount: "8-12" },
            { name: "Shoulder Press", repCount: "8-12" },
            { name: "Push Ups", repCount: "15-20" },
            { name: "Bench Press", repCount: "8-12" },
            { name: "Single Arm Row, Left Side", repCount: "8-12" },
            { name: "Single Arm Row, Right Side", repCount: "8-12" },
            { name: "Rest", repCount: 30 },
          ],
        },
      ],
    },
  ],
};
