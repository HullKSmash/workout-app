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

  const year = monday.getFullYear();
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(year, 0, 4);
  const weekNum = Math.ceil(
    ((monday - jan4) / 86400000 + jan4.getDay() + 1) / 7
  );
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

function loadAllCounts() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
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
