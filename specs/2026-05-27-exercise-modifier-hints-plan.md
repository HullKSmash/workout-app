# Exercise Modifier Hints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible "Make it easier or harder" panel to every non-rest exercise screen, showing exercise-specific or default modification tips.

**Architecture:** All state lives in the existing `WorkoutApp` component. A `showModifier` boolean toggled by tapping the link, reset via `useEffect` on step change. Exercise data model gains optional `easier`/`harder` string fields; when absent, hardcoded defaults are shown. `parse-csv.js` gains column support so tips can be authored in the spreadsheet workflow.

**Tech Stack:** React (useState, useEffect), inline JS styles, no dependencies added

---

## File Map

- **Modify:** `workout-app.jsx` — add state, useEffect reset, JSX panel, styles
- **Modify:** `workouts/parse-csv.js` — add `easier`/`harder` column support

---

### Task 1: Add modifier state and reset logic to WorkoutApp

**Files:**
- Modify: `workout-app.jsx`

- [ ] **Step 1: Add `showModifier` state and default text constants**

In `workout-app.jsx`, add the constants just above the `WorkoutApp` function definition (after the `visibleWorkouts`/`variantLinks` block at the top of the file):

```js
const MODIFIER_DEFAULTS = {
  easier: "Reduce your range of motion or use only body weight",
  harder: "Slow the motion down, increase your range of motion, or add more weight",
};
```

Then inside `WorkoutApp`, add the new state alongside the existing `useState` declarations (after `const [fadeClass, setFadeClass] = useState("step-enter")`):

```js
const [showModifier, setShowModifier] = useState(false);
```

- [ ] **Step 2: Reset the panel on step change**

Add this `useEffect` inside `WorkoutApp`, alongside the existing effects (after the countdown timer effects, before `animateTransition`):

```js
// Collapse modifier panel when exercise changes
useEffect(() => {
  setShowModifier(false);
}, [currentStep]);
```

- [ ] **Step 3: Verify by inspection**

Open `workout-app.jsx` and confirm:
- `MODIFIER_DEFAULTS` is defined at module level (not inside the component)
- `showModifier` appears in the `useState` declarations
- The `useEffect` with `[currentStep]` dependency is present

- [ ] **Step 4: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: add modifier panel state and reset logic"
```

---

### Task 2: Add modifier panel styles

**Files:**
- Modify: `workout-app.jsx` (the `styles` object at the bottom)

- [ ] **Step 1: Add styles to the `styles` object**

In `workout-app.jsx`, find the `// ── Complete ─────` section near the bottom of the `styles` object. Add the following new entries just before it:

```js
// ── Modifier Panel ───────────────────────────────────────────
modifierToggle: {
  marginTop: 16,
  fontSize: 13,
  fontWeight: 500,
  color: colors.textSecondary,
  cursor: "pointer",
  padding: "6px 0",
  WebkitTapHighlightColor: "transparent",
  userSelect: "none",
},

modifierPanel: {
  background: "#F7F5F2",
  borderRadius: 12,
  padding: "12px 14px",
  marginTop: 8,
  width: "100%",
  maxWidth: 320,
  textAlign: "left",
},

modifierRow: {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
},

modifierBadge: {
  fontSize: 11,
  fontWeight: 600,
  padding: "2px 8px",
  borderRadius: 20,
  flexShrink: 0,
  whiteSpace: "nowrap",
  marginTop: 1,
},

modifierBadgeEasier: {
  background: "#EAF1FC",
  color: "#2D6BD1",
},

modifierBadgeHarder: {
  background: "#FFF0EC",
  color: "#E85D3A",
},

modifierText: {
  fontSize: 12,
  color: "#555",
  lineHeight: 1.5,
},
```

- [ ] **Step 2: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: add modifier panel styles"
```

---

### Task 3: Add modifier panel JSX to exercise display

**Files:**
- Modify: `workout-app.jsx` (exercise display section, lines ~303–327)

- [ ] **Step 1: Add toggle link and panel after round info**

Locate this block in the exercise display (inside the `else` branch of `currentExercise.isRest`):

```jsx
{/* Circuit / Round info */}
{currentExercise.totalRounds > 1 && (
  <div style={styles.roundInfo}>
    Round {currentExercise.round} of{" "}
    {currentExercise.totalRounds}
  </div>
)}
```

Replace it with:

```jsx
{/* Circuit / Round info */}
{currentExercise.totalRounds > 1 && (
  <div style={styles.roundInfo}>
    Round {currentExercise.round} of{" "}
    {currentExercise.totalRounds}
  </div>
)}

{/* Modifier panel */}
<div
  style={styles.modifierToggle}
  onClick={() => setShowModifier((v) => !v)}
>
  Make it easier or harder {showModifier ? "▴" : "▾"}
</div>
{showModifier && (
  <div style={styles.modifierPanel}>
    <div style={styles.modifierRow}>
      <span style={{ ...styles.modifierBadge, ...styles.modifierBadgeEasier }}>
        Easier
      </span>
      <span style={styles.modifierText}>
        {currentExercise.easier || MODIFIER_DEFAULTS.easier}
      </span>
    </div>
    <div style={{ ...styles.modifierRow, marginTop: 8 }}>
      <span style={{ ...styles.modifierBadge, ...styles.modifierBadgeHarder }}>
        Harder
      </span>
      <span style={styles.modifierText}>
        {currentExercise.harder || MODIFIER_DEFAULTS.harder}
      </span>
    </div>
  </div>
)}
```

- [ ] **Step 2: Verify in the browser**

Start the dev server (`npm run dev` or `vite`) and open any workout. On any non-rest exercise:
- Confirm "Make it easier or harder ▾" appears below the rep badge / round info
- Tap it — confirm the panel opens with "Easier" and "Harder" rows showing default text
- Tap again — confirm it closes
- Tap Next to advance — confirm the panel is closed on the next exercise

Also confirm rest timer steps show no modifier toggle.

- [ ] **Step 3: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: add modifier panel toggle UI to exercise screen"
```

---

### Task 4: Update parse-csv.js to support easier/harder columns

**Files:**
- Modify: `workouts/parse-csv.js`

- [ ] **Step 1: Update the destructuring to include new columns**

Locate this line in `parse-csv.js`:

```js
for (const [phaseName, circuit, rounds, exercise, repCount] of rows) {
```

Replace it with:

```js
for (const [phaseName, circuit, rounds, exercise, repCount, easier, harder] of rows) {
```

- [ ] **Step 2: Build the exercise object conditionally**

Locate the two places where an exercise object is pushed inline. The first is inside the `isRest` branch (Rest rows — leave this one unchanged, Rest has no modifiers). The second is the non-Rest circuit construction:

```js
currentCircuit = {
  repeatCount: currentRounds,
  exercises: [{ name: exercise, repCount: rep }],
};
```

And the `else` branch that appends to an existing circuit:

```js
currentCircuit.exercises.push({ name: exercise, repCount: rep });
```

Replace both with a shared helper that builds the object. Add this helper function at the bottom of the file (after `parseCsvLine`):

```js
/** Builds an exercise object, omitting easier/harder when blank. */
function buildExercise(name, repCount, easier, harder) {
  const obj = { name, repCount };
  if (easier) obj.easier = easier;
  if (harder) obj.harder = harder;
  return obj;
}
```

Then update the two non-Rest exercise construction sites:

```js
// First site (new circuit):
currentCircuit = {
  repeatCount: currentRounds,
  exercises: [buildExercise(exercise, rep, easier, harder)],
};

// Second site (append to existing circuit):
currentCircuit.exercises.push(buildExercise(exercise, rep, easier, harder));
```

- [ ] **Step 3: Verify by manual test**

Open the browser console and run this snippet to confirm the parser handles the new columns:

```js
import { parseWorkoutCsv } from './workouts/parse-csv.js';

const csv = `Phase,Circuit,Rounds,Exercise,RepCount,Easier,Harder
Warm Up,A,1,Squat,10,Reduce depth,Add weight
Warm Up,,,Rest,30,,`;

const result = parseWorkoutCsv(csv, "Test");
console.log(JSON.stringify(result, null, 2));
// Expected: first exercise has easier and harder fields;
//           Rest row has no easier/harder
```

Confirm the output looks like:
```json
{
  "name": "Test",
  "phases": [{
    "name": "Warm Up",
    "circuits": [
      { "repeatCount": 1, "exercises": [{ "name": "Squat", "repCount": 10, "easier": "Reduce depth", "harder": "Add weight" }] },
      { "repeatCount": 1, "exercises": [{ "name": "Rest", "repCount": 30 }] }
    ]
  }]
}
```

- [ ] **Step 4: Commit**

```bash
git add workouts/parse-csv.js
git commit -m "feat: add easier/harder column support to parse-csv"
```
