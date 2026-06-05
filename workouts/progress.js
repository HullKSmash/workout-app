// ─── Local progress tracking for the 12-week Rider Strength program ──────────
// Completion is keyed by SCHEDULE POSITION (`w${week}-${slotIndex}`), not by
// workout identity — the same workout file is reused across multiple weeks, so
// keying on the workout itself would mark duplicates done together.
//
// Stored shape (only completed slots are kept):
//   { "w1-0": true, "w1-2": true, "w2-0": true }

const KEY = "riderStrength.completed";

export const slotId = (week, slotIndex) => `w${week}-${slotIndex}`;

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // localStorage unavailable (private mode, quota) — fail silently; the
    // in-memory state still works for the session.
  }
}

export function clearProgress() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
