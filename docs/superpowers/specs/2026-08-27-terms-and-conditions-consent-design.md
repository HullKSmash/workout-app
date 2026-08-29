# Terms & Conditions Consent — Design

**Date:** 2026-08-27
**Status:** Approved, ready for planning

## Problem

The app has no mechanism for users to agree to Terms & Conditions. Because this is
a fitness app, the most important part of the T&C is the injury / health disclaimer
and assumption of risk — the kind of clause whose value depends on showing the user
actually agreed. A passive footer disclaimer (browsewrap) protects that clause
poorly. We want affirmative, recorded consent (clickwrap) without nagging users on
every visit.

## Goals

- Show a blocking Terms & Conditions pop-up the first time a user reaches the main
  page, requiring an explicit checkbox + "I Agree" action before they can use the app.
- Record acceptance so returning users are not re-prompted.
- Allow re-prompting everyone when the terms materially change, via a version bump.
- Keep the T&C text itself as a standalone HTML document the user maintains.

## Non-Goals

- Writing the legal text (owned by Katie; not legal advice from the tooling).
- Server-side / auditable consent records — no backend exists; localStorage is
  sufficient for a free, no-PII, no-payment app.
- Per-device or cross-device sync of acceptance.
- Gating anything before the existing access-code gate.

## User Flow

1. User reaches the site and enters a valid access code (existing `GateScreen`).
2. User lands on the main page (`library`, or `select` for variants without a
   library).
3. If they have not accepted the current terms version, a blocking modal appears
   over the main page (dimmed backdrop, no close/dismiss).
4. User opens the full terms (new tab), checks "I have read and agree", and clicks
   **I Agree**.
5. Acceptance is stored; the modal unmounts; the main page is now usable.
6. On future visits the modal does not reappear — unless the stored version is older
   than the current `TERMS_VERSION`.

## Components

### 1. `public/terms.html` (static document)

- The full Terms & Conditions as a standalone HTML file, served by Vite at
  `/terms.html`.
- Content is authored/owned by Katie. Implementation places the file and may add a
  minimal on-brand styling wrapper if desired; it does not author legal text.
- Linked from the modal with `target="_blank" rel="noopener"` so users don't lose
  their place.

### 2. `TermsModal.jsx` (new, presentational)

A fixed, full-viewport overlay rendered on top of the main page.

- Dimmed backdrop covering the whole viewport; blocks interaction with the page
  behind (no dismiss on backdrop click, no close button — it is blocking).
- Contents:
  - Short heading + one-line intro.
  - Link: "Read the full Terms & Conditions" → `/terms.html` in a new tab.
  - Checkbox: "I have read and agree to the Terms & Conditions".
  - **I Agree** button, disabled until the checkbox is checked.
- Styled with `variant.accent` / `variant.accentLight` to match the app, consistent
  with existing screens' inline-style approach.
- Props: `accent`, `accentLight`, `onAgree` (called when the user confirms). Holds
  only local checkbox state; no storage logic inside the component.

### 3. Wiring in `workout-app.jsx`

- Add module constant `const TERMS_VERSION = 1;`.
- Per-variant localStorage key, following the existing convention
  (`${variantKey}.weeklyCount`): `${variantKey}.termsAcceptedVersion`.
- Pure helper `needsTermsConsent(storedVersion, currentVersion) → boolean`, extracted
  for unit testing (parallels the `view-mode` helpers). Returns `true` when stored is
  missing or older than current; `false` when stored equals/exceeds current.
- State `termsAccepted`, initialized by reading the stored version through the helper.
- Render placement: **after** the access-code gate. Once `accessCode` is present and
  the main page renders, include `{!termsAccepted && <TermsModal … />}` so the pop-up
  layers over `library` / `select`.
- On **I Agree** (`onAgree`): write `TERMS_VERSION` to localStorage, set
  `termsAccepted = true` (modal unmounts).

## Data & Storage

- Key: `${variantKey}.termsAcceptedVersion`
- Value: the integer `TERMS_VERSION` the user last accepted.
- Versioning: bump `TERMS_VERSION` when terms materially change → `needsTermsConsent`
  returns `true` for everyone with an older stored value → all users re-prompted once.
- Scope: per-variant / per-origin. In production each variant is its own subdomain
  with separate localStorage, so each audience accepts once. Expected behavior.

## Error Handling

- All localStorage access wrapped in try/catch (private mode / disabled storage can
  throw).
- If **reading** throws or returns nothing → treat as not accepted → show the modal.
- If **writing** throws → still set in-memory `termsAccepted = true` so the user can
  proceed for the current session (they may be re-prompted next visit; acceptable
  degradation).

## Testing

- Unit test for `needsTermsConsent` (mirrors `view-mode.test.js`):
  - stored === current → `false`
  - stored < current (older) → `true`
  - stored missing/undefined → `true`
- `TermsModal` is presentational; verify in the browser preview:
  - Modal appears on first landing after entering an access code.
  - **I Agree** is disabled until the checkbox is checked.
  - After agreeing, the modal does not reappear on reload.
  - Bumping `TERMS_VERSION` re-triggers the modal.

## Out of Scope / Future

- Auditable server-side consent logs (would require a backend).
- Recording acceptance timestamp or terms hash.
- Combining consent with the access-code screen into a single step.
