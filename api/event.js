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
