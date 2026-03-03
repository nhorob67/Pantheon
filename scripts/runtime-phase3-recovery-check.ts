import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface CliOptions {
  tenantId: string;
  customerId: string;
  appUrl: string;
  processorToken: string;
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
      "Usage: node --experimental-strip-types scripts/runtime-phase3-recovery-check.ts --tenant-id <uuid> --customer-id <uuid> [--app-url <url>] [--processor-token <token>]"
    );
  }
  return {
    tenantId,
    customerId,
    appUrl: appUrl.replace(/\/$/, ""),
    processorToken,
  };
}

function createAdminClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function callApi(
  options: CliOptions,
  path: string,
  method: "GET" | "POST"
): Promise<Response> {
  return fetch(`${options.appUrl}${path}`, {
    method,
    headers: {
      "x-tenant-runtime-processor-token": options.processorToken,
    },
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const admin = createAdminClient();
  const idempotency = `phase3-recovery:${randomUUID()}`;

  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .insert({
      tenant_id: options.tenantId,
      customer_id: options.customerId,
      run_kind: "discord_canary",
      source: "system",
      status: "queued",
      max_attempts: 1,
      idempotency_key: idempotency,
      request_trace_id: randomUUID(),
      correlation_id: idempotency,
      payload: {
        guild_id: "phase3-recovery-guild",
        channel_id: "",
        user_id: "phase3-recovery-user",
        message_id: randomUUID(),
        content: "phase3 recovery probe",
      },
      metadata: {
        recovery_probe: true,
      },
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to seed recovery probe run: ${error?.message || "unknown error"}`);
  }

  const runId = data.id as string;
  const processResponse = await callApi(options, "/api/admin/tenants/runtime/process-canary?batch=20", "POST");
  if (!processResponse.ok) {
    throw new Error(`Processor route failed during recovery probe (${processResponse.status})`);
  }

  const { data: failedRun, error: failedError } = await admin
    .from("tenant_runtime_runs")
    .select("id, status, metadata")
    .eq("id", runId)
    .single();
  if (failedError || !failedRun) {
    throw new Error(`Failed to read recovery probe run: ${failedError?.message || "unknown error"}`);
  }
  const metadata =
    failedRun.metadata && typeof failedRun.metadata === "object" && !Array.isArray(failedRun.metadata)
      ? (failedRun.metadata as Record<string, unknown>)
      : {};
  if (failedRun.status !== "failed" || metadata.dead_lettered !== true) {
    throw new Error("Dead-letter transition check failed");
  }

  const retryResponse = await callApi(
    options,
    `/api/admin/tenants/runtime/dead-letter/${runId}/retry`,
    "POST"
  );
  if (!retryResponse.ok) {
    throw new Error(`Dead-letter retry endpoint failed (${retryResponse.status})`);
  }

  const dismissResponse = await callApi(
    options,
    `/api/admin/tenants/runtime/dead-letter/${runId}/dismiss`,
    "POST"
  );
  if (!dismissResponse.ok) {
    throw new Error(`Dead-letter dismiss endpoint failed (${dismissResponse.status})`);
  }

  console.log(
    JSON.stringify(
      {
        run_id: runId,
        dead_lettered: true,
        retry_endpoint: "ok",
        dismiss_endpoint: "ok",
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
