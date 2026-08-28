# Terms & Conditions Consent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a blocking, versioned Terms & Conditions consent pop-up the first time a user reaches the main page, recording acceptance in localStorage so returning users aren't re-prompted.

**Architecture:** A small pure/storage module (`terms-consent.js`) owns the version constant, the accept/needs-consent logic, and localStorage access — mirroring the existing `view-mode.js` pattern. A presentational `TermsModal.jsx` renders the blocking overlay. `workout-app.jsx` wires them together: it initializes acceptance state from storage, renders the modal after the access-code gate, and persists on agree.

**Tech Stack:** React 19, Vite, inline styles (matching existing components), `node --test` for unit tests.

---

## File Structure

- **Create** `terms-consent.js` — `TERMS_VERSION`, pure `needsTermsConsent(stored, current)`, and localStorage helpers `getStoredTermsVersion(variantKey)` / `acceptTerms(variantKey, version)`.
- **Create** `terms-consent.test.js` — unit tests for `needsTermsConsent` and `TERMS_VERSION`.
- **Create** `TermsModal.jsx` — blocking consent overlay (presentational; parent owns persistence).
- **Modify** `workout-app.jsx` — import module + modal, add `termsAccepted` state and `handleAgreeTerms`, render the modal at the end of the main return.
- **User-owned (not in this plan):** `public/terms.html` — the T&C document Katie maintains. The modal links to `/terms.html`.

---

### Task 1: `terms-consent.js` module (version + logic + storage)

**Files:**
- Create: `terms-consent.js`
- Test: `terms-consent.test.js`

- [ ] **Step 1: Write the failing test**

Create `terms-consent.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { needsTermsConsent, TERMS_VERSION } from "./terms-consent.js";

test("needsTermsConsent is false when stored equals current", () => {
  assert.equal(needsTermsConsent("1", 1), false);
  assert.equal(needsTermsConsent("2", 2), false);
});

test("needsTermsConsent is false when stored is newer than current", () => {
  assert.equal(needsTermsConsent("3", 2), false);
});

test("needsTermsConsent is true when stored is older than current", () => {
  assert.equal(needsTermsConsent("1", 2), true);
});

test("needsTermsConsent is true when nothing/invalid is stored", () => {
  assert.equal(needsTermsConsent(null, 1), true);
  assert.equal(needsTermsConsent(undefined, 1), true);
  assert.equal(needsTermsConsent("", 1), true);
  assert.equal(needsTermsConsent("garbage", 1), true);
});

test("TERMS_VERSION is a positive integer", () => {
  assert.ok(Number.isInteger(TERMS_VERSION) && TERMS_VERSION >= 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot import from `./terms-consent.js` (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `terms-consent.js`:

```js
// ─── Terms & Conditions consent ──────────────────────────────────────────────
// First-run clickwrap consent. We store the terms version the user last accepted
// in localStorage, keyed per-variant (each variant is its own origin/subdomain in
// production). Bump TERMS_VERSION when the terms materially change to re-prompt
// everyone. Mirrors the view-mode.js pattern: a pure resolver plus storage I/O.

// Bump this when the Terms & Conditions materially change.
export const TERMS_VERSION = 1;

const keyFor = (variantKey) => `${variantKey}.termsAcceptedVersion`;

// Whether to show the consent modal, given the stored value (string|null from
// localStorage) and the current version. Pure — safe to unit-test.
export function needsTermsConsent(stored, current) {
  const accepted = Number(stored);
  return !(Number.isFinite(accepted) && accepted >= current);
}

export function getStoredTermsVersion(variantKey) {
  try {
    return localStorage.getItem(keyFor(variantKey));
  } catch {
    return null;
  }
}

export function acceptTerms(variantKey, version) {
  try {
    localStorage.setItem(keyFor(variantKey), String(version));
  } catch {
    // localStorage unavailable (private mode/quota) — session still works;
    // the user may be re-prompted on the next visit.
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — all `terms-consent` tests green, existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add terms-consent.js terms-consent.test.js
git commit -m "feat: add terms consent module (version, logic, storage)"
```

---

### Task 2: `TermsModal.jsx` blocking consent overlay

**Files:**
- Create: `TermsModal.jsx`

This is a presentational component verified in the browser preview (Task 4). No unit test — it holds only local checkbox state and delegates persistence to the parent.

- [ ] **Step 1: Create the component**

Create `TermsModal.jsx`:

```jsx
// First-run Terms & Conditions consent modal. A blocking overlay shown over the
// main page until the user checks the box and clicks "I Agree". Presentational:
// the parent owns persistence and decides when to render it. No close/dismiss —
// consent is required. Styling mirrors GateScreen (accent-driven inline styles).
import { useState } from "react";

const TEXT = "#2D2A26";
const TEXT_SECONDARY = "#8A8279";

export default function TermsModal({ accent, accentLight, onAgree }) {
  const s = makeStyles(accent, accentLight);
  const [checked, setChecked] = useState(false);

  return (
    <div
      style={s.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Terms and Conditions"
    >
      <div style={s.card}>
        <h2 style={s.title}>Before you begin</h2>
        <p style={s.body}>
          Please review our Terms &amp; Conditions, including the health and
          injury disclaimer. You must agree to continue.
        </p>
        <a style={s.link} href="/terms.html" target="_blank" rel="noopener">
          Read the full Terms &amp; Conditions →
        </a>
        <label style={s.checkboxRow}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={s.checkbox}
            aria-label="I have read and agree to the Terms and Conditions"
          />
          <span style={s.checkboxLabel}>
            I have read and agree to the Terms &amp; Conditions.
          </span>
        </label>
        <button
          style={{ ...s.button, ...(checked ? {} : s.buttonDisabled) }}
          type="button"
          disabled={!checked}
          onClick={onAgree}
        >
          I Agree
        </button>
      </div>
    </div>
  );
}

function makeStyles(accent, accentLight) {
  return {
    backdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(45, 42, 38, 0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      boxSizing: "border-box",
      zIndex: 1000,
      fontFamily: "'DM Sans', sans-serif",
    },
    card: {
      background: "#FAF8F5",
      borderRadius: 16,
      padding: "24px",
      width: "100%",
      maxWidth: 400,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 14,
      boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
    },
    title: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 24,
      fontWeight: 800,
      letterSpacing: "-0.02em",
      color: accent,
      margin: 0,
    },
    body: {
      fontSize: 15,
      lineHeight: 1.6,
      color: TEXT_SECONDARY,
      margin: 0,
    },
    link: {
      fontSize: 15,
      fontWeight: 700,
      color: accent,
      textDecoration: "none",
    },
    checkboxRow: {
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      cursor: "pointer",
    },
    checkbox: {
      width: 20,
      height: 20,
      marginTop: 1,
      accentColor: accent,
      flexShrink: 0,
    },
    checkboxLabel: {
      fontSize: 15,
      lineHeight: 1.5,
      color: TEXT,
    },
    button: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 17,
      fontWeight: 700,
      padding: "14px 16px",
      borderRadius: 12,
      border: "none",
      color: "#fff",
      background: accent,
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    },
    buttonDisabled: {
      background: accentLight,
      cursor: "not-allowed",
    },
  };
}
```

- [ ] **Step 2: Verify it compiles (lint)**

Run: `npm run lint`
Expected: PASS — no errors for `TermsModal.jsx`.

- [ ] **Step 3: Commit**

```bash
git add TermsModal.jsx
git commit -m "feat: add TermsModal blocking consent overlay"
```

---

### Task 3: Wire the modal into `workout-app.jsx`

**Files:**
- Modify: `workout-app.jsx` (imports near line 22; state near line 144; handler near line 267; render before the final `</div>` at line 1039)

- [ ] **Step 1: Add imports**

After the existing `view-mode.js` import (line 22), add:

```js
import TermsModal from "./TermsModal";
import {
  TERMS_VERSION,
  needsTermsConsent,
  getStoredTermsVersion,
  acceptTerms,
} from "./terms-consent.js";
```

- [ ] **Step 2: Add acceptance state**

After the `accessCode` state (`const [accessCode, setAccessCodeState] = useState(getAccessCode);`, line 144), add:

```js
  const [termsAccepted, setTermsAccepted] = useState(
    () => !needsTermsConsent(getStoredTermsVersion(variantKey), TERMS_VERSION)
  );
```

- [ ] **Step 3: Add the agree handler**

Add this handler alongside the other handlers (e.g. just before `handleBackToStart`, near line 320):

```js
  const handleAgreeTerms = () => {
    acceptTerms(variantKey, TERMS_VERSION);
    setTermsAccepted(true);
  };
```

- [ ] **Step 4: Render the modal at the end of the main return**

Immediately before the final closing `</div>` of the main return (the `</div>` on line 1039, just above `);`), add:

```jsx
      {!termsAccepted && (
        <TermsModal
          accent={variant.accent}
          accentLight={variant.accentLight}
          onAgree={handleAgreeTerms}
        />
      )}
```

Note: this render site is reached only after the access-code gate (`if (!accessCode) return <GateScreen .../>` short-circuits earlier), so the order is access code → main page with the T&C pop-up on top.

- [ ] **Step 5: Lint and run tests**

Run: `npm run lint && npm test`
Expected: PASS — no lint errors; all unit tests green.

- [ ] **Step 6: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: show first-run terms consent modal on main page"
```

---

### Task 4: Browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server and open the preview**

Use `preview_start` with the dev server (`npm run dev`). If prompted for a variant with a library, use the equestrian variant (e.g. `?variant=equestrian`) so the main page is the `library` screen.

- [ ] **Step 2: Clear stored acceptance to simulate a first-time user**

In the browser console (`javascript_tool`), clear any prior acceptance and reload:

```js
Object.keys(localStorage)
  .filter((k) => k.endsWith(".termsAcceptedVersion"))
  .forEach((k) => localStorage.removeItem(k));
location.reload();
```

- [ ] **Step 3: Verify the gate order and modal appearance**

Enter a valid access code if the `GateScreen` shows. Confirm the T&C modal then appears over the main page with a dimmed backdrop. Confirm the **I Agree** button is disabled (greyed) before the checkbox is checked. Take a screenshot.

- [ ] **Step 4: Verify the link**

Confirm "Read the full Terms & Conditions →" points to `/terms.html`. (If `public/terms.html` does not yet exist, the link will 404 — that is Katie's content task, not a code defect. Note it if so.)

- [ ] **Step 5: Verify acceptance persists**

Check the box, click **I Agree**, and confirm the modal disappears and the main page is usable. Reload the page (`location.reload()`), re-enter the access code if needed, and confirm the modal does NOT reappear.

- [ ] **Step 6: Verify version re-prompt (optional sanity check)**

In the console, set an older stored version and reload; the modal should reappear:

```js
const k = Object.keys(localStorage).find((k) => k.endsWith(".termsAcceptedVersion"));
if (k) localStorage.setItem(k, "0");
location.reload();
```

Re-accept to leave storage clean. No commit for this task.

---

## Notes for the implementer

- **No `public/terms.html` in this plan.** Katie owns that file (she is renaming `terms-conditions.html` → `terms.html` and folding in the liability-waiver text). Do not author legal text. `public/UserLiabilityWaiver.md` is her scratch tracking file — leave it untouched and do not commit it.
- **localStorage is per-variant by key and per-origin in production**, so each audience accepts once. Expected.
- Keep styling consistent with `GateScreen.jsx` (accent-driven inline styles, DM Sans / Outfit fonts).
