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
