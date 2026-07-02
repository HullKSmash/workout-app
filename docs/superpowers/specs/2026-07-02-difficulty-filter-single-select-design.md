# Difficulty Filter: Single-Select-First Behavior

**Date:** 2026-07-02
**Status:** Approved
**Area:** Library screen difficulty filter chips (`workout-app.jsx`)

## Problem

On the library screen, workouts can be filtered by difficulty (Easier / Moderate / Harder)
via a row of chips. The current `toggleFilter` treats each chip as an independent on/off
toggle. Because all three start active, the first tap *deselects* one difficulty and leaves
the other two showing — the opposite of the common expectation that tapping a filter narrows
to it.

## Desired Behavior

Tapping a difficulty when everything is shown should narrow to *just* that difficulty;
further taps then add or remove difficulties like a normal multi-select. The user should
never be able to reach an all-empty selection.

## Model

"All three active" is the canonical **show everything** state. Every interaction path leads
back to it, so there is no separate mode to track.

| Current state              | User taps            | Result                          |
| -------------------------- | -------------------- | ------------------------------- |
| All 3 active (show all)    | any chip             | Collapse to **only that chip**  |
| A subset active            | an **inactive** chip | **Add** it                      |
| A subset (2+) active       | an **active** chip   | **Deselect** just that one      |
| Exactly 1 active           | that **sole** chip   | **Reset to all 3** (show all)   |

Consequences:
- The active set is never empty (the sole-chip tap resets to all instead of clearing).
- Reaching all-three by adding the last chip is identical to the default "show all" state,
  so the next tap collapses again — fully consistent regardless of how all-three was reached.
- Reset-to-all on the sole-chip tap gives a discoverable "clear the filter" gesture.

## Changes

### 1. Rewrite `toggleFilter` (`workout-app.jsx`, ~line 216)

```js
const toggleFilter = (difficulty) => {
  setActiveFilters((prev) => {
    // From "show everything", first tap collapses to just this one.
    if (prev.size === ALL_DIFFICULTIES.length) return new Set([difficulty]);
    const next = new Set(prev);
    if (next.has(difficulty)) {
      // Deselecting the sole active chip resets to "show everything".
      if (next.size === 1) return new Set(ALL_DIFFICULTIES);
      next.delete(difficulty);
    } else {
      next.add(difficulty);
    }
    return next;
  });
};
```

### 2. Update empty-state copy (`workout-app.jsx`, ~line 390)

With the at-least-one guarantee, "No difficulty selected" is now unreachable. The list can
still be empty when a variant has no workouts of the selected difficulty (e.g. only "Harder"
active but no harder workouts exist for that variant). Reword to reflect that cause:

> "No workouts match this difficulty — tap another filter above."

## Out of Scope / Unchanged

- Default of all-difficulties-active on landing.
- Difficulty sort order, chip visuals/pips, and the `Set`-based `activeFilters` state shape.
- Any workout data or variant configuration.

## Testing

No test harness exists in this repo. Verify manually in the browser preview across the
state-transition table above, including: first tap collapses; adding a second chip;
deselecting one of two; tapping the sole chip resets to all; and the reworded empty state
when a single active difficulty has no matching workouts for the variant.
