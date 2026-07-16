import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveViewMode, DEFAULT_VIEW } from "./view-mode.js";

test("resolveViewMode returns a valid stored mode unchanged", () => {
  assert.equal(resolveViewMode("checklist"), "checklist");
  assert.equal(resolveViewMode("stepthrough"), "stepthrough");
});

test("resolveViewMode falls back to DEFAULT_VIEW for null/invalid", () => {
  assert.equal(resolveViewMode(null), DEFAULT_VIEW);
  assert.equal(resolveViewMode(undefined), DEFAULT_VIEW);
  assert.equal(resolveViewMode("garbage"), DEFAULT_VIEW);
  assert.equal(resolveViewMode(""), DEFAULT_VIEW);
});

test("DEFAULT_VIEW is the step-through (conservative default)", () => {
  assert.equal(DEFAULT_VIEW, "stepthrough");
});
