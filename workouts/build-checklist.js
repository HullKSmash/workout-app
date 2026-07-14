// ─── Build the grouped checklist model from a workout ────────────────────────
// Produces phases → circuits ("groups") → rounds → checkable items, expanding
// each circuit's repeatCount into rounds. `Rest` exercises are excluded from the
// checkable items and instead summarized as a per-set caption. Item ids embed
// position (phase/circuit/round/original-exercise index) so they stay stable
// across reloads — the persistence layer keys ticked state on them.
//
// Output shape:
//   {
//     totalItems,
//     sets: [{
//       id, name, multiCircuit, restCaption,
//       groups: [{ id, multiRound, rounds: [{ round, items: [{ id, name, repCount, tips }] }] }]
//     }]
//   }

function restCaption(seconds) {
  if (seconds.length === 0) return null;
  const distinct = [...new Set(seconds)];
  return distinct.length === 1 ? `Rest ~${distinct[0]}s` : "Rest as prescribed";
}

export function buildChecklist(workout) {
  const sets = [];
  let totalItems = 0;

  workout.phases.forEach((phase, phaseIndex) => {
    const groups = [];
    const restSeconds = [];

    phase.circuits.forEach((circuit, circuitIndex) => {
      const rounds = [];
      for (let round = 1; round <= circuit.repeatCount; round++) {
        const items = [];
        circuit.exercises.forEach((exercise, exIndex) => {
          if (exercise.name === "Rest") {
            if (typeof exercise.repCount === "number") {
              restSeconds.push(exercise.repCount);
            }
            return;
          }
          items.push({
            id: `p${phaseIndex}c${circuitIndex}r${round}e${exIndex}`,
            name: exercise.name,
            repCount: exercise.repCount,
            tips: exercise.tips,
          });
          totalItems += 1;
        });
        rounds.push({ round, items });
      }
      groups.push({
        id: `p${phaseIndex}c${circuitIndex}`,
        multiRound: circuit.repeatCount > 1,
        rounds,
      });
    });

    sets.push({
      id: `p${phaseIndex}`,
      name: phase.name,
      groups,
      multiCircuit: groups.length > 1,
      restCaption: restCaption(restSeconds),
    });
  });

  return { totalItems, sets };
}
