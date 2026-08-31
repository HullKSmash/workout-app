# Welcome "How-To" on the Guidance & Tips screen

**Date:** 2026-08-30
**Branch:** `feature/welcome-howto-guidance`
**Status:** Design approved, ready for implementation plan

## Problem

New arrivals don't know two practical things about the app:

1. **Weekly progress is stored locally and can occasionally clear.** When it
   does, users don't realize they can restore it by tapping the weekly
   checkmarks themselves.
2. **They can install the app to their home screen** for one-tap, full-screen
   access — but the browser flow to do so isn't obvious.

We want to greet users with this information on first visit, and keep it
available for reference afterward.

## Decision

Put both tidbits on the existing **Guidance & Tips** screen as their own
collapsible sections, and **auto-open the Guidance screen once on first visit**.
No separate "welcome that disappears forever" surface — a single help
destination that's also permanently reachable from the bottom of the library /
schedule screens (as it is today).

Rejected alternatives:

- *One-time welcome modal that never returns* — the home-screen steps are
  exactly the thing a user wants to re-find later; hiding them forever is worse.
- *Fully-collapsed accordion (every section, including philosophy)* — the
  training philosophy copy is short and worth showing open; a fully-collapsed
  page reads like a menu, not a welcome.
- *Linking an external "add to home screen" support page* — goes stale outside
  our control and can't show the SetGo-branded flow. We use our own screenshots
  instead, backed by skimmable text steps.

## Layout (Option A — accordion rows)

On the Guidance & Tips screen, top to bottom:

1. **Training philosophy** — the existing per-variant `guidance.js` copy.
   Stays open, rendered exactly as today.
2. **▸ Saving your progress** — collapsible row, collapsed by default.
3. **▸ Add to your home screen** — collapsible row, collapsed by default.
   Contains the intro line, iOS steps (with inline screenshots), and Android
   steps (text only).

Collapsible rows show a title with a chevron; tapping toggles expand/collapse.
Each row manages its own open/closed state locally in `GuidanceScreen`.

## Content

### Saving your progress

> Your weekly progress is saved right here on your device, not on a server —
> simple and private, but it means it can occasionally reset (say, if you clear
> your browser data or switch devices). If your checkmarks ever disappear, no
> problem: just tap the circles at the top of the workout list to mark the
> sessions you've done this week.

### Add to your home screen

Intro:

> Add SetGo to your home screen and it opens like an app — full screen, one tap,
> no address bar.

**On an iPhone (Safari):**

1. Tap the ••• menu, then **Share**. *(screenshots: menu, Share)*
2. Scroll down and tap **Add to Home Screen**. *(screenshot)*
3. Tap **Add** — the SetGo icon lands on your home screen. *(screenshot)*

**On Android (Chrome):**

1. Tap the ⋮ menu (top-right).
2. Tap **Add to Home screen** (or **Install app**).
3. Tap **Add** to confirm.

## Where the content lives

The two practical sections are **identical across all variants**
(equestrian, run, paul), so they live in a **single shared block**, not
triplicated in each variant's `guidance.js` entry. They render for **all
variants**, including paul.

- `guidance.js` gains a shared export (working name `HOW_TO`) holding the two
  how-to sections. Home-screen steps carry an optional `image` field (path +
  alt text) for the iOS screenshots.
- `GuidanceScreen.jsx` renders the variant-specific sections (open, as now),
  then appends the shared how-to sections as collapsible rows.

### Data shape (illustrative)

```js
export const HOW_TO = [
  {
    title: "Saving your progress",
    body: ["Your weekly progress is saved right here on your device…"],
  },
  {
    title: "Add to your home screen",
    body: ["Add SetGo to your home screen and it opens like an app…"],
    stepGroups: [
      {
        label: "On an iPhone (Safari)",
        steps: [
          { text: "Tap the ••• menu, then Share.",
            image: { src: "/guidance/ios-menu.png", alt: "Safari menu with Share highlighted" } },
          { text: "Scroll down and tap Add to Home Screen.",
            image: { src: "/guidance/ios-add.png", alt: "Share sheet with Add to Home Screen highlighted" } },
          { text: "Tap Add — the SetGo icon lands on your home screen.",
            image: { src: "/guidance/ios-confirm.png", alt: "Add to Home Screen confirmation dialog" } },
        ],
      },
      {
        label: "On Android (Chrome)",
        steps: [
          { text: "Tap the ⋮ menu (top-right)." },
          { text: "Tap Add to Home screen (or Install app)." },
          { text: "Tap Add to confirm." },
        ],
      },
    ],
  },
];
```

Exact field names to be settled during implementation; the renderer and the
data must agree. The key constraints: shared (not per-variant), collapsible,
and steps support optional images.

## Component changes

- **`GuidanceScreen.jsx`**
  - Add a small `CollapsibleSection` component: title + chevron, local
    `useState` for open/closed, tap-to-toggle, accessible (button with
    `aria-expanded`).
  - Render the shared `HOW_TO` sections after the variant sections, each wrapped
    in a `CollapsibleSection`, collapsed by default.
  - Render step groups: a label, an ordered list of steps, and inline `<img>`
    (`max-width: 100%`, rounded, lazy-loaded) where a step has an image.
  - Keep the existing flat rendering for the variant sections untouched.

- **`guidance.js`** — add the shared `HOW_TO` export described above.

- **`workout-app.jsx`** — first-visit auto-open (below).

## First-visit auto-open

- A single **global** localStorage flag (working name `setgo.guidanceSeen`),
  mirroring how terms consent is stored globally rather than per-variant. Once
  the user has seen the Guidance screen, they aren't auto-navigated again on any
  variant.
- On load, auto-navigate to the Guidance screen **once** and set the flag, only
  when:
  - terms have been accepted (so we don't collide with the terms modal), **and**
  - the current variant has guidance content (`guidance` is defined), **and**
  - the flag isn't already set.
- Auto-open lands on the **full Guidance screen** — philosophy open, how-to rows
  collapsed. Not pre-expanded.
- Sequencing: the auto-open must run *after* terms acceptance. Implementation
  should gate the effect on `termsAccepted` so a first-time user completes the
  terms flow first, then sees Guidance.
- After first visit, the Guidance & Tips card stays at the bottom of the
  library / schedule screens exactly as today.

### Helper module

Follow the existing pattern (`terms-consent.js`, `weekly-progress.js`): a small
module with `hasSeenGuidance()` / `markGuidanceSeen()` wrapping localStorage in
try/catch, so a private-mode / unavailable-storage user degrades gracefully
(no crash; auto-open simply may re-trigger, which is acceptable).

## Assets

- 4 iOS screenshots go in **`public/guidance/`**:
  `ios-menu.png`, `ios-add.png`, `ios-confirm.png` (and one more if the ••• and
  Share steps are shown as two images rather than one).
- Katie provides the real image files; they can't be pulled from the design
  chat. Implementation can wire the paths and use lightweight placeholders until
  the real screenshots are dropped in.
- Android is text-only — no images.

## Out of scope

- Detecting whether the app is already installed / running standalone to hide
  the home-screen section. Deliberately excluded — the collapsed row is
  unobtrusive enough to ignore once installed.
- Any change to how weekly progress itself is stored or to the tappable weekly
  checkmarks (they already work — see `workout-app.jsx` weekly tracker).
- Per-variant how-to copy — the how-to is shared and identical everywhere.

## Testing

- Unit-test the guidance-seen helper (seen/unseen transitions, storage
  unavailable) alongside the existing `terms-consent.test.js` pattern.
- Manual/preview verification: first visit auto-opens Guidance after terms;
  reload does not re-open; rows expand/collapse; screenshots render; card still
  reachable from library and schedule.
