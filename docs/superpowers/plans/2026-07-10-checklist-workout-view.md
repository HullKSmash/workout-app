# Checklist Workout View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a checklist view of a workout (set-grouped rounds with a checkbox per round-exercise, unrestricted ordering) as a per-user-selectable alternative to the existing step-through, sharing the same completion tracking.

**Architecture:** Three pure helper modules (`view-mode.js`, `workouts/build-checklist.js`, `workouts/checklist-progress.js`) carry the logic and get `node --test` coverage. A new presentational `ChecklistScreen.jsx` (following the existing `GuidanceScreen`/`GateScreen` extracted-component pattern) renders the UI. `workout-app.jsx` wires them in: a resolved `viewMode`, a landing-screen toggle, a new `screen === "checklist"` branch, checked-state + localStorage persistence, an extracted shared `completeWorkout()`, and a one-line wake-lock extension.

**Tech Stack:** React 19 (hooks, inline styles), Vite. Pure helpers tested with the built-in `node --test` runner (matches `api/_lib/validate.test.js`). React UI verified via the browser preview workflow (repo has no React test runner by design).

**Spec:** `docs/superpowers/specs/2026-07-10-checklist-workout-view-design.md`

---

### Task 1: `view-mode.js` — resolve + persist the view choice

**Files:**
- Create: `view-mode.js`
- Test: `view-mode.test.js`

- [ ] **Step 1: Write the failing test**

Create `view-mode.test.js` with exactly this content:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveViewMode, DEFAULT_VIEW } from "./view-mode.js";

test("resolveViewMode returns a valid stored mode unchanged", () => {
  assert.equal(resolveViewMode("checklist"), "checklist");
  assert.equal(resolveViewMode("stepthrough"), "stepthrough");
});

test("resolveViewMode falls back to DEFAULT_VIEW for null/invalid", () => {
  assert.equal(resolveViewMode(null), DEFAULT_VIEW);
  assert.equal(resolveViewMode(undefined), DEFAULT_VIEW);
  assert.equal(resolveViewMode("garbage"), DEFAULT_VIEW);
  assert.equal(resolveViewMode(""), DEFAULT_VIEW);
});

test("DEFAULT_VIEW is the step-through (conservative default)", () => {
  assert.equal(DEFAULT_VIEW, "stepthrough");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test view-mode.test.js`
Expected: FAIL — cannot find module `./view-mode.js`.

- [ ] **Step 3: Write the implementation**

Create `view-mode.js` with exactly this content:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test view-mode.test.js`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add view-mode.js view-mode.test.js
git commit -m "feat: add view-mode resolver (step-through vs checklist)"
```

---

### Task 2: `workouts/build-checklist.js` — grouped checklist model

**Files:**
- Create: `workouts/build-checklist.js`
- Test: `workouts/build-checklist.test.js`

**Context:** Workout shape is `{ name, phases:[{ name, circuits:[{ repeatCount, exercises:[{ name, repCount, tips? }] }] }] }`. `Rest` is an exercise with `name === "Rest"` and a numeric `repCount` (seconds); it must NOT become a checkable item. Most phases have one circuit, but some have 2–3 (e.g. "Leg Day", mini-circuits), so the model groups by circuit. Item ids embed phase/circuit/round/exercise index so they are stable across reloads for the same workout definition (persistence keys on them). The exercise index is the position in the original `exercises` array, so it stays stable even when a `Rest` sits between two exercises.

- [ ] **Step 1: Write the failing test**

Create `workouts/build-checklist.test.js` with exactly this content:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChecklist } from "./build-checklist.js";

const fixture = {
  name: "Test Workout",
  phases: [
    {
      name: "Warm Up",
      circuits: [
        { repeatCount: 1, exercises: [
          { name: "A", repCount: "8" },
          { name: "B", repCount: "10" },
        ] },
      ],
    },
    {
      name: "Superset 1",
      circuits: [
        { repeatCount: 2, exercises: [
          { name: "C", repCount: "8", tips: "keep back flat" },
          { name: "Rest", repCount: 30 },
          { name: "D", repCount: "6" },
        ] },
      ],
    },
    {
      name: "Mini Circuits",
      circuits: [
        { repeatCount: 1, exercises: [{ name: "E", repCount: "12" }] },
        { repeatCount: 1, exercises: [{ name: "F", repCount: "12" }] },
      ],
    },
  ],
};

test("totalItems counts checkable items, excluding Rest", () => {
  // Warm Up: 2 items × 1 round = 2
  // Superset 1: 2 items (C, D; Rest excluded) × 2 rounds = 4
  // Mini Circuits: 1 + 1 = 2
  assert.equal(buildChecklist(fixture).totalItems, 8);
});

test("one set per phase, with stable ids and names", () => {
  const { sets } = buildChecklist(fixture);
  assert.equal(sets.length, 3);
  assert.deepEqual(sets.map((s) => s.id), ["p0", "p1", "p2"]);
  assert.deepEqual(sets.map((s) => s.name), ["Warm Up", "Superset 1", "Mini Circuits"]);
});

test("single-round circuit exposes one round; multi-round flags multiRound", () => {
  const { sets } = buildChecklist(fixture);
  assert.equal(sets[0].groups[0].multiRound, false);
  assert.equal(sets[0].groups[0].rounds.length, 1);
  assert.equal(sets[1].groups[0].multiRound, true);
  assert.equal(sets[1].groups[0].rounds.length, 2);
});

test("Rest is excluded from items but sets a restCaption on the set", () => {
  const { sets } = buildChecklist(fixture);
  const round1 = sets[1].groups[0].rounds[0];
  assert.deepEqual(round1.items.map((i) => i.name), ["C", "D"]);
  assert.equal(sets[1].restCaption, "Rest ~30s");
  assert.equal(sets[0].restCaption, null);
});

test("item ids embed phase/circuit/round/original-exercise index", () => {
  const { sets } = buildChecklist(fixture);
  const round1 = sets[1].groups[0].rounds[0];
  // C is exercise index 0, D is index 2 (Rest is index 1, skipped)
  assert.deepEqual(round1.items.map((i) => i.id), ["p1c0r1e0", "p1c0r1e2"]);
  assert.equal(round1.items[0].tips, "keep back flat");
  assert.equal(round1.items[1].tips, undefined);
});

test("multiple circuits in a phase flag multiCircuit", () => {
  const { sets } = buildChecklist(fixture);
  assert.equal(sets[2].multiCircuit, true);
  assert.equal(sets[2].groups.length, 2);
  assert.deepEqual(sets[2].groups.map((g) => g.id), ["p2c0", "p2c1"]);
  assert.equal(sets[0].multiCircuit, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test workouts/build-checklist.test.js`
Expected: FAIL — cannot find module `./build-checklist.js`.

- [ ] **Step 3: Write the implementation**

Create `workouts/build-checklist.js` with exactly this content:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test workouts/build-checklist.test.js`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add workouts/build-checklist.js workouts/build-checklist.test.js
git commit -m "feat: add buildChecklist grouped-model builder"
```

---

### Task 3: `workouts/checklist-progress.js` — persist ticked state

**Files:**
- Create: `workouts/checklist-progress.js`
- Test: `workouts/checklist-progress.test.js`

**Context:** Exactly one active checklist is persisted at a time under a single key. The stored record is `{ key, checked: [...ids] }`. `key` identifies the open session — the workout name, plus the schedule `slot` when opened from the schedule (the same workout file is reused across weeks, so slot disambiguates — same reasoning as `progress.js`). The localStorage wrappers fail silently like `progress.js`/`weekly-progress.js`; only the pure `checklistKey` builder is unit-tested here (the wrappers are covered by the Task 8 browser verification).

- [ ] **Step 1: Write the failing test**

Create `workouts/checklist-progress.test.js` with exactly this content:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { checklistKey } from "./checklist-progress.js";

test("checklistKey uses the workout name when there is no slot", () => {
  assert.equal(checklistKey("Foundation 1", null), "Foundation 1");
  assert.equal(checklistKey("Foundation 1", undefined), "Foundation 1");
});

test("checklistKey prefixes the schedule slot so reused workouts stay distinct", () => {
  assert.equal(checklistKey("Foundation 1", "w1-0"), "w1-0::Foundation 1");
  assert.equal(checklistKey("Foundation 1", "w3-2"), "w3-2::Foundation 1");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test workouts/checklist-progress.test.js`
Expected: FAIL — cannot find module `./checklist-progress.js`.

- [ ] **Step 3: Write the implementation**

Create `workouts/checklist-progress.js` with exactly this content:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test workouts/checklist-progress.test.js`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add workouts/checklist-progress.js workouts/checklist-progress.test.js
git commit -m "feat: add checklist-progress persistence helpers"
```

---

### Task 4: `ChecklistScreen.jsx` — the checklist view component

**Files:**
- Create: `ChecklistScreen.jsx`

**Context:** Presentational component following the `GuidanceScreen.jsx`/`GateScreen.jsx` pattern: own color constants + a `makeStyles(accent, accentLight)` factory, everything else via props. Checked state, persistence, and completion side-effects live in the container (Task 7); this component only reads `checked` (a `Set`) and calls `onToggle`/`onFinish`/`onLeave`. It owns purely-visual state: which set is expanded (single-open accordion), the open detail sheet, and the leave-confirm modal. The leave modal is a self-contained copy of the step-through's End modal (same copy/behavior) to keep the two screens decoupled.

- [ ] **Step 1: Write the component**

Create `ChecklistScreen.jsx` with exactly this content:

```jsx
// Checklist workout view — an alternative to the step-through. Renders the whole
// workout as set-grouped rounds, each round-exercise with its own checkbox that
// can be ticked in any order. Presentational: ticked state, persistence, and
// completion live in the container (workout-app.jsx). This component owns only
// view state — the expanded set, the open detail sheet, and the leave modal.
import { useEffect, useState } from "react";

const TEXT = "#2D2A26";
const TEXT_SECONDARY = "#8A8279";
const BG = "#FAF8F5";
const SURFACE = "#FFFFFF";
const BORDER = "#E8E4E0";
const SUCCESS = "#3AAE6F";
const TIPS_DEFAULT =
  "If this is too easy, check your form, slow down, increase your range of motion, and add weight if necessary. If it's too hard, decrease the weight, decrease the number of reps, and reduce your range of motion if necessary.";

function setItemCount(set) {
  let n = 0;
  for (const g of set.groups) for (const r of g.rounds) n += r.items.length;
  return n;
}
function setDoneCount(set, checked) {
  let n = 0;
  for (const g of set.groups)
    for (const r of g.rounds)
      for (const it of r.items) if (checked.has(it.id)) n += 1;
  return n;
}
function setComplete(set, checked) {
  const total = setItemCount(set);
  return total > 0 && setDoneCount(set, checked) === total;
}

export default function ChecklistScreen({
  workout,
  checklist,
  checked,
  onToggle,
  onFinish,
  onLeave,
  accent,
  accentLight,
}) {
  const s = makeStyles(accent, accentLight);
  const { sets, totalItems } = checklist;

  const doneCount = sets.reduce((n, set) => n + setDoneCount(set, checked), 0);
  const allDone = totalItems > 0 && doneCount === totalItems;

  // Current set = first set (in order) that still has an unchecked item.
  const currentSetId = sets.find((set) => !setComplete(set, checked))?.id ?? null;

  const [expandedSetId, setExpandedSetId] = useState(
    currentSetId ?? (sets[0] && sets[0].id) ?? null
  );
  const [detailItem, setDetailItem] = useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Once the open set is fully checked, auto-advance to the next incomplete set.
  useEffect(() => {
    const expanded = sets.find((set) => set.id === expandedSetId);
    if (
      expanded &&
      setComplete(expanded, checked) &&
      currentSetId &&
      currentSetId !== expandedSetId
    ) {
      setExpandedSetId(currentSetId);
    }
  }, [checked, expandedSetId, currentSetId, sets]);

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <div style={s.title}>{workout.name}</div>
        <div style={s.bar}>
          {sets.map((set) => {
            const c = setItemCount(set);
            const fill = c > 0 ? setDoneCount(set, checked) / c : 0;
            return (
              <div key={set.id} style={s.barSeg}>
                <div style={{ ...s.barFill, width: `${fill * 100}%` }} />
              </div>
            );
          })}
        </div>
        <div style={{ ...s.count, ...(allDone ? s.countDone : {}) }}>
          {allDone
            ? `${totalItems} of ${totalItems} done 🎉`
            : `${doneCount} of ${totalItems} done`}
        </div>
      </div>

      {allDone && (
        <div style={s.completeBanner}>
          <div style={s.bigCheck}>✓</div>
          <div style={s.completeTitle}>Every set complete</div>
          <div style={s.completeSub}>Nice work — tap Finish to log it.</div>
        </div>
      )}

      <div style={s.list}>
        {sets.map((set) => {
          const complete = setComplete(set, checked);
          const isOpen = expandedSetId === set.id;
          const isCurrent = currentSetId === set.id;
          const c = setItemCount(set);
          const done = setDoneCount(set, checked);
          return (
            <div
              key={set.id}
              style={{
                ...s.set,
                ...(isCurrent ? s.setCurrent : {}),
                ...(complete ? s.setDone : {}),
              }}
            >
              <button
                style={s.setHeader}
                onClick={() => setExpandedSetId(isOpen ? null : set.id)}
              >
                <span style={s.setName}>
                  {complete ? "✓ " : isCurrent ? "● " : ""}
                  {set.name}
                </span>
                <span style={complete ? s.doneFlag : s.setMeta}>
                  {complete ? "done" : `${done} of ${c}`}
                </span>
              </button>

              {isOpen && (
                <div style={s.setBody}>
                  {set.groups.map((group, gi) => (
                    <div key={group.id}>
                      {set.multiCircuit && (
                        <div style={s.circuitLabel}>Circuit {gi + 1}</div>
                      )}
                      {group.rounds.map((round) => (
                        <div key={round.round}>
                          {group.multiRound && (
                            <div style={s.roundLabel}>Round {round.round}</div>
                          )}
                          {round.items.map((item) => {
                            const on = checked.has(item.id);
                            return (
                              <div key={item.id} style={s.row}>
                                <button
                                  style={{ ...s.box, ...(on ? s.boxOn : {}) }}
                                  onClick={() => onToggle(item.id)}
                                  aria-label={on ? "Uncheck exercise" : "Check exercise"}
                                >
                                  {on ? "✓" : ""}
                                </button>
                                <span
                                  style={{ ...s.rowName, ...(on ? s.rowNameOn : {}) }}
                                >
                                  {item.name}
                                  <span style={s.rowReps}> · {item.repCount}</span>
                                </span>
                                <button
                                  style={s.info}
                                  onClick={() => setDetailItem(item)}
                                  aria-label={`How to do ${item.name}`}
                                >
                                  ⓘ
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                  {set.restCaption && <div style={s.rest}>{set.restCaption}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={s.footer}>
        {allDone && (
          <button style={s.finishBtn} onClick={onFinish}>
            Finish workout →
          </button>
        )}
        <button style={s.leaveBtn} onClick={() => setShowLeaveConfirm(true)}>
          Leave workout
        </button>
      </div>

      {detailItem && (
        <div style={s.scrim} onClick={() => setDetailItem(null)}>
          <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={s.sheetMedia}>▶ demo coming soon</div>
            <div style={s.sheetName}>{detailItem.name}</div>
            <div style={s.sheetReps}>{detailItem.repCount}</div>
            <div style={s.tipBox}>
              <span style={s.tipIcon}>ℹ️</span>
              <span style={s.tipText}>{detailItem.tips || TIPS_DEFAULT}</span>
            </div>
            <button style={s.sheetClose} onClick={() => setDetailItem(null)}>
              Got it
            </button>
          </div>
        </div>
      )}

      {showLeaveConfirm && (
        <div style={s.scrim}>
          <div style={s.modal}>
            <div style={s.modalTitle}>End Workout?</div>
            <div style={s.modalText}>
              You'll lose your check-offs for this workout. Your progress won't be
              saved.
            </div>
            <div style={s.modalButtons}>
              <button
                style={s.modalCancel}
                onClick={() => setShowLeaveConfirm(false)}
              >
                Keep Going
              </button>
              <button style={s.modalConfirm} onClick={onLeave}>
                End Workout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function makeStyles(accent, accentLight) {
  return {
    screen: {
      fontFamily: "'DM Sans', sans-serif",
      minHeight: "100vh",
      maxWidth: 480,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      background: BG,
      color: TEXT,
    },
    header: { flexShrink: 0, padding: "18px 16px 8px" },
    title: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 20,
      fontWeight: 800,
      letterSpacing: "-0.02em",
      textAlign: "center",
    },
    bar: { display: "flex", gap: 3, margin: "10px 4px 6px" },
    barSeg: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      background: BORDER,
      overflow: "hidden",
    },
    barFill: { height: "100%", background: accent, transition: "width 0.3s ease" },
    count: {
      fontSize: 12,
      fontWeight: 600,
      color: TEXT_SECONDARY,
      textAlign: "center",
    },
    countDone: { color: SUCCESS, fontWeight: 800 },

    completeBanner: {
      flexShrink: 0,
      textAlign: "center",
      padding: "6px 16px 10px",
    },
    bigCheck: {
      width: 56,
      height: 56,
      borderRadius: "50%",
      background: "#E8F8EE",
      color: SUCCESS,
      fontSize: 28,
      fontWeight: 800,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 8px",
    },
    completeTitle: { fontSize: 15, fontWeight: 700 },
    completeSub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },

    list: { flex: 1, overflowY: "auto", padding: "4px 16px 8px" },
    set: {
      background: SURFACE,
      border: `1.5px solid ${BORDER}`,
      borderRadius: 14,
      padding: "2px 4px",
      marginBottom: 9,
    },
    setCurrent: { borderColor: accent, boxShadow: `0 0 0 3px ${accentLight}` },
    setDone: { background: "#f4f1ee", opacity: 0.72 },
    setHeader: {
      fontFamily: "'DM Sans', sans-serif",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 10px",
      background: "none",
      border: "none",
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    },
    setName: {
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: accent,
      textAlign: "left",
    },
    setMeta: { fontSize: 11, fontWeight: 600, color: TEXT_SECONDARY },
    doneFlag: { fontSize: 11, fontWeight: 700, color: SUCCESS },
    setBody: { padding: "2px 10px 10px" },
    circuitLabel: {
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: "0.06em",
      color: TEXT_SECONDARY,
      textTransform: "uppercase",
      margin: "10px 0 2px",
    },
    roundLabel: {
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: "0.06em",
      color: "#A79F96",
      margin: "9px 0 1px",
    },
    row: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "7px 0",
      borderTop: `1px solid #F2EFEB`,
    },
    box: {
      width: 22,
      height: 22,
      borderRadius: 6,
      border: `2px solid #D4CFC9`,
      background: SURFACE,
      color: "#fff",
      fontSize: 12,
      fontWeight: 700,
      flexShrink: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      padding: 0,
      WebkitTapHighlightColor: "transparent",
    },
    boxOn: { background: accent, borderColor: accent },
    rowName: { flex: 1, fontSize: 13.5, fontWeight: 600, color: TEXT, textAlign: "left" },
    rowNameOn: { color: "#A79F96" },
    rowReps: { fontWeight: 500, color: TEXT_SECONDARY },
    info: {
      width: 22,
      height: 22,
      borderRadius: "50%",
      border: `1.5px solid #D4CFC9`,
      background: "none",
      color: TEXT_SECONDARY,
      fontSize: 12,
      flexShrink: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      padding: 0,
      WebkitTapHighlightColor: "transparent",
    },
    rest: {
      fontSize: 11,
      fontWeight: 600,
      color: "#B7B0A8",
      textAlign: "center",
      padding: "8px 0 2px",
    },

    footer: {
      flexShrink: 0,
      padding: "12px 16px",
      paddingBottom: "max(16px, env(safe-area-inset-bottom))",
      borderTop: `1px solid ${BORDER}`,
      background: BG,
    },
    finishBtn: {
      fontFamily: "'DM Sans', sans-serif",
      width: "100%",
      background: accent,
      color: "#fff",
      border: "none",
      borderRadius: 14,
      padding: "15px",
      fontSize: 16,
      fontWeight: 700,
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    },
    leaveBtn: {
      fontFamily: "'DM Sans', sans-serif",
      width: "100%",
      background: "none",
      border: "none",
      color: TEXT_SECONDARY,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      marginTop: 8,
      padding: 6,
      WebkitTapHighlightColor: "transparent",
    },

    scrim: {
      position: "fixed",
      inset: 0,
      background: "rgba(45,42,38,0.5)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 100,
    },
    sheet: {
      background: SURFACE,
      borderRadius: "20px 20px 0 0",
      padding: "18px 18px 26px",
      width: "100%",
      maxWidth: 480,
      textAlign: "center",
      boxSizing: "border-box",
    },
    sheetMedia: {
      width: "100%",
      maxWidth: 260,
      aspectRatio: "1 / 1",
      margin: "0 auto 14px",
      borderRadius: 16,
      background: accentLight,
      color: accent,
      fontSize: 13,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    sheetName: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: "-0.02em",
      marginBottom: 6,
    },
    sheetReps: {
      display: "inline-block",
      background: accentLight,
      color: accent,
      fontWeight: 800,
      fontSize: 15,
      borderRadius: 10,
      padding: "5px 16px",
      marginBottom: 14,
    },
    tipBox: {
      border: `1.5px solid ${BORDER}`,
      borderRadius: 12,
      padding: "11px 12px",
      display: "flex",
      gap: 9,
      textAlign: "left",
    },
    tipIcon: { fontSize: 15, flexShrink: 0 },
    tipText: { fontSize: 12.5, lineHeight: 1.5, color: TEXT },
    sheetClose: {
      fontFamily: "'DM Sans', sans-serif",
      marginTop: 16,
      width: "100%",
      background: accent,
      color: "#fff",
      border: "none",
      borderRadius: 12,
      padding: 13,
      fontSize: 15,
      fontWeight: 700,
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    },

    modal: {
      alignSelf: "center",
      margin: "auto",
      background: SURFACE,
      borderRadius: 20,
      padding: 28,
      maxWidth: 340,
      width: "calc(100% - 48px)",
      textAlign: "center",
    },
    modalTitle: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 22,
      fontWeight: 700,
      marginBottom: 8,
    },
    modalText: {
      fontSize: 15,
      color: TEXT_SECONDARY,
      marginBottom: 24,
      lineHeight: 1.5,
    },
    modalButtons: { display: "flex", gap: 12 },
    modalCancel: {
      fontFamily: "'DM Sans', sans-serif",
      flex: 1,
      background: SURFACE,
      color: TEXT,
      border: `1.5px solid ${BORDER}`,
      borderRadius: 14,
      padding: "14px 16px",
      fontSize: 15,
      fontWeight: 600,
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    },
    modalConfirm: {
      fontFamily: "'DM Sans', sans-serif",
      flex: 1,
      background: accent,
      color: "#fff",
      border: "none",
      borderRadius: 14,
      padding: "14px 16px",
      fontSize: 15,
      fontWeight: 600,
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    },
  };
}
```

- [ ] **Step 2: Verify it compiles**

Start the preview if not running (`preview_start` with the dev server), then check `preview_logs` (level: error).
Expected: no build/compile errors. (The component isn't routed to yet — this only confirms it parses and the import graph is valid once imported in Task 7. If nothing imports it yet, Vite won't compile it; this step is a lint/parse sanity check via `npx eslint ChecklistScreen.jsx`.)

Run: `npx eslint ChecklistScreen.jsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add ChecklistScreen.jsx
git commit -m "feat: add ChecklistScreen presentational component"
```

---

### Task 5: Extract `completeWorkout()` in `workout-app.jsx` (no behavior change)

**Files:**
- Modify: `workout-app.jsx` (the completion block inside `handleNext`, ~lines 269–284)

**Context:** The step-through's completion side-effects are currently inline in `handleNext`'s last-step branch. Extract them into a `completeWorkout()` function so the checklist's Finish button can call the exact same logic (guaranteeing tracking parity). This task is behavior-preserving for the step-through. `clearActiveChecklist` is imported now and called here so a finished step-through also clears any stale saved checklist — harmless when none exists.

- [ ] **Step 1: Add the import**

At the top of `workout-app.jsx`, with the other `./workouts/...` imports (near line 5), add:

```js
import { clearActiveChecklist } from "./workouts/checklist-progress.js";
```

- [ ] **Step 2: Add `completeWorkout` and call it from `handleNext`**

Find this block in `handleNext` (~lines 269–284):

```js
  const handleNext = () => {
    if (currentStep >= totalSteps - 1) {
      // Auto-mark the schedule slot complete on finishing the last step.
      if (selectedSlot && !completed[selectedSlot]) toggleSlot(selectedSlot);
      // Increment weekly count for the library tracker.
      if (hasLibrary) {
        const next = weeklyCount + 1;
        setWeeklyCount(next);
        saveThisWeekCount(weeklyStorageKey, next);
      }
      recordCompletion(accessCode, selectedWorkout?.name);
      setScreen("complete");
    } else {
      animateTransition(() => setCurrentStep((s) => s + 1));
    }
  };
```

Replace it with:

```js
  // Shared completion side-effects — called by both the step-through (last step)
  // and the checklist (Finish button). Guarantees identical tracking.
  const completeWorkout = () => {
    // Auto-mark the schedule slot complete.
    if (selectedSlot && !completed[selectedSlot]) toggleSlot(selectedSlot);
    // Increment weekly count for the library tracker.
    if (hasLibrary) {
      const next = weeklyCount + 1;
      setWeeklyCount(next);
      saveThisWeekCount(weeklyStorageKey, next);
    }
    recordCompletion(accessCode, selectedWorkout?.name);
    // Clear any persisted checklist for this workout (no-op for step-through).
    clearActiveChecklist();
    setScreen("complete");
  };

  const handleNext = () => {
    if (currentStep >= totalSteps - 1) {
      completeWorkout();
    } else {
      animateTransition(() => setCurrentStep((s) => s + 1));
    }
  };
```

- [ ] **Step 3: Verify the step-through still completes**

With the preview running, drive a workout to the end in the (default) step-through view and confirm the Complete screen appears. Check `preview_logs` (error) and `read_console_messages` for errors.
Expected: Complete screen shows; no errors; a completion event POSTs to `/api/event` (visible in `read_network_requests`).

- [ ] **Step 4: Commit**

```bash
git add workout-app.jsx
git commit -m "refactor: extract completeWorkout() shared by both views"
```

---

### Task 6: Landing-screen view toggle in `workout-app.jsx`

**Files:**
- Modify: `workout-app.jsx` (imports ~line 11; state ~line 121; landing render ~lines 707–709; `styles` object)

**Context:** Add the resolved `viewMode` state and a "Guided / Checklist" segmented control on the landing screen, above the Start button. Selecting an option persists it (per-device override) and updates state so the next Start routes accordingly.

- [ ] **Step 1: Add the import**

With the other local imports near the top of `workout-app.jsx` (after the `access` import ~line 11), add:

```js
import { resolveViewMode, getStoredViewMode, setViewMode } from "./view-mode.js";
```

- [ ] **Step 2: Add view-mode state + selector**

Immediately after the `screen` state declaration (~line 121), add:

```js
  // Step-through vs. checklist view: universal default + per-device override.
  const [viewMode, setViewModeState] = useState(() =>
    resolveViewMode(getStoredViewMode())
  );
  const selectViewMode = (mode) => {
    setViewMode(mode);
    setViewModeState(mode);
  };
```

- [ ] **Step 3: Render the toggle on the landing screen**

In the landing render, find the Start button (~lines 707–709):

```jsx
            <button style={styles.startButton} onClick={handleStart}>
              Start Workout
            </button>
```

Insert the toggle immediately BEFORE that button:

```jsx
            <div style={styles.viewToggle}>
              <button
                style={{
                  ...styles.viewToggleOption,
                  ...(viewMode === "stepthrough" ? styles.viewToggleActive : {}),
                }}
                onClick={() => selectViewMode("stepthrough")}
              >
                Guided
              </button>
              <button
                style={{
                  ...styles.viewToggleOption,
                  ...(viewMode === "checklist" ? styles.viewToggleActive : {}),
                }}
                onClick={() => selectViewMode("checklist")}
              >
                Checklist
              </button>
            </div>
```

- [ ] **Step 4: Add the toggle styles**

In the `styles` object (anywhere among the other keys, e.g. right after the `startButton` style ~line 1107), add:

```js
  viewToggle: {
    display: "flex",
    gap: 4,
    background: colors.border,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    width: "100%",
    maxWidth: 260,
  },
  viewToggleOption: {
    fontFamily: "'DM Sans', sans-serif",
    flex: 1,
    background: "none",
    border: "none",
    borderRadius: 9,
    padding: "9px 12px",
    fontSize: 14,
    fontWeight: 600,
    color: colors.textSecondary,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  },
  viewToggleActive: {
    background: colors.surface,
    color: colors.accent,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
```

- [ ] **Step 5: Verify the toggle renders and persists**

With the preview running, open a workout's landing screen. Confirm the Guided/Checklist toggle appears above Start, switching the active option highlights it, and the choice survives a reload (`read_page` after `window.location.reload()`; the previously selected option stays active because `getStoredViewMode()` restores it).
Expected: toggle visible, selection persists across reload. No console errors.

- [ ] **Step 6: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: add Guided/Checklist toggle on the landing screen"
```

---

### Task 7: Route to the checklist + wire checked-state & persistence

**Files:**
- Modify: `workout-app.jsx` (imports; state; `handleStart` ~lines 263–267; new handlers; render branch after the workout branch ~line 885; wake-lock call ~line 125)

**Context:** This connects everything: on Start in checklist mode, load/resume ticked state and route to the new screen; toggling an item updates state and persists; Finish calls the shared `completeWorkout()`; Leave clears and returns. The wake lock extends to the checklist screen.

- [ ] **Step 1: Add imports**

With the other local imports near the top, add:

```js
import ChecklistScreen from "./ChecklistScreen";
import { buildChecklist } from "./workouts/build-checklist.js";
import {
  checklistKey,
  loadActiveChecklist,
  saveActiveChecklist,
} from "./workouts/checklist-progress.js";
```

(`clearActiveChecklist` is already imported from Task 5.)

- [ ] **Step 2: Extend the wake lock to the checklist screen**

Find (~line 125):

```js
  useWakeLock(screen === "workout");
```

Replace with:

```js
  useWakeLock(screen === "workout" || screen === "checklist");
```

- [ ] **Step 3: Add checklist state + derived model**

Immediately after the `viewMode` state added in Task 6, add:

```js
  // Checklist: ticked item ids for the one active checklist (Set for O(1) reads).
  const [checkedIds, setCheckedIds] = useState(() => new Set());
```

Then, next to the existing `steps` memo (~line 144), add:

```js
  const checklist = useMemo(
    () => (selectedWorkout ? buildChecklist(selectedWorkout) : null),
    [selectedWorkout]
  );
  const activeChecklistKey = selectedWorkout
    ? checklistKey(selectedWorkout.name, selectedSlot)
    : null;
```

- [ ] **Step 4: Route Start by view mode**

Find `handleStart` (~lines 263–267):

```js
  const handleStart = () => {
    setCurrentStep(0);
    setScreen("workout");
    setFadeClass("step-enter");
  };
```

Replace with:

```js
  const handleStart = () => {
    if (viewMode === "checklist") {
      const key = checklistKey(selectedWorkout.name, selectedSlot);
      const saved = loadActiveChecklist();
      if (saved && saved.key === key) {
        // Resume an interrupted session for this same workout.
        setCheckedIds(new Set(saved.checked));
      } else {
        // New/different workout — start fresh and reset the stored record.
        setCheckedIds(new Set());
        saveActiveChecklist(key, []);
      }
      setScreen("checklist");
      return;
    }
    setCurrentStep(0);
    setScreen("workout");
    setFadeClass("step-enter");
  };
```

- [ ] **Step 5: Add the toggle + leave handlers**

Right after `handleStart`, add:

```js
  const handleToggleChecklistItem = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveActiveChecklist(activeChecklistKey, [...next]);
      return next;
    });
  };

  // Confirmed leave from the checklist — discard progress and return.
  const handleLeaveChecklist = () => {
    clearActiveChecklist();
    setCheckedIds(new Set());
    setScreen(hasLibrary ? "library" : "select");
  };
```

- [ ] **Step 6: Render the checklist branch**

Find the end of the workout screen block — the closing of `{screen === "workout" && ...}` at ~line 885 (the line with `        </div>\n      )}` that closes that branch). Immediately AFTER it, add:

```jsx
      {/* ── Checklist View ───────────────────────────────────────────── */}
      {screen === "checklist" && selectedWorkout && checklist && (
        <ChecklistScreen
          workout={selectedWorkout}
          checklist={checklist}
          checked={checkedIds}
          onToggle={handleToggleChecklistItem}
          onFinish={completeWorkout}
          onLeave={handleLeaveChecklist}
          accent={variant.accent}
          accentLight={variant.accentLight}
        />
      )}
```

- [ ] **Step 7: Verify it compiles and routes**

With the preview running: on a landing screen, pick "Checklist", tap Start. Confirm the checklist screen renders the workout's sets. Check `preview_logs` (error) and `read_console_messages`.
Expected: checklist screen appears; no errors.

- [ ] **Step 8: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: route to checklist view with persisted ticked state"
```

---

### Task 8: End-to-end browser verification

**Files:** none (verification only)

Drive the full checklist flow in the preview and capture proof. Use the equestrian variant (green accent, has both library + schedule) via `?variant=equestrian`, unlocking with a valid access code if the gate appears.

- [ ] **Step 1: Enter the checklist**

Open a workout landing, select "Checklist", Start. `read_page`.
Expected: sets render; the first set is expanded and marked current (● + accent ring); later sets are collapsed; top reads "0 of N done".

- [ ] **Step 2: Out-of-order ticking + current-set tracking**

Tick a round-2 box before round-1 in the current set (`computer` click on the checkbox), then `read_page`.
Expected: the box shows ✓, the "x of N" counts update, and the current-set marker stays on the first set that still has an unchecked item.

- [ ] **Step 3: Accordion peek + auto-advance**

Tap an upcoming set header to expand it (it opens, current one collapses), then tap back. Tick every box in the current set and confirm the expansion auto-advances to the next incomplete set, and the completed set collapses to a "✓ … done" dimmed header.
Expected: single-open accordion behavior; auto-advance on set completion.

- [ ] **Step 4: Exercise detail sheet**

Tap an ⓘ on a row. `read_page`.
Expected: bottom sheet with the exercise name, reps, a square (not letterboxed) demo placeholder, and the exercise's tip text (or the default tip). Close returns to the list.

- [ ] **Step 5: Persistence across reload**

With several boxes ticked, reload (`javascript_tool`: `window.location.reload()`), unlock if needed, re-open the SAME workout in checklist mode, Start. `read_page`.
Expected: previously ticked boxes are restored (resumed from localStorage).

- [ ] **Step 6: Different-workout reset**

Leave (see Step 8 for the modal) or finish, then open a DIFFERENT workout in checklist mode.
Expected: it starts at "0 of N done" — the previous workout's ticks do not carry over.

- [ ] **Step 7: Completion + tracking parity**

Tick every box. `read_page` and `read_network_requests`.
Expected: header flips to "N of N done 🎉", the completion banner + Finish button appear. Tapping Finish shows the Complete screen, POSTs to `/api/event` (`read_network_requests`), bumps the weekly tracker, and — if opened from the schedule — auto-marks that slot done. Confirm `localStorage["setgo.activeChecklist"]` is cleared (`javascript_tool`).

- [ ] **Step 8: Leave discards**

Start a checklist, tick a couple boxes, tap "Leave workout" → the End Workout modal appears. "Keep Going" dismisses it; "End Workout" returns to the library AND clears the saved state (re-opening starts fresh, and `localStorage["setgo.activeChecklist"]` is gone).
Expected: leave discards progress, matching the step-through's End behavior.

- [ ] **Step 9: Step-through still works**

Switch the toggle back to "Guided", run a workout to completion.
Expected: unchanged step-through behavior; Complete screen; completion event recorded.

- [ ] **Step 10: Capture proof**

Take screenshots of: the checklist mid-workout (current set expanded), the ⓘ detail sheet, and the completed state with the Finish button. Share with the user as evidence, along with the `read_network_requests` completion POST.

---

## Notes for the implementer

- **Test runner:** pure helpers use `node --test <file>` (no config; matches `api/_lib/validate.test.js`). There is no React test runner — UI is verified in the browser preview.
- **Do NOT touch the step-through's own End modal** (inside the `screen === "workout"` branch). The checklist has its own leave modal in `ChecklistScreen.jsx` by design, to keep the two screens decoupled.
- **`checked` is a `Set`** passed as a prop; every toggle creates a new `Set` so React re-renders. Don't mutate it in place.
- **`TIPS_DEFAULT`** is intentionally duplicated in `ChecklistScreen.jsx` (the original lives in `workout-app.jsx` and isn't exported) — consistent with how the extracted screens redeclare shared style constants.
- **DEFAULT_VIEW** stays `"stepthrough"`; flipping the whole audience to checklist later is a one-line change in `view-mode.js` (plus the per-user toggle already overrides it).
- Leave the verification instrumentation OUT of committed code.
```
