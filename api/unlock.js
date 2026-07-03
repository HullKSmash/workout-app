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
