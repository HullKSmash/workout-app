/**
 * Parses a workout CSV string into the { name, phases } format.
 *
 * Expected CSV columns: Phase, Circuit, Rounds, Exercise, RepCount, Easier, Harder
 * - Phase only appears on the first row of each phase group.
 * - Circuit/Rounds only appear on the first row of each circuit.
 * - Rest rows (Exercise = "Rest") become their own single-round circuit.
 *
 * Output shape:
 *   {
 *     name,
 *     phases: [
 *       {
 *         name,
 *         circuits: [
 *           { repeatCount, exercises: [{ name, repCount, easier?, harder? }, ...] },
 *           ...
 *         ],
 *       },
 *       ...
 *     ],
 *   }
 */
export function parseWorkoutCsv(csvString, workoutName) {
  const lines = csvString.trim().split("\n");
  const rows = lines.slice(1).map(parseCsvLine);

  const phases = [];
  let currentPhase = null;
  let currentCircuit = null;
  let currentRounds = 1;

  for (const [phaseName, circuit, rounds, exercise, repCount, easier, harder] of rows) {
    if (phaseName) {
      currentPhase = { name: phaseName, circuits: [] };
      phases.push(currentPhase);
      currentCircuit = null;
    }
    if (circuit) currentRounds = parseInt(rounds, 10) || 1;

    const isRest = exercise === "Rest";
    const rep = /^\d+$/.test(repCount) ? parseInt(repCount, 10) : repCount;

    if (circuit || currentCircuit === null) {
      if (isRest) {
        currentPhase.circuits.push({
          repeatCount: 1,
          exercises: [{ name: "Rest", repCount: rep }],
        });
        currentCircuit = null;
      } else {
        currentCircuit = {
          repeatCount: currentRounds,
          exercises: [buildExercise(exercise, rep, easier, harder)],
        };
        currentPhase.circuits.push(currentCircuit);
      }
    } else {
      currentCircuit.exercises.push(buildExercise(exercise, rep, easier, harder));
    }
  }

  return { name: workoutName, phases };
}

/** Parses a single CSV line, handling quoted fields with commas. */
function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Builds an exercise object, omitting easier/harder when blank. */
function buildExercise(name, repCount, easier, harder) {
  const obj = { name, repCount };
  if (easier) obj.easier = easier;
  if (harder) obj.harder = harder;
  return obj;
}
