import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCoolifyClient } from "@/lib/coolify/client";
import { isAdmin } from "@/lib/auth/admin";
import { constantTimeTokenInSet } from "@/lib/security/constant-time";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { decrypt } from "@/lib/crypto";

export const runtime = "nodejs";

const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;
const MAX_ERROR_LENGTH = 2000;
const DEFAULT_GATEWAY_PORT = 18789;
const DEFAULT_MEMORY_OPERATION_TIMEOUT_SECONDS = 300;
const DEFAULT_MEMORY_OPERATION_YIELD_MS = 300000;
const DEFAULT_VAULT_PATH = "/home/node/.openclaw/vault";

interface ProcessMemoryOperationsBody {
  batch_size?: number;
}

interface ClaimedMemoryOperation {
  id: string;
  instance_id: string;
  customer_id: string;
  operation_type: "checkpoint" | "compress";
  input: Record<string, unknown> | null;
}

interface MemoryExecutionInstance {
  id: string;
  coolify_uuid: string | null;
  server_ip: string | null;
  channel_config: unknown;
}

interface GatewayToolInvokeEnvelope {
  ok?: boolean;
  result?: unknown;
  error?: {
    type?: string;
    message?: string;
  };
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const parsed = Math.trunc(value);
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

function errorToMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}

function readOptionalPositiveInt(raw: string | undefined): number | null {
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const value = Math.trunc(parsed);
  return value > 0 ? value : null;
}

function getGatewayPort(): number {
  return (
    readOptionalPositiveInt(process.env.FARMCLAW_GATEWAY_PORT) ||
    DEFAULT_GATEWAY_PORT
  );
}

function getOperationTimeoutSeconds(): number {
  return (
    readOptionalPositiveInt(process.env.FARMCLAW_MEMORY_OPERATION_TIMEOUT_SECONDS) ||
    DEFAULT_MEMORY_OPERATION_TIMEOUT_SECONDS
  );
}

function getOperationYieldMs(): number {
  return (
    readOptionalPositiveInt(process.env.FARMCLAW_MEMORY_OPERATION_YIELD_MS) ||
    DEFAULT_MEMORY_OPERATION_YIELD_MS
  );
}

function getGatewayPasswordFromChannelConfig(channelConfig: unknown): string | null {
  const config = (channelConfig ?? {}) as {
    gateway_password_encrypted?: unknown;
  };

  if (
    typeof config.gateway_password_encrypted === "string" &&
    config.gateway_password_encrypted.length > 0
  ) {
    try {
      return decrypt(config.gateway_password_encrypted);
    } catch {
      return null;
    }
  }

  return null;
}

function getMemoryCommand(operationType: ClaimedMemoryOperation["operation_type"]): string {
  const checkpointOverride = process.env.FARMCLAW_MEMORY_CHECKPOINT_COMMAND?.trim();
  const compressOverride = process.env.FARMCLAW_MEMORY_COMPRESS_COMMAND?.trim();

  if (operationType === "checkpoint" && checkpointOverride) {
    return checkpointOverride;
  }

  if (operationType === "compress" && compressOverride) {
    return compressOverride;
  }

  if (operationType === "checkpoint") {
    return `bash -lc 'if command -v clawvault >/dev/null 2>&1; then clawvault checkpoint --vault "\${FARMCLAW_VAULT_PATH:-${DEFAULT_VAULT_PATH}}"; else echo "clawvault CLI not found" >&2; exit 127; fi'`;
  }

  return `bash -lc 'if command -v clawvault >/dev/null 2>&1; then clawvault compress --vault "\${FARMCLAW_VAULT_PATH:-${DEFAULT_VAULT_PATH}}"; else echo "clawvault CLI not found" >&2; exit 127; fi'`;
}

function extractExitCode(result: unknown): number | null {
  if (!result || typeof result !== "object") {
    return null;
  }

  const record = result as Record<string, unknown>;
  const direct =
    record.exitCode ?? record.exit_code ?? record.code ?? record.exit_code_int;

  if (typeof direct === "number" && Number.isFinite(direct)) {
    return Math.trunc(direct);
  }

  if (typeof direct === "string" && /^-?\d+$/.test(direct.trim())) {
    return Number(direct.trim());
  }

  return null;
}

function extractStatus(result: unknown): string | null {
  if (!result || typeof result !== "object") {
    return null;
  }

  const status = (result as Record<string, unknown>).status;
  return typeof status === "string" ? status : null;
}

async function invokeGatewayMemoryOperation(
  instance: MemoryExecutionInstance,
  operation: ClaimedMemoryOperation
): Promise<Record<string, unknown>> {
  if (!instance.server_ip) {
    throw new Error("Instance has no server IP");
  }

  const gatewayPassword = getGatewayPasswordFromChannelConfig(instance.channel_config);
  if (!gatewayPassword) {
    throw new Error("Gateway password is unavailable");
  }

  const gatewayPort = getGatewayPort();
  const timeoutSeconds = getOperationTimeoutSeconds();
  const yieldMs = getOperationYieldMs();
  const command = getMemoryCommand(operation.operation_type);
  const gatewayUrl = `http://${instance.server_ip}:${gatewayPort}/tools/invoke`;

  const response = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${gatewayPassword}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tool: "exec",
      action: "json",
      sessionKey: "main",
      args: {
        command,
        timeout: timeoutSeconds,
        yieldMs,
        background: false,
        pty: false,
      },
    }),
    signal: AbortSignal.timeout((timeoutSeconds + 20) * 1000),
  });

  const rawBody = await response.text();
  let payload: GatewayToolInvokeEnvelope | null = null;

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as GatewayToolInvokeEnvelope;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      payload?.error?.message ||
      `Gateway returned HTTP ${response.status} for memory operation`;
    throw new Error(errorMessage);
  }

  if (payload?.ok === false) {
    throw new Error(payload.error?.message || "Gateway tool invocation failed");
  }

  const exitCode = extractExitCode(payload?.result);
  if (exitCode !== null && exitCode !== 0) {
    throw new Error(`Memory command exited with code ${exitCode}`);
  }

  const status = extractStatus(payload?.result);
  if (status === "failed" || status === "error") {
    throw new Error(`Gateway exec status=${status}`);
  }

  return {
    executor: "gateway.tools_invoke.exec",
    command,
    gateway_port: gatewayPort,
    timeout_seconds: timeoutSeconds,
    yield_ms: yieldMs,
    tool_result: payload?.result ?? rawBody,
  };
}

async function parseBody(request: Request): Promise<ProcessMemoryOperationsBody> {
  try {
    const body = (await request.json()) as ProcessMemoryOperationsBody;
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

function parseQueryParams(request: Request): ProcessMemoryOperationsBody {
  try {
    const searchParams = new URL(request.url).searchParams;
    const batchSizeRaw = searchParams.get("batch_size");
    const batchSize = batchSizeRaw ? Number(batchSizeRaw) : undefined;

    return Number.isFinite(batchSize) ? { batch_size: batchSize } : {};
  } catch {
    return {};
  }
}

interface AuthorizationOptions {
  allowSessionAuth: boolean;
}

async function isAuthorized(
  request: Request,
  options: AuthorizationOptions
): Promise<boolean> {
  const expectedTokens = [
    process.env.MEMORY_PROCESSOR_TOKEN,
    process.env.CRON_SECRET,
  ].filter((value): value is string => !!value && value.trim().length > 0);
  const bearerHeader = request.headers.get("authorization");
  const bearerToken =
    bearerHeader && bearerHeader.toLowerCase().startsWith("bearer ")
      ? bearerHeader.slice(7).trim()
      : null;
  const headerToken = request.headers.get("x-memory-processor-token");
  const providedToken = headerToken || bearerToken;

  if (providedToken && constantTimeTokenInSet(providedToken, expectedTokens)) {
    return true;
  }

  if (!options.allowSessionAuth) {
    return false;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return !!(user && isAdmin(user.email));
}

async function markOperationCompleted(
  operationId: string,
  result: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("memory_operations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      error_message: null,
      result,
    })
    .eq("id", operationId);

  if (error) {
    throw new Error(error.message);
  }
}

async function markOperationFailed(operationId: string, errorMessage: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("memory_operations")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq("id", operationId);

  if (error) {
    throw new Error(error.message);
  }
}

interface ProcessMemoryRequestOptions {
  body: ProcessMemoryOperationsBody;
  allowSessionAuth: boolean;
}

async function processMemoryOperationsRequest(
  request: Request,
  options: ProcessMemoryRequestOptions
) {
  const authorized = await isAuthorized(request, {
    allowSessionAuth: options.allowSessionAuth,
  });
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batchSize = clampInt(
    options.body.batch_size,
    DEFAULT_BATCH_SIZE,
    1,
    MAX_BATCH_SIZE
  );

  const admin = createAdminClient();
  const { data: claimedData, error: claimError } = await admin.rpc(
    "claim_memory_operations",
    {
      p_limit: batchSize,
    }
  );

  if (claimError) {
    return NextResponse.json(
      { error: safeErrorMessage(claimError, "Failed to claim memory operations") },
      { status: 500 }
    );
  }

  const claimed = (claimedData || []) as ClaimedMemoryOperation[];
  if (claimed.length === 0) {
    return NextResponse.json({
      claimed: 0,
      completed: 0,
      failed: 0,
    });
  }

  const instanceIds = Array.from(new Set(claimed.map((operation) => operation.instance_id)));
  const { data: instances, error: instanceError } = await admin
    .from("instances")
    .select("id, coolify_uuid, server_ip, channel_config")
    .in("id", instanceIds);

  if (instanceError) {
    const nowIso = new Date().toISOString();
    await admin
      .from("memory_operations")
      .update({
        status: "failed",
        completed_at: nowIso,
        error_message: "Failed to load instances for operation execution",
      })
      .in(
        "id",
        claimed.map((operation) => operation.id)
      )
      .eq("status", "running");

    return NextResponse.json(
      { error: safeErrorMessage(instanceError, "Failed to load instances") },
      { status: 500 }
    );
  }

  const typedInstances = (instances || []) as MemoryExecutionInstance[];
  const instanceById = new Map(typedInstances.map((instance) => [instance.id, instance]));
  const coolify = getCoolifyClient();

  let completed = 0;
  let failed = 0;

  for (const operation of claimed) {
    const instance = instanceById.get(operation.instance_id);

    if (!instance) {
      try {
        await markOperationFailed(
          operation.id,
          "Instance metadata not found for operation execution"
        );
      } catch {
        // Best effort operation state update.
      }
      failed++;
      continue;
    }

    const errors: string[] = [];

    try {
      const runtimeResult = await invokeGatewayMemoryOperation(instance, operation);
      await markOperationCompleted(operation.id, {
        ...runtimeResult,
        operation_type: operation.operation_type,
        processed_at: new Date().toISOString(),
        input: operation.input || {},
      });

      completed++;
      continue;
    } catch (error) {
      errors.push(`runtime invoke failed: ${errorToMessage(error)}`);
    }

    if (instance.coolify_uuid) {
      try {
        await coolify.restartApplication(instance.coolify_uuid);

        await markOperationCompleted(operation.id, {
          executor: "coolify.restartApplication",
          fallback_from: "gateway.tools_invoke.exec",
          runtime_error: errors[0],
          operation_type: operation.operation_type,
          processed_at: new Date().toISOString(),
          input: operation.input || {},
        });

        completed++;
        continue;
      } catch (error) {
        errors.push(`restart fallback failed: ${errorToMessage(error)}`);
      }
    }

    try {
      await markOperationFailed(operation.id, errors.join(" | "));
    } catch {
      // Best effort operation state update.
    }
    failed++;
  }

  return NextResponse.json({
    claimed: claimed.length,
    completed,
    failed,
  });
}

export async function POST(request: Request) {
  const body = await parseBody(request);
  return processMemoryOperationsRequest(request, {
    body,
    allowSessionAuth: true,
  });
}

export async function GET(request: Request) {
  const body = parseQueryParams(request);
  return processMemoryOperationsRequest(request, {
    body,
    allowSessionAuth: false,
  });
}
