import { test } from "node:test";
import assert from "node:assert/strict";
import { needsTermsConsent, TERMS_VERSION } from "./terms-consent.js";

test("needsTermsConsent is false when stored equals current", () => {
  assert.equal(needsTermsConsent("1", 1), false);
  assert.equal(needsTermsConsent("2", 2), false);
});

test("needsTermsConsent is false when stored is newer than current", () => {
  assert.equal(needsTermsConsent("3", 2), false);
});

test("needsTermsConsent is true when stored is older than current", () => {
  assert.equal(needsTermsConsent("1", 2), true);
});

test("needsTermsConsent is true when nothing/invalid is stored", () => {
  assert.equal(needsTermsConsent(null, 1), true);
  assert.equal(needsTermsConsent(undefined, 1), true);
  assert.equal(needsTermsConsent("", 1), true);
  assert.equal(needsTermsConsent("garbage", 1), true);
});

test("TERMS_VERSION is a positive integer", () => {
  assert.ok(Number.isInteger(TERMS_VERSION) && TERMS_VERSION >= 1);
});
