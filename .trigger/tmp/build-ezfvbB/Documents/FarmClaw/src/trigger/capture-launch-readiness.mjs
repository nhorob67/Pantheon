import {
  auditLog,
  isFeatureFlagEnabledOrDefaultTrue
} from "../../../../chunk-XF5T4F7Q.mjs";
import {
  safeErrorMessage
} from "../../../../chunk-R2V4UDE3.mjs";
import {
  createTriggerAdminClient
} from "../../../../chunk-HT5RPO7D.mjs";
import {
  schedules_exports
} from "../../../../chunk-OGNGFKGT.mjs";
import "../../../../chunk-WWNEOE5T.mjs";
import "../../../../chunk-RLLQVKNR.mjs";
import {
  __name,
  init_esm
} from "../../../../chunk-262SQFPS.mjs";

// src/trigger/capture-launch-readiness.ts
init_esm();

// src/lib/workflows/launch-readiness.ts
init_esm();

// src/lib/workflows/performance-gates.ts
init_esm();
var WORKFLOW_WEB_VITAL_EVENT_TYPE = "workflow.web_vital";
var WORKFLOW_WEB_VITAL_METRIC_NAMES = ["INP", "LCP", "CLS"];
var WORKFLOW_WEB_VITAL_ROUTE_KINDS = ["builder", "list"];
var METRIC_CONFIG = {
  INP: { thresholdP75: 200, unit: "ms" },
  LCP: { thresholdP75: 2500, unit: "ms" },
  CLS: { thresholdP75: 0.1, unit: "score" }
};
function computePercentile(values, percentile) {
  if (values.length === 0) {
    return null;
  }
  const ordered = [...values].sort((a, b) => a - b);
  const clampedPercentile = Math.max(0, Math.min(100, percentile));
  const index = clampedPercentile / 100 * (ordered.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  if (lowerIndex === upperIndex) {
    return ordered[lowerIndex];
  }
  const lowerValue = ordered[lowerIndex];
  const upperValue = ordered[upperIndex];
  const fraction = index - lowerIndex;
  return lowerValue + (upperValue - lowerValue) * fraction;
}
__name(computePercentile, "computePercentile");
function summarizeMetric(samples, metricName, minSamplesPerMetric) {
  const metricConfig = METRIC_CONFIG[metricName];
  const values = samples.filter((sample) => sample.metricName === metricName).map((sample) => sample.value);
  if (values.length < minSamplesPerMetric) {
    return {
      metricName,
      unit: metricConfig.unit,
      sampleCount: values.length,
      thresholdP75: metricConfig.thresholdP75,
      p75: null,
      status: "insufficient_data"
    };
  }
  const p75 = computePercentile(values, 75);
  if (p75 === null) {
    return {
      metricName,
      unit: metricConfig.unit,
      sampleCount: values.length,
      thresholdP75: metricConfig.thresholdP75,
      p75: null,
      status: "insufficient_data"
    };
  }
  return {
    metricName,
    unit: metricConfig.unit,
    sampleCount: values.length,
    thresholdP75: metricConfig.thresholdP75,
    p75,
    status: p75 <= metricConfig.thresholdP75 ? "pass" : "fail"
  };
}
__name(summarizeMetric, "summarizeMetric");
function summarizeRoute(samples, routeKind, minSamplesPerMetric) {
  const routeSamples = samples.filter((sample) => sample.routeKind === routeKind);
  return {
    routeKind,
    metrics: WORKFLOW_WEB_VITAL_METRIC_NAMES.map(
      (metricName) => summarizeMetric(routeSamples, metricName, minSamplesPerMetric)
    )
  };
}
__name(summarizeRoute, "summarizeRoute");
function findMetricSummary(routeSummary, metricName) {
  const metricSummary = routeSummary.metrics.find(
    (metric) => metric.metricName === metricName
  );
  if (!metricSummary) {
    return summarizeMetric([], metricName, 1);
  }
  return metricSummary;
}
__name(findMetricSummary, "findMetricSummary");
function evaluateWorkflowPerformanceGates(input) {
  const { samples, timeframeDays, minSamplesPerMetric } = input;
  const builderSummary = summarizeRoute(samples, "builder", minSamplesPerMetric);
  const listSummary = summarizeRoute(samples, "list", minSamplesPerMetric);
  const builderInp = findMetricSummary(builderSummary, "INP");
  const builderLcp = findMetricSummary(builderSummary, "LCP");
  const builderCls = findMetricSummary(builderSummary, "CLS");
  const listCls = findMetricSummary(listSummary, "CLS");
  const gateChecks = [
    {
      gate: "builder_inp",
      metricName: "INP",
      routeKind: "builder",
      status: builderInp.status,
      thresholdP75: builderInp.thresholdP75,
      p75: builderInp.p75,
      sampleCount: builderInp.sampleCount
    },
    {
      gate: "builder_lcp",
      metricName: "LCP",
      routeKind: "builder",
      status: builderLcp.status,
      thresholdP75: builderLcp.thresholdP75,
      p75: builderLcp.p75,
      sampleCount: builderLcp.sampleCount
    },
    {
      gate: "builder_cls",
      metricName: "CLS",
      routeKind: "builder",
      status: builderCls.status,
      thresholdP75: builderCls.thresholdP75,
      p75: builderCls.p75,
      sampleCount: builderCls.sampleCount
    },
    {
      gate: "list_cls",
      metricName: "CLS",
      routeKind: "list",
      status: listCls.status,
      thresholdP75: listCls.thresholdP75,
      p75: listCls.p75,
      sampleCount: listCls.sampleCount
    }
  ];
  const hasFailure = gateChecks.some((gate) => gate.status === "fail");
  const hasInsufficient = gateChecks.some(
    (gate) => gate.status === "insufficient_data"
  );
  return {
    timeframeDays,
    minSamplesPerMetric,
    overallStatus: hasFailure ? "fail" : hasInsufficient ? "insufficient_data" : "pass",
    gateChecks,
    routes: [builderSummary, listSummary]
  };
}
__name(evaluateWorkflowPerformanceGates, "evaluateWorkflowPerformanceGates");
function isMetricName(value) {
  return typeof value === "string" && WORKFLOW_WEB_VITAL_METRIC_NAMES.includes(
    value
  );
}
__name(isMetricName, "isMetricName");
function isRouteKind(value) {
  return typeof value === "string" && WORKFLOW_WEB_VITAL_ROUTE_KINDS.includes(
    value
  );
}
__name(isRouteKind, "isRouteKind");
function extractWorkflowWebVitalSamples(rows) {
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") {
      return [];
    }
    const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : null;
    if (!metadata) {
      return [];
    }
    const metricName = metadata.metric_name;
    const routeKind = metadata.route_kind;
    const value = metadata.value;
    if (!isMetricName(metricName) || !isRouteKind(routeKind) || typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return [];
    }
    return [
      {
        metricName,
        routeKind,
        value,
        createdAt: row.created_at
      }
    ];
  });
}
__name(extractWorkflowWebVitalSamples, "extractWorkflowWebVitalSamples");

// src/lib/workflows/launch-readiness.ts
var WORKFLOW_ROLLOUT_RINGS = ["canary", "standard", "delayed"];
var WORKFLOW_BUILDER_ROLLOUT_TARGET_RING_ENV = "WORKFLOW_BUILDER_ROLLOUT_TARGET_RING";
var WORKFLOW_ROLLOUT_BUCKET_LIMITS = {
  canary: 10,
  standard: 70,
  delayed: 100
};
var TERMINAL_WORKFLOW_RUN_STATUSES = /* @__PURE__ */ new Set([
  "succeeded",
  "failed",
  "approval_rejected",
  "canceled"
]);
var DEFAULT_ESTIMATED_MINUTES_SAVED_PER_SUCCEEDED_RUN = 6;
var WORKFLOW_LAUNCH_READINESS_CAPTURE_SOURCES = [
  "scheduled",
  "manual",
  "api"
];
var WORKFLOW_PERFORMANCE_GATE_STATUSES = [
  "pass",
  "fail",
  "insufficient_data"
];
var WORKFLOW_LAUNCH_READINESS_SNAPSHOT_SELECT_COLUMNS = "id, customer_id, instance_id, timeframe_days, min_samples_per_metric, capture_source, performance_overall_status, rollout_assigned_ring, rollout_target_ring, release_open_for_customer, snapshot, generated_at, created_at";
function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}
__name(roundToTwoDecimals, "roundToTwoDecimals");
function toPercent(numerator, denominator) {
  if (denominator <= 0) {
    return null;
  }
  return roundToTwoDecimals(numerator / denominator * 100);
}
__name(toPercent, "toPercent");
function toNonNegativeMinutes(from, to) {
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs) || toMs < fromMs) {
    return null;
  }
  return Math.max(0, (toMs - fromMs) / 6e4);
}
__name(toNonNegativeMinutes, "toNonNegativeMinutes");
function computeMedian(values) {
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
__name(computeMedian, "computeMedian");
function normalizeRolloutRing(value) {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "canary" || normalized === "standard" || normalized === "delayed") {
    return normalized;
  }
  return null;
}
__name(normalizeRolloutRing, "normalizeRolloutRing");
function normalizeCaptureSource(value) {
  if (value && WORKFLOW_LAUNCH_READINESS_CAPTURE_SOURCES.includes(
    value
  )) {
    return value;
  }
  return "api";
}
__name(normalizeCaptureSource, "normalizeCaptureSource");
function normalizePerformanceStatus(value) {
  if (value && WORKFLOW_PERFORMANCE_GATE_STATUSES.includes(
    value
  )) {
    return value;
  }
  return "insufficient_data";
}
__name(normalizePerformanceStatus, "normalizePerformanceStatus");
function normalizeStoredSnapshotRow(row) {
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
    snapshot: row.snapshot,
    generated_at: row.generated_at,
    created_at: row.created_at
  };
}
__name(normalizeStoredSnapshotRow, "normalizeStoredSnapshotRow");
function ringRank(ring) {
  return WORKFLOW_ROLLOUT_RINGS.indexOf(ring);
}
__name(ringRank, "ringRank");
function hashCustomerIdToPercentBucket(customerId) {
  let hash = 0;
  for (let index = 0; index < customerId.length; index += 1) {
    hash = hash * 31 + customerId.charCodeAt(index) >>> 0;
  }
  return hash % 100;
}
__name(hashCustomerIdToPercentBucket, "hashCustomerIdToPercentBucket");
function resolveRingFromBucket(bucket) {
  if (bucket < WORKFLOW_ROLLOUT_BUCKET_LIMITS.canary) {
    return "canary";
  }
  if (bucket < WORKFLOW_ROLLOUT_BUCKET_LIMITS.standard) {
    return "standard";
  }
  return "delayed";
}
__name(resolveRingFromBucket, "resolveRingFromBucket");
function getWorkflowBuilderRolloutTargetRing(envValue = process.env[WORKFLOW_BUILDER_ROLLOUT_TARGET_RING_ENV]) {
  return normalizeRolloutRing(envValue) || "delayed";
}
__name(getWorkflowBuilderRolloutTargetRing, "getWorkflowBuilderRolloutTargetRing");
function assignWorkflowBuilderRolloutRing(customerId) {
  return resolveRingFromBucket(hashCustomerIdToPercentBucket(customerId));
}
__name(assignWorkflowBuilderRolloutRing, "assignWorkflowBuilderRolloutRing");
function isWorkflowBuilderRolledOutToCustomer(customerId, targetRing = getWorkflowBuilderRolloutTargetRing()) {
  const assignedRing = assignWorkflowBuilderRolloutRing(customerId);
  return ringRank(assignedRing) <= ringRank(targetRing);
}
__name(isWorkflowBuilderRolledOutToCustomer, "isWorkflowBuilderRolledOutToCustomer");
function isWithinWindow(value, windowStartMs) {
  const valueMs = Date.parse(value);
  if (Number.isNaN(valueMs)) {
    return false;
  }
  return valueMs >= windowStartMs;
}
__name(isWithinWindow, "isWithinWindow");
function computeKpis(input) {
  const now = /* @__PURE__ */ new Date();
  const lastSevenDaysMs = now.getTime() - 7 * 24 * 60 * 60 * 1e3;
  const windowStartMs = input.windowStart.getTime();
  const workflowsInWindow = input.workflows.filter(
    (workflow) => isWithinWindow(workflow.created_at, windowStartMs)
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
  const runsInWindow = input.runs.filter(
    (run) => isWithinWindow(run.created_at, windowStartMs)
  );
  const terminalRuns = runsInWindow.filter(
    (run) => TERMINAL_WORKFLOW_RUN_STATUSES.has(run.status)
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
  const activeBuilderIds = /* @__PURE__ */ new Set();
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
    succeededRunsInWindow * input.estimatedMinutesSavedPerSucceededRun / 60
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
    estimated_operator_hours_saved: estimatedOperatorHoursSaved
  };
}
__name(computeKpis, "computeKpis");
async function buildWorkflowLaunchReadinessSnapshot(admin, params) {
  const timeframeDays = params.timeframeDays;
  const minSamplesPerMetric = params.minSamplesPerMetric;
  const estimatedMinutesSavedPerSucceededRun = params.estimatedMinutesSavedPerSucceededRun ?? DEFAULT_ESTIMATED_MINUTES_SAVED_PER_SUCCEEDED_RUN;
  const windowStart = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1e3);
  const [
    workflowResult,
    versionResult,
    runResult,
    approvalResult,
    performanceResult
  ] = await Promise.all([
    admin.from("workflow_definitions").select(
      "id, status, published_version, created_at, updated_at, created_by, updated_by"
    ).eq("customer_id", params.customerId).eq("instance_id", params.instanceId),
    admin.from("workflow_versions").select("workflow_id, created_at").eq("customer_id", params.customerId).eq("instance_id", params.instanceId).eq("source", "publish").gte("created_at", windowStart.toISOString()).order("created_at", { ascending: true }).limit(5e3),
    admin.from("workflow_runs").select("status, trigger_type, created_at").eq("customer_id", params.customerId).eq("instance_id", params.instanceId).gte("created_at", windowStart.toISOString()).order("created_at", { ascending: false }).limit(5e3),
    admin.from("workflow_approvals").select("created_at, decided_at").eq("customer_id", params.customerId).eq("instance_id", params.instanceId).gte("created_at", windowStart.toISOString()).order("created_at", { ascending: false }).limit(5e3),
    admin.from("telemetry_events").select("created_at, metadata").eq("customer_id", params.customerId).eq("instance_id", params.instanceId).eq("event_type", WORKFLOW_WEB_VITAL_EVENT_TYPE).gte("created_at", windowStart.toISOString()).order("created_at", { ascending: false }).limit(5e3)
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
  const workflows = workflowResult.data || [];
  const versions = versionResult.data || [];
  const runs = runResult.data || [];
  const approvals = approvalResult.data || [];
  const performanceRows = performanceResult.data || [];
  const firstPublishAtByWorkflowId = /* @__PURE__ */ new Map();
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
    estimatedMinutesSavedPerSucceededRun
  });
  const samples = extractWorkflowWebVitalSamples(performanceRows);
  const performanceGates = evaluateWorkflowPerformanceGates({
    samples,
    timeframeDays,
    minSamplesPerMetric
  });
  const rolloutTargetRing = getWorkflowBuilderRolloutTargetRing();
  const rolloutAssignedRing = assignWorkflowBuilderRolloutRing(params.customerId);
  return {
    generated_at: (/* @__PURE__ */ new Date()).toISOString(),
    window_started_at: windowStart.toISOString(),
    timeframe_days: timeframeDays,
    rollout: {
      assigned_ring: rolloutAssignedRing,
      target_ring: rolloutTargetRing,
      release_open_for_customer: ringRank(rolloutAssignedRing) <= ringRank(rolloutTargetRing),
      progression: [...WORKFLOW_ROLLOUT_RINGS]
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
        "Decide ring promotion, pause, or rollback actions"
      ]
    }
  };
}
__name(buildWorkflowLaunchReadinessSnapshot, "buildWorkflowLaunchReadinessSnapshot");
async function persistWorkflowLaunchReadinessSnapshot(admin, params) {
  const snapshot = await buildWorkflowLaunchReadinessSnapshot(admin, {
    customerId: params.customerId,
    instanceId: params.instanceId,
    timeframeDays: params.timeframeDays,
    minSamplesPerMetric: params.minSamplesPerMetric,
    estimatedMinutesSavedPerSucceededRun: params.estimatedMinutesSavedPerSucceededRun
  });
  const { data, error } = await admin.from("workflow_launch_readiness_snapshots").insert({
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
    generated_at: snapshot.generated_at
  }).select(WORKFLOW_LAUNCH_READINESS_SNAPSHOT_SELECT_COLUMNS).single();
  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to persist workflow launch readiness snapshot")
    );
  }
  if (!data) {
    throw new Error("Launch readiness snapshot persisted with empty payload.");
  }
  const normalized = normalizeStoredSnapshotRow(
    data
  );
  if (!normalized) {
    throw new Error("Persisted launch readiness snapshot could not be normalized.");
  }
  return normalized;
}
__name(persistWorkflowLaunchReadinessSnapshot, "persistWorkflowLaunchReadinessSnapshot");

// src/lib/workflows/feature-gate.ts
init_esm();
var WORKFLOW_BUILDER_FEATURE_FLAG_KEY = "workflow.builder";
async function isWorkflowBuilderEnabledForCustomer(admin, customerId) {
  if (!customerId) {
    return false;
  }
  try {
    const baseFlagEnabled = await isFeatureFlagEnabledOrDefaultTrue(
      admin,
      customerId,
      WORKFLOW_BUILDER_FEATURE_FLAG_KEY
    );
    if (!baseFlagEnabled) {
      return false;
    }
    return isWorkflowBuilderRolledOutToCustomer(customerId);
  } catch {
    return true;
  }
}
__name(isWorkflowBuilderEnabledForCustomer, "isWorkflowBuilderEnabledForCustomer");

// src/trigger/capture-launch-readiness.ts
var DEFAULT_DAYS = 30;
var DEFAULT_MIN_SAMPLES = 5;
var DEFAULT_INSTANCE_LIMIT = 500;
var captureLaunchReadiness = schedules_exports.task({
  id: "capture-launch-readiness",
  cron: "15 * * * *",
  retry: {
    maxAttempts: 2
  },
  run: /* @__PURE__ */ __name(async () => {
    const admin = createTriggerAdminClient();
    const captureSource = "scheduled";
    const { data: instancesData, error: instancesError } = await admin.from("instances").select("id, customer_id").order("created_at", { ascending: false }).limit(DEFAULT_INSTANCE_LIMIT);
    if (instancesError) {
      throw new Error(
        safeErrorMessage(
          instancesError,
          "Failed to load instances for launch-readiness capture"
        )
      );
    }
    const instances = instancesData || [];
    if (instances.length === 0) {
      return {
        scanned_instances: 0,
        captured: 0,
        skipped_builder_disabled: 0,
        failed: 0
      };
    }
    let captured = 0;
    let skippedBuilderDisabled = 0;
    let failed = 0;
    const errors = [];
    for (const instance of instances) {
      const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(admin, instance.customer_id);
      if (!workflowBuilderEnabled) {
        skippedBuilderDisabled += 1;
        continue;
      }
      try {
        await persistWorkflowLaunchReadinessSnapshot(admin, {
          customerId: instance.customer_id,
          instanceId: instance.id,
          timeframeDays: DEFAULT_DAYS,
          minSamplesPerMetric: DEFAULT_MIN_SAMPLES,
          captureSource
        });
        captured += 1;
      } catch (error) {
        failed += 1;
        errors.push(
          `${instance.id}: ${safeErrorMessage(
            error,
            "Launch-readiness capture failed"
          )}`
        );
      }
    }
    auditLog({
      action: "workflow.launch_readiness.capture",
      actor: "workflow-launch-readiness-cron",
      resource_type: "workflow_launch_readiness",
      resource_id: "batch",
      details: {
        scanned_instances: instances.length,
        captured,
        skipped_builder_disabled: skippedBuilderDisabled,
        failed,
        days: DEFAULT_DAYS,
        min_samples: DEFAULT_MIN_SAMPLES,
        capture_source: captureSource
      }
    });
    return {
      scanned_instances: instances.length,
      captured,
      skipped_builder_disabled: skippedBuilderDisabled,
      failed,
      errors: errors.slice(0, 25)
    };
  }, "run")
});
export {
  captureLaunchReadiness
};
//# sourceMappingURL=capture-launch-readiness.mjs.map
