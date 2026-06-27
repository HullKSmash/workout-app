# Workout Library Design

**Date:** 2026-06-15
**Status:** Approved (extended 2026-06-16 to Runner & Paul variants)

## Overview

Replace the 12-week program schedule as the default experience with a self-directed workout library organized by difficulty tier. Users browse and pick workouts freely, with a weekly goal tracker encouraging at least 3 sessions per week.

Originally designed for the **equestrian** variant; extended on 2026-06-16 to the **run** and **paul** variants. The library is the default screen for any variant flagged `library: true` in `variants.js` (run, paul, equestrian). The 12-week schedule remains accessible as a secondary option **only for variants flagged `schedule: true` (equestrian)** — run and paul have no schedule, so they omit the schedule screen and its footer link.

---

## Section 1: Library Screen (new default for library variants)

The initial screen for any `library: true` variant. For equestrian it replaces `screen === "schedule"`; for run and paul it replaces `screen === "select"` (which had no schedule).

### Weekly Tracker

- Sits immediately below the app header
- Styled to match the Guidance & Tips card: `accentLight` background, `borderRadius: 16`, no shadow
- Left side: label "This week" with sub-label "Resets Monday" in small secondary text
- Right side: dots representing completed workouts this week
- Dots start at 3 (the weekly goal); additional dots appear only when earned (after each workout beyond 3)
- Empty dots: gray border, white fill
- Completed dots: filled solid green (#355E3B)
- Dots are tappable: tap an empty dot to manually add +1 (for workouts done outside the app); tap a filled dot to remove −1. No confirmation dialog.
- Resets every Monday at midnight (calendar week). Stored per ISO week key.
- When 3+ dots are filled, the goal-hit message **replaces the "This week" label in place** (not a separate banner):
  - **"Weekly goal hit! Keep going if you feel strong!"**
  - Bold, text color `rgb(45, 42, 38)` (charcoal)
  - The "Resets Monday" sub-label remains visible beneath the message

### Filter Chips

- Row of three chips below the tracker: **Easier**, **Moderate**, **Harder**
- Center-aligned and equal-width for symmetry
- Each chip has a colored pip: green (#22c55e), amber (#d97706), red (#ef4444)
- All three chips active (visible) by default
- Tapping a chip toggles that tier off/on, filtering the list below
- Chip styles when active: colored border + light tinted background (green/amber/red)
- Chip styles when inactive: gray border, **gray fill background**, gray text (clearly reads as "off")

### Sticky Layout

- The weekly tracker and filter chips are grouped in a container stuck to the **top** of the screen (`position: sticky; top: 0`)
- The Guidance & Tips card is stuck to the **bottom** of the screen
- Only the workout list scrolls between them

### Workout List

- Single vertical scrollable list below the chips
- Sorted by difficulty: Easier first, then Moderate, then Harder; within each tier, order follows the workout's position in the `WORKOUTS` array in `workouts/index.js` (same as the existing select screen)
- No section dividers — difficulty is communicated by the colored pip on each card only
- If all chips are deactivated, the list shows a short empty state message: "No difficulty selected — tap a filter above to show workouts."
- Each card shows:
  - Colored difficulty pip (left)
  - Workout name (bold)
  - One-line description (secondary text, smaller)
  - `›` arrow (right)
- Tapping a card navigates to the landing screen for that workout

### Guidance & Tips Card

- Collapsible card (same visual pattern as the existing "How to Use This Program" card)
- Full width, matching the workout cards above it
- Sticky to the bottom of the screen as the workout list scrolls
- Title: **"Guidance & Tips"**
- Content: placeholder for now ("Coming soon"), to be filled in later

### Footer

- Shown **only on `schedule: true` variants (equestrian)**. Omitted for run and paul, which have no schedule.
- Small underlined green text at the bottom of the screen:
  **"Looking for more structure? Follow a 12-week program here!"**
- Tapping navigates to the existing schedule screen (`screen === "schedule"`)

---

## Section 2: Changes to Existing Screens

### Landing Screen

Existing screen is kept as-is with two additions above the current content:

1. **Difficulty badge** — pill-shaped badge showing the workout's tier (e.g. "Easier" with green pip). Styled to match the filter chips, center-aligned above the workout title.
2. **Description** — one-line workout description in secondary text below the workout name.

Back button returns to library screen (was: schedule).

### Complete Screen

Existing layout kept. Add a weekly progress block between the completion message and the back button:

- Shows the current dot state (same dot visual as the tracker)
- Progress message varies by count:
  - 1 done: **"1 done this week. Shoot for 2 more!"**
  - 2 done: **"2 done this week. Shoot for one more!"**
  - 3+ done: **"Weekly goal hit! Keep going if you feel strong!"**
- "Back" button label: **"Back to library"** (was: back to schedule)
- Completing a workout auto-increments the weekly dot count before this screen renders

### Workout Screen

No changes.

---

## Section 3: Data Model & Storage

### Workout File — New Fields

Each library workout file gets two new top-level fields:

```js
export default {
  name: "Foundation 1",
  audiences: ["equestrian"],
  difficulty: "easier",          // "easier" | "moderate" | "harder"
  description: "Full-body compound strength to build your base",
  phases: [ ... ]
};
```

Every workout shown in a library variant needs `difficulty` and `description` authored by Katie (the list filter excludes workouts with an undefined `difficulty`).

Equestrian workouts in scope:
- rider-foundation-1 through rider-foundation-4
- rider-symmetry-and-balance-1, rider-symmetry-and-balance-2
- rider-build-1, rider-build-2
- rider-alternating-supersets

(Week-specific Foundation variants like `rider-foundation-1-wk1` are NOT shown in the library — they remain in the codebase exclusively for the schedule screen.)

Run & Paul workouts in scope (added 2026-06-16):
- runner-foundation-1 through runner-foundation-4
- leg-day, paul-upper-body

These 6 were scaffolded with placeholder `difficulty: "moderate"` and a `TODO(Katie)` description — the real tier and one-line description still need authoring.

### localStorage

Multiple keys coexist; none conflict:

| Key | Shape | Purpose |
|-----|-------|---------|
| `riderStrength.completed` | `{ "w1-0": true }` | Existing equestrian schedule slot tracking — untouched |
| `<variant>.weeklyCount` | `{ "2026-W24": 3 }` | Library weekly count, per variant |

The weekly count is stored per-variant: `equestrian.weeklyCount`, `run.weeklyCount`, `paul.weeklyCount` (key = `${variantKey}.weeklyCount`). Implemented in `workouts/weekly-progress.js` (renamed from `equestrian-weekly-progress.js`); its functions take a `storageKey` argument.

Week key format: ISO week string derived from the Monday that started the current week (e.g. `"2026-W24"`).

Weekly count increments automatically when a workout is completed via the app. Also supports manual +1/−1 via dot tap on the library screen.

No manual reset button — the tracker resets automatically each Monday.

---

## Section 4: Removed / Renamed from Library Screen

| Element | Action |
|---------|--------|
| "How to Use This Program" card | Renamed to "Guidance & Tips"; content placeholder |
| "Back to schedule" navigation link | Removed from library screen |
| "Reset progress" button | Removed (auto-reset on Monday) |
| Separate goal-hit banner | Removed; message now replaces the "This week" tracker label in place |

---

## Navigation Flow

```
Library screen (new default)
  ↓ tap workout card
Landing screen (+ difficulty badge + description)
  ↓ tap Start
Workout screen (unchanged)
  ↓ finish last exercise → auto-increment weekly count
Complete screen (+ weekly progress note, Back → library)
  ↓ tap Back to library
Library screen (dot count updated)
```

Schedule screen remains reachable via the library footer link and is otherwise unchanged. The existing "View all workouts" link on the schedule screen is kept as-is — it navigates to the library for users who entered the program path.

---

## Out of Scope

- Workout history / log of past sessions
- Per-workout "done this week" indicators on cards (count only, not which workouts)
- Content for the "Guidance & Tips" card body
- Any changes to the workout screen itself
- A 12-week schedule for the Runner and Paul variants (library is their only path)

> **Note (2026-06-16):** "Descriptions or difficulty tiers for non-equestrian variants" was previously out of scope. The library was extended to Runner and Paul, so those variants' workouts are now in scope (see Section 3) — though their real `difficulty`/`description` values are still pending authoring.
