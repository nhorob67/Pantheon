import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface CliOptions {
  tenantId: string;
  customerId: string;
  appUrl: string;
  processorToken: string;
  runs: number;
  batch: number;
  maxP95QueueToTerminalMs: number;
  minSuccessRate: number;
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

  const tenantId = getArg("--tenant-id");
  const customerId = getArg("--customer-id");
  const appUrl = getArg("--app-url") || process.env.NEXT_PUBLIC_APP_URL;
  const processorToken =
    getArg("--processor-token") || process.env.TENANT_RUNTIME_PROCESSOR_TOKEN;

  if (!tenantId || !customerId || !appUrl || !processorToken) {
    throw new Error(
      "Usage: node --experimental-strip-types scripts/runtime-phase3-load-test.ts --tenant-id <uuid> --customer-id <uuid> [--app-url <url>] [--processor-token <token>] [--runs <n>] [--batch <n>] [--max-p95-queue-to-terminal-ms <n>] [--min-success-rate <n>]"
    );
  }

  return {
    tenantId,
    customerId,
    appUrl: appUrl.replace(/\/$/, ""),
    processorToken,
    runs: parseNumber(getArg("--runs"), 200),
    batch: parseNumber(getArg("--batch"), 50),
    maxP95QueueToTerminalMs: parseNumber(getArg("--max-p95-queue-to-terminal-ms"), 30000),
    minSuccessRate: Number(getArg("--min-success-rate") || "0.98"),
  };
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

function createAdminClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function enqueueSyntheticRuns(admin: SupabaseClient, options: CliOptions): Promise<string[]> {
  const nowIso = new Date().toISOString();
  const rows = Array.from({ length: options.runs }).map((_, index) => ({
    tenant_id: options.tenantId,
    customer_id: options.customerId,
    run_kind: "discord_canary",
    source: "system",
    status: "queued",
    idempotency_key: `phase3-load:${randomUUID()}:${index}`,
    request_trace_id: randomUUID(),
    correlation_id: `phase3-load-${index}`,
    payload: {
      guild_id: "phase3-load-guild",
      channel_id: "phase3-load-channel",
      user_id: "phase3-load-user",
      message_id: randomUUID(),
      content: `Phase 3 load test message ${index}`,
      ingress_mode: "discord_canary",
    },
    metadata: {
      load_test: true,
      load_test_run_id: nowIso,
      ingress_channel_id: "phase3-load-channel",
      ingress_user_id: "phase3-load-user",
      estimated_input_tokens: 8,
      requested_tool_calls: 0,
    },
    queued_at: nowIso,
  }));

  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .insert(rows)
    .select("id");
  if (error) {
    throw new Error(`Failed to enqueue load test runs: ${error.message}`);
  }
  return ((data || []) as Array<{ id: string }>).map((row) => row.id);
}

async function processBatch(options: CliOptions): Promise<void> {
  const response = await fetch(
    `${options.appUrl}/api/admin/tenants/runtime/process-canary?batch=${options.batch}`,
    {
      method: "POST",
      headers: {
        "x-tenant-runtime-processor-token": options.processorToken,
      },
    }
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Processor route failed (${response.status}): ${body}`);
  }
}

async function waitForCompletion(
  admin: SupabaseClient,
  runIds: string[],
  options: CliOptions
): Promise<Array<{ id: string; status: string; queued_at: string; completed_at: string | null }>> {
  const timeoutMs = 3 * 60 * 1000;
  const startMs = Date.now();

  while (true) {
    const { data, error } = await admin
      .from("tenant_runtime_runs")
      .select("id, status, queued_at, completed_at")
      .in("id", runIds);
    if (error) {
      throw new Error(`Failed to read load test run status: ${error.message}`);
    }

    const rows = (data || []) as Array<{
      id: string;
      status: string;
      queued_at: string;
      completed_at: string | null;
    }>;
    const active = rows.filter(
      (row) => row.status === "queued" || row.status === "running" || row.status === "awaiting_approval"
    );
    if (active.length === 0) {
      return rows;
    }

    if (Date.now() - startMs > timeoutMs) {
      throw new Error(`Timed out waiting for load test completion (${active.length} active)`);
    }

    await processBatch(options);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const admin = createAdminClient();

  console.log("Enqueuing synthetic runs...");
  const runIds = await enqueueSyntheticRuns(admin, options);
  console.log(`Queued ${runIds.length} runs`);

  const startedAt = Date.now();
  const rows = await waitForCompletion(admin, runIds, options);
  const durationMs = Date.now() - startedAt;

  const completed = rows.filter((row) => row.status === "completed").length;
  const failed = rows.filter((row) => row.status === "failed").length;
  const successRate = rows.length > 0 ? completed / rows.length : 0;
  const latencies = rows
    .map((row) => {
      if (!row.completed_at) {
        return null;
      }
      return Math.max(0, Date.parse(row.completed_at) - Date.parse(row.queued_at));
    })
    .filter((value): value is number => typeof value === "number");
  const p95 = percentile(latencies, 0.95);
  const runsPerMinute = rows.length / Math.max(1, durationMs / 60000);

  console.log(
    JSON.stringify(
      {
        runs: rows.length,
        completed,
        failed,
        duration_ms: durationMs,
        success_rate: successRate,
        p95_queue_to_terminal_ms: p95,
        runs_per_minute: runsPerMinute,
      },
      null,
      2
    )
  );

  if (successRate < options.minSuccessRate) {
    throw new Error(
      `Load-test success rate gate failed (${successRate.toFixed(3)} < ${options.minSuccessRate})`
    );
  }
  if (p95 === null || p95 > options.maxP95QueueToTerminalMs) {
    throw new Error(
      `Load-test p95 gate failed (${String(p95)} > ${options.maxP95QueueToTerminalMs})`
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
