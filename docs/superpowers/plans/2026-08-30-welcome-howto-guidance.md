# Welcome How-To on Guidance & Tips — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two collapsible how-to sections (saving progress, add to home screen) to the Guidance & Tips screen, and auto-open that screen once on a user's first visit.

**Architecture:** A new pure helper module tracks whether the intro has been seen, persisting the flag through the existing cross-subdomain store (cookie + localStorage), exactly like `terms-consent.js`. Shared how-to content lives in `guidance.js` and is rendered by `GuidanceScreen.jsx` as collapsible accordion rows appended after the variant-specific sections. A first-visit `useEffect` in `workout-app.jsx` navigates to the Guidance screen once, gated on terms acceptance.

**Tech Stack:** React 19 (new JSX transform, no React import needed for JSX), inline JS styles, `node --test` for pure-module unit tests, ESLint, Vite dev server for preview verification.

**Spec:** `docs/superpowers/specs/2026-08-30-welcome-howto-guidance-design.md`

**Branch:** `feature/welcome-howto-guidance` (already created and checked out)

---

## File Structure

- **Create** `guidance-intro.js` — pure `needsGuidanceIntro(stored)` + thin `getStoredGuidanceIntro()` / `markGuidanceIntroSeen()` wrappers over `cross-domain-store.js`. One responsibility: the "has the intro been shown?" flag.
- **Create** `guidance-intro.test.js` — unit tests for the pure predicate.
- **Modify** `guidance.js` — add a shared `HOW_TO` export (the two how-to sections). No change to the existing per-variant `GUIDANCE` map.
- **Modify** `GuidanceScreen.jsx` — add `CollapsibleSection` + `StepGroup` components, render `HOW_TO` after the variant sections, add supporting styles.
- **Modify** `workout-app.jsx` — import the helper, add the first-visit auto-open effect.
- **Create** `public/guidance/README.md` — documents the screenshot filenames Katie will drop in.

---

## Task 1: Guidance-intro seen flag (pure helper + tests)

**Files:**
- Create: `guidance-intro.js`
- Test: `guidance-intro.test.js`

- [ ] **Step 1: Write the failing test**

Create `guidance-intro.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { needsGuidanceIntro } from "./guidance-intro.js";

test("needsGuidanceIntro is false once the seen flag is stored", () => {
  assert.equal(needsGuidanceIntro("1"), false);
});

test("needsGuidanceIntro is true when nothing is stored", () => {
  assert.equal(needsGuidanceIntro(null), true);
  assert.equal(needsGuidanceIntro(undefined), true);
  assert.equal(needsGuidanceIntro(""), true);
});

test("needsGuidanceIntro is true for any value other than the seen flag", () => {
  assert.equal(needsGuidanceIntro("0"), true);
  assert.equal(needsGuidanceIntro("garbage"), true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test guidance-intro.test.js`
Expected: FAIL — cannot resolve `./guidance-intro.js` (module does not exist yet).

- [ ] **Step 3: Write the module**

Create `guidance-intro.js`:

```js
// ─── First-visit "how-to" intro flag ─────────────────────────────────────────
// Tracks whether we've already auto-opened the Guidance & Tips screen for this
// user. Like terms consent (see terms-consent.js), this is a single, variant-
// independent flag persisted through cross-domain-store so a user who's seen the
// intro on one subdomain isn't re-prompted on another. localStorage is the
// same-origin fallback for hosts where the shared cookie can't be set.
import { readValue, writeValue } from "./cross-domain-store.js";

const KEY = "setgo.guidanceIntroSeen";
const SEEN = "1";

// Whether the first-visit Guidance screen should still be auto-opened, given the
// stored value (string|null). Pure — safe to unit-test.
export function needsGuidanceIntro(stored) {
  return stored !== SEEN;
}

export function getStoredGuidanceIntro() {
  return readValue(KEY);
}

export function markGuidanceIntroSeen() {
  writeValue(KEY, SEEN);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test guidance-intro.test.js`
Expected: PASS — 3 tests, 0 failures.

- [ ] **Step 5: Run the full test suite to confirm nothing broke**

Run: `npm test`
Expected: all existing test files plus the new one pass.

- [ ] **Step 6: Commit**

```bash
git add guidance-intro.js guidance-intro.test.js
git commit -m "feat: add guidance-intro seen flag helper"
```

---

## Task 2: Shared how-to content in guidance.js

**Files:**
- Modify: `guidance.js` (append a new export after the existing `GUIDANCE` object, which ends at the closing `};` around line 44)

- [ ] **Step 1: Add the HOW_TO export**

Append to the end of `guidance.js`:

```js
// Shared "how-to" sections shown on every variant's Guidance & Tips screen,
// below the variant-specific sections, as collapsible rows. Identical across
// variants, so authored once here rather than duplicated per variant.
//
// Section shape: { title, body?, stepGroups? }
//   - body: array of paragraph strings
//   - stepGroups: array of { label, steps: [{ text, image? }] }
//       image: { src, alt } — inline screenshot for a step (iOS only)
export const HOW_TO = [
  {
    title: "Saving your progress",
    body: [
      "Your weekly progress is saved right here on your device, not on a server — simple and private, but it means it can occasionally reset (say, if you clear your browser data or switch devices). If your checkmarks ever disappear, no problem: just tap the circles at the top of the workout list to mark the sessions you've done this week.",
    ],
  },
  {
    title: "Add to your home screen",
    body: [
      "Add SetGo to your home screen and it opens like an app — full screen, one tap, no address bar.",
    ],
    stepGroups: [
      {
        label: "On an iPhone (Safari)",
        steps: [
          {
            text: "Tap the ••• menu, then Share.",
            image: {
              src: "/guidance/ios-share.png",
              alt: "Safari menu with Share highlighted",
            },
          },
          {
            text: "Scroll down and tap Add to Home Screen.",
            image: {
              src: "/guidance/ios-add.png",
              alt: "Share sheet with Add to Home Screen highlighted",
            },
          },
          {
            text: "Tap Add — the SetGo icon lands on your home screen.",
            image: {
              src: "/guidance/ios-confirm.png",
              alt: "Add to Home Screen dialog with the Add button highlighted",
            },
          },
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

- [ ] **Step 2: Lint to confirm the file is valid**

Run: `npm run lint`
Expected: no errors for `guidance.js`.

- [ ] **Step 3: Commit**

```bash
git add guidance.js
git commit -m "feat: add shared how-to content for guidance screen"
```

---

## Task 3: Render collapsible how-to rows in GuidanceScreen

**Files:**
- Modify: `GuidanceScreen.jsx`

The current file has no imports (line 1 is a comment). We add a React import, two new components, one line in the main render, and new style keys.

- [ ] **Step 1: Add the React import and the HOW_TO import**

At the very top of `GuidanceScreen.jsx`, before the existing leading comment block, add:

```jsx
import { useState } from "react";
import { HOW_TO } from "./guidance";
```

- [ ] **Step 2: Add the CollapsibleSection and StepGroup components**

Insert these two components immediately above the existing `export default function GuidanceScreen(...)` (currently around line 34):

```jsx
function StepGroup({ group, accent, accentLight }) {
  const s = makeStyles(accent, accentLight);
  return (
    <div style={s.stepGroup}>
      <div style={s.stepGroupLabel}>{group.label}</div>
      <ol style={s.stepList}>
        {group.steps.map((step, i) => (
          <li key={i} style={s.step}>
            <span>{step.text}</span>
            {step.image && (
              <img
                src={step.image.src}
                alt={step.image.alt}
                loading="lazy"
                style={s.stepImage}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function CollapsibleSection({ section, accent, accentLight }) {
  const s = makeStyles(accent, accentLight);
  const [open, setOpen] = useState(false);
  return (
    <div style={s.collapsible}>
      <button
        style={s.collapsibleHeader}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span style={s.collapsibleTitle}>{section.title}</span>
        <span
          style={{
            ...s.chevron,
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
          aria-hidden="true"
        >
          {"›"}
        </span>
      </button>
      {open && (
        <div style={s.collapsibleBody}>
          {(section.body ?? []).map((para, i) => (
            <p key={i} style={s.para}>
              {para}
            </p>
          ))}
          {(section.stepGroups ?? []).map((group, i) => (
            <StepGroup
              key={i}
              group={group}
              accent={accent}
              accentLight={accentLight}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Render HOW_TO after the variant sections**

In `GuidanceScreen`'s returned JSX, the variant sections are mapped like this (currently lines 43-50):

```jsx
        {guidance.sections.map((section, i) => (
          <Section
            key={i}
            section={section}
            accent={accent}
            accentLight={accentLight}
          />
        ))}
```

Immediately after that closing `))}`, add:

```jsx
        {HOW_TO.map((section, i) => (
          <CollapsibleSection
            key={`howto-${i}`}
            section={section}
            accent={accent}
            accentLight={accentLight}
          />
        ))}
```

- [ ] **Step 4: Add the new style keys**

In `makeStyles`, add these keys to the returned object (place them after the existing `subHeading` key, before the closing `}`):

```jsx
    collapsible: {
      borderTop: `0.5px solid ${accentLight}`,
    },
    collapsibleHeader: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      background: "none",
      border: "none",
      padding: "16px 0",
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "'DM Sans', sans-serif",
      WebkitTapHighlightColor: "transparent",
    },
    collapsibleTitle: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 18,
      fontWeight: 700,
      color: TEXT,
    },
    chevron: {
      fontSize: 22,
      lineHeight: 1,
      color: accent,
      transition: "transform 0.15s ease",
    },
    collapsibleBody: {
      paddingBottom: 12,
    },
    stepGroup: {
      marginTop: 12,
    },
    stepGroupLabel: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 15,
      fontWeight: 700,
      color: accent,
      margin: "0 0 8px 0",
    },
    stepList: {
      margin: 0,
      paddingLeft: 20,
    },
    step: {
      fontSize: 15,
      lineHeight: 1.6,
      color: TEXT,
      marginBottom: 16,
    },
    stepImage: {
      display: "block",
      maxWidth: "100%",
      marginTop: 10,
      borderRadius: 12,
      border: `0.5px solid ${accentLight}`,
    },
```

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: no errors for `GuidanceScreen.jsx`.

- [ ] **Step 6: Commit**

```bash
git add GuidanceScreen.jsx
git commit -m "feat: render collapsible how-to rows on guidance screen"
```

---

## Task 4: First-visit auto-open effect

**Files:**
- Modify: `workout-app.jsx`

- [ ] **Step 1: Import the helper**

`workout-app.jsx` already imports the terms helpers around lines 25-29. Add this import directly below the `terms-consent.js` import block (near line 29):

```jsx
import {
  needsGuidanceIntro,
  getStoredGuidanceIntro,
  markGuidanceIntroSeen,
} from "./guidance-intro.js";
```

- [ ] **Step 2: Add the auto-open effect**

The rest-timer effects live around lines 216-246. Add this effect immediately after the first `useEffect` block (the one ending at line 220, `}, [currentStep, screen, currentExercise?.isRest]);`):

```jsx
  // First visit: auto-open the Guidance & Tips screen once. Gated on terms
  // acceptance so it doesn't collide with the consent modal — when the user
  // accepts, `termsAccepted` flips and this re-runs. Only fires for variants
  // that actually have a Guidance screen (`guidance` defined).
  useEffect(() => {
    if (!termsAccepted) return;
    if (!guidance) return;
    if (!needsGuidanceIntro(getStoredGuidanceIntro())) return;
    markGuidanceIntroSeen();
    setGuidanceReturn(hasLibrary ? "library" : "select");
    setScreen("guidance");
  }, [termsAccepted]);
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors. (`guidance` and `hasLibrary` are module-level constants, so `react-hooks/exhaustive-deps` does not flag them; the state setters are stable.)

- [ ] **Step 4: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: auto-open guidance screen on first visit"
```

---

## Task 5: Screenshot asset placeholders

**Files:**
- Create: `public/guidance/README.md`

The `HOW_TO` iOS steps reference `/guidance/ios-share.png`, `/guidance/ios-add.png`, and `/guidance/ios-confirm.png`. Until the real files are added, those `<img>` tags show their alt text — expected and acceptable interim behavior.

- [ ] **Step 1: Create the asset README**

Create `public/guidance/README.md`:

```markdown
# Guidance screenshots

Inline screenshots for the "Add to your home screen" section of the Guidance &
Tips screen (iOS/Safari steps). Drop the real PNGs here with these exact names —
they're referenced from `guidance.js` (`HOW_TO`):

- `ios-share.png` — Safari menu open, with Share highlighted
- `ios-add.png` — Share sheet scrolled to Add to Home Screen, highlighted
- `ios-confirm.png` — the Add to Home Screen dialog, with the Add button highlighted

Files in `public/` are served from the site root, so `public/guidance/ios-share.png`
is referenced as `/guidance/ios-share.png`. Keep them reasonably small (portrait
phone screenshots, ideally < 300 KB each). Android is text-only — no images.
```

- [ ] **Step 2: Commit**

```bash
git add public/guidance/README.md
git commit -m "docs: document guidance screenshot assets"
```

---

## Task 6: Verify in the browser preview

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Use the preview tool to start the Vite dev server (create `.claude/launch.json` with a `dev` entry running `npm` / `["run","dev"]` on the Vite port if it doesn't exist). Open the equestrian variant, e.g. `http://localhost:5173/?variant=equestrian`.

- [ ] **Step 2: Verify first-visit auto-open**

Clear site data first (so both the terms flag and `setgo.guidanceIntroSeen` are unset), reload. Expected sequence: the Terms modal appears; after agreeing, the app navigates straight to the Guidance & Tips screen. Confirm the two new rows ("Saving your progress", "Add to your home screen") appear collapsed below the training-philosophy section.

- [ ] **Step 3: Verify collapse/expand**

Use `read_page` to get refs, then click each collapsible header. Confirm the body expands (progress copy; intro + iOS/Android step lists) and collapses again. Check `read_console_messages` for errors. The iOS `<img>` tags will show alt text until real screenshots are added — confirm they don't throw.

- [ ] **Step 4: Verify no re-open on reload**

Reload the page (terms and intro flags now set). Expected: the app stays on the library screen — no auto-open. Confirm the Guidance & Tips card is still present at the bottom of the library screen and still opens the screen manually.

- [ ] **Step 5: Verify the paul variant also shows the how-to rows**

Open `http://localhost:5173/?variant=paul`, navigate to Guidance & Tips, and confirm the same two collapsible rows appear below paul's philosophy section.

- [ ] **Step 6: Screenshot for the record**

Take a screenshot of the Guidance screen with both rows visible (one expanded) and share it as proof.

---

## Self-Review

- **Spec coverage:** Saving-progress copy (Task 2) ✓; add-to-home-screen iOS+Android steps (Task 2) ✓; Option A collapsible rows (Task 3) ✓; shared/not-per-variant, shown for all variants incl. paul (Task 2 + Task 6 step 5) ✓; own screenshots not external link (Task 2 image refs + Task 5) ✓; global seen flag via cross-domain-store (Task 1) ✓; auto-open once, after terms, full screen with rows collapsed (Task 4) ✓; no installed-app conditional — deliberately absent ✓; card stays reachable afterward (Task 6 step 4) ✓; helper unit-tested (Task 1) ✓.
- **Placeholders:** none — all code is complete; the only intentional "placeholder" is the screenshot assets, which are the user-provided inputs the spec calls out, documented in Task 5.
- **Type consistency:** `needsGuidanceIntro` / `getStoredGuidanceIntro` / `markGuidanceIntroSeen` used identically in Task 1 and Task 4. `HOW_TO` shape (`title`/`body`/`stepGroups`/`label`/`steps`/`text`/`image{src,alt}`) authored in Task 2 matches exactly what `CollapsibleSection`/`StepGroup` read in Task 3. Style keys referenced in Task 3 components (`collapsible`, `collapsibleHeader`, `collapsibleTitle`, `chevron`, `collapsibleBody`, `stepGroup`, `stepGroupLabel`, `stepList`, `step`, `stepImage`) all defined in Task 3 step 4.
