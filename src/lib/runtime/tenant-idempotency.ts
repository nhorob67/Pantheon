import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const IDEMPOTENCY_HEADER = "idempotency-key";
export const LEGACY_IDEMPOTENCY_HEADER = "x-idempotency-key";
export const IDEMPOTENCY_RESPONSE_HEADER = "x-idempotency-key";
export const IDEMPOTENCY_REPLAYED_HEADER = "x-idempotency-replayed";

const IDEMPOTENT_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DEFAULT_TTL_SECONDS = 60 * 60 * 24;

function formatSafeErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as { message?: unknown };
    if (typeof candidate.message === "string" && candidate.message.trim().length > 0) {
      return candidate.message;
    }
  }

  return fallbackMessage;
}

interface TenantIdempotencyRow {
  idempotency_key: string;
  request_fingerprint: string;
  response_status: number;
  response_body: unknown;
}

export interface TenantIdempotencyContext {
  key: string;
  fingerprint: string;
  routePath: string;
  replayed: boolean;
}

export interface TenantIdempotencyReplay {
  status: number;
  body: unknown;
}

function normalizePath(pathname: string): string {
  const normalized = pathname.trim();
  if (!normalized.startsWith("/")) {
    return `/${normalized}`;
  }

  return normalized;
}

function resolveRawIdempotencyKey(headers: Headers): string | null {
  const direct = headers.get(IDEMPOTENCY_HEADER);
  if (typeof direct === "string" && direct.trim().length > 0) {
    return direct.trim();
  }

  const legacy = headers.get(LEGACY_IDEMPOTENCY_HEADER);
  if (typeof legacy === "string" && legacy.trim().length > 0) {
    return legacy.trim();
  }

  return null;
}

async function buildFingerprint(request: Request, key: string, routePath: string): Promise<string> {
  const cloned = request.clone();
  const bodyText = await cloned.text();
  const base = `${request.method.toUpperCase()}\n${routePath}\n${key}\n${bodyText}`;

  return createHash("sha256").update(base).digest("hex");
}

export function requiresTenantIdempotency(method: string): boolean {
  return IDEMPOTENT_METHODS.has(method.toUpperCase());
}

export async function resolveTenantIdempotencyContext(
  request: Request,
  requestTraceId: string
): Promise<TenantIdempotencyContext | null> {
  if (!requiresTenantIdempotency(request.method)) {
    return null;
  }

  const routePath = normalizePath(new URL(request.url).pathname);
  const resolvedKey =
    resolveRawIdempotencyKey(request.headers) || `${requestTraceId}:${randomUUID()}`;
  const fingerprint = await buildFingerprint(request, resolvedKey, routePath);

  return {
    key: resolvedKey,
    fingerprint,
    routePath,
    replayed: false,
  };
}

export async function findTenantIdempotentReplay(
  admin: SupabaseClient,
  tenantId: string,
  method: string,
  context: TenantIdempotencyContext
): Promise<TenantIdempotencyReplay | null> {
  const { data, error } = await admin
    .from("tenant_api_idempotency_keys")
    .select("idempotency_key, request_fingerprint, response_status, response_body")
    .eq("tenant_id", tenantId)
    .eq("http_method", method.toUpperCase())
    .eq("route_path", context.routePath)
    .eq("idempotency_key", context.key)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      formatSafeErrorMessage(error, "Failed to resolve tenant idempotency record")
    );
  }

  if (!data) {
    return null;
  }

  const row = data as TenantIdempotencyRow;

  if (row.request_fingerprint !== context.fingerprint) {
    throw {
      status: 409,
      message: "Idempotency key reuse with different request payload",
      details: {
        idempotency_key: row.idempotency_key,
      },
    };
  }

  return {
    status: row.response_status,
    body: row.response_body,
  };
}

export async function storeTenantIdempotentResponse(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  userId: string,
  method: string,
  context: TenantIdempotencyContext,
  response: TenantIdempotencyReplay,
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const { error } = await admin.from("tenant_api_idempotency_keys").upsert(
    {
      tenant_id: tenantId,
      customer_id: customerId,
      user_id: userId,
      route_path: context.routePath,
      http_method: method.toUpperCase(),
      idempotency_key: context.key,
      request_fingerprint: context.fingerprint,
      response_status: response.status,
      response_body: response.body,
      expires_at: expiresAt,
    },
    {
      onConflict: "tenant_id,route_path,http_method,idempotency_key",
      ignoreDuplicates: false,
    }
  );

  if (error) {
    throw new Error(
      formatSafeErrorMessage(error, "Failed to persist tenant idempotency response")
    );
  }
}
