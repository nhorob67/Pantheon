"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import {
  WORKFLOW_WEB_VITAL_METRIC_NAMES,
  type WorkflowWebVitalMetricName,
  type WorkflowWebVitalRouteKind,
} from "@/lib/workflows/performance-gates";

interface WorkflowPerformanceBeaconProps {
  instanceId: string;
  routeKind: WorkflowWebVitalRouteKind;
}

interface WebVitalMetricPayload {
  id: string;
  name: string;
  value: number;
  delta?: number;
  rating?: string;
  navigationType?: string;
}

const ACCEPTED_METRICS = new Set<string>(WORKFLOW_WEB_VITAL_METRIC_NAMES);

export function WorkflowPerformanceBeacon({
  instanceId,
  routeKind,
}: WorkflowPerformanceBeaconProps) {
  const pathname = usePathname();
  const sentMetricIdsRef = useRef(new Set<string>());

  useReportWebVitals((metric: WebVitalMetricPayload) => {
    if (!metric || typeof metric !== "object") {
      return;
    }

    const metricName = metric.name as WorkflowWebVitalMetricName;
    if (!ACCEPTED_METRICS.has(metricName)) {
      return;
    }

    if (typeof metric.value !== "number" || !Number.isFinite(metric.value)) {
      return;
    }

    const dedupeKey = `${metric.id}:${metricName}`;
    if (sentMetricIdsRef.current.has(dedupeKey)) {
      return;
    }
    sentMetricIdsRef.current.add(dedupeKey);

    const body = JSON.stringify({
      metric_name: metricName,
      value: metric.value,
      id: metric.id,
      delta: metric.delta,
      rating: metric.rating,
      navigation_type: metric.navigationType,
      route_kind: routeKind,
      path: pathname,
      source: "web-vitals",
      sampled_at: new Date().toISOString(),
    });

    const endpoint = `/api/instances/${instanceId}/workflows/performance`;

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const payload = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(endpoint, payload);
      return;
    }

    void fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: true,
    });
  });

  return null;
}
