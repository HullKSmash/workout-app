// ─── Persist the one active checklist's ticked items ─────────────────────────
// Only ONE checklist is active at a time. Stored shape:
//   { key: "<session key>", checked: ["p0c0r1e0", ...] }
// `key` = workout name, prefixed with the schedule slot when opened from the
// schedule (the same workout file is reused across weeks, so slot disambiguates —
// same idea as workouts/progress.js). Cleared on finish and on a confirmed leave.

const KEY = "setgo.activeChecklist";

export function checklistKey(workoutName, slot) {
  return slot ? `${slot}::${workoutName}` : String(workoutName);
}

export function loadActiveChecklist() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw.key === "string" && Array.isArray(raw.checked)) {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveActiveChecklist(key, checked) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ key, checked }));
  } catch {
    // localStorage unavailable — in-memory state still works for the session.
  }
}

export function clearActiveChecklist() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
