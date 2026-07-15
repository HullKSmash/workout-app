import { test } from "node:test";
import assert from "node:assert/strict";

// Minimal in-memory localStorage shim so the persistence wrappers (which the app
// relies on for resume-vs-reset) can be exercised outside a browser.
globalThis.localStorage = {
  store: {},
  getItem(k) {
    return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null;
  },
  setItem(k, v) {
    this.store[k] = String(v);
  },
  removeItem(k) {
    delete this.store[k];
  },
};

const {
  checklistKey,
  loadActiveChecklist,
  saveActiveChecklist,
  clearActiveChecklist,
} = await import("./checklist-progress.js");

test("checklistKey uses the workout name when there is no slot", () => {
  assert.equal(checklistKey("Foundation 1", null), "Foundation 1");
  assert.equal(checklistKey("Foundation 1", undefined), "Foundation 1");
});

test("checklistKey prefixes the schedule slot so reused workouts stay distinct", () => {
  assert.equal(checklistKey("Foundation 1", "w1-0"), "w1-0::Foundation 1");
  assert.equal(checklistKey("Foundation 1", "w3-2"), "w3-2::Foundation 1");
});

test("save then load round-trips the record; clear removes it", () => {
  clearActiveChecklist();
  assert.equal(loadActiveChecklist(), null);

  saveActiveChecklist("Foundation 1", ["p0c0r1e0", "p1c0r2e1"]);
  assert.deepEqual(loadActiveChecklist(), {
    key: "Foundation 1",
    checked: ["p0c0r1e0", "p1c0r2e1"],
  });

  clearActiveChecklist();
  assert.equal(loadActiveChecklist(), null);
});

test("loadActiveChecklist rejects malformed/legacy records", () => {
  const cases = [
    "not json",
    "null",
    "42",
    JSON.stringify({ key: "x" }), // missing checked
    JSON.stringify({ checked: [] }), // missing key
    JSON.stringify({ key: 5, checked: [] }), // wrong key type
    JSON.stringify({ key: "x", checked: "nope" }), // wrong checked type
  ];
  for (const raw of cases) {
    localStorage.setItem("setgo.activeChecklist", raw);
    assert.equal(loadActiveChecklist(), null, `should reject: ${raw}`);
  }
  clearActiveChecklist();
});
