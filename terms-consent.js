// ─── Terms & Conditions consent ──────────────────────────────────────────────
// First-run clickwrap consent. We store the terms version the user last accepted
// under a single, variant-independent key: the Terms, Cookie Policy, and
// liability waiver are one document covering the whole Service, so consent is not
// per-variant. Persistence goes through cross-domain-store so acceptance is shared
// across the apex and every subdomain (see cross-domain-store.js) rather than
// living in per-origin localStorage. Bump TERMS_VERSION when the terms materially
// change to re-prompt everyone.
import { readValue, writeValue } from "./cross-domain-store.js";

// Bump this when the Terms & Conditions materially change.
export const TERMS_VERSION = 1;

const KEY = "setgo.termsAcceptedVersion";

// Whether to show the consent modal, given the stored value (string|null) and the
// current version. Pure — safe to unit-test.
export function needsTermsConsent(stored, current) {
  const accepted = Number(stored);
  return !(Number.isFinite(accepted) && accepted >= current);
}

export function getStoredTermsVersion() {
  return readValue(KEY);
}

export function acceptTerms(version) {
  writeValue(KEY, version);
}
