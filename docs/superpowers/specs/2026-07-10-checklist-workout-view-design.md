# Checklist Workout View (alternate to step-through)

**Date:** 2026-07-10
**Status:** Approved, ready for implementation plan

## Goal

Add a second way to run a workout: a **checklist** view that shows the whole
workout as a list of exercises and reps, grouped by set, in prescribed order,
with a checkbox per round that the user ticks off. It is an alternative to — not
a replacement for — the existing **step-through** view. Which view a user gets is
controlled by a universal default plus a per-user toggle.

A workout is complete when every checkbox is ticked. Completion tracking, access
gating, and the weekly/schedule progress features all behave identically to the
step-through today.

## Non-goals (YAGNI)

- No removal or redesign of the step-through view.
- No backend/per-access-code control of the mode (the toggle is local; the
  unlock API is untouched). This can be layered on later without rework.
- No real per-exercise demo videos (still content-blocked); the demo area is a
  placeholder, as it is in the step-through today.
- No admin UI.

## Key decisions

1. **Check-off granularity — one checkbox per round ("Option C").** A set that
   repeats 3 rounds shows Round 1 / Round 2 / Round 3, each round listing its
   exercises with their own checkboxes. Fully explicit, closest to the
   step-through's expansion.
2. **Ordering is unrestricted.** Any box can be ticked at any time — round 2
   before round 1, a later set before an earlier one. The structure is
   *encouraged* visually, never *enforced*.
3. **Layout — focused accordion.** Exactly one set is expanded at a time. Done
   sets collapse to a ✓ header; upcoming sets collapse to a tappable header the
   user can open to peek. The "current" set (see below) is visually marked even
   when collapsed.
4. **Mode selection — universal default + per-user override.** A single
   build-time default plus a "Guided / Checklist" toggle on each workout's
   landing screen, stored in localStorage, that overrides the default for that
   device across all workouts.
5. **Persistence — localStorage.** Ticked boxes survive a reload / app-switch /
   tab eviction *within* an active session. Cleared on finish and on a confirmed
   leave (see Leaving).
6. **Completion is explicit.** Ticking the last box does not auto-navigate.
   Instead a clear "done" state and a **Finish workout** button appear; Finish
   runs the same completion side-effects as the step-through.

## Architecture

The current step-through lives entirely in `workout-app.jsx` as the
`screen === "workout"` branch, driven by `flattenWorkout()` (a linear step list)
and `currentStep`. The checklist is a parallel branch that shares the same
selection/landing/complete flow and the same completion side-effects.

### View-mode resolution

- **Universal default:** a module-level constant, e.g.
  `const DEFAULT_VIEW = "stepthrough"` (start conservative; flip to `"checklist"`
  to change the default for everyone without touching the toggle).
- **Per-user override:** a new tiny helper module `view-mode.js` mirroring
  `access.js` / `progress.js`:
  - `getViewMode()` → returns the stored override (`"checklist"` |
    `"stepthrough"`) or `null` if unset.
  - `setViewMode(mode)` → persists to `localStorage["setgo.viewMode"]`.
- **Effective mode** = stored override ?? `DEFAULT_VIEW`. Resolved into React
  state so the landing-screen toggle updates it live.

### Screen state

The existing `screen` variable (`library | schedule | guidance | select |
landing | workout | complete`) gains one value: **`checklist`**. `handleStart`
routes to `workout` or `checklist` based on the effective view mode. `landing`
and `complete` are shared unchanged.

### Checklist data model — `buildChecklist(workout)`

A new pure function (sibling to `flattenWorkout`) that produces the *grouped*
structure the accordion needs (rather than a flat list):

```
{
  sets: [
    {
      id,                 // stable: `p${phaseIndex}c${circuitIndex}`
      name,               // phase name, e.g. "Superset 1", "Warm Up"
      rounds: [
        {
          round,          // 1-based
          items: [
            { id, name, repCount, tips }   // id: `${setId}r${round}e${exIndex}`
          ]
        }
      ],
      restCaption,        // optional subtle "Rest ~60s" text, or null
    }
  ],
  totalItems,             // count of checkable items (excludes Rest)
}
```

- **Rest handling:** `Rest` steps are *not* checkable items. Where a circuit
  contains rests, surface them as a non-interactive caption on the set (e.g.
  "Rest ~60s between rounds"); they never appear as a tickable row. Trailing
  rests are dropped, as `flattenWorkout` already does.
- Item ids are derived from position (phase/circuit/round/exercise index), so
  they are stable across reloads for the same workout definition — this is what
  persistence keys on.

### Checked state + persistence — `checklist-progress.js`

A new helper module, same shape as `progress.js`:

- In-memory state: a `Set` (or map) of ticked item ids for the *one* active
  checklist.
- Persisted under a single key, e.g. `localStorage["setgo.activeChecklist"]`,
  storing `{ key, checked: [...ids] }` where `key` identifies the open session
  (workout name, plus schedule `slot` when opened from the schedule, since the
  same workout file is reused across weeks — same reasoning as `progress.js`).
- `loadActiveChecklist()`, `saveActiveChecklist(key, checkedIds)`,
  `clearActiveChecklist()`.
- **Resume/clear rules:**
  - Opening a workout whose saved `key` matches → resume its ticks.
  - Opening a *different* workout → discard the saved state, start fresh (only
    one active checklist at a time).
  - Finish → clear.
  - Confirmed leave/abandon → clear.

### Shared completion — `completeWorkout()`

Extract the side-effects currently inline in `handleNext`'s last-step branch
into one function both views call:

- `recordCompletion(accessCode, selectedWorkout?.name)`
- if `hasLibrary`: increment + save the weekly count
- if `selectedSlot`: `toggleSlot(selectedSlot)` (auto-mark schedule slot)
- clear the active checklist (no-op for step-through)
- `setScreen("complete")`

The step-through's `handleNext` calls this at the last step; the checklist's
**Finish** button calls the same function. Tracking parity is guaranteed by
construction.

### Wake lock

Extend the existing hook call to cover the new screen:
`useWakeLock(screen === "workout" || screen === "checklist")`.

## UX details

- **Current set** = the first set (in workout order) that still has an unticked
  box. It is expanded on entry and marked (accent ring + dot) even when
  collapsed. Ticking the last box of the current set auto-advances the expansion
  to the next incomplete set. Tapping any header expands that set and collapses
  the previously open one (single-open accordion).
- **Progress readout:** an "N of M done" count at the top (M = `totalItems`),
  plus the segmented per-phase bar from the step-through for visual continuity.
- **Exercise detail (ⓘ):** tapping the info affordance on a row opens a bottom
  sheet with the exercise name, reps, a **square / aspect-flexible** demo-media
  placeholder (do **not** assume a wide 16:9 rectangle — anticipate a roughly
  square clip), and the exercise's `tips` text (falling back to `TIPS_DEFAULT`).
  A close button dismisses it.
- **Completion:** when all boxes are ticked, the readout flips to a done state
  ("M of M done"), a completion banner + big check appear, and a **Finish
  workout** button surfaces. Finish → `completeWorkout()`.
- **Leaving early:** reuses the existing End Workout confirmation modal
  (`showEndConfirm` / `confirmEnd` / `cancelEnd` and the modal styles). Warns
  that progress won't be saved, offering Keep Going / End. Confirming clears the
  active checklist and returns to the library/select screen.
- **Toggle:** a "Guided / Checklist" segmented control on the landing screen
  (before Start), styled consistently with the app. Flipping it calls
  `setViewMode` and updates the effective mode so the next Start routes
  accordingly.

## Visual consistency

Reuse the existing palette (`colors`), fonts (DM Sans / Outfit), card radii,
accent treatment, the rep-badge styling, the tips-box styling, the segmented
progress bar, the complete-screen check, and the End modal. The checklist should
read as the same product as the step-through, not a new theme.

## Edge cases

- **Reopen a completed workout** → saved state was cleared on finish, so it
  starts fresh.
- **Switch apps mid-workout, OS reloads the tab** → saved ticks restore on
  return (this is the primary reason for persistence).
- **Empty/degenerate workout** (all rest, no checkable items) → treated as
  already complete; not expected in real data but handled gracefully.
- **Unsupported localStorage** (private mode/quota) → helpers fail silently
  (same pattern as `progress.js`); the session still works in memory.
- **Switching the landing toggle mid-nothing** → only affects the *next* Start;
  does not mutate an in-progress session.

## Testing / verification

No automated test infra for UI in this repo; verify via the browser preview
workflow:

- Default mode routes to the step-through; toggling to Checklist routes to the
  new screen; the choice persists across reloads.
- Ticking boxes out of order works; the current-set marker tracks the first
  incomplete set; the accordion advances on set completion.
- ⓘ opens the detail sheet with the right tips; the media placeholder is not
  letterboxed for a square clip.
- Persistence: tick some boxes, reload → ticks restored; Finish → cleared;
  leave via modal → cleared.
- Finish fires the same tracking: schedule slot auto-marks, weekly count bumps,
  completion event records — identical to the step-through.

The pure `buildChecklist` builder and the `checklist-progress` /
`view-mode` helpers have no DOM dependency and can get lightweight
`node --test` coverage alongside the existing `api/_lib` tests if desired.

## Rough component inventory

- `view-mode.js` — new (get/set effective view override).
- `workouts/checklist-progress.js` — new (persist active checklist ticks).
- `buildChecklist(workout)` — new pure builder in `workout-app.jsx` (or a
  sibling module) next to `flattenWorkout`.
- `completeWorkout()` — extracted shared side-effects.
- `screen === "checklist"` render branch + the exercise-detail bottom sheet.
- Landing-screen "Guided / Checklist" toggle.
- One-line wake-lock call extension.
- Styles added to the existing `styles` object.
