import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import {
  evaluateWorkflowPerformanceGates,
  extractWorkflowWebVitalSamples,
  WORKFLOW_WEB_VITAL_EVENT_TYPE,
  type WorkflowPerformanceGateSummary,
} from "@/lib/workflows/performance-gates";
import type { WorkflowLaunchReadinessSnapshotRow } from "@/types/database";
import type { WorkflowRunStatus } from "@/types/workflow";

export const WORKFLOW_ROLLOUT_RINGS = ["canary", "standard", "delayed"] as const;
export type WorkflowRolloutRing = (typeof WORKFLOW_ROLLOUT_RINGS)[number];

export const WORKFLOW_BUILDER_ROLLOUT_TARGET_RING_ENV =
  "WORKFLOW_BUILDER_ROLLOUT_TARGET_RING";

const WORKFLOW_ROLLOUT_BUCKET_LIMITS: Record<WorkflowRolloutRing, number> = {
  canary: 10,
  standard: 70,
  delayed: 100,
};

const TERMINAL_WORKFLOW_RUN_STATUSES = new Set<WorkflowRunStatus>([
  "succeeded",
  "failed",
  "approval_rejected",
  "canceled",
]);

const DEFAULT_ESTIMATED_MINUTES_SAVED_PER_SUCCEEDED_RUN = 6;
const WORKFLOW_LAUNCH_READINESS_CAPTURE_SOURCES = [
  "scheduled",
  "manual",
  "api",
] as const;
const WORKFLOW_PERFORMANCE_GATE_STATUSES = [
  "pass",
  "fail",
  "insufficient_data",
] as const;
const WORKFLOW_LAUNCH_READINESS_SNAPSHOT_SELECT_COLUMNS =
  "id, customer_id, instance_id, timeframe_days, min_samples_per_metric, capture_source, performance_overall_status, rollout_assigned_ring, rollout_target_ring, release_open_for_customer, snapshot, generated_at, created_at";

interface WorkflowDefinitionMetricsRow {
  id: string;
  status: string;
  published_version: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

interface WorkflowVersionPublishRow {
  workflow_id: string;
  created_at: string;
}

interface WorkflowRunMetricsRow {
  status: string;
  trigger_type: string;
  created_at: string;
}

interface WorkflowApprovalMetricsRow {
  created_at: string;
  decided_at: string | null;
}

interface WorkflowTelemetryRow {
  created_at: string;
  metadata: unknown;
}

export interface WorkflowRolloutSummary {
  assigned_ring: WorkflowRolloutRing;
  target_ring: WorkflowRolloutRing;
  release_open_for_customer: boolean;
  progression: WorkflowRolloutRing[];
}

export interface WorkflowLaunchKpiSummary {
  total_workflows: number;
  published_workflows: number;
  draft_to_publish_completion_rate_pct: number | null;
  time_to_first_publish_median_minutes: number | null;
  total_runs: number;
  run_success_rate_pct: number | null;
  retry_rate_pct: number | null;
  retry_recovery_success_rate_pct: number | null;
  approval_cycle_time_p50_minutes: number | null;
  weekly_active_builders: number;
  estimated_operator_hours_saved: number;
}

export interface WorkflowWeeklyReviewCadence {
  timezone: "UTC";
  day_of_week: "Monday";
  time_utc: "16:00";
  owner: string;
  agenda: string[];
}

export interface WorkflowLaunchReadinessSnapshot {
  generated_at: string;
  window_started_at: string;
  timeframe_days: number;
  rollout: WorkflowRolloutSummary;
  kpis: WorkflowLaunchKpiSummary;
  performance_gates: WorkflowPerformanceGateSummary;
  weekly_review_cadence: WorkflowWeeklyReviewCadence;
}

export type WorkflowLaunchReadinessCaptureSource =
  (typeof WORKFLOW_LAUNCH_READINESS_CAPTURE_SOURCES)[number];

export interface StoredWorkflowLaunchReadinessSnapshot {
  id: string;
  customer_id: string;
  instance_id: string;
  timeframe_days: number;
  min_samples_per_metric: number;
  capture_source: WorkflowLaunchReadinessCaptureSource;
  performance_overall_status: WorkflowPerformanceGateSummary["overallStatus"];
  rollout_assigned_ring: WorkflowRolloutRing;
  rollout_target_ring: WorkflowRolloutRing;
  release_open_for_customer: boolean;
  snapshot: WorkflowLaunchReadinessSnapshot;
  generated_at: string;
  created_at: string;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function toPercent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }

  return roundToTwoDecimals((numerator / denominator) * 100);
}

function toNonNegativeMinutes(from: string, to: string): number | null {
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);

  if (Number.isNaN(fromMs) || Number.isNaN(toMs) || toMs < fromMs) {
    return null;
  }

  return Math.max(0, (toMs - fromMs) / 60000);
}

function computeMedian(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return roundToTwoDecimals((sorted[middle - 1] + sorted[middle]) / 2);
  }

  return roundToTwoDecimals(sorted[middle]);
}

function normalizeRolloutRing(value: string | null | undefined): WorkflowRolloutRing | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "canary" || normalized === "standard" || normalized === "delayed") {
    return normalized;
  }

  return null;
}

function normalizeCaptureSource(
  value: string | null | undefined
): WorkflowLaunchReadinessCaptureSource {
  if (
    value &&
    WORKFLOW_LAUNCH_READINESS_CAPTURE_SOURCES.includes(
      value as WorkflowLaunchReadinessCaptureSource
    )
  ) {
    return value as WorkflowLaunchReadinessCaptureSource;
  }

  return "api";
}

function normalizePerformanceStatus(
  value: string | null | undefined
): WorkflowPerformanceGateSummary["overallStatus"] {
  if (
    value &&
    WORKFLOW_PERFORMANCE_GATE_STATUSES.includes(
      value as WorkflowPerformanceGateSummary["overallStatus"]
    )
  ) {
    return value as WorkflowPerformanceGateSummary["overallStatus"];
  }

  return "insufficient_data";
}

function normalizeStoredSnapshotRow(
  row: WorkflowLaunchReadinessSnapshotRow
): StoredWorkflowLaunchReadinessSnapshot | null {
  if (!row.snapshot || typeof row.snapshot !== "object") {
    return null;
  }

  const rolloutAssignedRing = normalizeRolloutRing(row.rollout_assigned_ring);
  const rolloutTargetRing = normalizeRolloutRing(row.rollout_target_ring);
  if (!rolloutAssignedRing || !rolloutTargetRing) {
    return null;
  }

  return {
    id: row.id,
    customer_id: row.customer_id,
    instance_id: row.instance_id,
    timeframe_days: row.timeframe_days,
    min_samples_per_metric: row.min_samples_per_metric,
    capture_source: normalizeCaptureSource(row.capture_source),
    performance_overall_status: normalizePerformanceStatus(
      row.performance_overall_status
    ),
    rollout_assigned_ring: rolloutAssignedRing,
    rollout_target_ring: rolloutTargetRing,
    release_open_for_customer: !!row.release_open_for_customer,
    snapshot: row.snapshot as WorkflowLaunchReadinessSnapshot,
    generated_at: row.generated_at,
    created_at: row.created_at,
  };
}

function ringRank(ring: WorkflowRolloutRing): number {
  return WORKFLOW_ROLLOUT_RINGS.indexOf(ring);
}

function hashCustomerIdToPercentBucket(customerId: string): number {
  let hash = 0;
  for (let index = 0; index < customerId.length; index += 1) {
    hash = (hash * 31 + customerId.charCodeAt(index)) >>> 0;
  }

  return hash % 100;
}

function resolveRingFromBucket(bucket: number): WorkflowRolloutRing {
  if (bucket < WORKFLOW_ROLLOUT_BUCKET_LIMITS.canary) {
    return "canary";
  }

  if (bucket < WORKFLOW_ROLLOUT_BUCKET_LIMITS.standard) {
    return "standard";
  }

  return "delayed";
}

export function getWorkflowBuilderRolloutTargetRing(
  envValue: string | undefined = process.env[WORKFLOW_BUILDER_ROLLOUT_TARGET_RING_ENV]
): WorkflowRolloutRing {
  return normalizeRolloutRing(envValue) || "delayed";
}

export function assignWorkflowBuilderRolloutRing(
  customerId: string
): WorkflowRolloutRing {
  return resolveRingFromBucket(hashCustomerIdToPercentBucket(customerId));
}

export function isWorkflowBuilderRolledOutToCustomer(
  customerId: string,
  targetRing: WorkflowRolloutRing = getWorkflowBuilderRolloutTargetRing()
): boolean {
  const assignedRing = assignWorkflowBuilderRolloutRing(customerId);
  return ringRank(assignedRing) <= ringRank(targetRing);
}

function isWithinWindow(value: string, windowStartMs: number): boolean {
  const valueMs = Date.parse(value);
  if (Number.isNaN(valueMs)) {
    return false;
  }

  return valueMs >= windowStartMs;
}

function computeKpis(input: {
  windowStart: Date;
  workflows: WorkflowDefinitionMetricsRow[];
  firstPublishAtByWorkflowId: Map<string, string>;
  runs: WorkflowRunMetricsRow[];
  approvals: WorkflowApprovalMetricsRow[];
  estimatedMinutesSavedPerSucceededRun: number;
}): WorkflowLaunchKpiSummary {
  const now = new Date();
  const lastSevenDaysMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const windowStartMs = input.windowStart.getTime();
  const workflowsInWindow = input.workflows.filter((workflow) =>
    isWithinWindow(workflow.created_at, windowStartMs)
  );

  const totalWorkflows = workflowsInWindow.length;
  const publishedWorkflows = workflowsInWindow.filter(
    (workflow) => workflow.published_version !== null || workflow.status === "published"
  ).length;

  const timeToFirstPublishMinutes = workflowsInWindow.flatMap((workflow) => {
    const firstPublishAt = input.firstPublishAtByWorkflowId.get(workflow.id);
    if (!firstPublishAt) {
      return [];
    }

    const durationMinutes = toNonNegativeMinutes(workflow.created_at, firstPublishAt);
    return durationMinutes === null ? [] : [durationMinutes];
  });

  const runsInWindow = input.runs.filter((run) =>
    isWithinWindow(run.created_at, windowStartMs)
  );
  const terminalRuns = runsInWindow.filter((run) =>
    TERMINAL_WORKFLOW_RUN_STATUSES.has(run.status as WorkflowRunStatus)
  );
  const succeededTerminalRuns = terminalRuns.filter(
    (run) => run.status === "succeeded"
  ).length;
  const retryRuns = runsInWindow.filter((run) => run.trigger_type === "retry");
  const retrySucceededRuns = retryRuns.filter((run) => run.status === "succeeded");

  const approvalCycleMinutes = input.approvals.flatMap((approval) => {
    if (!approval.decided_at) {
      return [];
    }

    if (!isWithinWindow(approval.created_at, windowStartMs)) {
      return [];
    }

    const minutes = toNonNegativeMinutes(approval.created_at, approval.decided_at);
    return minutes === null ? [] : [minutes];
  });

  const activeBuilderIds = new Set<string>();
  for (const workflow of input.workflows) {
    if (!isWithinWindow(workflow.updated_at, lastSevenDaysMs)) {
      continue;
    }

    if (workflow.updated_by) {
      activeBuilderIds.add(workflow.updated_by);
      continue;
    }

    if (workflow.created_by) {
      activeBuilderIds.add(workflow.created_by);
    }
  }

  const succeededRunsInWindow = runsInWindow.filter(
    (run) => run.status === "succeeded"
  ).length;
  const estimatedOperatorHoursSaved = roundToTwoDecimals(
    (succeededRunsInWindow * input.estimatedMinutesSavedPerSucceededRun) / 60
  );

  return {
    total_workflows: totalWorkflows,
    published_workflows: publishedWorkflows,
    draft_to_publish_completion_rate_pct: toPercent(publishedWorkflows, totalWorkflows),
    time_to_first_publish_median_minutes: computeMedian(timeToFirstPublishMinutes),
    total_runs: runsInWindow.length,
    run_success_rate_pct: toPercent(succeededTerminalRuns, terminalRuns.length),
    retry_rate_pct: toPercent(retryRuns.length, runsInWindow.length),
    retry_recovery_success_rate_pct: toPercent(
      retrySucceededRuns.length,
      retryRuns.length
    ),
    approval_cycle_time_p50_minutes: computeMedian(approvalCycleMinutes),
    weekly_active_builders: activeBuilderIds.size,
    estimated_operator_hours_saved: estimatedOperatorHoursSaved,
  };
}

export async function buildWorkflowLaunchReadinessSnapshot(
  admin: SupabaseClient,
  params: {
    customerId: string;
    instanceId: string;
    timeframeDays: number;
    minSamplesPerMetric: number;
    estimatedMinutesSavedPerSucceededRun?: number;
  }
): Promise<WorkflowLaunchReadinessSnapshot> {
  const timeframeDays = params.timeframeDays;
  const minSamplesPerMetric = params.minSamplesPerMetric;
  const estimatedMinutesSavedPerSucceededRun =
    params.estimatedMinutesSavedPerSucceededRun ??
    DEFAULT_ESTIMATED_MINUTES_SAVED_PER_SUCCEEDED_RUN;
  const windowStart = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

  const [
    workflowResult,
    versionResult,
    runResult,
    approvalResult,
    performanceResult,
  ] = await Promise.all([
    admin
      .from("workflow_definitions")
      .select(
        "id, status, published_version, created_at, updated_at, created_by, updated_by"
      )
      .eq("customer_id", params.customerId)
      .eq("instance_id", params.instanceId),
    admin
      .from("workflow_versions")
      .select("workflow_id, created_at")
      .eq("customer_id", params.customerId)
      .eq("instance_id", params.instanceId)
      .eq("source", "publish")
      .gte("created_at", windowStart.toISOString())
      .order("created_at", { ascending: true })
      .limit(5000),
    admin
      .from("workflow_runs")
      .select("status, trigger_type, created_at")
      .eq("customer_id", params.customerId)
      .eq("instance_id", params.instanceId)
      .gte("created_at", windowStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000),
    admin
      .from("workflow_approvals")
      .select("created_at, decided_at")
      .eq("customer_id", params.customerId)
      .eq("instance_id", params.instanceId)
      .gte("created_at", windowStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000),
    admin
      .from("telemetry_events")
      .select("created_at, metadata")
      .eq("customer_id", params.customerId)
      .eq("instance_id", params.instanceId)
      .eq("event_type", WORKFLOW_WEB_VITAL_EVENT_TYPE)
      .gte("created_at", windowStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  if (workflowResult.error) {
    throw new Error(
      safeErrorMessage(workflowResult.error, "Failed to load workflow KPI definitions")
    );
  }

  if (versionResult.error) {
    throw new Error(
      safeErrorMessage(versionResult.error, "Failed to load workflow publish versions")
    );
  }

  if (runResult.error) {
    throw new Error(
      safeErrorMessage(runResult.error, "Failed to load workflow run metrics")
    );
  }

  if (approvalResult.error) {
    throw new Error(
      safeErrorMessage(approvalResult.error, "Failed to load workflow approval metrics")
    );
  }

  if (performanceResult.error) {
    throw new Error(
      safeErrorMessage(performanceResult.error, "Failed to load workflow performance metrics")
    );
  }

  const workflows = (workflowResult.data || []) as WorkflowDefinitionMetricsRow[];
  const versions = (versionResult.data || []) as WorkflowVersionPublishRow[];
  const runs = (runResult.data || []) as WorkflowRunMetricsRow[];
  const approvals = (approvalResult.data || []) as WorkflowApprovalMetricsRow[];
  const performanceRows = (performanceResult.data || []) as WorkflowTelemetryRow[];

  const firstPublishAtByWorkflowId = new Map<string, string>();
  for (const version of versions) {
    if (!firstPublishAtByWorkflowId.has(version.workflow_id)) {
      firstPublishAtByWorkflowId.set(version.workflow_id, version.created_at);
    }
  }

  const kpis = computeKpis({
    windowStart,
    workflows,
    firstPublishAtByWorkflowId,
    runs,
    approvals,
    estimatedMinutesSavedPerSucceededRun,
  });

  const samples = extractWorkflowWebVitalSamples(performanceRows);
  const performanceGates = evaluateWorkflowPerformanceGates({
    samples,
    timeframeDays,
    minSamplesPerMetric,
  });

  const rolloutTargetRing = getWorkflowBuilderRolloutTargetRing();
  const rolloutAssignedRing = assignWorkflowBuilderRolloutRing(params.customerId);

  return {
    generated_at: new Date().toISOString(),
    window_started_at: windowStart.toISOString(),
    timeframe_days: timeframeDays,
    rollout: {
      assigned_ring: rolloutAssignedRing,
      target_ring: rolloutTargetRing,
      release_open_for_customer:
        ringRank(rolloutAssignedRing) <= ringRank(rolloutTargetRing),
      progression: [...WORKFLOW_ROLLOUT_RINGS],
    },
    kpis,
    performance_gates: performanceGates,
    weekly_review_cadence: {
      timezone: "UTC",
      day_of_week: "Monday",
      time_utc: "16:00",
      owner: "Workflow Operations",
      agenda: [
        "Review KPI deltas and failed gate checks",
        "Inspect retry spikes and approval cycle-time regressions",
        "Decide ring promotion, pause, or rollback actions",
      ],
    },
  };
}

export async function persistWorkflowLaunchReadinessSnapshot(
  admin: SupabaseClient,
  params: {
    customerId: string;
    instanceId: string;
    timeframeDays: number;
    minSamplesPerMetric: number;
    captureSource?: WorkflowLaunchReadinessCaptureSource;
    estimatedMinutesSavedPerSucceededRun?: number;
  }
): Promise<StoredWorkflowLaunchReadinessSnapshot> {
  const snapshot = await buildWorkflowLaunchReadinessSnapshot(admin, {
    customerId: params.customerId,
    instanceId: params.instanceId,
    timeframeDays: params.timeframeDays,
    minSamplesPerMetric: params.minSamplesPerMetric,
    estimatedMinutesSavedPerSucceededRun:
      params.estimatedMinutesSavedPerSucceededRun,
  });

  const { data, error } = await admin
    .from("workflow_launch_readiness_snapshots")
    .insert({
      customer_id: params.customerId,
      instance_id: params.instanceId,
      timeframe_days: params.timeframeDays,
      min_samples_per_metric: params.minSamplesPerMetric,
      capture_source: params.captureSource ?? "api",
      performance_overall_status: snapshot.performance_gates.overallStatus,
      rollout_assigned_ring: snapshot.rollout.assigned_ring,
      rollout_target_ring: snapshot.rollout.target_ring,
      release_open_for_customer: snapshot.rollout.release_open_for_customer,
      snapshot,
      generated_at: snapshot.generated_at,
    })
    .select(WORKFLOW_LAUNCH_READINESS_SNAPSHOT_SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to persist workflow launch readiness snapshot")
    );
  }

  if (!data) {
    throw new Error("Launch readiness snapshot persisted with empty payload.");
  }

  const normalized = normalizeStoredSnapshotRow(
    data as WorkflowLaunchReadinessSnapshotRow
  );
  if (!normalized) {
    throw new Error("Persisted launch readiness snapshot could not be normalized.");
  }

  return normalized;
}

export async function listWorkflowLaunchReadinessSnapshots(
  admin: SupabaseClient,
  params: {
    customerId: string;
    instanceId: string;
    limit?: number;
  }
): Promise<StoredWorkflowLaunchReadinessSnapshot[]> {
  const limit = Math.min(30, Math.max(1, params.limit ?? 12));
  const { data, error } = await admin
    .from("workflow_launch_readiness_snapshots")
    .select(WORKFLOW_LAUNCH_READINESS_SNAPSHOT_SELECT_COLUMNS)
    .eq("customer_id", params.customerId)
    .eq("instance_id", params.instanceId)
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to load workflow launch readiness snapshot history")
    );
  }

  return ((data || []) as WorkflowLaunchReadinessSnapshotRow[])
    .map(normalizeStoredSnapshotRow)
    .filter(
      (snapshot): snapshot is StoredWorkflowLaunchReadinessSnapshot =>
        snapshot !== null
    );
}
