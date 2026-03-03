import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { auditLog } from "@/lib/security/audit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import type { TenantRuntimeRun, TenantRole } from "@/types/tenant-runtime";
import { runWithCircuitBreaker } from "./tenant-runtime-circuit-breaker";
import {
  executeRuntimeMutatingTool,
  isMutatingRuntimeTool,
} from "./tenant-runtime-mutating-tools";
import {
  executeRuntimeQueryTool,
  isQueryRuntimeTool,
} from "./tenant-runtime-query-tools";
import { evaluateTenantToolPolicy } from "./tenant-runtime-policy";
import { executeRuntimeSafeTool } from "./tenant-runtime-safe-tools";

interface ToolRequest {
  toolKey: string;
  args: Record<string, unknown>;
}

interface ToolExecutionResult {
  output: Record<string, unknown>;
}

interface TenantToolInvocationRow {
  id: string;
  tool_key: string;
  status: "pending" | "approved" | "rejected" | "completed" | "failed";
  request_payload: Record<string, unknown>;
  result_payload: Record<string, unknown>;
  continuation_token: string | null;
}

export interface TenantToolInvocationOutcome {
  outcome: "completed" | "failed" | "awaiting_approval";
  result: Record<string, unknown>;
  errorMessage?: string;
}

interface ToolContinuationTokenPayload {
  invocation_id: string;
  token: string;
}

const TOOL_EXECUTION_CIRCUIT_FAILURE_THRESHOLD = 3;
const TOOL_EXECUTION_CIRCUIT_COOLDOWN_MS = 15_000;

async function executeToolWithCircuitBreaker(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  toolKey: string,
  args: Record<string, unknown>
): Promise<ToolExecutionResult> {
  return runWithCircuitBreaker(
    `tool_execution:${run.tenant_id}:${toolKey}`,
    () => executeTool(admin, run, toolKey, args),
    {
      failureThreshold: TOOL_EXECUTION_CIRCUIT_FAILURE_THRESHOLD,
      cooldownMs: TOOL_EXECUTION_CIRCUIT_COOLDOWN_MS,
    }
  );
}

function extractJsonObject(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // noop
  }
  return {};
}

export function parseToolRequestFromContent(content: string): ToolRequest | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("/tool ")) {
    return null;
  }

  const body = trimmed.slice(6).trim();
  if (!body) {
    return null;
  }

  const firstSpace = body.indexOf(" ");
  if (firstSpace < 0) {
    return {
      toolKey: body,
      args: {},
    };
  }

  const toolKey = body.slice(0, firstSpace).trim();
  const argRaw = body.slice(firstSpace + 1).trim();
  return {
    toolKey,
    args: extractJsonObject(argRaw),
  };
}

async function insertToolInvocation(
  admin: SupabaseClient,
  input: {
    run: TenantRuntimeRun;
    toolId: string | null;
    toolKey: string;
    policyDecision: "allowed" | "denied" | "requires_approval";
    status: "pending" | "approved" | "rejected" | "completed" | "failed";
    requestPayload: Record<string, unknown>;
    resultPayload?: Record<string, unknown>;
    errorMessage?: string | null;
    continuationToken?: string | null;
  }
): Promise<TenantToolInvocationRow> {
  const { data, error } = await admin
    .from("tenant_tool_invocations")
    .insert({
      tenant_id: input.run.tenant_id,
      customer_id: input.run.customer_id,
      run_id: input.run.id,
      tool_id: input.toolId,
      tool_key: input.toolKey,
      policy_decision: input.policyDecision,
      status: input.status,
      request_payload: input.requestPayload,
      result_payload: input.resultPayload || {},
      continuation_token: input.continuationToken || null,
      error_message: input.errorMessage || null,
      started_at: new Date().toISOString(),
      completed_at:
        input.status === "completed" || input.status === "failed" || input.status === "rejected"
          ? new Date().toISOString()
          : null,
    })
    .select("id, tool_key, status, request_payload, result_payload, continuation_token")
    .single();

  if (error || !data) {
    throw new Error(safeErrorMessage(error, "Failed to record tenant tool invocation"));
  }

  return data as unknown as TenantToolInvocationRow;
}

async function enqueueApproval(
  admin: SupabaseClient,
  input: {
    run: TenantRuntimeRun;
    toolId: string | null;
    toolKey: string;
    requiredRole: TenantRole;
    requestPayload: Record<string, unknown>;
    invocationId: string;
    continuationToken: string | null;
  }
): Promise<{ approvalId: string }> {
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        tenant_id: input.run.tenant_id,
        run_id: input.run.id,
        tool_key: input.toolKey,
        request_payload: input.requestPayload,
      })
    )
    .digest("hex");

  const { data, error } = await admin
    .from("tenant_approvals")
    .insert({
      tenant_id: input.run.tenant_id,
      customer_id: input.run.customer_id,
      approval_type: "tool",
      status: "pending",
      required_role: input.requiredRole,
      tool_id: input.toolId,
      request_hash: requestHash,
      request_payload: {
        ...input.requestPayload,
        run_id: input.run.id,
        invocation_id: input.invocationId,
        continuation_token: input.continuationToken,
        tool_key: input.toolKey,
      },
      decision_payload: {},
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(safeErrorMessage(error, "Failed to enqueue tenant tool approval"));
  }

  return { approvalId: String((data as { id: string }).id) };
}

async function executeTool(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  toolKey: string,
  args: Record<string, unknown>
): Promise<ToolExecutionResult> {
  if (isMutatingRuntimeTool(toolKey)) {
    return executeRuntimeMutatingTool(admin, {
      run,
      toolKey,
      args,
    });
  }
  if (isQueryRuntimeTool(toolKey)) {
    return executeRuntimeQueryTool(admin, {
      run,
      toolKey,
      args,
    });
  }
  return executeRuntimeSafeTool(toolKey, args);
}

function readArgsFromRequestPayload(
  value: Record<string, unknown>
): Record<string, unknown> {
  const args = value.args;
  if (typeof args === "object" && args !== null && !Array.isArray(args)) {
    return args as Record<string, unknown>;
  }
  return {};
}

export function encodeToolContinuationToken(payload: ToolContinuationTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeToolContinuationToken(
  token: string
): ToolContinuationTokenPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { invocation_id?: unknown }).invocation_id === "string" &&
      typeof (parsed as { token?: unknown }).token === "string"
    ) {
      return {
        invocation_id: (parsed as { invocation_id: string }).invocation_id,
        token: (parsed as { token: string }).token,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function resumeTenantToolInvocationWithToken(
  admin: SupabaseClient,
  input: {
    run: TenantRuntimeRun;
    continuationToken: string;
    actorId: string | null;
  }
): Promise<TenantToolInvocationOutcome> {
  const decoded = decodeToolContinuationToken(input.continuationToken);
  if (!decoded) {
    return {
      outcome: "failed",
      errorMessage: "Invalid tool continuation token",
      result: {
        policy_decision: "requires_approval",
        continuation_token_valid: false,
      },
    };
  }

  const { data, error } = await admin
    .from("tenant_tool_invocations")
    .select("id, tool_key, status, request_payload, result_payload, continuation_token")
    .eq("id", decoded.invocation_id)
    .eq("tenant_id", input.run.tenant_id)
    .maybeSingle();
  if (error || !data) {
    return {
      outcome: "failed",
      errorMessage: safeErrorMessage(error, "Tool continuation invocation not found"),
      result: {
        invocation_id: decoded.invocation_id,
      },
    };
  }

  const invocation = data as unknown as TenantToolInvocationRow;
  if (!invocation.continuation_token || invocation.continuation_token !== decoded.token) {
    return {
      outcome: "failed",
      errorMessage: "Continuation token mismatch",
      result: {
        invocation_id: invocation.id,
      },
    };
  }

  if (invocation.status === "completed") {
    return {
      outcome: "completed",
      result: {
        tool_key: invocation.tool_key,
        invocation_id: invocation.id,
        policy_decision: "requires_approval",
        tool_output: invocation.result_payload,
        resumed_from_token: true,
        replayed_result: true,
      },
    };
  }

  if (invocation.status !== "approved") {
    return {
      outcome: "failed",
      errorMessage: "Tool invocation is not approved for resume",
      result: {
        invocation_id: invocation.id,
        invocation_status: invocation.status,
      },
    };
  }

  try {
    const executed = await executeToolWithCircuitBreaker(
      admin,
      input.run,
      invocation.tool_key,
      readArgsFromRequestPayload(invocation.request_payload)
    );
    const { error: updateError } = await admin
      .from("tenant_tool_invocations")
      .update({
        status: "completed",
        result_payload: executed.output,
        completed_at: new Date().toISOString(),
      })
      .eq("id", invocation.id);

    if (updateError) {
      throw new Error(safeErrorMessage(updateError, "Failed to update resumed tool invocation"));
    }

    auditLog({
      action: "tenant.tool.invocation.resumed",
      actor: input.actorId || "runtime",
      resource_type: "tenant_tool_invocation",
      resource_id: invocation.id,
      details: {
        run_id: input.run.id,
        tool_key: invocation.tool_key,
      },
    });

    return {
      outcome: "completed",
      result: {
        tool_key: invocation.tool_key,
        invocation_id: invocation.id,
        policy_decision: "requires_approval",
        tool_output: executed.output,
        resumed_from_token: true,
      },
    };
  } catch (error) {
    const { error: updateError } = await admin
      .from("tenant_tool_invocations")
      .update({
        status: "failed",
        error_message: safeErrorMessage(error, "Resumed tool execution failed"),
        completed_at: new Date().toISOString(),
      })
      .eq("id", invocation.id);
    if (updateError) {
      throw new Error(safeErrorMessage(updateError, "Failed to record resumed tool failure"));
    }

    return {
      outcome: "failed",
      errorMessage: safeErrorMessage(error, "Resumed tool execution failed"),
      result: {
        tool_key: invocation.tool_key,
        invocation_id: invocation.id,
      },
    };
  }
}

export async function executeTenantToolInvocation(
  admin: SupabaseClient,
  input: {
    run: TenantRuntimeRun;
    toolRequest: ToolRequest;
    actorRole: TenantRole;
    actorId: string | null;
  }
): Promise<TenantToolInvocationOutcome> {
  const policy = await evaluateTenantToolPolicy(admin, {
    tenantId: input.run.tenant_id,
    customerId: input.run.customer_id,
    toolKey: input.toolRequest.toolKey,
    actorRole: input.actorRole,
  });

  const requestPayload = {
    args: input.toolRequest.args,
    actor_role: input.actorRole,
    actor_id: input.actorId,
  };

  if (policy.decision === "denied") {
    await insertToolInvocation(admin, {
      run: input.run,
      toolId: policy.toolId,
      toolKey: input.toolRequest.toolKey,
      policyDecision: "denied",
      status: "rejected",
      requestPayload,
      resultPayload: {
        reason: policy.reason,
      },
      errorMessage: "Tool invocation denied by policy",
    });

    auditLog({
      action: "tenant.tool.invocation.denied",
      actor: input.actorId || "runtime",
      resource_type: "tenant_tool",
      resource_id: `${input.run.tenant_id}:${input.toolRequest.toolKey}`,
      details: {
        run_id: input.run.id,
        reason: policy.reason,
      },
    });

    return {
      outcome: "failed",
      errorMessage: "Tool invocation denied by tenant policy",
      result: {
        tool_key: input.toolRequest.toolKey,
        policy_decision: "denied",
        reason: policy.reason,
      },
    };
  }

  if (policy.decision === "requires_approval") {
    const continuationToken = randomUUID();
    const invocation = await insertToolInvocation(admin, {
      run: input.run,
      toolId: policy.toolId,
      toolKey: input.toolRequest.toolKey,
      policyDecision: "requires_approval",
      status: "pending",
      requestPayload,
      resultPayload: {
        reason: policy.reason,
      },
      continuationToken,
    });

    const approval = await enqueueApproval(admin, {
      run: input.run,
      toolId: policy.toolId,
      toolKey: input.toolRequest.toolKey,
      requiredRole: policy.requiredRole,
      requestPayload,
      invocationId: invocation.id,
      continuationToken: invocation.continuation_token,
    });

    auditLog({
      action: "tenant.tool.invocation.approval_requested",
      actor: input.actorId || "runtime",
      resource_type: "tenant_approval",
      resource_id: approval.approvalId,
      details: {
        run_id: input.run.id,
        tool_key: input.toolRequest.toolKey,
        required_role: policy.requiredRole,
      },
    });

    return {
      outcome: "awaiting_approval",
      result: {
        tool_key: input.toolRequest.toolKey,
        approval_id: approval.approvalId,
        invocation_id: invocation.id,
        continuation_token: encodeToolContinuationToken({
          invocation_id: invocation.id,
          token: continuationToken,
        }),
        policy_decision: "requires_approval",
      },
    };
  }

  const invocation = await insertToolInvocation(admin, {
    run: input.run,
    toolId: policy.toolId,
    toolKey: input.toolRequest.toolKey,
    policyDecision: "allowed",
    status: "approved",
    requestPayload,
  });

  try {
    const executed = await executeToolWithCircuitBreaker(
      admin,
      input.run,
      input.toolRequest.toolKey,
      input.toolRequest.args
    );
    const { error: updateError } = await admin
      .from("tenant_tool_invocations")
      .update({
        status: "completed",
        result_payload: executed.output,
        completed_at: new Date().toISOString(),
      })
      .eq("id", invocation.id);

    if (updateError) {
      throw new Error(safeErrorMessage(updateError, "Failed to update tool invocation"));
    }

    auditLog({
      action: "tenant.tool.invocation.completed",
      actor: input.actorId || "runtime",
      resource_type: "tenant_tool_invocation",
      resource_id: invocation.id,
      details: {
        run_id: input.run.id,
        tool_key: input.toolRequest.toolKey,
      },
    });

    return {
      outcome: "completed",
      result: {
        tool_key: input.toolRequest.toolKey,
        invocation_id: invocation.id,
        policy_decision: "allowed",
        tool_output: executed.output,
      },
    };
  } catch (error) {
    const { error: updateError } = await admin
      .from("tenant_tool_invocations")
      .update({
        status: "failed",
        error_message: safeErrorMessage(error, "Tool execution failed"),
        completed_at: new Date().toISOString(),
      })
      .eq("id", invocation.id);

    if (updateError) {
      throw new Error(safeErrorMessage(updateError, "Failed to record tool failure"));
    }

    auditLog({
      action: "tenant.tool.invocation.failed",
      actor: input.actorId || "runtime",
      resource_type: "tenant_tool_invocation",
      resource_id: invocation.id,
      details: {
        run_id: input.run.id,
        tool_key: input.toolRequest.toolKey,
      },
    });

    return {
      outcome: "failed",
      errorMessage: safeErrorMessage(error, "Tool execution failed"),
      result: {
        tool_key: input.toolRequest.toolKey,
        invocation_id: invocation.id,
        policy_decision: "allowed",
      },
    };
  }
}
