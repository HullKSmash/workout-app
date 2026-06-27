# Equestrian Workout Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 12-week schedule as the default equestrian screen with a self-directed workout library organized by difficulty tier, with a weekly goal tracker.

**Architecture:** Add a new `"library"` screen to `workout-app.jsx` that renders filter chips (Easier/Moderate/Harder), a filtered+sorted workout list, and a weekly dot tracker. Weekly progress is stored in a new `workouts/equestrian-weekly-progress.js` module keyed by ISO week. Each equestrian workout file gets `difficulty` and `description` fields. The existing schedule screen is unchanged and reachable via a footer link.

**Tech Stack:** React + Vite, inline JS styles, localStorage, no TypeScript, no tests.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `workouts/equestrian-weekly-progress.js` | **Create** | Weekly count localStorage module |
| `workouts/rider-foundation-1.js` | Modify | Add `difficulty`, `description` |
| `workouts/rider-foundation-2.js` | Modify | Add `difficulty`, `description` |
| `workouts/rider-foundation-3.js` | Modify | Add `difficulty`, `description` |
| `workouts/rider-foundation-4.js` | Modify | Add `difficulty`, `description` |
| `workouts/rider-symmetry-and-balance-1.js` | Modify | Add `difficulty`, `description` |
| `workouts/rider-symmetry-and-balance-2.js` | Modify | Add `difficulty`, `description` |
| `workouts/rider-build-1.js` | Modify | Add `difficulty`, `description` |
| `workouts/rider-build-2.js` | Modify | Add `difficulty`, `description` |
| `workouts/rider-alternating-supersets.js` | Modify | Add `difficulty`, `description` |
| `workout-app.jsx` | Modify | Library screen, tracker logic, landing/complete screen updates, navigation |

---

## Task 1: Create the weekly progress module

**Files:**
- Create: `workouts/equestrian-weekly-progress.js`

- [ ] **Step 1.1: Create the file**

```js
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
```

- [ ] **Step 1.2: Verify the file saved correctly**

```bash
cat workouts/equestrian-weekly-progress.js
```
Expected: file contents match above.

- [ ] **Step 1.3: Commit**

```bash
git add workouts/equestrian-weekly-progress.js
git commit -m "feat: add equestrian weekly progress module"
```

---

## Task 2: Add difficulty and description to equestrian workout files

**Files:**
- Modify: `workouts/rider-foundation-1.js` through `workouts/rider-alternating-supersets.js` (9 files)

> **Note for Katie:** The difficulty and description values below are suggested defaults. Review and adjust before or after this task. Difficulty must be one of: `"easier"`, `"moderate"`, `"harder"`.

- [ ] **Step 2.1: Add fields to `rider-foundation-1.js`**

Add after `"audiences": ["equestrian"],`:

```js
"difficulty": "easier",
"description": "Full-body compound strength to build your base",
```

- [ ] **Step 2.2: Add fields to `rider-foundation-2.js`**

Add after `"audiences": ["equestrian"],`:

```js
"difficulty": "easier",
"description": "A second angle on foundational compound movements",
```

- [ ] **Step 2.3: Add fields to `rider-foundation-3.js`**

Add after `"audiences": ["equestrian"],`:

```js
"difficulty": "moderate",
"description": "Hip hinge emphasis with posterior chain loading",
```

- [ ] **Step 2.4: Add fields to `rider-foundation-4.js`**

Add after `"audiences": ["equestrian"],`:

```js
"difficulty": "moderate",
"description": "Upper pulling and single-leg stability for balanced strength",
```

- [ ] **Step 2.5: Add fields to `rider-symmetry-and-balance-1.js`**

Add after `"audiences": ["equestrian"],`:

```js
"difficulty": "moderate",
"description": "Isolated unilateral work to enforce symmetrical strength and neural activation",
```

- [ ] **Step 2.6: Add fields to `rider-symmetry-and-balance-2.js`**

Add after `"audiences": ["equestrian"],`:

```js
"difficulty": "moderate",
"description": "Lateral movement and proprioceptive training for rider stability",
```

- [ ] **Step 2.7: Add fields to `rider-build-1.js`**

Add after `"audiences": ["equestrian"],`:

```js
"difficulty": "harder",
"description": "High-volume hypertrophy training to build serious riding strength",
```

- [ ] **Step 2.8: Add fields to `rider-build-2.js`**

Add after `"audiences": ["equestrian"],`:

```js
"difficulty": "harder",
"description": "Progressive overload targeting the posterior chain and upper back",
```

- [ ] **Step 2.9: Add fields to `rider-alternating-supersets.js`**

Add after `"audiences": ["equestrian"],`:

```js
"difficulty": "harder",
"description": "Upper/lower alternating supersets for maximum training efficiency",
```

- [ ] **Step 2.10: Commit**

```bash
git add workouts/rider-foundation-1.js workouts/rider-foundation-2.js \
        workouts/rider-foundation-3.js workouts/rider-foundation-4.js \
        workouts/rider-symmetry-and-balance-1.js workouts/rider-symmetry-and-balance-2.js \
        workouts/rider-build-1.js workouts/rider-build-2.js \
        workouts/rider-alternating-supersets.js
git commit -m "feat: add difficulty and description to equestrian workouts"
```

---

## Task 3: Add library screen scaffold to `workout-app.jsx`

**Files:**
- Modify: `workout-app.jsx`

This task wires up the import, the initial screen state, derived data, and renders a basic library screen shell. No interactive state yet.

- [ ] **Step 3.1: Add the import for the weekly progress module**

At the top of `workout-app.jsx`, after the existing imports, add:

```js
import { getThisWeekCount, saveThisWeekCount } from "./workouts/equestrian-weekly-progress.js";
```

- [ ] **Step 3.2: Add library-specific constants after the existing `MODIFIER_DEFAULTS` block**

Find:
```js
// ─── Modifier defaults ───────────────────────────────────────────────────────
```

After the `MODIFIER_DEFAULTS` object (the closing `};`), add:

```js
// ─── Library difficulty config ───────────────────────────────────────────────
const DIFFICULTY_ORDER = { easier: 0, moderate: 1, harder: 2 };
const DIFFICULTY_COLORS = {
  easier: "#22c55e",
  moderate: "#d97706",
  harder: "#ef4444",
};
const DIFFICULTY_LABELS = {
  easier: "Easier",
  moderate: "Moderate",
  harder: "Harder",
};
```

- [ ] **Step 3.3: Change the initial screen for equestrian**

Find:
```js
const [screen, setScreen] = useState(isEquestrian ? "schedule" : "select"); // schedule | select | landing | workout | complete
```

Replace with:
```js
const [screen, setScreen] = useState(isEquestrian ? "library" : "select"); // library | schedule | select | landing | workout | complete
```

- [ ] **Step 3.4: Add library state variables**

Find the block of `useState` declarations (around line 93–100). After `const [selectedSlot, setSelectedSlot] = useState(null);`, add:

```js
// ─── Library state ───────────────────────────────────────────────────────────
const ALL_DIFFICULTIES = ["easier", "moderate", "harder"];
const [activeFilters, setActiveFilters] = useState(new Set(ALL_DIFFICULTIES));
const [weeklyCount, setWeeklyCount] = useState(() =>
  isEquestrian ? getThisWeekCount() : 0
);
```

- [ ] **Step 3.5: Add derived `libraryWorkouts` value**

Find the existing `useMemo` for `totalSteps`. Just before it, add:

```js
// Filtered + sorted workout list for the library screen.
const libraryWorkouts = useMemo(() => {
  if (!isEquestrian) return [];
  return visibleWorkouts
    .filter((w) => activeFilters.has(w.difficulty))
    .sort(
      (a, b) =>
        (DIFFICULTY_ORDER[a.difficulty] ?? 99) -
        (DIFFICULTY_ORDER[b.difficulty] ?? 99)
    );
}, [activeFilters]);
```

- [ ] **Step 3.6: Add the library screen render block**

Find in the JSX:
```js
      {/* ── Schedule ─────────────────────────────────────────────────── */}
```

Just before that comment, add the library screen block:

```jsx
      {/* ── Library ──────────────────────────────────────────────────── */}
      {screen === "library" && (
        <div style={styles.screenContainer}>
          <div style={styles.libraryContent}>
            <h1 style={styles.appTitle}>{variant.brandName}</h1>
            <p style={styles.selectSubtitle}>{variant.tagline}</p>

            {/* Weekly tracker — rendered in Task 5 */}
            {/* Filter chips — rendered in Task 4 */}

            {/* Workout list */}
            <div style={styles.workoutList}>
              {libraryWorkouts.length === 0 ? (
                <p style={styles.libraryEmptyState}>
                  No difficulty selected — tap a filter above to show workouts.
                </p>
              ) : (
                libraryWorkouts.map((workout, i) => (
                  <button
                    key={i}
                    style={styles.libraryCard}
                    onClick={() => handleSelectWorkout(workout)}
                  >
                    <span
                      style={{
                        ...styles.libraryPip,
                        background: DIFFICULTY_COLORS[workout.difficulty] ?? "#ccc",
                      }}
                    />
                    <span style={styles.libraryCardBody}>
                      <span style={styles.libraryCardName}>{workout.name}</span>
                      <span style={styles.libraryCardDesc}>{workout.description}</span>
                    </span>
                    <span style={styles.libraryCardArrow}>›</span>
                  </button>
                ))
              )}
            </div>

            {/* Guidance & Tips card — rendered in Task 6 */}

            {/* Footer link to 12-week program */}
            <button
              style={styles.viewAllLink}
              onClick={() => setScreen("schedule")}
            >
              Looking for more structure? Follow a 12-week program here!
            </button>
          </div>
        </div>
      )}
```

- [ ] **Step 3.7: Add styles for the library screen**

Find `scheduleContent:` in the styles object at the bottom of `workout-app.jsx`. Before it, add:

```js
  libraryContent: {
    width: "100%",
    maxWidth: 480,
    margin: "0 auto",
    padding: "20px 16px 40px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  libraryCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    background: colors.surface,
    border: "none",
    borderRadius: 12,
    padding: "12px 14px",
    cursor: "pointer",
    textAlign: "left",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
    width: "100%",
  },
  libraryPip: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 4,
  },
  libraryCardBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  libraryCardName: {
    fontSize: 15,
    fontWeight: 700,
    color: colors.text,
  },
  libraryCardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 1.4,
  },
  libraryCardArrow: {
    fontSize: 20,
    color: colors.border,
    fontWeight: 300,
    alignSelf: "center",
  },
  libraryEmptyState: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    padding: "24px 0",
  },
```

- [ ] **Step 3.8: Start the dev server and verify the library screen loads**

```bash
npm run dev
```

Open `http://localhost:5173?variant=equestrian`. Expected: library screen shows with the workout list (all workouts visible), footer link visible, no weekly tracker or chips yet (those placeholders render nothing).

- [ ] **Step 3.9: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: add library screen scaffold for equestrian variant"
```

---

## Task 4: Library screen — filter chips

**Files:**
- Modify: `workout-app.jsx`

- [ ] **Step 4.1: Add a `toggleFilter` handler**

Find `handleSelectWorkout` in `workout-app.jsx`. Before it, add:

```js
  const toggleFilter = (difficulty) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(difficulty)) next.delete(difficulty);
      else next.add(difficulty);
      return next;
    });
  };
```

- [ ] **Step 4.2: Replace the filter chips placeholder comment with JSX**

Find in the library screen block:
```jsx
            {/* Filter chips — rendered in Task 4 */}
```

Replace with:
```jsx
            {/* Filter chips */}
            <div style={styles.chipBar}>
              {ALL_DIFFICULTIES.map((d) => {
                const active = activeFilters.has(d);
                return (
                  <button
                    key={d}
                    style={{
                      ...styles.chip,
                      ...(active ? styles.chipActive(d) : styles.chipInactive),
                    }}
                    onClick={() => toggleFilter(d)}
                  >
                    <span
                      style={{
                        ...styles.chipPip,
                        background: active
                          ? DIFFICULTY_COLORS[d]
                          : colors.textSecondary,
                      }}
                    />
                    {DIFFICULTY_LABELS[d]}
                  </button>
                );
              })}
            </div>
```

- [ ] **Step 4.3: Add chip styles**

In the styles object (near `libraryEmptyState`), add:

```js
  chipBar: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    border: "1.5px solid",
    letterSpacing: 0.2,
  },
  chipActive: (difficulty) => ({
    easier: {
      borderColor: "#22c55e",
      color: "#166534",
      background: "#f0fdf4",
    },
    moderate: {
      borderColor: "#d97706",
      color: "#92400e",
      background: "#fffbeb",
    },
    harder: {
      borderColor: "#ef4444",
      color: "#7f1d1d",
      background: "#fef2f2",
    },
  })[difficulty],
  chipInactive: {
    borderColor: colors.border,
    color: colors.textSecondary,
    background: colors.surface,
  },
  chipPip: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    flexShrink: 0,
  },
```

- [ ] **Step 4.4: Verify filter chips work**

In browser at `?variant=equestrian`: tap each chip — the list should filter to show only workouts matching active chips. Tap all chips off — empty state message should appear.

- [ ] **Step 4.5: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: add filter chips to library screen"
```

---

## Task 5: Library screen — weekly tracker UI

**Files:**
- Modify: `workout-app.jsx`

- [ ] **Step 5.1: Add a `weekGoal` constant and `weeklyDots` derived value**

After the `libraryWorkouts` useMemo, add:

```js
const WEEK_GOAL = 3;
// Total dots to show: goal (3) or however many they've done if over goal.
const weeklyDots = Math.max(WEEK_GOAL, weeklyCount);
```

- [ ] **Step 5.2: Replace the weekly tracker placeholder comment with JSX**

Find in the library screen block:
```jsx
            {/* Weekly tracker — rendered in Task 5 */}
```

Replace with:
```jsx
            {/* Weekly tracker */}
            <div style={styles.trackerRow}>
              <div style={styles.trackerLabel}>
                This week
                <span style={styles.trackerSubLabel}>Resets Monday</span>
              </div>
              <div style={styles.trackerDots}>
                {Array.from({ length: weeklyDots }).map((_, i) => {
                  const filled = i < weeklyCount;
                  return (
                    <button
                      key={i}
                      aria-label={filled ? "Remove one workout" : "Add one workout"}
                      style={{
                        ...styles.trackerDot,
                        ...(filled ? styles.trackerDotFilled : {}),
                      }}
                      onClick={() => {
                        const next = filled ? weeklyCount - 1 : weeklyCount + 1;
                        setWeeklyCount(next);
                        saveThisWeekCount(next);
                      }}
                    >
                      {filled ? "✓" : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Goal-hit banner */}
            {weeklyCount >= WEEK_GOAL && (
              <div style={styles.goalBanner}>
                <span style={styles.goalBannerIcon}>🌿</span>
                <span style={styles.goalBannerText}>
                  Weekly goal hit! Keep going if you feel strong!
                </span>
              </div>
            )}
```

- [ ] **Step 5.3: Add tracker + banner styles**

In the styles object, add:

```js
  trackerRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: colors.surface,
    borderRadius: 12,
    padding: "12px 14px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  },
  trackerLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: 700,
    color: colors.text,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  trackerSubLabel: {
    fontSize: 11,
    fontWeight: 400,
    color: colors.textSecondary,
  },
  trackerDots: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  trackerDot: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    border: `2px solid ${colors.border}`,
    background: colors.surface,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "transparent",
    cursor: "pointer",
    padding: 0,
  },
  trackerDotFilled: {
    background: colors.accent,
    borderColor: colors.accent,
    color: "#fff",
  },
  goalBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    padding: "10px 14px",
  },
  goalBannerIcon: {
    fontSize: 16,
  },
  goalBannerText: {
    fontSize: 13,
    fontWeight: 600,
    color: "#166534",
  },
```

- [ ] **Step 5.4: Verify tracker in browser**

At `?variant=equestrian`: three gray dots visible. Tap a dot — it fills green. Tap a filled dot — it unfills. At 3 filled dots the goal banner appears. At 4+ dots a new dot appears each time. Refresh the page — count should persist (loaded from localStorage).

- [ ] **Step 5.5: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: add weekly tracker to library screen"
```

---

## Task 6: Library screen — Guidance & Tips card and schedule footer link

**Files:**
- Modify: `workout-app.jsx`

The footer link was added in Task 3. This task adds the collapsible guidance card. The `guideOpen` state already exists (used by the schedule screen) — reuse it for the library.

- [ ] **Step 6.1: Replace the Guidance & Tips placeholder comment with JSX**

Find in the library screen block:
```jsx
            {/* Guidance & Tips card — rendered in Task 6 */}
```

Replace with:
```jsx
            {/* Guidance & Tips card */}
            <div style={styles.guideCard}>
              <button
                style={styles.guideToggle}
                onClick={() => setGuideOpen((v) => !v)}
              >
                <div style={styles.guideToggleLeft}>
                  <span style={styles.guideIcon}>📋</span>
                  <div>
                    <div style={styles.guideTitle}>Guidance &amp; Tips</div>
                    <div style={styles.guideSubtitle}>How to use this library</div>
                  </div>
                </div>
                <span style={styles.guideChevron}>{guideOpen ? "∧" : "∨"}</span>
              </button>
              {guideOpen && (
                <div style={styles.guideBody}>
                  <p style={styles.guidePlaceholder}>Guidance coming soon.</p>
                </div>
              )}
            </div>
```

- [ ] **Step 6.2: Verify card in browser**

At `?variant=equestrian`: "Guidance & Tips" card visible, collapses/expands on tap.

- [ ] **Step 6.3: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: add Guidance & Tips card to library screen"
```

---

## Task 7: Update the landing screen (difficulty badge + description)

**Files:**
- Modify: `workout-app.jsx`

The landing screen currently shows only the workout name, step count/phase count, a start button, and a back link. Add the difficulty badge and description when the selected workout has a `difficulty` field.

- [ ] **Step 7.1: Replace the landing screen content**

Find:
```jsx
      {screen === "landing" && selectedWorkout && (
        <div style={styles.screenContainer}>
          <div style={styles.landingContent}>
            <h1 style={styles.workoutTitle}>{selectedWorkout.name}</h1>
            <p style={styles.workoutSubtitle}>
              {totalSteps} exercises · {selectedWorkout.phases.length} phases
            </p>
            <button style={styles.startButton} onClick={handleStart}>
              Start Workout
            </button>
            <button
              style={styles.backLink}
              onClick={handleBackFromLanding}
            >
              Choose a different workout
            </button>
          </div>
        </div>
      )}
```

Replace with:
```jsx
      {screen === "landing" && selectedWorkout && (
        <div style={styles.screenContainer}>
          <div style={styles.landingContent}>
            {selectedWorkout.difficulty && (
              <div
                style={{
                  ...styles.diffBadge,
                  borderColor: DIFFICULTY_COLORS[selectedWorkout.difficulty],
                  color:
                    selectedWorkout.difficulty === "easier"
                      ? "#166534"
                      : selectedWorkout.difficulty === "moderate"
                      ? "#92400e"
                      : "#7f1d1d",
                  background:
                    selectedWorkout.difficulty === "easier"
                      ? "#f0fdf4"
                      : selectedWorkout.difficulty === "moderate"
                      ? "#fffbeb"
                      : "#fef2f2",
                }}
              >
                <span
                  style={{
                    ...styles.diffBadgePip,
                    background: DIFFICULTY_COLORS[selectedWorkout.difficulty],
                  }}
                />
                {DIFFICULTY_LABELS[selectedWorkout.difficulty]}
              </div>
            )}
            <h1 style={styles.workoutTitle}>{selectedWorkout.name}</h1>
            {selectedWorkout.description && (
              <p style={styles.workoutDescription}>{selectedWorkout.description}</p>
            )}
            <p style={styles.workoutSubtitle}>
              {totalSteps} exercises · {selectedWorkout.phases.length} phases
            </p>
            <button style={styles.startButton} onClick={handleStart}>
              Start Workout
            </button>
            <button
              style={styles.backLink}
              onClick={handleBackFromLanding}
            >
              Choose a different workout
            </button>
          </div>
        </div>
      )}
```

- [ ] **Step 7.2: Add badge and description styles**

In the styles object, add:

```js
  diffBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    borderRadius: 20,
    border: "1.5px solid",
    fontSize: 12,
    fontWeight: 700,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  diffBadgePip: {
    width: 7,
    height: 7,
    borderRadius: "50%",
  },
  workoutDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 1.5,
    marginBottom: 4,
  },
```

- [ ] **Step 7.3: Verify in browser**

Tap any equestrian workout from the library. Expected: difficulty badge (colored pill) and description show above the workout name. Tap a workout without a `difficulty` field (e.g. from the schedule screen) — badge and description should not appear (conditional render).

- [ ] **Step 7.4: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: add difficulty badge and description to landing screen"
```

---

## Task 8: Update the complete screen with weekly progress block

**Files:**
- Modify: `workout-app.jsx`

- [ ] **Step 8.1: Add a `weeklyProgressMessage` derived value**

After the `WEEK_GOAL` / `weeklyDots` lines from Task 5, add:

```js
const weeklyProgressMessage =
  weeklyCount >= WEEK_GOAL
    ? "Weekly goal hit! Keep going if you feel strong!"
    : weeklyCount === 2
    ? "2 done this week. Shoot for one more!"
    : weeklyCount === 1
    ? "1 done this week. Shoot for 2 more!"
    : null;
```

- [ ] **Step 8.2: Replace the complete screen render block**

Find:
```jsx
      {/* ── Completion Page ───────────────────────────────────────────── */}
      {screen === "complete" && (
        <div style={styles.screenContainer}>
          <div style={styles.completeContent}>
            <div style={styles.checkmark}>✓</div>
            <h1 style={styles.completeTitle}>Workout Complete!</h1>
            <p style={styles.completeSubtitle}>
              Great work finishing {selectedWorkout.name}
            </p>
            <button style={styles.startButton} onClick={handleBackToStart}>
              Back to Start
            </button>
          </div>
        </div>
      )}
```

Replace with:
```jsx
      {/* ── Completion Page ───────────────────────────────────────────── */}
      {screen === "complete" && (
        <div style={styles.screenContainer}>
          <div style={styles.completeContent}>
            <div style={styles.checkmark}>✓</div>
            <h1 style={styles.completeTitle}>Workout Complete!</h1>
            <p style={styles.completeSubtitle}>
              Great work finishing {selectedWorkout.name}
            </p>

            {isEquestrian && weeklyProgressMessage && (
              <div style={styles.weeklyProgressBlock}>
                <div style={styles.trackerDots}>
                  {Array.from({ length: Math.max(WEEK_GOAL, weeklyCount) }).map(
                    (_, i) => (
                      <div
                        key={i}
                        style={{
                          ...styles.trackerDot,
                          ...(i < weeklyCount ? styles.trackerDotFilled : {}),
                          cursor: "default",
                        }}
                      >
                        {i < weeklyCount ? "✓" : ""}
                      </div>
                    )
                  )}
                </div>
                <p style={styles.weeklyProgressMsg}>{weeklyProgressMessage}</p>
              </div>
            )}

            <button style={styles.startButton} onClick={handleBackToStart}>
              Back to Library
            </button>
          </div>
        </div>
      )}
```

- [ ] **Step 8.3: Add weekly progress block styles**

In the styles object, add:

```js
  weeklyProgressBlock: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  weeklyProgressMsg: {
    fontSize: 13,
    fontWeight: 600,
    color: "#166534",
    textAlign: "center",
    lineHeight: 1.4,
  },
```

- [ ] **Step 8.4: Verify complete screen in browser**

Complete a workout from the equestrian library. Expected: weekly progress block with dots and message appears. If 1 done: "1 done this week. Shoot for 2 more!" If 2 done: "2 done this week. Shoot for one more!" If 3+: "Weekly goal hit! Keep going if you feel strong!" The "Back to Start" button now reads "Back to Library".

- [ ] **Step 8.5: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: add weekly progress block to complete screen"
```

---

## Task 9: Wire workout completion to auto-increment the weekly count

**Files:**
- Modify: `workout-app.jsx`

Currently `weeklyCount` is only changed by manual dot taps. This task increments it automatically when the user finishes a workout via the app.

- [ ] **Step 9.1: Update `handleNext` to increment weekly count on completion**

Find:
```js
  const handleNext = () => {
    if (currentStep >= totalSteps - 1) {
      // Auto-mark the schedule slot complete on finishing the last step.
      if (selectedSlot && !completed[selectedSlot]) toggleSlot(selectedSlot);
      setScreen("complete");
    } else {
```

Replace with:
```js
  const handleNext = () => {
    if (currentStep >= totalSteps - 1) {
      // Auto-mark the schedule slot complete on finishing the last step.
      if (selectedSlot && !completed[selectedSlot]) toggleSlot(selectedSlot);
      // Increment weekly count for the library tracker.
      if (isEquestrian) {
        const next = weeklyCount + 1;
        setWeeklyCount(next);
        saveThisWeekCount(next);
      }
      setScreen("complete");
    } else {
```

- [ ] **Step 9.2: Verify auto-increment in browser**

Complete a full workout from the library (tap through all exercises to "Finish"). Expected: the complete screen shows one more dot filled than before, and the count persists on returning to the library screen.

- [ ] **Step 9.3: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: auto-increment weekly count on workout completion"
```

---

## Task 10: Navigation cleanup and schedule screen card rename

**Files:**
- Modify: `workout-app.jsx`

This task updates all back-navigation for equestrian to go to "library" instead of "schedule", removes the "Back to schedule" link from the select screen for equestrian, and renames the guide card on the schedule screen.

- [ ] **Step 10.1: Update `handleBackFromLanding`**

Find:
```js
  const handleBackFromLanding = () => {
    setScreen(isEquestrian ? "schedule" : "select");
  };
```

Replace with:
```js
  const handleBackFromLanding = () => {
    setScreen(isEquestrian ? "library" : "select");
  };
```

- [ ] **Step 10.2: Update `confirmEnd`**

Find:
```js
  const confirmEnd = () => {
    setShowEndConfirm(false);
    setScreen(isEquestrian ? "schedule" : "select");
  };
```

Replace with:
```js
  const confirmEnd = () => {
    setShowEndConfirm(false);
    setScreen(isEquestrian ? "library" : "select");
  };
```

- [ ] **Step 10.3: Update `handleBackToStart`**

Find:
```js
  const handleBackToStart = () => {
    setScreen(isEquestrian ? "schedule" : "select");
  };
```

Replace with:
```js
  const handleBackToStart = () => {
    setScreen(isEquestrian ? "library" : "select");
  };
```

- [ ] **Step 10.4: Remove "Back to schedule" link from the select screen for equestrian**

Find in the select screen JSX:
```jsx
            {isEquestrian && (
              <button style={styles.backToScheduleLink} onClick={() => setScreen("schedule")}>
                ← Back to schedule
              </button>
            )}
```

Delete those four lines entirely. The equestrian variant no longer shows the select screen as a primary screen (it's reachable from the schedule's "View all workouts" link), and the library is the new home.

- [ ] **Step 10.5: Rename the guide card on the schedule screen**

Find in the schedule screen JSX:
```jsx
                    <div style={styles.guideTitle}>How to Use This Program</div>
                    <div style={styles.guideSubtitle}>Schedule, weight guidance, and technique</div>
```

Replace with:
```jsx
                    <div style={styles.guideTitle}>Guidance &amp; Tips</div>
                    <div style={styles.guideSubtitle}>Schedule, weight guidance, and technique</div>
```

- [ ] **Step 10.6: Verify full navigation flow in browser**

At `?variant=equestrian`:
1. App opens on library screen ✓
2. Tap a workout → landing screen with difficulty badge ✓
3. Tap "Choose a different workout" → back to library ✓
4. Start a workout, tap "End Workout" → confirm → back to library ✓
5. Complete a workout → complete screen → "Back to Library" → library ✓
6. Tap footer link → schedule screen ✓
7. Tap "View all workouts" on schedule → select screen ✓
8. Schedule screen guide card title reads "Guidance & Tips" ✓

Also verify Runner variant (`?variant=run`) is unaffected — opens on select screen, no library screen, no difficulty badges.

- [ ] **Step 10.7: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: update equestrian navigation to use library as home screen"
```

---

## Self-Review Checklist

Spec requirements vs. tasks:

| Spec requirement | Covered by |
|-----------------|-----------|
| Library as default equestrian screen | Task 3 (initial screen), Task 10 (back nav) |
| Filter chips Easier/Moderate/Harder, all active by default | Task 4 |
| Workout list sorted easier→moderate→harder | Task 3 (libraryWorkouts sort) |
| Colored pip per card, no dividers | Task 3 |
| One-line description per card | Task 2 (data) + Task 3 (render) |
| Empty state when all chips off | Task 3 |
| Weekly tracker, 3-dot goal | Task 5 |
| Dots earned-only (goal + extras) | Task 5 (weeklyDots = max(WEEK_GOAL, count)) |
| Resets Monday | Task 1 (getCurrentWeekKey) |
| Goal-hit banner with exact text | Task 5 |
| Manual dot tap +1/−1 | Task 5 |
| Auto-increment on completion | Task 9 |
| Guidance & Tips collapsible card | Task 6 |
| Footer link to schedule | Task 3 |
| Difficulty badge on landing screen | Task 7 |
| Description on landing screen | Task 7 |
| Complete screen weekly progress block | Task 8 |
| Complete screen message variants | Task 8 |
| "Back to Library" button on complete | Task 8 |
| Schedule card renamed "Guidance & Tips" | Task 10 |
| "Back to schedule" removed from select screen | Task 10 |
| Two localStorage keys coexist | Task 1 + Task 9 |
| "View all workouts" kept on schedule screen | No change needed — already exists |
| Runner/Paul variants unaffected | isEquestrian guards all new code |
