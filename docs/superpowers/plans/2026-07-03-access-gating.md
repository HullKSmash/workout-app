# Access Gating & Completion Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an invite-only soft gate (per-person codes) and per-person workout-completion analytics to the static SPA, backed by two Vercel serverless functions and Upstash Redis.

**Architecture:** Codes double as gate and pseudonym. A strict allowlist lives server-side in a Redis Set (never in the client bundle). `POST /api/unlock` validates a code; `POST /api/event` records completions (`events` list + `count:<code>` counter). The React app shows a `GateScreen` until a code is stored in `localStorage`, and fires a fire-and-forget completion event on the complete screen. No PII, no accounts. `workout-app.jsx` is NOT refactored here.

**Tech Stack:** React 19 + Vite (existing), Vercel serverless functions (new — first backend), `@upstash/redis`, Node's built-in `node --test` runner for pure-logic unit tests. No new test framework.

**Spec:** `docs/superpowers/specs/2026-07-03-access-gating-design.md`

---

## File Structure

**Create:**
- `api/_lib/validate.js` — pure request-body validators (`normalizeCode`, `validateUnlockBody`, `validateEventBody`). No deps → unit-testable.
- `api/_lib/validate.test.js` — `node --test` unit tests for the validators.
- `api/_lib/redis.js` — Upstash Redis client built from the `KV_REST_API_*` env vars.
- `api/unlock.js` — `POST /api/unlock` handler.
- `api/event.js` — `POST /api/event` handler.
- `access.js` — front-end helpers: code `localStorage` I/O + `requestUnlock` + `recordCompletion`.
- `GateScreen.jsx` — the gate UI (mirrors `GuidanceScreen.jsx`).

**Modify:**
- `package.json` — add `@upstash/redis` dependency.
- `workout-app.jsx` — import gate + access helpers; render `GateScreen` until unlocked; fire completion event.

**Manual/config (dashboard, no code):**
- Add the Upstash Redis integration to the Vercel `workout-app` project; confirm the HTTP-REST env vars exist (typically `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
- Pull env vars locally for `vercel dev`.

---

## Task 1: Provision Upstash Redis + local env + dependency

**Files:**
- Modify: `package.json` (via `npm install`)

- [ ] **Step 1: Install the Redis client**

Run:
```bash
npm install @upstash/redis
```
Expected: `package.json` `dependencies` now lists `@upstash/redis`; `package-lock.json` updated.

- [ ] **Step 2: Add the Upstash Redis integration to Vercel (dashboard — manual)**

In the Vercel dashboard → project `workout-app` → **Storage** (or **Integrations** → Marketplace) → add **Upstash Redis** → create a database and connect it to this project.

Then confirm the env vars were created: Vercel → project → Settings → Environment Variables. The Upstash integration injects HTTP-REST credentials — most commonly `KV_REST_API_URL` and `KV_REST_API_TOKEN` (the successor naming to the retired Vercel KV). Some provisions also add `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
- No renaming needed. `api/_lib/redis.js` (Task 3) reads `KV_REST_API_*` first and falls back to `UPSTASH_REDIS_REST_*`, so whichever pair exists will work. You just need at least one REST URL + token pair. (These are sensitive/encrypted values — you do not need to copy or re-enter them.)

- [ ] **Step 3: Pull env vars for local development**

Run:
```bash
npx vercel env pull .env.local
```
(Run `npx vercel login` first if prompted.) Expected: a `.env.local` file containing `KV_REST_API_URL=...` and `KV_REST_API_TOKEN=...` (and possibly `UPSTASH_REDIS_REST_*` too).

- [ ] **Step 4: Confirm `.env.local` is gitignored**

Run:
```bash
git check-ignore .env.local
```
Expected: prints `.env.local` (already ignored by Vite's default `*.local` rule). If it prints nothing, add a line `*.local` to `.gitignore`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: add @upstash/redis dependency for access gating"
```

---

## Task 2: Pure request-body validators (TDD)

**Files:**
- Create: `api/_lib/validate.js`
- Test: `api/_lib/validate.test.js`

- [ ] **Step 1: Write the failing tests**

Create `api/_lib/validate.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCode,
  validateUnlockBody,
  validateEventBody,
} from "./validate.js";

test("normalizeCode trims and lowercases", () => {
  assert.equal(normalizeCode("  Rider-Jane  "), "rider-jane");
});

test("normalizeCode returns empty string for non-strings", () => {
  assert.equal(normalizeCode(undefined), "");
  assert.equal(normalizeCode(42), "");
  assert.equal(normalizeCode(null), "");
});

test("validateUnlockBody accepts a non-empty code, normalized", () => {
  assert.deepEqual(validateUnlockBody({ code: " Paul " }), {
    ok: true,
    code: "paul",
  });
});

test("validateUnlockBody rejects missing/empty code", () => {
  assert.equal(validateUnlockBody({}).ok, false);
  assert.equal(validateUnlockBody({ code: "   " }).ok, false);
  assert.equal(validateUnlockBody(undefined).ok, false);
});

test("validateEventBody requires code and workoutName", () => {
  assert.deepEqual(
    validateEventBody({ code: "Paul", workoutName: " Foundation 1 " }),
    { ok: true, code: "paul", workoutName: "Foundation 1" }
  );
});

test("validateEventBody rejects missing fields", () => {
  assert.equal(validateEventBody({ code: "paul" }).ok, false);
  assert.equal(validateEventBody({ workoutName: "x" }).ok, false);
  assert.equal(validateEventBody({ code: " ", workoutName: " " }).ok, false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
node --test api/_lib/validate.test.js
```
Expected: FAIL — cannot resolve `./validate.js` (module not found).

- [ ] **Step 3: Write the validators**

Create `api/_lib/validate.js`:
```js
// Pure request-body validators for the access-gating API functions.
// No external dependencies so they can be unit-tested with `node --test`.

export function normalizeCode(code) {
  return typeof code === "string" ? code.trim().toLowerCase() : "";
}

export function validateUnlockBody(body) {
  const code = normalizeCode(body?.code);
  if (!code) return { ok: false, error: "missing code" };
  return { ok: true, code };
}

export function validateEventBody(body) {
  const code = normalizeCode(body?.code);
  const workoutName =
    typeof body?.workoutName === "string" ? body.workoutName.trim() : "";
  if (!code) return { ok: false, error: "missing code" };
  if (!workoutName) return { ok: false, error: "missing workoutName" };
  return { ok: true, code, workoutName };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```bash
node --test api/_lib/validate.test.js
```
Expected: PASS — all tests pass (`# pass 6`).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/validate.js api/_lib/validate.test.js
git commit -m "feat: add request-body validators for access-gating API"
```

---

## Task 3: Redis client module

**Files:**
- Create: `api/_lib/redis.js`

- [ ] **Step 1: Write the client module**

Create `api/_lib/redis.js`:
```js
// Shared Upstash Redis client for the API functions. The Vercel Upstash
// integration injects HTTP-REST credentials as KV_REST_API_URL /
// KV_REST_API_TOKEN; we read those directly (with UPSTASH_* as a fallback in
// case a future re-provision uses that naming). `Redis.fromEnv()` is NOT used
// because it only looks for the UPSTASH_* names.
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const ALLOWLIST_KEY = "allowlist";
export const EVENTS_KEY = "events";
export const countKey = (code) => `count:${code}`;
```

- [ ] **Step 2: Verify it imports without throwing (env present)**

Run:
```bash
node --env-file=.env.local -e "import('./api/_lib/redis.js').then(m => m.redis.ping()).then(r => console.log('PING', r))"
```
Expected: prints `PING PONG`. (Requires `.env.local` from Task 1. If it errors with a connection/auth message, re-check the env vars.)

- [ ] **Step 3: Commit**

```bash
git add api/_lib/redis.js
git commit -m "feat: add Upstash Redis client module"
```

---

## Task 4: `POST /api/unlock` handler

**Files:**
- Create: `api/unlock.js`

- [ ] **Step 1: Write the handler**

Create `api/unlock.js`:
```js
import { redis, ALLOWLIST_KEY } from "./_lib/redis.js";
import { validateUnlockBody } from "./_lib/validate.js";

// POST /api/unlock  { code } -> { ok: boolean }
// ok:true means the (normalized) code is in the server-side allowlist.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method not allowed" });
  }
  const parsed = validateUnlockBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ ok: false });
  }
  const isMember = await redis.sismember(ALLOWLIST_KEY, parsed.code);
  return res.status(200).json({ ok: isMember === 1 });
}
```

- [ ] **Step 2: Seed a test code and start `vercel dev`**

In one terminal, start the local dev server (serves the Vite app AND the `/api` functions):
```bash
npx vercel dev
```
Expected: server listening on `http://localhost:3000`.

In another terminal, seed a test code into the allowlist via the Upstash REST API:
```bash
set -a && . ./.env.local && set +a
curl -s -X POST "$KV_REST_API_URL/sadd/allowlist/testcode" \
  -H "Authorization: Bearer $KV_REST_API_TOKEN"
```
Expected: JSON like `{"result":1}` (1 = added; 0 = already present).

- [ ] **Step 3: Verify a valid code is accepted and an invalid one rejected**

Run:
```bash
curl -s -X POST http://localhost:3000/api/unlock \
  -H "Content-Type: application/json" -d '{"code":"testcode"}'
echo
curl -s -X POST http://localhost:3000/api/unlock \
  -H "Content-Type: application/json" -d '{"code":"nope"}'
echo
curl -s -X POST http://localhost:3000/api/unlock \
  -H "Content-Type: application/json" -d '{"code":"  TESTCODE  "}'
```
Expected, in order: `{"ok":true}`, `{"ok":false}`, `{"ok":true}` (third confirms trim+lowercase normalization).

- [ ] **Step 4: Commit**

```bash
git add api/unlock.js
git commit -m "feat: add /api/unlock allowlist-check endpoint"
```

---

## Task 5: `POST /api/event` handler

**Files:**
- Create: `api/event.js`

- [ ] **Step 1: Write the handler**

Create `api/event.js`:
```js
import { redis, ALLOWLIST_KEY, EVENTS_KEY, countKey } from "./_lib/redis.js";
import { validateEventBody } from "./_lib/validate.js";

// POST /api/event  { code, workoutName } -> { ok: boolean }
// Re-validates the code against the allowlist (rejects unknown codes so the
// log can't be polluted), then appends an event and bumps the per-code count.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method not allowed" });
  }
  const parsed = validateEventBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ ok: false });
  }
  const isMember = await redis.sismember(ALLOWLIST_KEY, parsed.code);
  if (isMember !== 1) {
    return res.status(403).json({ ok: false });
  }
  const event = JSON.stringify({
    code: parsed.code,
    workoutName: parsed.workoutName,
    ts: Date.now(),
  });
  await Promise.all([
    redis.rpush(EVENTS_KEY, event),
    redis.incr(countKey(parsed.code)),
  ]);
  return res.status(200).json({ ok: true });
}
```

- [ ] **Step 2: Verify a valid completion is recorded**

With `vercel dev` running and `testcode` seeded (Task 4), and env loaded in the shell (`set -a && . ./.env.local && set +a`):
```bash
curl -s -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{"code":"testcode","workoutName":"Foundation 1"}'
echo
curl -s "$KV_REST_API_URL/get/count:testcode" \
  -H "Authorization: Bearer $KV_REST_API_TOKEN"
```
Expected: first call `{"ok":true}`; second call `{"result":"1"}` (the counter). Run the first curl again and re-check: the counter becomes `"2"`.

- [ ] **Step 3: Verify an unknown code is rejected (not recorded)**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{"code":"nope","workoutName":"Foundation 1"}'
```
Expected: `403`.

- [ ] **Step 4: Commit**

```bash
git add api/event.js
git commit -m "feat: add /api/event completion-recording endpoint"
```

---

## Task 6: Front-end access helpers

**Files:**
- Create: `access.js`

- [ ] **Step 1: Write the helpers**

Create `access.js` (mirrors the `localStorage` try/catch style of `workouts/progress.js`):
```js
// ─── Access gating: per-person code stored locally + API client ──────────────
// The code doubles as the user's pseudonym. It is stored in localStorage after
// the server confirms it is on the allowlist, and skipped on return visits.

const CODE_KEY = "setgo.accessCode";

const normalize = (code) => (typeof code === "string" ? code.trim().toLowerCase() : "");

export function getAccessCode() {
  try {
    return localStorage.getItem(CODE_KEY);
  } catch {
    return null;
  }
}

export function setAccessCode(code) {
  try {
    localStorage.setItem(CODE_KEY, code);
  } catch {
    // localStorage unavailable (private mode/quota) — session still works.
  }
}

export function clearAccessCode() {
  try {
    localStorage.removeItem(CODE_KEY);
  } catch {
    // ignore
  }
}

// Ask the server whether a code is on the allowlist.
// Returns { ok, code } where code is the normalized value to store on success.
// Throws on network failure or 5xx so the caller can fail closed (retry) rather
// than treating a server outage as "wrong code".
export async function requestUnlock(rawCode) {
  const code = normalize(rawCode);
  const res = await fetch("/api/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (res.status >= 500) throw new Error("server error");
  const data = await res.json().catch(() => ({ ok: false }));
  return { ok: data.ok === true, code };
}

// Fire-and-forget: record a completed workout. Never blocks the UI, never
// surfaces failures — best-effort analytics only.
export function recordCompletion(code, workoutName) {
  if (!code || !workoutName) return;
  fetch("/api/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, workoutName }),
  }).catch(() => {});
}
```

- [ ] **Step 2: Verify it parses (build check)**

Run:
```bash
npx vite build 2>&1 | tail -5
```
Expected: build succeeds (`✓ built in ...`). `access.js` isn't imported yet, so this just confirms no syntax error once bundled in later tasks; a clean build is enough here.

- [ ] **Step 3: Commit**

```bash
git add access.js
git commit -m "feat: add front-end access-code helpers and API client"
```

---

## Task 7: GateScreen component

**Files:**
- Create: `GateScreen.jsx`

- [ ] **Step 1: Write the component**

Create `GateScreen.jsx` (mirrors `GuidanceScreen.jsx`: `makeStyles(accent, accentLight)`, inline styles, maxWidth 480, same color constants):
```jsx
// Invite-only soft gate. Shown before the app whenever no access code is stored
// locally. On submit it asks the server (/api/unlock) whether the code is on the
// allowlist; a valid code is persisted by the caller and unlocks the app.
import { useState } from "react";
import { requestUnlock } from "./access";

const TEXT = "#2D2A26";
const TEXT_SECONDARY = "#8A8279";
const BG = "#FAF8F5";

export default function GateScreen({ brandName, accent, accentLight, onUnlock }) {
  const s = makeStyles(accent, accentLight);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | checking | invalid | error
  const disabled = status === "checking" || code.trim() === "";

  const submit = async (e) => {
    e.preventDefault();
    if (disabled) return;
    setStatus("checking");
    try {
      const { ok, code: normalized } = await requestUnlock(code);
      if (ok) {
        onUnlock(normalized);
      } else {
        setStatus("invalid");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div style={s.screen}>
      <form style={s.content} onSubmit={submit}>
        <h1 style={s.title}>{brandName}</h1>
        <p style={s.subtitle}>Enter your access code to continue.</p>
        <input
          style={s.input}
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          placeholder="Access code"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          aria-label="Access code"
        />
        <button style={s.button} type="submit" disabled={disabled}>
          {status === "checking" ? "Checking…" : "Enter"}
        </button>
        {status === "invalid" && (
          <p style={s.error}>That code isn’t valid. Double-check and try again.</p>
        )}
        {status === "error" && (
          <p style={s.error}>Couldn’t check that right now. Please try again.</p>
        )}
      </form>
    </div>
  );
}

function makeStyles(accent, accentLight) {
  return {
    screen: {
      minHeight: "100vh",
      maxWidth: 480,
      margin: "0 auto",
      background: BG,
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      padding: "24px",
      width: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    },
    title: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 32,
      fontWeight: 800,
      letterSpacing: "-0.02em",
      color: accent,
      margin: 0,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 1.6,
      color: TEXT_SECONDARY,
      margin: "0 0 4px 0",
      textAlign: "center",
    },
    input: {
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 17,
      padding: "14px 16px",
      borderRadius: 12,
      border: `2px solid ${accentLight}`,
      color: TEXT,
      background: "#fff",
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
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
    error: {
      fontSize: 14,
      color: "#B4342B",
      margin: 0,
      textAlign: "center",
    },
  };
}
```

- [ ] **Step 2: Verify it builds**

Run:
```bash
npx vite build 2>&1 | tail -5
```
Expected: build succeeds. (Component compiles; not wired in until Task 8.)

- [ ] **Step 3: Commit**

```bash
git add GateScreen.jsx
git commit -m "feat: add GateScreen access-code entry component"
```

---

## Task 8: Wire the gate and completion event into the app

**Files:**
- Modify: `workout-app.jsx`

- [ ] **Step 1: Add imports**

In `workout-app.jsx`, after the existing `import GuidanceScreen from "./GuidanceScreen";` line (currently line 9), add:
```jsx
import GateScreen from "./GateScreen";
import { getAccessCode, setAccessCode, recordCompletion } from "./access";
```

- [ ] **Step 2: Add unlocked state**

Inside `WorkoutApp`, next to the other `useState` calls (just after the `const [screen, setScreen] = useState(...)` line, currently line 119), add:
```jsx
  // Access gate: unlocked once a code is stored locally (see access.js).
  const [accessCode, setAccessCodeState] = useState(getAccessCode);
```

- [ ] **Step 3: Fire the completion event**

In `handleNext`, in the completion branch, immediately after `setScreen("complete");` (currently line 275), add:
```jsx
      recordCompletion(accessCode, selectedWorkout?.name);
```

- [ ] **Step 4: Render the gate before the app**

Immediately before the main render `return (` (currently line 320, the line after `const programComplete = ...`), add an early return:
```jsx
  // Gate everything behind a valid access code.
  if (!accessCode) {
    return (
      <GateScreen
        brandName={variant.brandName}
        accent={variant.accent}
        accentLight={variant.accentLight}
        onUnlock={(code) => {
          setAccessCode(code);
          setAccessCodeState(code);
        }}
      />
    );
  }

```

- [ ] **Step 5: Verify the build compiles**

Run:
```bash
npx vite build 2>&1 | tail -5
```
Expected: build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add workout-app.jsx
git commit -m "feat: gate app behind access code and record completions"
```

---

## Task 9: End-to-end verification

**Files:** none (verification + final notes)

- [ ] **Step 1: Run the full stack locally**

Run:
```bash
npx vercel dev
```
Open `http://localhost:3000`. Expected: the **GateScreen** appears (brand name + "Enter your access code"), NOT the normal app.

- [ ] **Step 2: Reject an invalid code**

In the gate input, type `wrongcode` and submit. Expected: inline message "That code isn't valid…" and you stay on the gate.

- [ ] **Step 3: Accept a valid code and confirm it's remembered**

Ensure `testcode` is still in the allowlist (from Task 4; re-seed if needed). Type `testcode`, submit. Expected: the normal app screen appears. Reload the page — expected: the app appears directly, no gate (code persisted in `localStorage`).

- [ ] **Step 4: Confirm a completed workout increments the count**

Note the current count:
```bash
set -a && . ./.env.local && set +a
curl -s "$KV_REST_API_URL/get/count:testcode" \
  -H "Authorization: Bearer $KV_REST_API_TOKEN"; echo
```
In the app, open a workout and step through to the complete screen. Then re-run the curl above. Expected: the counter increased by exactly 1. Also check the raw log:
```bash
curl -s "$KV_REST_API_URL/lrange/events/-1/-1" \
  -H "Authorization: Bearer $KV_REST_API_TOKEN"; echo
```
Expected: the last `events` entry is JSON with `code:"testcode"`, the workout's `workoutName`, and a `ts`.

- [ ] **Step 5: Confirm event-failure doesn't break the UI**

Stop `vercel dev` and instead run the plain Vite dev server (no `/api`):
```bash
npx vite
```
Manually set an access code so you skip the gate: open the app, and in the browser devtools console run `localStorage.setItem("setgo.accessCode","testcode")`, then reload. Step through a workout to completion. Expected: the complete screen shows normally with no visible error (the `/api/event` call fails silently — best-effort by design). Note: with plain `vite` the gate's `/api/unlock` isn't available, which is why we set the code directly; real gate testing uses `vercel dev`.

- [ ] **Step 6: Clean up the test data (optional)**

Remove the test code and its count so real analytics aren't polluted:
```bash
set -a && . ./.env.local && set +a
curl -s -X POST "$KV_REST_API_URL/srem/allowlist/testcode" \
  -H "Authorization: Bearer $KV_REST_API_TOKEN"; echo
curl -s -X POST "$KV_REST_API_URL/del/count:testcode" \
  -H "Authorization: Bearer $KV_REST_API_TOKEN"; echo
```
(Leave real invitee codes in place. To wipe the `events` test entries entirely for a clean slate, you can `del/events` — only do this before any real usage.)

- [ ] **Step 7: Deploy and smoke-test production**

Push the branch and open a PR (or deploy a preview). After deploy, seed a real invitee code (`SADD allowlist <code>`) and confirm the gate + a completion work against the deployed `/api` functions. Then hand out codes.

---

## Operator cheat-sheet (post-launch)

- **Invite someone:** text them their code, then in the Upstash console (or via REST) run `SADD allowlist <code>` (codes are lowercased). No redeploy.
- **Revoke someone:** `SREM allowlist <code>` — takes effect on their next completion event immediately.
- **See per-person counts:** read the `count:*` keys (Upstash console → Data Browser, or `GET count:<code>`).
- **See raw completions:** `LRANGE events 0 -1`.

## Future work (not in this plan)

- Decompose `workout-app.jsx` (~1,900 lines) into per-screen components + extracted styles — its own spec.
- Optional `add-code` convenience script wrapping the Upstash REST `SADD` call.
