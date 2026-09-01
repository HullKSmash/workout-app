import { test } from "node:test";
import assert from "node:assert/strict";
import { needsGuidanceIntro } from "./guidance-intro.js";

test("needsGuidanceIntro is false once the seen flag is stored", () => {
  assert.equal(needsGuidanceIntro("1"), false);
});

test("needsGuidanceIntro is true when nothing is stored", () => {
  assert.equal(needsGuidanceIntro(null), true);
  assert.equal(needsGuidanceIntro(undefined), true);
  assert.equal(needsGuidanceIntro(""), true);
});

test("needsGuidanceIntro is true for any value other than the seen flag", () => {
  assert.equal(needsGuidanceIntro("0"), true);
  assert.equal(needsGuidanceIntro("garbage"), true);
});
