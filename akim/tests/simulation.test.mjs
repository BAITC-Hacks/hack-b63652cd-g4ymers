import test from "node:test";
import assert from "node:assert/strict";
import { baseline, costOf, examplePlan, formatDelta, simulate, validatePlan } from "../lib/simulation.ts";

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const measure = (id, district = "nura") => ({ id, district });

test("matches the official baseline and reference plan", () => {
  near(baseline.score, 52.55768);
  assert.equal(baseline.critical, 2);
  assert.equal(validatePlan(examplePlan), null);
  assert.equal(costOf(examplePlan), 95);
  const result = simulate(examplePlan);
  near(result.score, 56.54307);
  assert.equal(result.critical, 0);
  near(result.districts.find(d => d.id === "nura").score, 52.9625);
});

test("requires five unique measures, validates direction limits and targets", () => {
  assert.ok(validatePlan(examplePlan.slice(0, 4)));
  assert.ok(validatePlan([...examplePlan, { id: "M2" }]));
  assert.ok(validatePlan([measure("M7"), measure("M7", "esil")], false));
  assert.ok(validatePlan([measure("M7"), measure("M8"), measure("M9")], false));
  assert.ok(validatePlan([{ id: "M7" }], false));
  assert.ok(validatePlan([measure("M7", "unknown")], false));
  assert.ok(validatePlan([measure("M2")], false));
  assert.ok(validatePlan([{ id: "unknown" }], false));
});

test("budget permits leftover funds but rejects overspending", () => {
  const cheap = [measure("M9"), measure("M11"), measure("M10"), { id: "M12" }, measure("M4")];
  assert.equal(costOf(cheap), 61);
  assert.equal(validatePlan(cheap), null);
  const expensive = [measure("M3"), measure("M5"), measure("M7"), measure("M10"), { id: "M12" }];
  assert.equal(costOf(expensive), 105);
  assert.match(validatePlan(expensive), /бюджета/);
});

test("global and district conflicts are enforced in both selection orders", () => {
  for (const [a, b, global] of [["M1", "M3", true], ["M4", "M7", false], ["M5", "M13", false]]) {
    assert.ok(validatePlan([measure(a), measure(b)], false));
    assert.ok(validatePlan([measure(b), measure(a)], false));
    assert.equal(!!validatePlan([measure(a), measure(b, "esil")], false), global);
  }
});

test("lag and fixed synergies use exact effects in the targeted district", () => {
  const traffic = simulate([measure("M1"), { id: "M2" }]);
  near(traffic.districts.find(d => d.id === "nura").values[0], 55 + 6 * .75 + 4 * .75 + 2);
  near(traffic.districts.find(d => d.id === "esil").values[0], 45 + 4 * .75);
  const ecology = simulate([measure("M5"), { id: "M6" }]);
  near(ecology.districts.find(d => d.id === "nura").values[3], 65 + 14 * .625 + 3 * .5 + 2);
  assert.deepEqual(simulate([...examplePlan].reverse()), simulate(examplePlan));
});

test("strict critical threshold catches a negative tradeoff", () => {
  const result = simulate([measure("M11", "almaty")]);
  assert.equal(result.critical, 3);
  near(result.districts.find(d => d.id === "almaty").values[0], 38.25);
  assert.ok(result.score < baseline.score);
  assert.equal(formatDelta(result.score - baseline.score).startsWith("−"), true);
});
