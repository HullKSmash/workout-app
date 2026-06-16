// workouts/equestrian-weekly-progress.js
// ─── Weekly workout count for the equestrian library ─────────────────────────
// Keyed by ISO week of the Monday that started the week.
// Stored shape: { "2026-W24": 3, "2026-W25": 1 }
// The schedule's existing key (riderStrength.completed) is untouched.

const KEY = "equestrian.weeklyCount";

/**
 * Returns the ISO week key for the current Monday, e.g. "2026-W24".
 */
export function getCurrentWeekKey() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, …
  const daysToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);

  // ISO week year is determined by the Thursday of the week (Monday + 3 days)
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const year = thursday.getFullYear();

  // First day of the ISO year is the Monday of the week that contains Jan 4
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // Make Sunday = 7
  const isoYearStart = new Date(jan4);
  isoYearStart.setDate(jan4.getDate() - (jan4Day - 1)); // Back to Monday

  const weekNum =
    Math.round((monday - isoYearStart) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

function loadAllCounts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function getThisWeekCount() {
  return loadAllCounts()[getCurrentWeekKey()] ?? 0;
}

export function saveThisWeekCount(count) {
  try {
    const all = loadAllCounts();
    all[getCurrentWeekKey()] = Math.max(0, count);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable — fail silently; in-memory state still works
  }
}
