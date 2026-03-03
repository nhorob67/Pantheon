import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { loadCustomerExtensionTrustPolicy } from "@/lib/extensions/trust-policy";
import { type TenantRole } from "./tenant-role-policy";
import { resolveTenantRuntimeGateState } from "./tenant-runtime-gates";
import {
  evaluateTenantToolTrustDecision,
  resolveTenantToolTrustContext,
} from "./tenant-tool-trust";
import { isMutatingRuntimeTool } from "./tenant-runtime-mutating-tools";
import { resolveTenantToolApprovalRequirement } from "./tenant-runtime-tool-approval";

export interface TenantToolPolicyDecisionInput {
  tenantId: string;
  customerId: string;
  toolKey: string;
  actorRole: TenantRole;
}

export interface TenantToolPolicyDecision {
  decision: "allowed" | "denied" | "requires_approval";
  reason: string;
  toolId: string | null;
  requiredRole: TenantRole;
  timeoutMs: number;
}

interface TenantToolWithPolicyRow {
  id: string;
  status: string;
  risk_level: string;
  metadata: unknown;
  tenant_tool_policies:
    | {
      approval_mode: string;
      allow_roles: string[];
      timeout_ms: number;
    }
    | Array<{
      approval_mode: string;
      allow_roles: string[];
      timeout_ms: number;
    }>
    | null;
}

function normalizePolicy(
  value: TenantToolWithPolicyRow["tenant_tool_policies"]
): { approval_mode: string; allow_roles: string[]; timeout_ms: number } | null {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return value[0] || null;
  }
  return value;
}

function toTenantRole(value: string): TenantRole | null {
  if (value === "owner" || value === "admin" || value === "operator" || value === "viewer") {
    return value;
  }
  return null;
}

export async function evaluateTenantToolPolicy(
  admin: SupabaseClient,
  input: TenantToolPolicyDecisionInput
): Promise<TenantToolPolicyDecision> {
  const gates = await resolveTenantRuntimeGateState(admin, input.customerId);
  if (gates.tool_execution_paused) {
    return {
      decision: "denied",
      reason: "tool_execution_paused",
      toolId: null,
      requiredRole: "admin",
      timeoutMs: 1000,
    };
  }

  if (gates.memory_writes_paused && isMutatingRuntimeTool(input.toolKey)) {
    return {
      decision: "denied",
      reason: "memory_writes_paused",
      toolId: null,
      requiredRole: "admin",
      timeoutMs: 1000,
    };
  }

  const { data, error } = await admin
    .from("tenant_tools")
    .select(
      "id, status, risk_level, metadata, tenant_tool_policies(approval_mode, allow_roles, timeout_ms)"
    )
    .eq("tenant_id", input.tenantId)
    .eq("tool_key", input.toolKey)
    .maybeSingle();

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to evaluate tenant tool policy"));
  }

  if (!data) {
    return {
      decision: "denied",
      reason: "tool_not_registered",
      toolId: null,
      requiredRole: "admin",
      timeoutMs: 1000,
    };
  }

  const tool = data as unknown as TenantToolWithPolicyRow;
  if (tool.status !== "enabled") {
    return {
      decision: "denied",
      reason: "tool_disabled",
      toolId: tool.id,
      requiredRole: "admin",
      timeoutMs: 1000,
    };
  }

  const policy = normalizePolicy(tool.tenant_tool_policies);
  const allowRoles = (policy?.allow_roles || ["owner", "admin", "operator", "viewer"])
    .map(toTenantRole)
    .filter((value): value is TenantRole => Boolean(value));

  if (allowRoles.length > 0 && !allowRoles.includes(input.actorRole)) {
    return {
      decision: "denied",
      reason: "actor_role_not_allowed",
      toolId: tool.id,
      requiredRole: "admin",
      timeoutMs: policy?.timeout_ms || 30000,
    };
  }

  const trustContext = resolveTenantToolTrustContext(input.toolKey, tool.metadata);
  if (trustContext) {
    const trustPolicy = await loadCustomerExtensionTrustPolicy(admin, input.customerId);
    const trustDecision = evaluateTenantToolTrustDecision(trustContext, trustPolicy);
    if (!trustDecision.allowed) {
      return {
        decision: "denied",
        reason: "trust_policy_blocked",
        toolId: tool.id,
        requiredRole: "admin",
        timeoutMs: policy?.timeout_ms || 30000,
      };
    }
  }

  const approval = resolveTenantToolApprovalRequirement({
    toolKey: input.toolKey,
    actorRole: input.actorRole,
    riskLevel: tool.risk_level,
    approvalMode: policy?.approval_mode || "none",
  });

  return {
    decision: approval.decision,
    reason: approval.reason,
    toolId: tool.id,
    requiredRole: approval.requiredRole,
    timeoutMs: policy?.timeout_ms || 30000,
  };
}
