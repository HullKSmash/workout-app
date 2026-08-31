// ─── Access gating: per-person code stored locally + API client ──────────────
// The code doubles as the user's pseudonym. It is stored after the server
// confirms it is on the allowlist, and skipped on return visits. Persistence
// goes through cross-domain-store so the code is shared across the apex and every
// subdomain (see cross-domain-store.js) rather than living in per-origin
// localStorage, which would re-gate the user on each subdomain.
import { readValue, writeValue, removeValue } from "./cross-domain-store.js";

const CODE_KEY = "setgo.accessCode";

const normalize = (code) => (typeof code === "string" ? code.trim().toLowerCase() : "");

export function getAccessCode() {
  return readValue(CODE_KEY);
}

export function setAccessCode(code) {
  writeValue(CODE_KEY, code);
}

export function clearAccessCode() {
  removeValue(CODE_KEY);
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
