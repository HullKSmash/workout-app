import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCode,
  validateUnlockBody,
  validateEventBody,
} from "./validate.js";

test("normalizeCode trims and lowercases", () => {
  assert.equal(normalizeCode("  Rider-Jane  "), "rider-jane");
});

test("normalizeCode returns empty string for non-strings", () => {
  assert.equal(normalizeCode(undefined), "");
  assert.equal(normalizeCode(42), "");
  assert.equal(normalizeCode(null), "");
});

test("validateUnlockBody accepts a non-empty code, normalized", () => {
  assert.deepEqual(validateUnlockBody({ code: " Paul " }), {
    ok: true,
    code: "paul",
  });
});

test("validateUnlockBody rejects missing/empty code", () => {
  assert.equal(validateUnlockBody({}).ok, false);
  assert.equal(validateUnlockBody({ code: "   " }).ok, false);
  assert.equal(validateUnlockBody(undefined).ok, false);
});

test("validateEventBody requires code and workoutName", () => {
  assert.deepEqual(
    validateEventBody({ code: "Paul", workoutName: " Foundation 1 " }),
    { ok: true, code: "paul", workoutName: "Foundation 1" }
  );
});

test("validateEventBody rejects missing fields", () => {
  assert.equal(validateEventBody({ code: "paul" }).ok, false);
  assert.equal(validateEventBody({ workoutName: "x" }).ok, false);
  assert.equal(validateEventBody({ code: " ", workoutName: " " }).ok, false);
});
