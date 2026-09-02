export default {
  name: "Runner Foundation 1",
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
              name: "Single Leg Pogos, Left",
              repCount: "10-20",
            },
            {
              name: "Single Leg Pogos, Right",
              repCount: "10-21",
            },
            {
              name: "Jump Squat",
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
              name: "RDL & Row",
              repCount: "8-10",
            }
          ],
        },
        {
          repeatCount: 2,
          exercises: [
            {
              name: "Bird Dogs, Left Arm/Right Leg",
              repCount: "8-10",
            },
            {
              name: "Bird Dogs, Right Arm/Left Leg",
              repCount: "8-10",
            }
          ],
        },
        {
          repeatCount: 1,
          exercises: [
            {
              name: "RDL & Row",
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
              name: "Hamstring Bridge",
              repCount: "8-10",
            }
          ],
        },
        {
          repeatCount: 2,
          exercises: [
            {
              name: "Curtsy Lunge, Left",
              repCount: "8-10",
            },
            {
              name: "Curtsy Lunge, Right",
              repCount: "10-15",
            }
          ],
        },
        {
          repeatCount: 1,
          exercises: [
            {
              name: "Hamstring Bridge",
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
              name: "Banded Crab Walk",
              repCount: "8-10 per side",
            }
          ],
        },
        {
          repeatCount: 2,
          exercises: [
            {
              name: "Glute Arcs, Left",
              repCount: "8-10",
            },
            {
              name: "Glute Arcs, Right",
              repCount: "8-10",
            }
          ],
        },
        {
          repeatCount: 1,
          exercises: [
            {
              name: "Banded Crab Walk",
              repCount: "8-10 per side",
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
              name: "Adductor Cross",
              repCount: "10-20",
            },
            {
              name: "Russian Twist",
              repCount: "10-20",
            },
            {
              name: "Plank Pike",
              repCount: "10-20",
            }
          ],
        }
      ],
    }
  ],
};
