export const WORKFLOW_WEB_VITAL_EVENT_TYPE = "workflow.web_vital";

export const WORKFLOW_WEB_VITAL_METRIC_NAMES = ["INP", "LCP", "CLS"] as const;
export type WorkflowWebVitalMetricName =
  (typeof WORKFLOW_WEB_VITAL_METRIC_NAMES)[number];

export const WORKFLOW_WEB_VITAL_ROUTE_KINDS = ["builder", "list"] as const;
export type WorkflowWebVitalRouteKind =
  (typeof WORKFLOW_WEB_VITAL_ROUTE_KINDS)[number];

interface WorkflowWebVitalMetricConfig {
  thresholdP75: number;
  unit: "ms" | "score";
}

const METRIC_CONFIG: Record<
  WorkflowWebVitalMetricName,
  WorkflowWebVitalMetricConfig
> = {
  INP: { thresholdP75: 200, unit: "ms" },
  LCP: { thresholdP75: 2500, unit: "ms" },
  CLS: { thresholdP75: 0.1, unit: "score" },
};

export interface WorkflowWebVitalSample {
  metricName: WorkflowWebVitalMetricName;
  routeKind: WorkflowWebVitalRouteKind;
  value: number;
  createdAt: string;
}

export interface WorkflowWebVitalMetricSummary {
  metricName: WorkflowWebVitalMetricName;
  unit: "ms" | "score";
  sampleCount: number;
  thresholdP75: number;
  p75: number | null;
  status: "pass" | "fail" | "insufficient_data";
}

export interface WorkflowWebVitalRouteSummary {
  routeKind: WorkflowWebVitalRouteKind;
  metrics: WorkflowWebVitalMetricSummary[];
}

export interface WorkflowPerformanceGateCheck {
  gate: "builder_inp" | "builder_lcp" | "builder_cls" | "list_cls";
  metricName: WorkflowWebVitalMetricName;
  routeKind: WorkflowWebVitalRouteKind;
  status: "pass" | "fail" | "insufficient_data";
  thresholdP75: number;
  p75: number | null;
  sampleCount: number;
}

export interface WorkflowPerformanceGateSummary {
  timeframeDays: number;
  minSamplesPerMetric: number;
  overallStatus: "pass" | "fail" | "insufficient_data";
  gateChecks: WorkflowPerformanceGateCheck[];
  routes: WorkflowWebVitalRouteSummary[];
}

export function computePercentile(
  values: number[],
  percentile: number
): number | null {
  if (values.length === 0) {
    return null;
  }

  const ordered = [...values].sort((a, b) => a - b);
  const clampedPercentile = Math.max(0, Math.min(100, percentile));
  const index = (clampedPercentile / 100) * (ordered.length - 1);
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

function summarizeMetric(
  samples: WorkflowWebVitalSample[],
  metricName: WorkflowWebVitalMetricName,
  minSamplesPerMetric: number
): WorkflowWebVitalMetricSummary {
  const metricConfig = METRIC_CONFIG[metricName];
  const values = samples
    .filter((sample) => sample.metricName === metricName)
    .map((sample) => sample.value);

  if (values.length < minSamplesPerMetric) {
    return {
      metricName,
      unit: metricConfig.unit,
      sampleCount: values.length,
      thresholdP75: metricConfig.thresholdP75,
      p75: null,
      status: "insufficient_data",
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
      status: "insufficient_data",
    };
  }

  return {
    metricName,
    unit: metricConfig.unit,
    sampleCount: values.length,
    thresholdP75: metricConfig.thresholdP75,
    p75,
    status: p75 <= metricConfig.thresholdP75 ? "pass" : "fail",
  };
}

function summarizeRoute(
  samples: WorkflowWebVitalSample[],
  routeKind: WorkflowWebVitalRouteKind,
  minSamplesPerMetric: number
): WorkflowWebVitalRouteSummary {
  const routeSamples = samples.filter((sample) => sample.routeKind === routeKind);
  return {
    routeKind,
    metrics: WORKFLOW_WEB_VITAL_METRIC_NAMES.map((metricName) =>
      summarizeMetric(routeSamples, metricName, minSamplesPerMetric)
    ),
  };
}

function findMetricSummary(
  routeSummary: WorkflowWebVitalRouteSummary,
  metricName: WorkflowWebVitalMetricName
): WorkflowWebVitalMetricSummary {
  const metricSummary = routeSummary.metrics.find(
    (metric) => metric.metricName === metricName
  );

  if (!metricSummary) {
    return summarizeMetric([], metricName, 1);
  }

  return metricSummary;
}

export function evaluateWorkflowPerformanceGates(input: {
  samples: WorkflowWebVitalSample[];
  timeframeDays: number;
  minSamplesPerMetric: number;
}): WorkflowPerformanceGateSummary {
  const { samples, timeframeDays, minSamplesPerMetric } = input;
  const builderSummary = summarizeRoute(samples, "builder", minSamplesPerMetric);
  const listSummary = summarizeRoute(samples, "list", minSamplesPerMetric);

  const builderInp = findMetricSummary(builderSummary, "INP");
  const builderLcp = findMetricSummary(builderSummary, "LCP");
  const builderCls = findMetricSummary(builderSummary, "CLS");
  const listCls = findMetricSummary(listSummary, "CLS");

  const gateChecks: WorkflowPerformanceGateCheck[] = [
    {
      gate: "builder_inp",
      metricName: "INP",
      routeKind: "builder",
      status: builderInp.status,
      thresholdP75: builderInp.thresholdP75,
      p75: builderInp.p75,
      sampleCount: builderInp.sampleCount,
    },
    {
      gate: "builder_lcp",
      metricName: "LCP",
      routeKind: "builder",
      status: builderLcp.status,
      thresholdP75: builderLcp.thresholdP75,
      p75: builderLcp.p75,
      sampleCount: builderLcp.sampleCount,
    },
    {
      gate: "builder_cls",
      metricName: "CLS",
      routeKind: "builder",
      status: builderCls.status,
      thresholdP75: builderCls.thresholdP75,
      p75: builderCls.p75,
      sampleCount: builderCls.sampleCount,
    },
    {
      gate: "list_cls",
      metricName: "CLS",
      routeKind: "list",
      status: listCls.status,
      thresholdP75: listCls.thresholdP75,
      p75: listCls.p75,
      sampleCount: listCls.sampleCount,
    },
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
    routes: [builderSummary, listSummary],
  };
}

function isMetricName(value: unknown): value is WorkflowWebVitalMetricName {
  return (
    typeof value === "string" &&
    WORKFLOW_WEB_VITAL_METRIC_NAMES.includes(
      value as WorkflowWebVitalMetricName
    )
  );
}

function isRouteKind(value: unknown): value is WorkflowWebVitalRouteKind {
  return (
    typeof value === "string" &&
    WORKFLOW_WEB_VITAL_ROUTE_KINDS.includes(
      value as WorkflowWebVitalRouteKind
    )
  );
}

interface WorkflowWebVitalTelemetryRow {
  created_at: string;
  metadata: unknown;
}

export function extractWorkflowWebVitalSamples(
  rows: WorkflowWebVitalTelemetryRow[]
): WorkflowWebVitalSample[] {
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") {
      return [];
    }

    const metadata =
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null;

    if (!metadata) {
      return [];
    }

    const metricName = metadata.metric_name;
    const routeKind = metadata.route_kind;
    const value = metadata.value;

    if (
      !isMetricName(metricName) ||
      !isRouteKind(routeKind) ||
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0
    ) {
      return [];
    }

    return [
      {
        metricName,
        routeKind,
        value,
        createdAt: row.created_at,
      },
    ];
  });
}
