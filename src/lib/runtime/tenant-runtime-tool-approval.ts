import {
  hasMinimumTenantRole,
  type TenantRole,
} from "./tenant-role-policy.ts";
import { isMutatingRuntimeTool } from "./tenant-runtime-mutating-tools.ts";

export interface TenantToolApprovalRequirementInput {
  toolKey: string;
  actorRole: TenantRole;
  riskLevel: string;
  approvalMode: string;
}

export interface TenantToolApprovalRequirement {
  decision: "allowed" | "requires_approval";
  reason:
    | "policy_allowed"
    | "policy_approval_required"
    | "risk_approval_required"
    | "mutating_tool_approval_required";
  requiredRole: TenantRole;
}

function approvalModeToRole(value: string): TenantRole {
  switch (value) {
    case "owner":
      return "owner";
    case "admin":
      return "admin";
    case "operator":
      return "operator";
    case "always":
      return "admin";
    case "none":
    default:
      return "viewer";
  }
}

function normalizeRequiredRoleForMutatingTools(role: TenantRole): TenantRole {
  if (role === "viewer" || role === "operator") {
    return "admin";
  }
  return role;
}

export function resolveTenantToolApprovalRequirement(
  input: TenantToolApprovalRequirementInput
): TenantToolApprovalRequirement {
  const mutatingTool = isMutatingRuntimeTool(input.toolKey);
  const explicitApprovalMode = input.approvalMode || "none";
  const riskRequiresApproval =
    input.riskLevel === "high" || input.riskLevel === "critical";

  let requiredRole = approvalModeToRole(explicitApprovalMode);
  if (mutatingTool) {
    requiredRole = normalizeRequiredRoleForMutatingTools(requiredRole);
  }

  if (explicitApprovalMode === "always") {
    return {
      decision: "requires_approval",
      reason: "policy_approval_required",
      requiredRole,
    };
  }

  if (mutatingTool) {
    return {
      decision: "requires_approval",
      reason: "mutating_tool_approval_required",
      requiredRole,
    };
  }

  if (riskRequiresApproval) {
    const riskRequiredRole = normalizeRequiredRoleForMutatingTools(requiredRole);
    return {
      decision: "requires_approval",
      reason: "risk_approval_required",
      requiredRole: riskRequiredRole,
    };
  }

  if (
    explicitApprovalMode !== "none" &&
    !hasMinimumTenantRole(input.actorRole, requiredRole)
  ) {
    return {
      decision: "requires_approval",
      reason: "policy_approval_required",
      requiredRole,
    };
  }

  return {
    decision: "allowed",
    reason: "policy_allowed",
    requiredRole,
  };
}
