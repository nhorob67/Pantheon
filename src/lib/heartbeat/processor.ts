import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueDiscordRuntimeRun } from "@/lib/runtime/tenant-runtime-queue";
import { floorDateToUtcMinute } from "@/lib/workflows/scheduler";
import { runCheapChecks } from "./cheap-checks";
import type { HeartbeatExecutionConfig } from "./effective-configs";
import {
  applyHeartbeatIssuePlan,
  buildHeartbeatIssuePlan,
  decideHeartbeatIssueDelivery,
  fetchActiveHeartbeatIssues,
} from "./issues";
import {
  computeHeartbeatNextRunAt,
  isWithinHeartbeatActiveHours,
} from "./schedule";
import {
  buildHeartbeatPreviewText,
  collectHeartbeatAlertSignals,
} from "./signals";
import { evaluateHeartbeatSourceGuardrails } from "./guardrails";
import {
  enqueueHeartbeatApproval,
  shouldRequireHeartbeatApproval,
  type HeartbeatApprovalIssueContext,
  type HeartbeatApprovalRequestPayload,
} from "./approvals";
import {
  asPlainObject,
  buildHeartbeatDecisionTrace,
  buildHeartbeatFreshnessMetadata,
} from "./observability";
import type {
  HeartbeatChecks,
  HeartbeatConfig,
  HeartbeatDeliveryStatus,
  HeartbeatRun,
  HeartbeatTriggerMode,
} from "@/types/heartbeat";

const DEFAULT_CHECKS: HeartbeatChecks = {
  unanswered_emails: true,
  unanswered_emails_threshold_hours: 2,
};

const DEFAULT_COOLDOWN_MINUTES = 120;
const DEFAULT_MAX_ALERTS_PER_DAY = 6;
const DEFAULT_DIGEST_WINDOW_MINUTES = 120;
const DEFAULT_REMINDER_INTERVAL_MINUTES = 1440;

export interface HeartbeatConfigRow {
  id: string;
  tenant_id: string;
  customer_id: string;
  agent_id: string | null;
  enabled: boolean;
  interval_minutes: number;
  timezone: string;
  active_hours_start: string;
  active_hours_end: string;
  checks: unknown;
  custom_checks: string[] | null;
  delivery_channel_id: string | null;
  cooldown_minutes: number | null;
  max_alerts_per_day: number | null;
  digest_enabled: boolean | null;
  digest_window_minutes: number | null;
  reminder_interval_minutes: number | null;
  heartbeat_instructions: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
}

export interface ResolvedHeartbeatConfig
  extends Omit<HeartbeatExecutionConfig, "effective_scope">,
    Omit<HeartbeatConfig, "created_at" | "updated_at"> {
  created_at?: string;
  updated_at?: string;
  effective_scope: "all_checks" | "tenant_scoped_only" | "agent_scoped_only";
}

export interface HeartbeatExecutionInput {
  admin: SupabaseClient;
  config: ResolvedHeartbeatConfig;
  triggerMode: HeartbeatTriggerMode;
  now?: Date;
  requestTraceId?: string;
  previewOnly?: boolean;
  respectActiveHours?: boolean;
  updateSchedule?: boolean;
}

export interface HeartbeatExecutionResult {
  status:
    | "completed"
    | "duplicate_slot"
    | "outside_active_hours"
    | "shadowed_by_agent_override";
  configId: string;
  heartbeatRunId?: string;
  runtimeRunId?: string;
  hadSignal?: boolean;
  deliveryStatus?: HeartbeatDeliveryStatus;
  suppressedReason?: string | null;
  nextRunAt?: string | null;
  previewText?: string;
}

export interface HeartbeatDispatchIssueContext {
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

export interface QueueHeartbeatDeliveryInput {
  admin: SupabaseClient;
  config: ResolvedHeartbeatConfig;
  heartbeatRunId: string;
  requestTraceId?: string;
  now: Date;
  signalSummaries: string[];
  signalData: Record<string, unknown>;
  issueContexts?: HeartbeatDispatchIssueContext[];
  testMode?: boolean;
}

export interface HeartbeatApprovalRef {
  approval_id: string;
  approval_reason: string;
  required_role: string;
  created_at: string;
}

interface InsertedHeartbeatRunId {
  id: string;
}

interface ActiveTenantRuntimeRow {
  run_kind: string;
  status: string;
}

function parseChecks(raw: unknown): HeartbeatChecks {
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    return {
      unanswered_emails: obj.unanswered_emails === true,
      unanswered_emails_threshold_hours:
        typeof obj.unanswered_emails_threshold_hours === "number"
          ? obj.unanswered_emails_threshold_hours
          : DEFAULT_CHECKS.unanswered_emails_threshold_hours,
    };
  }

  return DEFAULT_CHECKS;
}

export function resolveHeartbeatConfig(raw: HeartbeatConfigRow): ResolvedHeartbeatConfig {
  return {
    id: raw.id,
    tenant_id: raw.tenant_id,
    customer_id: raw.customer_id,
    agent_id: raw.agent_id,
    enabled: raw.enabled,
    interval_minutes: raw.interval_minutes,
    timezone: raw.timezone,
    active_hours_start: raw.active_hours_start,
    active_hours_end: raw.active_hours_end,
    checks: parseChecks(raw.checks),
    custom_checks: raw.custom_checks || [],
    delivery_channel_id: raw.delivery_channel_id,
    cooldown_minutes: raw.cooldown_minutes ?? DEFAULT_COOLDOWN_MINUTES,
    max_alerts_per_day: raw.max_alerts_per_day ?? DEFAULT_MAX_ALERTS_PER_DAY,
    digest_enabled: raw.digest_enabled ?? false,
    digest_window_minutes:
      raw.digest_window_minutes ?? DEFAULT_DIGEST_WINDOW_MINUTES,
    reminder_interval_minutes:
      raw.reminder_interval_minutes ?? DEFAULT_REMINDER_INTERVAL_MINUTES,
    heartbeat_instructions: raw.heartbeat_instructions ?? "",
    last_run_at: raw.last_run_at,
    next_run_at: raw.next_run_at,
    effective_scope: raw.agent_id ? "agent_scoped_only" : "all_checks",
  };
}

async function fetchRecentDeliveries(
  admin: SupabaseClient,
  configId: string,
  now: Date,
): Promise<number> {
  const since = new Date(
    now.getTime() - 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await admin
    .from("tenant_heartbeat_runs")
    .select("id")
    .eq("config_id", configId)
    .eq("delivery_attempted", true)
    .in("delivery_status", ["queued", "dispatched"])
    .gte("created_at", since)
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).length;
}

function summarizeBusyRuntimeReason(rows: ActiveTenantRuntimeRow[]): string | null {
  if (rows.some((row) => row.status === "awaiting_approval")) {
    return "busy_runtime_awaiting_approval";
  }

  if (rows.some((row) => row.status === "running")) {
    return "busy_runtime_running";
  }

  return null;
}

async function fetchBusyRuntimeReason(
  admin: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .select("run_kind, status")
    .eq("tenant_id", tenantId)
    .in("run_kind", ["discord_runtime", "email_runtime"])
    .in("status", ["running", "awaiting_approval"])
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  return summarizeBusyRuntimeReason((data || []) as ActiveTenantRuntimeRow[]);
}

async function updateHeartbeatSchedule(
  admin: SupabaseClient,
  configId: string,
  now: Date,
  intervalMinutes: number
): Promise<string> {
  const nextRunAt = computeHeartbeatNextRunAt(intervalMinutes, now);
  await admin
    .from("tenant_heartbeat_configs")
    .update({
      last_run_at: now.toISOString(),
      next_run_at: nextRunAt,
    })
    .eq("id", configId);

  return nextRunAt;
}

async function insertHeartbeatRun(
  admin: SupabaseClient,
  payload: Partial<HeartbeatRun> & {
    config_id: string;
    tenant_id: string;
    ran_at: string;
  }
): Promise<string | null> {
  const { data, error } = await admin
    .from("tenant_heartbeat_runs")
    .insert(payload)
    .select("id")
    .single();

  if (error && (error as { code?: string }).code === "23505") {
    return null;
  }

  if (error) {
    throw new Error(error.message);
  }

  return (data as InsertedHeartbeatRunId | null)?.id ?? null;
}

async function updateHeartbeatRunRuntimeLink(
  admin: SupabaseClient,
  heartbeatRunId: string,
  runtimeRunId: string
): Promise<void> {
  await admin
    .from("tenant_heartbeat_runs")
    .update({ runtime_run_id: runtimeRunId })
    .eq("id", heartbeatRunId);
}

async function fetchTeamName(
  admin: SupabaseClient,
  customerId: string
): Promise<string> {
  const { data: profile } = await admin
    .from("team_profiles")
    .select("team_name")
    .eq("customer_id", customerId)
    .maybeSingle();

  return profile?.team_name ?? "the team";
}

export async function queueHeartbeatDelivery(
  input: QueueHeartbeatDeliveryInput
): Promise<string> {
  const teamName = await fetchTeamName(input.admin, input.config.customer_id);
  const run = await enqueueDiscordRuntimeRun(input.admin, {
    runKind: "discord_heartbeat",
    tenantId: input.config.tenant_id,
    customerId: input.config.customer_id,
    requestTraceId: input.requestTraceId ?? crypto.randomUUID(),
    idempotencyKey: input.testMode
      ? `heartbeat-test:${input.heartbeatRunId}`
      : `heartbeat:${input.config.id}:${input.now.toISOString().slice(0, 16)}`,
    payload: {
      channel_id: input.config.delivery_channel_id,
      content: input.testMode
        ? `[heartbeat-test] ${input.config.id}`
        : `[heartbeat] ${input.config.id}`,
      user_id: "system",
      guild_id: null,
      message_id: `${input.testMode ? "heartbeat-test" : "heartbeat"}-${input.config.id}-${Date.now()}`,
      run_kind: "discord_heartbeat",
      signal_summaries: input.signalSummaries,
      signal_data: input.signalData,
      issue_contexts: input.issueContexts ?? [],
      heartbeat_instructions: input.config.heartbeat_instructions,
      heartbeat_run_id: input.heartbeatRunId,
      team_name: teamName,
      test_mode: input.testMode === true,
    },
    metadata: {
      heartbeat_config_id: input.config.id,
      heartbeat_run_id: input.heartbeatRunId,
      test_mode: input.testMode === true,
    },
  });
  await updateHeartbeatRunRuntimeLink(input.admin, input.heartbeatRunId, run.id);
  return run.id;
}

export async function markHeartbeatRunDeliveryStatus(
  admin: SupabaseClient,
  heartbeatRunId: string,
  status: Extract<
    HeartbeatDeliveryStatus,
    | "awaiting_approval"
    | "queued"
    | "dispatched"
    | "dispatch_failed"
    | "suppressed"
    | "deferred"
  >,
  dispatchMetadata?: Record<string, unknown>,
  suppressedReason?: string | null,
  deliveryAttempted?: boolean
): Promise<void> {
  const { data: existingRun } = await admin
    .from("tenant_heartbeat_runs")
    .select("decision_trace, dispatch_metadata")
    .eq("id", heartbeatRunId)
    .maybeSingle();

  const existingDecisionTrace = asPlainObject(existingRun?.decision_trace);
  const existingDispatchMetadata = asPlainObject(existingRun?.dispatch_metadata);

  await admin
    .from("tenant_heartbeat_runs")
    .update({
      delivery_attempted:
        typeof deliveryAttempted === "boolean"
          ? deliveryAttempted
          : status === "queued" || status === "dispatched" || status === "dispatch_failed",
      delivery_status: status,
      suppressed_reason:
        status === "suppressed" || status === "awaiting_approval" || status === "deferred"
          ? (suppressedReason ?? null)
          : null,
      decision_trace: {
        ...existingDecisionTrace,
        delivery_status: status,
        final_state: status,
        final_reason:
          status === "suppressed" || status === "awaiting_approval" || status === "deferred"
            ? (suppressedReason ?? null)
            : null,
        delivery_attempted:
          typeof deliveryAttempted === "boolean"
            ? deliveryAttempted
            : status === "queued" || status === "dispatched" || status === "dispatch_failed",
      },
      dispatch_metadata: dispatchMetadata
        ? {
            ...existingDispatchMetadata,
            ...dispatchMetadata,
          }
        : existingDispatchMetadata,
    })
    .eq("id", heartbeatRunId);
}

function buildHeartbeatDispatchIssueContexts(
  notificationCandidates: Array<{
    attentionType: string;
    issue: {
      fingerprint: string;
      signal_type: string;
      severity: number;
      state: string;
      summary: string | null;
      first_seen_at: string;
      last_notified_at: string | null;
      snoozed_until: string | null;
    };
  }>
): HeartbeatDispatchIssueContext[] {
  return notificationCandidates.map((candidate) => ({
    fingerprint: candidate.issue.fingerprint,
    attention_type: candidate.attentionType,
    signal_type: candidate.issue.signal_type,
    severity: candidate.issue.severity,
    state: candidate.issue.state,
    summary: candidate.issue.summary,
    first_seen_at: candidate.issue.first_seen_at,
    last_notified_at: candidate.issue.last_notified_at,
    snoozed_until: candidate.issue.snoozed_until,
  }));
}

function buildHeartbeatApprovalIssueContexts(
  issueContexts: HeartbeatDispatchIssueContext[]
): HeartbeatApprovalIssueContext[] {
  return issueContexts.map((issue) => ({
    fingerprint: issue.fingerprint,
    attention_type: issue.attention_type,
    signal_type: issue.signal_type,
    severity: issue.severity,
    state: issue.state,
    summary: issue.summary,
    first_seen_at: issue.first_seen_at,
    last_notified_at: issue.last_notified_at,
    snoozed_until: issue.snoozed_until,
  }));
}

async function createHeartbeatApprovalRequest(input: {
  admin: SupabaseClient;
  config: ResolvedHeartbeatConfig;
  heartbeatRunId: string;
  requestTraceId?: string;
  signalSummaries: string[];
  signalData: Record<string, unknown>;
  issueContexts: HeartbeatApprovalIssueContext[];
}): Promise<HeartbeatApprovalRef> {
  const approvalReason = "custom_checks_policy";
  const payload: HeartbeatApprovalRequestPayload = {
    kind: "heartbeat_alert",
    heartbeat_run_id: input.heartbeatRunId,
    config_id: input.config.id,
    tenant_id: input.config.tenant_id,
    customer_id: input.config.customer_id,
    agent_id: input.config.agent_id,
    delivery_channel_id: input.config.delivery_channel_id,
    approval_reason: approvalReason,
    signal_summaries: input.signalSummaries,
    signal_data: input.signalData,
    issue_contexts: input.issueContexts,
    request_trace_id: input.requestTraceId ?? null,
  };

  const { approvalId } = await enqueueHeartbeatApproval(input.admin, {
    tenantId: input.config.tenant_id,
    customerId: input.config.customer_id,
    payload,
  });

  return {
    approval_id: approvalId,
    approval_reason: approvalReason,
    required_role: "operator",
    created_at: new Date().toISOString(),
  };
}

export async function executeHeartbeatForConfig(
  input: HeartbeatExecutionInput
): Promise<HeartbeatExecutionResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const previewOnly = input.previewOnly === true;
  const runSlot = input.triggerMode === "scheduled"
    ? floorDateToUtcMinute(now).toISOString()
    : null;

  if (
    input.respectActiveHours !== false
    && !isWithinHeartbeatActiveHours(
      input.config.timezone,
      input.config.active_hours_start,
      input.config.active_hours_end,
      now
    )
  ) {
    const nextRunAt = input.updateSchedule === false
      ? input.config.next_run_at
      : await updateHeartbeatSchedule(
          input.admin,
          input.config.id,
          now,
          input.config.interval_minutes
        );

    return {
      status: "outside_active_hours",
      configId: input.config.id,
      nextRunAt,
    };
  }

  const startedAt = Date.now();
  let checksOutput;
  try {
    checksOutput = await runCheapChecks({
      admin: input.admin,
      tenantId: input.config.tenant_id,
      customerId: input.config.customer_id,
      agentId: input.config.agent_id,
      effectiveScope: input.config.effective_scope,
      checks: input.config.checks,
      customChecks: input.config.custom_checks,
    });
  } catch (error) {
    const heartbeatRunId = await insertHeartbeatRun(input.admin, {
      config_id: input.config.id,
      tenant_id: input.config.tenant_id,
      ran_at: nowIso,
      run_slot: runSlot,
      trigger_mode: input.triggerMode,
      checks_executed: {},
      check_durations: {},
      signal_fingerprints: [],
      had_signal: false,
      llm_invoked: false,
      delivery_attempted: false,
      delivery_status: "not_applicable",
      suppressed_reason: null,
      decision_trace: {
        request_trace_id: input.requestTraceId ?? null,
        preview_only: previewOnly,
        had_signal: false,
        check_results: [],
        signal_types: [],
        signal_fingerprints: [],
        issue_counts: {
          active: 0,
          new: 0,
          updated: 0,
          resolved: 0,
          notification_candidates: 0,
        },
        lifecycle_suppressed_reasons: [],
        busy_runtime_reason: null,
        selected_signal_types: [],
        selected_attention_types: [],
        delivery_attempted: false,
        delivery_status: "not_applicable",
        final_state: "not_applicable",
        final_reason: null,
      },
      freshness_metadata: {},
      dispatch_metadata: {
        request_trace_id: input.requestTraceId ?? null,
        test_mode: false,
      },
      duration_ms: Date.now() - startedAt,
      error_message:
        error instanceof Error ? error.message : "Heartbeat checks failed",
    });

    if (input.updateSchedule !== false) {
      await updateHeartbeatSchedule(
        input.admin,
        input.config.id,
        now,
        input.config.interval_minutes
      );
    }

    return {
      status: heartbeatRunId ? "completed" : "duplicate_slot",
      configId: input.config.id,
      heartbeatRunId: heartbeatRunId ?? undefined,
      hadSignal: false,
      deliveryStatus: "not_applicable",
    };
  }

  const alertSignals = collectHeartbeatAlertSignals(checksOutput.results);
  const signalFingerprints = alertSignals.map((signal) => signal.fingerprint);
  const durationMs = Date.now() - startedAt;
  const freshnessMetadata = buildHeartbeatFreshnessMetadata(checksOutput.results);
  const [recentDeliveryCount, existingIssues, busyRuntimeReason] = await Promise.all([
    fetchRecentDeliveries(input.admin, input.config.id, now),
    fetchActiveHeartbeatIssues(input.admin, input.config.id),
    previewOnly
      ? Promise.resolve(null)
      : fetchBusyRuntimeReason(input.admin, input.config.tenant_id),
  ]);
  const issuePlan = buildHeartbeatIssuePlan({
    config: input.config,
    existingIssues,
    alertSignals,
    now,
  });
  const deliveryDecision = decideHeartbeatIssueDelivery({
    hasSignal: checksOutput.hadSignal,
    deliveryChannelId: input.config.delivery_channel_id,
    maxAlertsPerDay: input.config.max_alerts_per_day,
    recentDeliveryCount,
    plan: issuePlan,
    digestEnabled: input.config.digest_enabled,
    digestWindowMinutes: input.config.digest_window_minutes,
    now,
    busyRuntimeReason,
  });
  const sourceGuardrail = !previewOnly && deliveryDecision.deliveryAttempted
    ? evaluateHeartbeatSourceGuardrails(checksOutput.results)
    : null;
  const guardedDeliveryDecision = sourceGuardrail?.blocked
    ? {
        ...deliveryDecision,
        deliveryAttempted: false,
        deliveryStatus: "suppressed" as const,
        suppressedReason: sourceGuardrail.reason,
        summaries: [],
        notificationCandidates: [],
      }
    : deliveryDecision;
  const dispatchIssueContexts = buildHeartbeatDispatchIssueContexts(
    guardedDeliveryDecision.notificationCandidates
  );
  const approvalIssueContexts = buildHeartbeatApprovalIssueContexts(dispatchIssueContexts);
  const requiresApproval = shouldRequireHeartbeatApproval({
    triggerMode: input.triggerMode,
    issueContexts: approvalIssueContexts,
  });
  const finalDeliveryDecision = !previewOnly && guardedDeliveryDecision.deliveryAttempted && requiresApproval
    ? {
        ...guardedDeliveryDecision,
        deliveryAttempted: false,
        deliveryStatus: "awaiting_approval" as const,
        suppressedReason: "awaiting_heartbeat_approval",
      }
    : guardedDeliveryDecision;

  const initialDeliveryStatus = previewOnly && finalDeliveryDecision.deliveryAttempted
    ? "preview"
    : finalDeliveryDecision.deliveryStatus;
  const llmInvoked = !previewOnly && finalDeliveryDecision.deliveryAttempted;
  const decisionTrace = buildHeartbeatDecisionTrace({
    requestTraceId: input.requestTraceId,
    previewOnly,
    hadSignal: checksOutput.hadSignal,
    checksOutput: checksOutput.results,
    signalFingerprints,
    issuePlan,
    busyRuntimeReason,
    deliveryAttempted: !previewOnly && finalDeliveryDecision.deliveryAttempted,
    deliveryStatus: initialDeliveryStatus,
    finalReason: finalDeliveryDecision.suppressedReason,
    guardrail: sourceGuardrail?.metadata,
  });

  const heartbeatRunId = await insertHeartbeatRun(input.admin, {
    config_id: input.config.id,
    tenant_id: input.config.tenant_id,
    ran_at: nowIso,
    run_slot: runSlot,
    trigger_mode: input.triggerMode,
    checks_executed: checksOutput.results,
    check_durations: checksOutput.checkDurations,
    signal_fingerprints: signalFingerprints,
    had_signal: checksOutput.hadSignal,
    llm_invoked: llmInvoked,
    delivery_attempted: !previewOnly && finalDeliveryDecision.deliveryAttempted,
    delivery_status: initialDeliveryStatus,
    suppressed_reason: finalDeliveryDecision.suppressedReason,
    decision_trace: decisionTrace,
    freshness_metadata: freshnessMetadata,
    dispatch_metadata: {
      request_trace_id: input.requestTraceId ?? null,
      test_mode: false,
      guardrail_ref: sourceGuardrail?.metadata ?? null,
      approval_ref: null,
    },
    duration_ms: durationMs,
    error_message: null,
  });

  if (!heartbeatRunId && input.triggerMode === "scheduled") {
    return {
      status: "duplicate_slot",
      configId: input.config.id,
    };
  }

  if (!previewOnly) {
    await applyHeartbeatIssuePlan({
      admin: input.admin,
      plan: issuePlan,
      deliveryDecision: finalDeliveryDecision.deliveryAttempted
        ? finalDeliveryDecision
        : {
            ...finalDeliveryDecision,
            notificationCandidates: [],
          },
      now,
    });
  }

  let approvalRef: HeartbeatApprovalRef | undefined;
  if (!previewOnly && heartbeatRunId && initialDeliveryStatus === "awaiting_approval") {
    approvalRef = await createHeartbeatApprovalRequest({
      admin: input.admin,
      config: input.config,
      heartbeatRunId,
      requestTraceId: input.requestTraceId,
      signalSummaries: guardedDeliveryDecision.summaries,
      signalData: checksOutput.results as Record<string, unknown>,
      issueContexts: approvalIssueContexts,
    });
    await markHeartbeatRunDeliveryStatus(
      input.admin,
      heartbeatRunId,
      "awaiting_approval",
      {
        request_trace_id: input.requestTraceId ?? null,
        test_mode: false,
        guardrail_ref: sourceGuardrail?.metadata ?? null,
        approval_ref: approvalRef,
      },
      "awaiting_heartbeat_approval",
      false
    );
  }

  let runtimeRunId: string | undefined;
  if (!previewOnly && finalDeliveryDecision.deliveryAttempted && heartbeatRunId) {
    runtimeRunId = await queueHeartbeatDelivery({
      admin: input.admin,
      config: input.config,
      heartbeatRunId,
      requestTraceId: input.requestTraceId,
      now: new Date(runSlot ?? nowIso),
      signalSummaries: finalDeliveryDecision.summaries,
      signalData: checksOutput.results as Record<string, unknown>,
      issueContexts: dispatchIssueContexts,
    });
  }

  const nextRunAt = input.updateSchedule === false
    ? input.config.next_run_at
    : await updateHeartbeatSchedule(
        input.admin,
        input.config.id,
        now,
        input.config.interval_minutes
      );

  return {
    status: "completed",
    configId: input.config.id,
    heartbeatRunId: heartbeatRunId ?? undefined,
    runtimeRunId,
    hadSignal: checksOutput.hadSignal,
    deliveryStatus: initialDeliveryStatus,
    suppressedReason: finalDeliveryDecision.suppressedReason,
    nextRunAt,
    previewText: buildHeartbeatPreviewText(finalDeliveryDecision.summaries),
  };
}
