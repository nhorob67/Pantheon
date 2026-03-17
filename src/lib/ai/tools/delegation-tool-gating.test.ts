import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDelegationToolAvailable } from "./delegation-tool-gating.ts";

describe("isDelegationToolAvailable", () => {
  it("returns true when all conditions met", () => {
    assert.ok(
      isDelegationToolAvailable({
        tenantStatus: "enabled",
        rolloutEnabled: true,
        delegationPaused: false,
      })
    );
  });

  it("returns false when paused", () => {
    assert.ok(
      !isDelegationToolAvailable({
        tenantStatus: "enabled",
        rolloutEnabled: true,
        delegationPaused: true,
      })
    );
  });

  it("returns false when rollout disabled", () => {
    assert.ok(
      !isDelegationToolAvailable({
        tenantStatus: "enabled",
        rolloutEnabled: false,
        delegationPaused: false,
      })
    );
  });

  it("returns false when tenant status is disabled", () => {
    assert.ok(
      !isDelegationToolAvailable({
        tenantStatus: "disabled",
        rolloutEnabled: true,
        delegationPaused: false,
      })
    );
  });

  it("returns false when tenant status is undefined", () => {
    assert.ok(
      !isDelegationToolAvailable({
        tenantStatus: undefined,
        rolloutEnabled: true,
        delegationPaused: false,
      })
    );
  });

  it("pause takes precedence over everything", () => {
    assert.ok(
      !isDelegationToolAvailable({
        tenantStatus: "enabled",
        rolloutEnabled: true,
        delegationPaused: true,
      })
    );
  });
});
