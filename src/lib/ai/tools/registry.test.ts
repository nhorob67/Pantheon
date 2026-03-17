import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isWebToolAvailable } from "./web-tool-gating.ts";

describe("tool registry web rollout gating", () => {
  it("disables web tools when the rollout flag is off", () => {
    assert.equal(
      isWebToolAvailable({
        tenantStatus: "enabled",
        rolloutEnabled: false,
        webResearchPaused: false,
      }),
      false
    );
  });

  it("disables web tools when the kill switch is on", () => {
    assert.equal(
      isWebToolAvailable({
        tenantStatus: "enabled",
        rolloutEnabled: true,
        webResearchPaused: true,
      }),
      false
    );
  });

  it("disables web tools when the tenant tool is not enabled", () => {
    assert.equal(
      isWebToolAvailable({
        tenantStatus: "disabled",
        rolloutEnabled: true,
        webResearchPaused: false,
      }),
      false
    );
  });

  it("enables web tools only when all gates allow it", () => {
    assert.equal(
      isWebToolAvailable({
        tenantStatus: "enabled",
        rolloutEnabled: true,
        webResearchPaused: false,
      }),
      true
    );
  });
});
