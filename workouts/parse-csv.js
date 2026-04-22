/**
 * Parses a workout CSV string into the { name, circuits } format.
 *
 * Expected CSV columns: Phase, Circuit, Rounds, Exercise, RepCount
 * - Phase only appears on the first row of each phase group.
 * - Circuit/Rounds only appear on the first row of each circuit.
 * - Rest rows (Exercise = "Rest") become their own single-round circuit.
 */
export function parseWorkoutCsv(csvString, workoutName) {
  const lines = csvString.trim().split("\n");
  // Skip header row
  const rows = lines.slice(1).map(parseCsvLine);

  const circuits = [];
  let currentPhase = "";
  let currentCircuit = null;
  let currentRounds = 1;

  for (const [phase, circuit, rounds, exercise, repCount] of rows) {
    if (phase) currentPhase = phase;
    if (circuit) currentRounds = parseInt(rounds, 10) || 1;

    const isRest = exercise === "Rest";
    const rep = /^\d+$/.test(repCount) ? parseInt(repCount, 10) : repCount;

    if (circuit || currentCircuit === null) {
      // New circuit group
      if (isRest) {
        circuits.push({
          phase: currentPhase,
          repeatCount: 1,
          exercises: [{ name: "Rest", repCount: rep }],
        });
        currentCircuit = null;
      } else {
        currentCircuit = {
          phase: currentPhase,
          repeatCount: currentRounds,
          exercises: [{ name: exercise, repCount: rep }],
        };
        circuits.push(currentCircuit);
      }
    } else {
      // Continuation of current circuit
      currentCircuit.exercises.push({ name: exercise, repCount: rep });
    }
  }

  return { name: workoutName, circuits };
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
