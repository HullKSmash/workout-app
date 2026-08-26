export default {
  name: "Runner Foundation 2",
  audiences: [
    "run"
  ],
  difficulty: "moderate",
  description: "Full-body strength combining compound movements, isolation exercises, and unilateral work.",
  phases: [
    {
      name: "Plyometric Warm Up",
      circuits: [
        {
          repeatCount: 2,
          exercises: [
            {
              name: "Runner Hop, Left",
              repCount: "8-10",
            },
            {
              name: "Runner Hop, Right",
              repCount: "8-10",
            },
            {
              name: "Lateral Line Jumps",
              repCount: "8-10",
            }
          ],
        }
      ],
    },
    {
      name: "Superset 1",
      circuits: [
        {
          repeatCount: 1,
          exercises: [
            {
              name: "Row & Kickback",
              repCount: "8-10",
            }
          ],
        },
        {
          repeatCount: 2,
          exercises: [
            {
              name: "Unilateral Calf Raise & Curl, Left",
              repCount: "8-10",
            },
            {
              name: "Unilateral Calf Raise & Curl, Right",
              repCount: "8-10",
            }
          ],
        },
        {
          repeatCount: 1,
          exercises: [
            {
              name: "Row & Kickback",
              repCount: "8-10",
            }
          ],
        }
      ],
    },
    {
      name: "Superset 2",
      circuits: [
        {
          repeatCount: 1,
          exercises: [
            {
              name: "Romanian Dead Lift",
              repCount: "8-10",
            }
          ],
        },
        {
          repeatCount: 2,
          exercises: [
            {
              name: "Side Lying Leg Lift, Left",
              repCount: "6-10",
            },
            {
              name: "Side Lying Leg Lift, Right",
              repCount: "6-10",
            }
          ],
        },
        {
          repeatCount: 1,
          exercises: [
            {
              name: "Romanian Dead Lift",
              repCount: "8-10",
            }
          ],
        }
      ],
    },
    {
      name: "Superset 3",
      circuits: [
        {
          repeatCount: 1,
          exercises: [
            {
              name: "Sumo Goblet Squat",
              repCount: "8-10",
            }
          ],
        },
        {
          repeatCount: 2,
          exercises: [
            {
              name: "Single Leg Glute Bridge, Left",
              repCount: "10-12",
            },
            {
              name: "Single Leg Glute Bridge, Right",
              repCount: "10-12",
            }
          ],
        },
        {
          repeatCount: 1,
          exercises: [
            {
              name: "Sumo Goblet Squat",
              repCount: "8-10",
            }
          ],
        }
      ],
    },
    {
      name: "Core Finisher",
      circuits: [
        {
          repeatCount: 2,
          exercises: [
            {
              name: "Hip Dip Plank",
              repCount: "10-12",
            },
            {
              name: "Toe Tap",
              repCount: "10-12",
            },
            {
              name: "Dead Bug",
              repCount: "6-10 per side",
            }
          ],
        }
      ],
    }
  ],
};
