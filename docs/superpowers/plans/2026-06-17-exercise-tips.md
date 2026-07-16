# Exercise Tips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-exercise `easier`/`harder` fields with a single `tips` string, shown as a always-visible static box (info icon + paragraph) in the workout screen.

**Architecture:** Data model change in workout files + parser; UI change in `workout-app.jsx` to remove the toggle and render a static tips box; default fallback tip text for exercises with no `tips` field.

**Tech Stack:** React (JSX), inline JS styles, Vite

---

## Files

- **Modify:** `workouts/parse-csv.js` — swap `easier`/`harder` columns for `tips`
- **Modify:** `workouts/rider-build-1.js` — remove `easier`/`harder` from exercises
- **Modify:** `workouts/rider-build-2.js` — remove `easier`/`harder` from exercises
- **Modify:** `workouts/rider-symmetry-and-balance-1.js` — remove `easier`/`harder`
- **Modify:** `workouts/rider-symmetry-and-balance-2.js` — remove `easier`/`harder`
- **Modify:** `workouts/rider-alternating-supersets.js` — remove `easier`/`harder`
- **Modify:** `workout-app.jsx` — replace modifier block UI with static tips box

---

### Task 1: Update parse-csv.js

**Files:**
- Modify: `workouts/parse-csv.js`

- [ ] **Step 1: Update the destructuring in the CSV loop**

In `parseWorkoutCsv`, change the destructuring on line 33 from:
```js
for (const [phaseName, circuit, rounds, exercise, repCount, easier, harder] of rows) {
```
to:
```js
for (const [phaseName, circuit, rounds, exercise, repCount, tips] of rows) {
```

- [ ] **Step 2: Update both `buildExercise` calls**

Line 54 — change:
```js
exercises: [buildExercise(exercise, rep, easier, harder)],
```
to:
```js
exercises: [buildExercise(exercise, rep, tips)],
```

Line 59 — change:
```js
currentCircuit.exercises.push(buildExercise(exercise, rep, easier, harder));
```
to:
```js
currentCircuit.exercises.push(buildExercise(exercise, rep, tips));
```

- [ ] **Step 3: Update `buildExercise` function**

Replace the existing `buildExercise` (lines 88–93) with:
```js
/** Builds an exercise object, omitting tips when blank. */
function buildExercise(name, repCount, tips) {
  const obj = { name, repCount };
  if (tips) obj.tips = tips;
  return obj;
}
```

- [ ] **Step 4: Update the file header comment**

Change the `Expected CSV columns` line in the JSDoc comment at the top:
```
 * Expected CSV columns: Phase, Circuit, Rounds, Exercise, RepCount, Tips
```
And update the Output shape exercise example:
```
 *       { repeatCount, exercises: [{ name, repCount, tips? }, ...] },
```

- [ ] **Step 5: Commit**
```bash
git add workouts/parse-csv.js
git commit -m "feat: replace easier/harder CSV columns with single tips column"
```

---

### Task 2: Strip easier/harder from workout files

**Files:**
- Modify: `workouts/rider-build-1.js`
- Modify: `workouts/rider-build-2.js`
- Modify: `workouts/rider-symmetry-and-balance-1.js`
- Modify: `workouts/rider-symmetry-and-balance-2.js`
- Modify: `workouts/rider-alternating-supersets.js`

- [ ] **Step 1: Remove all `easier` and `harder` keys from rider-build-1.js**

Open the file and delete every line of the form `"easier": "...",` or `"harder": "...",`. Do not add `tips` — tips content will be provided by Katie separately. Leave the exercise objects intact with just `name` and `repCount`.

- [ ] **Step 2: Same for rider-build-2.js**

Remove all `"easier"` and `"harder"` lines.

- [ ] **Step 3: Same for rider-symmetry-and-balance-1.js**

Remove all `"easier"` and `"harder"` lines.

- [ ] **Step 4: Same for rider-symmetry-and-balance-2.js**

Remove all `"easier"` and `"harder"` lines.

- [ ] **Step 5: Same for rider-alternating-supersets.js**

Remove all `"easier"` and `"harder"` lines.

- [ ] **Step 6: Verify no easier/harder remain**
```bash
grep -rn "easier\|harder" workouts/ --include="*.js" | grep -v "parse-csv.js" | grep -v "index.js"
```
Expected: no output.

- [ ] **Step 7: Commit**
```bash
git add workouts/rider-build-1.js workouts/rider-build-2.js workouts/rider-symmetry-and-balance-1.js workouts/rider-symmetry-and-balance-2.js workouts/rider-alternating-supersets.js
git commit -m "chore: remove easier/harder fields from all workout files"
```

---

### Task 3: Update workout-app.jsx — data constants

**Files:**
- Modify: `workout-app.jsx`

The file currently has constants for modifier defaults and styling near the top. These need to be replaced.

- [ ] **Step 1: Replace MODIFIER_DEFAULTS**

Find the `MODIFIER_DEFAULTS` constant (around line 30–33). Replace it entirely with:
```js
const TIPS_DEFAULT =
  "If this is too easy, check your form, slow down, increase your range of motion, and add weight if necessary. If it's too hard, decrease the weight, decrease the number of reps, and reduce your range of motion if necessary.";
```

- [ ] **Step 2: Remove difficulty color/label constants that reference easier/harder as modifier labels**

Find and remove these constants (around lines 38–45):
```js
const MODIFIER_COLORS = { ... };   // the one with easier/harder color hex values
const MODIFIER_LABELS = { ... };   // the one with "Easier" / "Harder" labels
```
Leave `DIFFICULTY_ORDER` and `DIFFICULTY_COLORS` alone — those are for workout difficulty chips (easier/moderate/harder workout-level difficulty), not exercise modifiers.

- [ ] **Step 3: Commit**
```bash
git add workout-app.jsx
git commit -m "refactor: replace MODIFIER_DEFAULTS/COLORS/LABELS with TIPS_DEFAULT"
```

---

### Task 4: Update workout-app.jsx — UI

**Files:**
- Modify: `workout-app.jsx`

The modifier block (around lines 797–833) currently renders a tap-to-toggle box. Replace it with a static tips box.

- [ ] **Step 1: Remove the showModifier state**

Find the line:
```js
const [showModifier, setShowModifier] = useState(false);
```
Delete it. (Search for `showModifier` to confirm it only appears in the modifier block — it should.)

- [ ] **Step 2: Replace the modifier block JSX**

Find the block starting around line 797 that looks like:
```jsx
<div
  style={{
    ...styles.modifierBlock,
    ...
  }}
  onClick={() => setShowModifier((v) => !v)}
>
  <div style={{
    ...styles.modifierToggleLabel,
    ...
  }}>
    ...
  </div>
  <div style={{
    ...styles.modifierPanel,
    ...
  }}>
    ...two rows with Easier/Harder badges...
  </div>
</div>
```

Replace the entire block with:
```jsx
<div style={styles.tipsBox}>
  <span style={styles.tipsIcon}>ℹ️</span>
  <span style={styles.tipsText}>
    {currentExercise.tips || TIPS_DEFAULT}
  </span>
</div>
```

- [ ] **Step 3: Commit**
```bash
git add workout-app.jsx
git commit -m "feat: replace modifier toggle with static tips box"
```

---

### Task 5: Update workout-app.jsx — styles

**Files:**
- Modify: `workout-app.jsx`

- [ ] **Step 1: Remove old modifier styles**

In the `styles` object (near the bottom of the file), find and delete these keys:
- `modifierBlock`
- `modifierToggleLabel`
- `modifierPanel`
- `modifierRow`
- `modifierBadge`
- `modifierBadgeEasier`
- `modifierBadgeHarder`
- `modifierText`

- [ ] **Step 2: Add new tips styles**

In their place, add:
```js
tipsBox: {
  width: "100%",
  maxWidth: 320,
  borderRadius: 12,
  border: `1.5px solid ${colors.border}`,
  marginTop: 4,
  padding: "12px 14px",
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  background: colors.surface,
  boxSizing: "border-box",
},

tipsIcon: {
  fontSize: 16,
  flexShrink: 0,
  marginTop: 1,
},

tipsText: {
  fontSize: 12,
  color: colors.text,
  lineHeight: 1.55,
},
```

- [ ] **Step 3: Verify no references to old style keys remain**
```bash
grep -n "modifierBlock\|modifierToggleLabel\|modifierPanel\|modifierRow\|modifierBadge\|modifierText\|showModifier\|MODIFIER_DEFAULTS\|MODIFIER_COLORS\|MODIFIER_LABELS" workout-app.jsx
```
Expected: no output.

- [ ] **Step 4: Commit**
```bash
git add workout-app.jsx
git commit -m "style: replace modifier styles with tipsBox styles"
```

---

### Task 6: Verify in browser

- [ ] **Step 1: Start the dev server**
```bash
npm run dev
```

- [ ] **Step 2: Open the app and navigate to a workout**

Open `http://localhost:5173`, select any workout, start it, and step through to an exercise (not a Rest).

- [ ] **Step 3: Confirm tips box renders correctly**

- Tips box is visible without tapping
- Info icon (ℹ️) appears on the left
- Default tip text appears for exercises without a `tips` field
- Box is roughly the same size as the old modifier block

- [ ] **Step 4: Confirm no console errors**

Open browser devtools and check for React errors or undefined reference errors.
