# Exercise Modifier Hints

**Date:** 2026-05-27
**Status:** Approved

## Problem

Users occasionally need to scale an exercise up or down mid-workout — either because it's too hard or too easy. There's currently no in-app guidance for how to do this.

## Solution

A collapsible "Make it easier or harder" panel on every non-rest exercise screen. Tapping the toggle reveals two labeled rows (Easier / Harder) with tip text specific to that exercise, falling back to sensible defaults when no specific tip is authored.

## Data Model

Add two optional string fields to the `Exercise` object:

```js
{
  name: string,
  repCount: string | number,
  easier?: string,   // optional override for easier tip
  harder?: string,   // optional override for harder tip
}
```

**Default tip text (used when field is absent):**
- Easier: `"Reduce your range of motion or use only body weight"`
- Harder: `"Slow the motion down, increase your range of motion, or add more weight"`

The `easier`/`harder` fields will also be supported in the CSV template and `parse-csv.js` so Katie can author them in the spreadsheet workflow.

## UI Behavior

- A "Make it easier or harder ▾" link appears at the bottom of the exercise content area, above the nav buttons, on every non-rest step.
- Tapping expands an inline panel with **Easier** and **Harder** labeled rows.
- Tapping again collapses the panel.
- The panel state is local (`useState`). It must be explicitly reset when the user advances — the exercise display div is not unmounted between steps, so `useState` persists across exercises. Add `key={currentStep}` to the exercise display div to cause React to remount it on each step change, which resets all local state cleanly.
- The panel shows on every exercise — always — because default tip text is always available.

## Visual Design

- Toggle link: small, muted secondary color (`#8A8279`), sits above the nav row
- Panel background: light off-white (`#F7F5F2`), rounded corners, padding
- "Easier" badge: blue pill (`#EAF1FC` bg, `#2D6BD1` text)
- "Harder" badge: orange pill (`#FFF0EC` bg, `#E85D3A` text)
- Tip text: small (11–12px), dark gray (`#555`)

## CSV / Authoring

Add `easier` and `harder` as optional columns to the workout CSV template. `parse-csv.js` should map them to the exercise object when present, and omit them (leaving fields undefined) when empty.

## Scope

- `workout-app.jsx` — add toggle state, panel UI, styles
- `workouts/*.js` — no changes needed now; fields added as Katie authors them
- `parse-csv.js` — add `easier`/`harder` column support
- No changes to routing, variants, or other screens
