import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface CliOptions {
  windowMinutes: number;
  runKind: "discord_runtime" | "discord_canary" | "all";
}

interface RuntimeRunRow {
  id: string;
  run_kind: "discord_runtime" | "discord_canary";
  status: "queued" | "running" | "awaiting_approval" | "completed" | "failed" | "canceled";
  queued_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  metadata: unknown;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (name === "NEXT_PUBLIC_SUPABASE_URL" && value.includes("your-project.supabase.co")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is still set to placeholder value 'https://your-project.supabase.co'"
    );
  }
  if (
    name === "SUPABASE_SERVICE_ROLE_KEY" &&
    (value.includes("your-service-role-key") || value === "your-service-role-key")
  ) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is still set to a placeholder value");
  }
  return value;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function parseArgs(argv: string[]): CliOptions {
  const getArg = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    if (index >= 0 && argv[index + 1]) {
      return argv[index + 1];
    }
    const prefixed = argv.find((arg) => arg.startsWith(`${flag}=`));
    if (prefixed) {
      return prefixed.slice(flag.length + 1);
    }
    return undefined;
  };

  const runKindRaw = getArg("--run-kind") || "discord_runtime";
  const runKind =
    runKindRaw === "discord_runtime" || runKindRaw === "discord_canary" || runKindRaw === "all"
      ? runKindRaw
      : "discord_runtime";

  return {
    windowMinutes: parseNumber(getArg("--window-minutes"), 60 * 24),
    runKind,
  };
}

function createAdminClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
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

function parseMemoryHit(metadata: unknown): boolean | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const row = metadata as Record<string, unknown>;
  if (typeof row.memory_hit === "boolean") {
    return row.memory_hit;
  }
  if (typeof row.retrieval_hit === "boolean") {
    return row.retrieval_hit;
  }
  return null;
}

async function loadRuns(
  admin: SupabaseClient,
  options: CliOptions
): Promise<RuntimeRunRow[]> {
  const sinceIso = new Date(Date.now() - options.windowMinutes * 60 * 1000).toISOString();
  let query = admin
    .from("tenant_runtime_runs")
    .select(
      "id, run_kind, status, queued_at, started_at, completed_at, metadata"
    )
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true })
    .limit(10000);

  if (options.runKind !== "all") {
    query = query.eq("run_kind", options.runKind);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load runtime runs for baseline SLO report: ${error.message}`);
  }
  return (data || []) as RuntimeRunRow[];
}

function buildBaselineReport(runs: RuntimeRunRow[], options: CliOptions) {
  const terminal = runs.filter((run) => run.status === "completed" || run.status === "failed");
  const completed = terminal.filter((run) => run.status === "completed").length;
  const failed = terminal.filter((run) => run.status === "failed").length;
  const successRate = terminal.length > 0 ? completed / terminal.length : null;

  const queueToTerminal = terminal
    .map((run) => toMs(run.queued_at, run.completed_at))
    .filter((value): value is number => typeof value === "number");
  const queueToStart = runs
    .map((run) => toMs(run.queued_at, run.started_at))
    .filter((value): value is number => typeof value === "number");

  const p95QueueToTerminalMs = percentile(queueToTerminal, 0.95);
  const p95QueueToStartMs = percentile(queueToStart, 0.95);

  const memoryHitSignals = runs
    .map((run) => parseMemoryHit(run.metadata))
    .filter((value): value is boolean => typeof value === "boolean");
  const memoryHitRate =
    memoryHitSignals.length > 0
      ? memoryHitSignals.filter(Boolean).length / memoryHitSignals.length
      : null;

  return {
    captured_at: new Date().toISOString(),
    window_minutes: options.windowMinutes,
    run_kind: options.runKind,
    sample_count: runs.length,
    terminal_count: terminal.length,
    success: {
      completed,
      failed,
      success_rate: successRate,
    },
    latency_ms: {
      p95_queue_to_terminal_ms: p95QueueToTerminalMs,
      p95_queue_to_start_ms: p95QueueToStartMs,
    },
    memory: {
      hit_rate: memoryHitRate,
      observed_signal_count: memoryHitSignals.length,
      note:
        memoryHitSignals.length === 0
          ? "No memory hit signal fields (metadata.memory_hit or metadata.retrieval_hit) were present in sampled runs."
          : null,
    },
    support_incidents: {
      value: null,
      note:
        "No tenant-runtime support incident table is currently available in this repository; track from external support tooling.",
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const admin = createAdminClient();
  const runs = await loadRuns(admin, options);
  const report = buildBaselineReport(runs, options);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
