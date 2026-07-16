// ─── View mode: step-through vs. checklist ───────────────────────────────────
// A universal default plus a per-device override stored in localStorage. The
// override wins when present and valid; otherwise DEFAULT_VIEW applies. Flip
// DEFAULT_VIEW to change the default for everyone without touching the toggle.

const KEY = "setgo.viewMode";

// Change to "checklist" to make the checklist the default for all users.
export const DEFAULT_VIEW = "stepthrough";

const VALID = new Set(["stepthrough", "checklist"]);

// Effective mode given a stored override (or null). Pure — safe to unit-test.
export function resolveViewMode(stored) {
  return VALID.has(stored) ? stored : DEFAULT_VIEW;
}

export function getStoredViewMode() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setViewMode(mode) {
  try {
    if (VALID.has(mode)) localStorage.setItem(KEY, mode);
  } catch {
    // localStorage unavailable (private mode/quota) — session still works.
  }
}
