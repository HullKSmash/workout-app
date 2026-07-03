# Access Gating & Lightweight Completion Analytics — Design

**Date:** 2026-07-03
**Status:** Approved design, ready for implementation plan
**Scope:** Gate who can use the app + record per-person workout-completion counts, as minimally as possible for a proof-of-concept.

## Goal & Motivation

The app is a proof-of-concept. The question we want to answer is: **do the ~15 people we invite actually use it?**

To answer that we need two things that don't exist yet:

1. **Access control** — a way to control who gets in (invite-only), not open to the public.
2. **Per-person completion analytics** — how many workouts each invited person completes.

Guiding constraint: **collect as little as possible** to minimize liability and security surface. No sensitive health data, no PII, no accounts.

## Key Decisions (from brainstorm)

- **Audience size:** a handful (≤ ~15), hand-curated, people we know.
- **Analytics detail:** per-person counts ("Paul: 4, rider-jane: 2"). Per-workout detail stored opportunistically (free), but the headline metric is per-person counts.
- **Gate strength:** **soft gate.** Goal is to control who we *invite* and to attribute usage — not to protect secrets. A determined person can always fetch a static SPA's assets; we are not defending against that. So the gate is client-side UX backed by a server-side allowlist for the *data*, not a content lock.
- **Identity model:** **per-person access codes double as the gate and the pseudonym.** No email, no password, no name.
- **Event store:** **Upstash Redis** (provisioned via the Vercel Marketplace Upstash integration — the successor to the retired Vercel KV, which was auto-migrated to Upstash in Dec 2024). It injects HTTP-REST credentials (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, and `KV_REST_API_*` aliases) that the `@upstash/redis` client reads. Queryable via the Upstash console or a short script — sufficient readability at this scale.
- **Allowlist storage:** **Redis Set**, not an env-var list — so adding/removing a code is one command with no redeploy, and revocation is instant. No new dependency, since unlock already hits the backend and Redis is already in use for events.
- **Refactor:** the large `workout-app.jsx` (~1,900 lines) is **explicitly out of scope** here. See Future Work.

## Liability Posture

The system stores only:

- Codes we invented (e.g. `paul`, `rider-jane`, or random tokens like `rider-7f3k`).
- Completion events: `{ code, workoutName, timestamp }`.
- Per-code completion counters.

No email, password, name, or health data. The mapping of a code → a real human lives **only in Katie's private notes**, never in the app or Redis. There is effectively nothing sensitive to breach.

## Architecture

Three additions to the existing static SPA on Vercel:

### 1. Two serverless functions (`/api`)

This is the app's first backend. Both validate the code server-side against the Redis allowlist.

- **`POST /api/unlock`**
  - Body: `{ code }`.
  - Checks `SISMEMBER allowlist <code>`.
  - Returns `{ ok: true }` or `{ ok: false }`. No other data returned.
- **`POST /api/event`**
  - Body: `{ code, workoutName }`.
  - Re-validates the code with `SISMEMBER allowlist <code>` (rejects unknown codes so the log can't be polluted).
  - On valid: append event to the `events` list and `INCR count:<code>`.
  - Returns `{ ok: true }` / `{ ok: false }`. Best-effort — the client does not block on it.

The allowlist is **never shipped in the client bundle**; codes are not fetchable from the deployed JS.

### 2. Upstash Redis (data model)

- `allowlist` — **Set** of valid codes. Add: `SADD allowlist rider-jane`. Revoke: `SREM allowlist rider-jane`. List: `SMEMBERS allowlist`.
- `events` — **List**; each entry is a JSON string `{ code, workoutName, ts }`. Full raw log, preserved for optional later "which workouts" analysis.
- `count:<code>` — integer, `INCR`'d per completion. Gives instant per-person totals without scanning the log.

Redis connection uses Upstash REST credentials stored as Vercel environment variables (server-side only), e.g. `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

### 3. Gate screen in the React app

- New `GateScreen.jsx` component (its own file, mirroring the existing `GuidanceScreen.jsx` pattern — the gate does **not** add to the `workout-app.jsx` monolith).
- A stored-code check runs before the app's normal screens. If no valid code is in `localStorage`, the gate screen is shown first.

## Flows

### Unlock (first visit)

1. App loads; no code in `localStorage` → show `GateScreen`.
2. User enters a code → `POST /api/unlock`.
3. `ok: true` → save code to `localStorage` (e.g. key `accessCode`) → proceed to the normal app entry screen.
4. `ok: false` → inline message ("That code isn't valid.") and let them retry.
5. Return visits: a stored code skips the gate entirely. (We trust the stored code for UX; the server still re-validates on every `/api/event`.)

An invalid code never reaches the rest of the app UI.

### Completion (analytics write)

1. User finishes the final step; the app already transitions to the complete screen.
2. In that same moment, fire-and-forget `POST /api/event` with the stored code + the completed workout's name.
3. If the call fails (offline, cold start, Redis hiccup), the user sees nothing broken — analytics is best-effort and never blocks the workout experience.

### Reading the data (Katie's workflow)

- Per-person leaderboard: read `count:*` keys.
- Detail / audit: read the `events` list.
- Via the Upstash console data browser, or a short local script hitting the Upstash REST API. No dashboard is built.

### Managing codes (Katie's workflow)

- Invite someone: text them their code → `SADD allowlist <code>` in the Upstash console. Two steps, no deploy.
- Revoke someone: `SREM allowlist <code>` — takes effect immediately (their next `/api/event` is rejected; a soft gate means an already-loaded session isn't force-killed, which is acceptable at this scale).

## Error Handling

- **Unlock network failure:** show a retry-able "Couldn't check that right now, try again" message; do not grant access on failure (fail closed for the gate UX).
- **Event write failure:** swallow silently; never surface to the user, never block the complete screen. Best-effort by design. (Acceptable data loss: an occasional missed completion count — fine for a PoC signal.)
- **Malformed/empty code submission:** client-side guard (non-empty) before calling `/api/unlock`; server treats anything not in the Set as invalid.

## Testing

No automated test suite exists in this repo; verification is by running the app and exercising the flows manually:

- Valid code unlocks and is remembered across reloads.
- Invalid code is rejected with a message and does not proceed.
- Completing a workout increments the correct `count:<code>` and appends one `events` entry.
- A revoked code (`SREM`) is rejected on the next `/api/event`.
- Event-write failure (simulate by breaking the endpoint) does not disrupt the complete screen.

The two serverless functions are small and pure enough to be unit-testable later if a harness is added; not required for this PoC.

## Explicitly Out of Scope (YAGNI)

- Passwords, email, real accounts, sessions/JWTs.
- "Forgot code" / self-serve recovery.
- Admin UI for codes (managed via Redis commands).
- Rate limiting beyond Vercel defaults.
- Hard content lock / DRM (soft gate by decision).
- Per-workout analytics *dashboards* (raw data is stored; no UI built).

All addable later if the PoC proves out.

## Future Work (noted, not part of this spec)

- **Decompose `workout-app.jsx`** (~1,900 lines): extract each `screen === "..."` block into its own component file, extract the `styles` object, move `flatten`/progress helpers out; state and handlers stay in the container. Mechanical, separately verifiable, worth its own spec. Deliberately deferred so the gate change stays small and independently verifiable.
- Optional convenience `add-code` script wrapping the Upstash REST call, if raw Redis commands become friction.
- Graduate the allowlist/analytics to a real accounts model only if/when the PoC justifies it.
