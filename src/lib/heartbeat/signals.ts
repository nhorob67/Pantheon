import { createHash } from "node:crypto";
import type {
  CheapCheckResult,
  HeartbeatIssueAttentionType,
} from "@/types/heartbeat";

export interface HeartbeatAlertSignal {
  key: string;
  summary: string | null;
  fingerprint: string;
  data: unknown;
  severity: number;
}

function normalizeForFingerprint(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeForFingerprint(item))
      .sort((left, right) => {
        const leftString = JSON.stringify(left);
        const rightString = JSON.stringify(right);
        return leftString.localeCompare(rightString);
      });
  }

  if (typeof value === "object" && value !== null) {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeForFingerprint(
          (value as Record<string, unknown>)[key]
        );
        return acc;
      }, {});
  }

  return value;
}

export function buildHeartbeatSignalFingerprint(
  key: string,
  data: unknown
): string {
  const normalized = JSON.stringify(normalizeForFingerprint(data ?? null));
  return createHash("sha256").update(`${key}:${normalized}`).digest("hex");
}

export function collectHeartbeatAlertSignals(
  results: Record<string, CheapCheckResult>
): HeartbeatAlertSignal[] {
  return Object.entries(results)
    .filter(([, result]) => result.status === "alert")
    .map(([key, result]) => ({
      key,
      summary: typeof result.summary === "string" ? result.summary : null,
      data: result.data ?? null,
      severity: deriveHeartbeatSignalSeverity(key, result.data ?? null),
      fingerprint: buildHeartbeatSignalFingerprint(key, result.data ?? result.summary ?? null),
    }));
}

export function deriveHeartbeatSignalSeverity(
  key: string,
  data: unknown
): number {
  if (key === "weather_severe" && Array.isArray(data)) {
    const severities = data
      .map((entry) =>
        typeof entry === "object" && entry !== null
          ? (entry as { severity?: unknown }).severity
          : null
      )
      .filter((value): value is string => typeof value === "string");

    if (severities.some((value) => value === "Extreme")) {
      return 5;
    }

    if (severities.some((value) => value === "Severe")) {
      return 4;
    }

    return 3;
  }

  if (key === "grain_price_movement" && Array.isArray(data)) {
    const maxChange = data.reduce<number>((maxValue, entry) => {
      if (
        typeof entry === "object"
        && entry !== null
        && typeof (entry as { change_cents?: unknown }).change_cents === "number"
      ) {
        return Math.max(
          maxValue,
          Math.abs((entry as { change_cents: number }).change_cents)
        );
      }

      return maxValue;
    }, 0);

    if (maxChange >= 50) return 5;
    if (maxChange >= 25) return 4;
    if (maxChange >= 10) return 3;
    return 2;
  }

  if (
    (key === "unreviewed_tickets" || key === "unanswered_emails")
    && typeof data === "object"
    && data !== null
    && typeof (data as { count?: unknown }).count === "number"
  ) {
    const count = (data as { count: number }).count;
    if (count >= 10) return 5;
    if (count >= 5) return 4;
    if (count >= 2) return 3;
    return 2;
  }

  if (
    key === "custom_checks"
    && typeof data === "object"
    && data !== null
    && Array.isArray((data as { items?: unknown }).items)
  ) {
    const count = ((data as { items: unknown[] }).items).length;
    if (count >= 5) return 4;
    return 3;
  }

  return 2;
}

export function prefixHeartbeatIssueSummary(
  attentionType: HeartbeatIssueAttentionType,
  summary: string
): string {
  if (attentionType === "new_issue") {
    return `New issue: ${summary}`;
  }

  if (attentionType === "worsened") {
    return `Worsened: ${summary}`;
  }

  return `Still unresolved: ${summary}`;
}

export function buildHeartbeatPreviewText(
  signalSummaries: string[]
): string {
  if (signalSummaries.length === 0) {
    return "No alert would be sent right now. All enabled checks are clear.";
  }

  if (signalSummaries.length === 1) {
    return signalSummaries[0] as string;
  }

  return signalSummaries.map((summary) => `- ${summary}`).join("\n");
}
