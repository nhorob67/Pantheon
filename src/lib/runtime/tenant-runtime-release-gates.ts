import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";

const SELECT = [
  "id",
  "tenant_id",
  "customer_id",
  "run_kind",
  "status",
  "attempt_count",
  "max_attempts",
  "queued_at",
  "started_at",
  "completed_at",
  "updated_at",
  "metadata",
].join(", ");

export interface Phase3ReleaseGateThresholds {
  minSamples: number;
  minSuccessRate: number;
  maxP95QueueToTerminalMs: number;
  maxP95QueueToStartMs: number;
  maxDeadLetterOpen: number;
}

export interface Phase3ReleaseGateReport {
  passed: boolean;
  windowMinutes: number;
  sampleCount: number;
  thresholds: Phase3ReleaseGateThresholds;
  metrics: {
    successRate: number;
    p95QueueToTerminalMs: number | null;
    p95QueueToStartMs: number | null;
    deadLetterOpen: number;
    deadLetterRecovered: number;
    runsPerMinute: number;
  };
  checks: Array<{
    key: string;
    passed: boolean;
    actual: number | null;
    target: number;
    operator: ">=" | "<=";
  }>;
}

interface ReleaseGateRunRow {
  id: string;
  status: "queued" | "running" | "awaiting_approval" | "completed" | "failed" | "canceled";
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  metadata: unknown;
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function toMs(startIso: string | null, endIso: string | null): number | null {
  if (!startIso || !endIso) {
    return null;
  }
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null;
  }
  return Math.max(0, end - start);
}

function readDeadLetterMetadata(metadata: unknown): {
  deadLettered: boolean;
  deadLetterRecovered: boolean;
} {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { deadLettered: false, deadLetterRecovered: false };
  }
  const row = metadata as Record<string, unknown>;
  return {
    deadLettered: row.dead_lettered === true,
    deadLetterRecovered: row.dead_letter_retried === true || row.dead_letter_dismissed === true,
  };
}

export async function buildPhase3ReleaseGateReport(
  admin: SupabaseClient,
  {
    windowMinutes,
    thresholds,
  }: {
    windowMinutes: number;
    thresholds?: Partial<Phase3ReleaseGateThresholds>;
  }
): Promise<Phase3ReleaseGateReport> {
  const resolvedThresholds: Phase3ReleaseGateThresholds = {
    minSamples: thresholds?.minSamples ?? 50,
    minSuccessRate: thresholds?.minSuccessRate ?? 0.98,
    maxP95QueueToTerminalMs: thresholds?.maxP95QueueToTerminalMs ?? 30000,
    maxP95QueueToStartMs: thresholds?.maxP95QueueToStartMs ?? 5000,
    maxDeadLetterOpen: thresholds?.maxDeadLetterOpen ?? 0,
  };

  const sinceIso = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .select(SELECT)
    .eq("run_kind", "discord_canary")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true })
    .limit(10000);
  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to build Phase 3 release gate report"));
  }

  const runs = ((data || []) as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id || ""),
    status: (row.status as ReleaseGateRunRow["status"]) || "failed",
    queued_at: typeof row.queued_at === "string" ? row.queued_at : new Date(0).toISOString(),
    started_at: typeof row.started_at === "string" ? row.started_at : null,
    completed_at: typeof row.completed_at === "string" ? row.completed_at : null,
    metadata: row.metadata || {},
  }));
  const sampleCount = runs.length;
  const terminal = runs.filter((run) => run.status === "completed" || run.status === "failed");
  const successful = terminal.filter((run) => run.status === "completed").length;
  const successRate = terminal.length > 0 ? successful / terminal.length : 0;

  const queueToTerminal = terminal
    .map((run) => toMs(run.queued_at, run.completed_at))
    .filter((value): value is number => typeof value === "number");
  const queueToStart = runs
    .map((run) => toMs(run.queued_at, run.started_at))
    .filter((value): value is number => typeof value === "number");

  const p95QueueToTerminalMs = percentile(queueToTerminal, 0.95);
  const p95QueueToStartMs = percentile(queueToStart, 0.95);

  let deadLetterOpen = 0;
  let deadLetterRecovered = 0;
  for (const run of runs) {
    const deadLetter = readDeadLetterMetadata(run.metadata);
    if (deadLetter.deadLettered && run.status === "failed") {
      deadLetterOpen += 1;
      if (deadLetter.deadLetterRecovered) {
        deadLetterRecovered += 1;
      }
    }
  }

  const runsPerMinute = windowMinutes > 0 ? sampleCount / windowMinutes : 0;

  const checks = [
    {
      key: "sample_count",
      passed: sampleCount >= resolvedThresholds.minSamples,
      actual: sampleCount,
      target: resolvedThresholds.minSamples,
      operator: ">=" as const,
    },
    {
      key: "success_rate",
      passed: successRate >= resolvedThresholds.minSuccessRate,
      actual: successRate,
      target: resolvedThresholds.minSuccessRate,
      operator: ">=" as const,
    },
    {
      key: "p95_queue_to_terminal_ms",
      passed:
        p95QueueToTerminalMs !== null &&
        p95QueueToTerminalMs <= resolvedThresholds.maxP95QueueToTerminalMs,
      actual: p95QueueToTerminalMs,
      target: resolvedThresholds.maxP95QueueToTerminalMs,
      operator: "<=" as const,
    },
    {
      key: "p95_queue_to_start_ms",
      passed:
        p95QueueToStartMs !== null &&
        p95QueueToStartMs <= resolvedThresholds.maxP95QueueToStartMs,
      actual: p95QueueToStartMs,
      target: resolvedThresholds.maxP95QueueToStartMs,
      operator: "<=" as const,
    },
    {
      key: "dead_letter_open",
      passed: deadLetterOpen <= resolvedThresholds.maxDeadLetterOpen,
      actual: deadLetterOpen,
      target: resolvedThresholds.maxDeadLetterOpen,
      operator: "<=" as const,
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    windowMinutes,
    sampleCount,
    thresholds: resolvedThresholds,
    metrics: {
      successRate,
      p95QueueToTerminalMs,
      p95QueueToStartMs,
      deadLetterOpen,
      deadLetterRecovered,
      runsPerMinute,
    },
    checks,
  };
}
