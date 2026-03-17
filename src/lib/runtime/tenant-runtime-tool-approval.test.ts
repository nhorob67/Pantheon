import assert from "node:assert/strict";
import test from "node:test";
import { resolveTenantToolApprovalRequirement } from "./tenant-runtime-tool-approval.ts";

test("mutating tools always require approval with at least admin-level approver", () => {
  const decision = resolveTenantToolApprovalRequirement({
    toolKey: "tenant_memory_write",
    actorRole: "owner",
    riskLevel: "low",
    approvalMode: "none",
  });

  assert.equal(decision.decision, "requires_approval");
  assert.equal(decision.reason, "mutating_tool_approval_required");
  assert.equal(decision.requiredRole, "admin");
});

test("approval_mode always requires approval even for admin actors", () => {
  const decision = resolveTenantToolApprovalRequirement({
    toolKey: "echo",
    actorRole: "admin",
    riskLevel: "low",
    approvalMode: "always",
  });

  assert.equal(decision.decision, "requires_approval");
  assert.equal(decision.reason, "policy_approval_required");
  assert.equal(decision.requiredRole, "admin");
});

test("high-risk tools remain approval-gated for low-privilege actors", () => {
  const viewerDecision = resolveTenantToolApprovalRequirement({
    toolKey: "hash",
    actorRole: "viewer",
    riskLevel: "high",
    approvalMode: "none",
  });
  assert.equal(viewerDecision.decision, "requires_approval");
  assert.equal(viewerDecision.reason, "risk_approval_required");
  assert.equal(viewerDecision.requiredRole, "admin");

  const adminDecision = resolveTenantToolApprovalRequirement({
    toolKey: "hash",
    actorRole: "admin",
    riskLevel: "high",
    approvalMode: "none",
  });
  assert.equal(adminDecision.decision, "requires_approval");
  assert.equal(adminDecision.reason, "risk_approval_required");
});

test("browser and delegation tools use custom approval handling instead of blanket risk gating", () => {
  const browserDecision = resolveTenantToolApprovalRequirement({
    toolKey: "browser_navigate",
    actorRole: "operator",
    riskLevel: "high",
    approvalMode: "none",
  });
  assert.equal(browserDecision.decision, "allowed");
  assert.equal(browserDecision.reason, "policy_allowed");

  const delegationDecision = resolveTenantToolApprovalRequirement({
    toolKey: "delegate_task",
    actorRole: "operator",
    riskLevel: "high",
    approvalMode: "none",
  });
  assert.equal(delegationDecision.decision, "allowed");
  assert.equal(delegationDecision.reason, "policy_allowed");
});
