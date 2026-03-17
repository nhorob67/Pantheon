import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isBrowserToolAvailable } from "./browser-tool-gating.ts";

describe("isBrowserToolAvailable", () => {
  it("returns true when all conditions met", () => {
    assert.ok(
      isBrowserToolAvailable({
        tenantStatus: "enabled",
        rolloutEnabled: true,
        browserPaused: false,
      })
    );
  });

  it("returns false when paused", () => {
    assert.ok(
      !isBrowserToolAvailable({
        tenantStatus: "enabled",
        rolloutEnabled: true,
        browserPaused: true,
      })
    );
  });

  it("returns false when rollout disabled", () => {
    assert.ok(
      !isBrowserToolAvailable({
        tenantStatus: "enabled",
        rolloutEnabled: false,
        browserPaused: false,
      })
    );
  });

  it("returns false when tenant status is disabled", () => {
    assert.ok(
      !isBrowserToolAvailable({
        tenantStatus: "disabled",
        rolloutEnabled: true,
        browserPaused: false,
      })
    );
  });

  it("returns false when tenant status is undefined", () => {
    assert.ok(
      !isBrowserToolAvailable({
        tenantStatus: undefined,
        rolloutEnabled: true,
        browserPaused: false,
      })
    );
  });

  it("pause takes precedence over everything", () => {
    assert.ok(
      !isBrowserToolAvailable({
        tenantStatus: "enabled",
        rolloutEnabled: true,
        browserPaused: true,
      })
    );
  });
});
