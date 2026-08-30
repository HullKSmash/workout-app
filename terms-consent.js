// ─── Terms & Conditions consent ──────────────────────────────────────────────
// First-run clickwrap consent. We store the terms version the user last accepted
// in localStorage under a single, variant-independent key: the Terms, Cookie
// Policy, and liability waiver are one document covering the whole Service, so
// consent is not per-variant. Keying it per-variant would re-prompt a user who
// agrees on the portal ("default") and then picks a variant on the same origin.
// Bump TERMS_VERSION when the terms materially change to re-prompt everyone.
// Mirrors the view-mode.js pattern: a pure resolver plus storage I/O.

// Bump this when the Terms & Conditions materially change.
export const TERMS_VERSION = 1;

const KEY = "setgo.termsAcceptedVersion";

// Whether to show the consent modal, given the stored value (string|null from
// localStorage) and the current version. Pure — safe to unit-test.
export function needsTermsConsent(stored, current) {
  const accepted = Number(stored);
  return !(Number.isFinite(accepted) && accepted >= current);
}

export function getStoredTermsVersion() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function acceptTerms(version) {
  try {
    localStorage.setItem(KEY, String(version));
  } catch {
    // localStorage unavailable (private mode/quota) — session still works;
    // the user may be re-prompted on the next visit.
  }
}
