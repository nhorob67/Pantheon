import test from "node:test";
import assert from "node:assert/strict";
import { projectMonthlyCost } from "./cost-projection.ts";

test("zero days returns current as projection", () => {
  const result = projectMonthlyCost(500, 0, 30, []);
  assert.equal(result.projected, 500);
  assert.equal(result.low, 500);
  assert.equal(result.high, 500);
});

test("single day with no variance returns flat projection", () => {
  const result = projectMonthlyCost(100, 1, 30, [100]);
  assert.equal(result.projected, 3000);
  // Single data point => no confidence interval spread
  assert.equal(result.low, 3000);
  assert.equal(result.high, 3000);
});

test("mid-month projection with uniform costs", () => {
  const dailyCosts = [100, 100, 100, 100, 100];
  const result = projectMonthlyCost(500, 5, 30, dailyCosts);
  // 500 + (100 * 25) = 3000
  assert.equal(result.projected, 3000);
  // Zero variance => low == high == projected
  assert.equal(result.low, 3000);
  assert.equal(result.high, 3000);
});

test("confidence interval widens with variance", () => {
  const dailyCosts = [50, 150, 50, 150]; // high variance
  const result = projectMonthlyCost(400, 4, 30, dailyCosts);
  // Average: 100/day, projected = 400 + 100 * 26 = 3000
  assert.equal(result.projected, 3000);
  // Stddev = 50, so low = 400 + (100-50)*26 = 1700, high = 400 + (100+50)*26 = 4300
  assert.ok(result.low < result.projected);
  assert.ok(result.high > result.projected);
});

test("low is clamped to at least current spend", () => {
  const dailyCosts = [10, 500]; // large variance with low avg
  const result = projectMonthlyCost(510, 2, 30, dailyCosts);
  assert.ok(result.low >= 510);
});

test("zero days in month returns current", () => {
  const result = projectMonthlyCost(200, 5, 0, []);
  assert.equal(result.projected, 200);
});
