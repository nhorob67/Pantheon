import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HeartbeatTriggerMode } from "@/types/heartbeat";
import type { TenantRole } from "@/types/tenant-runtime";

export interface HeartbeatApprovalIssueContext {
  fingerprint: string;
  attention_type: string;
  signal_type: string;
  severity: number;
  state: string;
  summary: string | null;
  first_seen_at: string;
  last_notified_at: string | null;
  snoozed_until: string | null;
}

export interface HeartbeatApprovalRequestPayload {
  kind: "heartbeat_alert";
  heartbeat_run_id: string;
  config_id: string;
  tenant_id: string;
  customer_id: string;
  agent_id: string | null;
  delivery_channel_id: string | null;
  approval_reason: string;
  signal_summaries: string[];
  signal_data: Record<string, unknown>;
  issue_contexts: HeartbeatApprovalIssueContext[];
  request_trace_id: string | null;
}

export function isLiveHeartbeatTriggerMode(mode: HeartbeatTriggerMode): boolean {
  return mode === "scheduled" || mode === "manual_run";
}

function isUrgentWeatherIssue(issue: Pick<HeartbeatApprovalIssueContext, "signal_type" | "severity">): boolean {
  return issue.signal_type === "weather_severe" && issue.severity >= 4;
}

export function shouldRequireHeartbeatApproval(input: {
  triggerMode: HeartbeatTriggerMode;
  issueContexts: HeartbeatApprovalIssueContext[];
}): boolean {
  if (!isLiveHeartbeatTriggerMode(input.triggerMode)) {
    return false;
  }

  const hasCustomChecks = input.issueContexts.some((issue) => issue.signal_type === "custom_checks");
  const hasUrgentWeather = input.issueContexts.some(isUrgentWeatherIssue);

  return hasCustomChecks && !hasUrgentWeather;
}

export function isHeartbeatApprovalPayload(value: unknown): value is HeartbeatApprovalRequestPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    payload.kind === "heartbeat_alert"
    && typeof payload.heartbeat_run_id === "string"
    && typeof payload.config_id === "string"
    && typeof payload.tenant_id === "string"
    && typeof payload.customer_id === "string"
  );
}

export async function enqueueHeartbeatApproval(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    customerId: string;
    requiredRole?: TenantRole;
    payload: HeartbeatApprovalRequestPayload;
  }
): Promise<{ approvalId: string }> {
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        kind: input.payload.kind,
        heartbeat_run_id: input.payload.heartbeat_run_id,
        approval_reason: input.payload.approval_reason,
      })
    )
    .digest("hex");

  const { data, error } = await admin
    .from("tenant_approvals")
    .insert({
      tenant_id: input.tenantId,
      customer_id: input.customerId,
      approval_type: "policy",
      status: "pending",
      required_role: input.requiredRole ?? "operator",
      request_hash: requestHash,
      request_payload: input.payload,
      decision_payload: {},
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (error && (error as { code?: string }).code === "23505") {
    const { data: existing, error: existingError } = await admin
      .from("tenant_approvals")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .eq("request_hash", requestHash)
      .maybeSingle();

    if (existingError || !existing) {
      throw new Error(existingError?.message || "Failed to resolve duplicate heartbeat approval");
    }

    return { approvalId: String((existing as { id: string }).id) };
  }

  if (error || !data) {
    throw new Error(error?.message || "Failed to enqueue heartbeat approval");
  }

  return { approvalId: String((data as { id: string }).id) };
}
