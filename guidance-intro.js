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
