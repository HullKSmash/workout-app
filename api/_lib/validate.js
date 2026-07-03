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
