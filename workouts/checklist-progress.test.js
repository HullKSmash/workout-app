import { test } from "node:test";
import assert from "node:assert/strict";
import { checklistKey } from "./checklist-progress.js";

test("checklistKey uses the workout name when there is no slot", () => {
  assert.equal(checklistKey("Foundation 1", null), "Foundation 1");
  assert.equal(checklistKey("Foundation 1", undefined), "Foundation 1");
});

test("checklistKey prefixes the schedule slot so reused workouts stay distinct", () => {
  assert.equal(checklistKey("Foundation 1", "w1-0"), "w1-0::Foundation 1");
  assert.equal(checklistKey("Foundation 1", "w3-2"), "w3-2::Foundation 1");
});
