import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateTenantToolTrustDecision,
  resolveTenantToolTrustContext,
} from "./tenant-tool-trust.ts";

test("resolveTenantToolTrustContext returns null for missing metadata", () => {
  assert.equal(resolveTenantToolTrustContext("tool.echo", null), null);
  assert.equal(resolveTenantToolTrustContext("tool.echo", {}), null);
});

test("resolveTenantToolTrustContext normalizes valid source type and slug", () => {
  const context = resolveTenantToolTrustContext("tool.echo", {
    source_type: "NPM",
    verified: true,
    slug: "my-tool",
  });

  assert.deepEqual(context, {
    source_type: "npm",
    verified: true,
    slug: "my-tool",
  });
});

test("evaluateTenantToolTrustDecision blocks unverified npm tool when policy requires verification", () => {
  const context = resolveTenantToolTrustContext("pkg-tool", {
    source_type: "npm",
    verified: false,
    slug: "pkg-tool",
  });
  assert.ok(context);

  const decision = evaluateTenantToolTrustDecision(context, {
    allowed_source_types: ["local", "npm", "git", "clawhub", "internal"],
    require_verified_source_types: ["npm", "git", "clawhub"],
  });

  assert.equal(decision.allowed, false);
});

test("evaluateTenantToolTrustDecision allows verified npm tool when policy allows it", () => {
  const context = resolveTenantToolTrustContext("pkg-tool", {
    source_type: "npm",
    verified: true,
    slug: "pkg-tool",
  });
  assert.ok(context);

  const decision = evaluateTenantToolTrustDecision(context, {
    allowed_source_types: ["local", "npm", "git", "clawhub", "internal"],
    require_verified_source_types: ["npm", "git", "clawhub"],
  });

  assert.equal(decision.allowed, true);
});
