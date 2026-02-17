import test from "node:test";
import assert from "node:assert/strict";
import {
  computePercentile,
  evaluateWorkflowPerformanceGates,
  extractWorkflowWebVitalSamples,
  type WorkflowWebVitalSample,
} from "./performance-gates.ts";

function buildSamples(
  routeKind: "builder" | "list",
  metricName: "INP" | "LCP" | "CLS",
  values: number[]
): WorkflowWebVitalSample[] {
  return values.map((value, index) => ({
    metricName,
    routeKind,
    value,
    createdAt: new Date(Date.UTC(2026, 1, 16, 12, index, 0)).toISOString(),
  }));
}

test("computePercentile returns interpolated percentile for non-discrete index", () => {
  const p75 = computePercentile([100, 200, 300, 400], 75);
  assert.equal(p75, 325);
});

test("extractWorkflowWebVitalSamples filters invalid telemetry rows", () => {
  const samples = extractWorkflowWebVitalSamples([
    {
      created_at: "2026-02-16T00:00:00.000Z",
      metadata: {
        metric_name: "INP",
        route_kind: "builder",
        value: 180,
      },
    },
    {
      created_at: "2026-02-16T00:01:00.000Z",
      metadata: {
        metric_name: "INVALID",
        route_kind: "builder",
        value: 42,
      },
    },
    {
      created_at: "2026-02-16T00:02:00.000Z",
      metadata: {
        metric_name: "CLS",
        route_kind: "list",
        value: "0.04",
      },
    },
  ]);

  assert.deepEqual(samples, [
    {
      metricName: "INP",
      routeKind: "builder",
      value: 180,
      createdAt: "2026-02-16T00:00:00.000Z",
    },
  ]);
});

test("evaluateWorkflowPerformanceGates reports pass when p75 values are under thresholds", () => {
  const samples = [
    ...buildSamples("builder", "INP", Array(25).fill(160)),
    ...buildSamples("builder", "LCP", Array(25).fill(2100)),
    ...buildSamples("builder", "CLS", Array(25).fill(0.06)),
    ...buildSamples("list", "CLS", Array(25).fill(0.05)),
  ];

  const summary = evaluateWorkflowPerformanceGates({
    samples,
    timeframeDays: 7,
    minSamplesPerMetric: 20,
  });

  assert.equal(summary.overallStatus, "pass");
  assert.ok(summary.gateChecks.every((gate) => gate.status === "pass"));
});

test("evaluateWorkflowPerformanceGates reports fail when thresholds are exceeded", () => {
  const samples = [
    ...buildSamples("builder", "INP", Array(25).fill(260)),
    ...buildSamples("builder", "LCP", Array(25).fill(3300)),
    ...buildSamples("builder", "CLS", Array(25).fill(0.2)),
    ...buildSamples("list", "CLS", Array(25).fill(0.18)),
  ];

  const summary = evaluateWorkflowPerformanceGates({
    samples,
    timeframeDays: 14,
    minSamplesPerMetric: 20,
  });

  assert.equal(summary.overallStatus, "fail");
  assert.ok(summary.gateChecks.every((gate) => gate.status === "fail"));
});

test("evaluateWorkflowPerformanceGates reports insufficient data when sample floor is not met", () => {
  const samples = [
    ...buildSamples("builder", "INP", Array(5).fill(120)),
    ...buildSamples("builder", "LCP", Array(5).fill(1400)),
    ...buildSamples("builder", "CLS", Array(5).fill(0.04)),
    ...buildSamples("list", "CLS", Array(5).fill(0.03)),
  ];

  const summary = evaluateWorkflowPerformanceGates({
    samples,
    timeframeDays: 14,
    minSamplesPerMetric: 20,
  });

  assert.equal(summary.overallStatus, "insufficient_data");
  assert.ok(
    summary.gateChecks.every((gate) => gate.status === "insufficient_data")
  );
});
