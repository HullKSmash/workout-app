export default {
  name: "Paul Upper Body",
  audiences: ["paul"],
  difficulty: "moderate", // TODO(Katie): set tier — easier | moderate | harder
  description: "TODO(Katie): one-line library description",
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
