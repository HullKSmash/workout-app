// ─── Terms & Conditions consent ──────────────────────────────────────────────
// First-run clickwrap consent. We store the terms version the user last accepted
// in localStorage, keyed per-variant (each variant is its own origin/subdomain in
// production). Bump TERMS_VERSION when the terms materially change to re-prompt
// everyone. Mirrors the view-mode.js pattern: a pure resolver plus storage I/O.

// Bump this when the Terms & Conditions materially change.
export const TERMS_VERSION = 1;

const keyFor = (variantKey) => `${variantKey}.termsAcceptedVersion`;

// Whether to show the consent modal, given the stored value (string|null from
// localStorage) and the current version. Pure — safe to unit-test.
export function needsTermsConsent(stored, current) {
  const accepted = Number(stored);
  return !(Number.isFinite(accepted) && accepted >= current);
}

export function getStoredTermsVersion(variantKey) {
  try {
    return localStorage.getItem(keyFor(variantKey));
  } catch {
    return null;
  }
}

export function acceptTerms(variantKey, version) {
  try {
    localStorage.setItem(keyFor(variantKey), String(version));
  } catch {
    // localStorage unavailable (private mode/quota) — session still works;
    // the user may be re-prompted on the next visit.
  }
}
