import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateOverage,
  API_CREDIT_CENTS,
  OVERAGE_BLOCK_CENTS,
} from "../overage.ts";

describe("calculateOverage", () => {
  it("returns zero overage for zero usage", () => {
    const result = calculateOverage(0);
    assert.equal(result.overageBaseCents, 0);
    assert.equal(result.overageWithMarginCents, 0);
    assert.equal(result.units, 0);
    assert.equal(result.chargeableCents, 0);
  });

  it("returns zero overage when usage is under credit", () => {
    const result = calculateOverage(1500); // $15 < $25 credit
    assert.equal(result.overageBaseCents, 0);
    assert.equal(result.units, 0);
    assert.equal(result.chargeableCents, 0);
  });

  it("returns zero overage when usage equals credit exactly", () => {
    const result = calculateOverage(API_CREDIT_CENTS);
    assert.equal(result.overageBaseCents, 0);
    assert.equal(result.units, 0);
    assert.equal(result.chargeableCents, 0);
  });

  it("charges one block for $1 over credit", () => {
    // $26 raw → $1 overage → ceil($1 × 1.25) = $2 → ceil($2/$20) = 1 unit
    const result = calculateOverage(API_CREDIT_CENTS + 100);
    assert.equal(result.overageBaseCents, 100);
    assert.equal(result.overageWithMarginCents, 125);
    assert.equal(result.units, 1);
    assert.equal(result.chargeableCents, OVERAGE_BLOCK_CENTS);
  });

  it("calculates the $60 example from the plan correctly", () => {
    // $60 raw → $35 overage → ceil($35 × 1.25) = ceil($43.75) = $44 → ceil($44/$20) = 3 units → $60
    const result = calculateOverage(6000);
    assert.equal(result.rawUsageCents, 6000);
    assert.equal(result.overageBaseCents, 3500);
    assert.equal(result.overageWithMarginCents, 4375);
    assert.equal(result.units, 3);
    assert.equal(result.chargeableCents, 6000);
  });

  it("handles large usage", () => {
    // $200 raw → $175 overage → ceil($175 × 1.25) = ceil($218.75) = $219 → ceil($219/$20) = 11 units → $220
    const result = calculateOverage(20000);
    assert.equal(result.overageBaseCents, 17500);
    assert.equal(result.overageWithMarginCents, 21875);
    assert.equal(result.units, 11);
    assert.equal(result.chargeableCents, 22000);
  });

  it("preserves rawUsageCents in result", () => {
    const result = calculateOverage(4200);
    assert.equal(result.rawUsageCents, 4200);
  });
});
