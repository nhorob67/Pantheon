import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BROWSER_POLICY } from "../../types/browser.ts";

describe("DEFAULT_BROWSER_POLICY", () => {
  it("has sensible defaults", () => {
    assert.deepEqual(DEFAULT_BROWSER_POLICY.domainAllowlist, []);
    assert.deepEqual(DEFAULT_BROWSER_POLICY.domainBlocklist, []);
    assert.deepEqual(DEFAULT_BROWSER_POLICY.requireApprovalActions, []);
    assert.equal(DEFAULT_BROWSER_POLICY.maxSessionsPerDay, 10);
    assert.equal(DEFAULT_BROWSER_POLICY.maxActionsPerSession, 25);
    assert.equal(DEFAULT_BROWSER_POLICY.maxSessionDurationMs, 120_000);
  });

  it("is frozen", () => {
    const copy = { ...DEFAULT_BROWSER_POLICY };
    assert.equal(copy.maxSessionsPerDay, 10);
    assert.equal(copy.maxActionsPerSession, 25);
  });
});
