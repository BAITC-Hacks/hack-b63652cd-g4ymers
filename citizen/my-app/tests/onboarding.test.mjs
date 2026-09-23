import test from "node:test";
import assert from "node:assert/strict";
import { initialTourProgress, readTourProgress, saveTourProgress, tourSteps, tourStorageKey } from "../lib/onboarding.ts";

function memory() {
  const entries = new Map();
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
}
test("a new account sees the guide even when another account or the old guide was completed", () => {
  const storage = memory();
  storage.setItem("citizen-onboarding-seen", "1");
  saveTourProgress(storage, "account-one", { version: 2, step: 10, status: "completed" });
  assert.equal(readTourProgress(storage, "account-one").status, "completed");
  assert.equal(readTourProgress(storage, "account-two"), null);
  assert.deepEqual(initialTourProgress(), { version: 2, step: 0, status: "in-progress" });
});
test("reload, later, completion and restart preserve independent per-account progress", () => {
  const storage = memory();
  for (const status of ["in-progress", "dismissed", "completed"]) {
    const saved = { version: 2, step: 7, status };
    saveTourProgress(storage, "account", saved);
    assert.deepEqual(readTourProgress(storage, "account"), saved);
  }
  saveTourProgress(storage, "account", initialTourProgress());
  assert.deepEqual(readTourProgress(storage, "account"), initialTourProgress());
});
test("corrupt, obsolete or out-of-range progress cannot break the guide", () => {
  const storage = memory();
  for (const invalid of ["broken json", "null", "[]", "1", ...[
    { version: 1, step: 0, status: "completed" },
    { version: 2, step: -1, status: "in-progress" },
    { version: 2, step: tourSteps.length, status: "in-progress" },
    { version: 2, step: 1.5, status: "in-progress" },
    { version: 2, step: "0", status: "in-progress" },
    { version: 2, step: 0, status: "unexpected" },
  ].map(value => JSON.stringify(value))]) {
    storage.setItem(tourStorageKey("account"), invalid);
    assert.equal(readTourProgress(storage, "account"), null);
  }
});
test("unavailable or full browser storage is non-fatal", () => {
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("quota exceeded"); } };
  for (const storage of [blocked, null]) {
    assert.equal(readTourProgress(storage, "account"), null);
    assert.doesNotThrow(() => saveTourProgress(storage, "account", initialTourProgress()));
  }
});
test("the guide covers the complete resident journey with stable unique steps", () => {
  assert.equal(tourSteps.length, 11);
  assert.equal(new Set(tourSteps.map(step => step.id)).size, tourSteps.length);
  for (const id of ["scan", "location", "place", "report", "send", "tracking", "journal", "rewards", "finish"]) {
    assert.ok(tourSteps.some(step => step.id === id));
  }
  assert.ok(tourSteps.every(step => step.instructions.length === 3 && step.tip && step.title));
  assert.ok(tourSteps.every(step => !step.target || ["navigation", "scan", "reports", "map", "profile", "help"].includes(step.target)));
});
