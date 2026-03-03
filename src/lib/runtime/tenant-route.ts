import type { User } from "@supabase/supabase-js";
import type { ZodType } from "zod/v4";
import { createAdminClient } from "../supabase/admin.ts";
import { createClient } from "../supabase/server.ts";
import { safeErrorMessage } from "../security/safe-error.ts";
import {
  IDEMPOTENCY_REPLAYED_HEADER,
  IDEMPOTENCY_RESPONSE_HEADER,
  findTenantIdempotentReplay,
  resolveTenantIdempotencyContext,
  storeTenantIdempotentResponse,
} from "./tenant-idempotency";
import {
  canManageTenantRuntimeData,
  resolveAuthorizedTenantContext,
} from "./tenant-auth";
import { REQUEST_ID_HEADER, resolveRequestTraceIdFromHeaders } from "./request-trace";
import { resolveTenantRuntimeGateState } from "./tenant-runtime-gates";

type TenantRouteGate = "reads" | "writes";

const TENANT_API_VERSION = "2026-02-24";

export interface TenantRouteState {
  requestTraceId: string;
  user: User;
  admin: ReturnType<typeof createAdminClient>;
  tenantContext: NonNullable<
    Awaited<ReturnType<typeof resolveAuthorizedTenantContext>>
  >;
  runtimeGates: Awaited<ReturnType<typeof resolveTenantRuntimeGateState>>;
}

interface ServiceLikeError {
  status: number;
  message: string;
  details?: unknown;
}

interface TenantEnvelopeError {
  message: string;
  details?: unknown;
}

interface TenantEnvelope {
  version: string;
  request_id: string;
  idempotency_key: string | null;
  idempotency_replayed: boolean;
  data: unknown;
  error: TenantEnvelopeError | null;
}

export interface TenantRouteOptions {
  tenantId: string;
  requestTraceId?: string;
  requiredGate?: TenantRouteGate;
  requireManageRuntimeData?: boolean;
  roleErrorMessage?: string;
  fallbackErrorMessage: string;
}

interface ParsedTenantRouteParams<T> {
  requestTraceId: string;
  data: T;
}

function isServiceLikeError(value: unknown): value is ServiceLikeError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { status?: unknown }).status === "number" &&
    typeof (value as { message?: unknown }).message === "string"
  );
}

function normalizeTenantEnvelopeError(body: unknown): TenantEnvelopeError {
  if (typeof body === "object" && body !== null) {
    const candidate = body as {
      error?: unknown;
      message?: unknown;
      details?: unknown;
    };

    if (typeof candidate.error === "string") {
      return {
        message: candidate.error,
        ...(candidate.details !== undefined ? { details: candidate.details } : {}),
      };
    }

    if (typeof candidate.message === "string") {
      return {
        message: candidate.message,
        ...(candidate.details !== undefined ? { details: candidate.details } : {}),
      };
    }
  }

  return {
    message: "Request failed",
  };
}

function buildTenantEnvelope({
  requestTraceId,
  status,
  body,
  idempotencyKey,
  idempotencyReplayed,
}: {
  requestTraceId: string;
  status: number;
  body: unknown;
  idempotencyKey: string | null;
  idempotencyReplayed: boolean;
}): TenantEnvelope {
  if (status >= 400) {
    return {
      version: TENANT_API_VERSION,
      request_id: requestTraceId,
      idempotency_key: idempotencyKey,
      idempotency_replayed: idempotencyReplayed,
      data: null,
      error: normalizeTenantEnvelopeError(body),
    };
  }

  return {
    version: TENANT_API_VERSION,
    request_id: requestTraceId,
    idempotency_key: idempotencyKey,
    idempotency_replayed: idempotencyReplayed,
    data: body,
    error: null,
  };
}

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type") || "";
  return contentType.toLowerCase().includes("application/json");
}

async function readJsonResponseBody(response: Response): Promise<unknown> {
  const cloned = response.clone();
  try {
    return await cloned.json();
  } catch {
    return {
      message: "Invalid JSON response body",
    };
  }
}

function withStandardTenantHeaders<T extends Response>(
  response: T,
  requestTraceId: string,
  idempotencyKey: string | null,
  idempotencyReplayed: boolean
): T {
  response.headers.set(REQUEST_ID_HEADER, requestTraceId);
  if (idempotencyKey) {
    response.headers.set(IDEMPOTENCY_RESPONSE_HEADER, idempotencyKey);
  }
  response.headers.set(IDEMPOTENCY_REPLAYED_HEADER, idempotencyReplayed ? "true" : "false");
  return response;
}

async function toTenantEnvelopeResponse(
  response: Response,
  requestTraceId: string,
  idempotencyKey: string | null,
  idempotencyReplayed: boolean
): Promise<{ response: Response; envelope: TenantEnvelope | null }> {
  if (!isJsonResponse(response)) {
    return {
      response: withStandardTenantHeaders(
        response,
        requestTraceId,
        idempotencyKey,
        idempotencyReplayed
      ),
      envelope: null,
    };
  }

  const body = await readJsonResponseBody(response);
  const envelope = buildTenantEnvelope({
    requestTraceId,
    status: response.status,
    body,
    idempotencyKey,
    idempotencyReplayed,
  });

  const wrapped = Response.json(envelope, {
    status: response.status,
    headers: response.headers,
  });

  return {
    response: withStandardTenantHeaders(
      wrapped,
      requestTraceId,
      idempotencyKey,
      idempotencyReplayed
    ),
    envelope,
  };
}

function asReplayEnvelope(
  value: unknown,
  requestTraceId: string,
  idempotencyKey: string
): TenantEnvelope {
  const candidate = value as Partial<TenantEnvelope> | null;
  if (
    candidate &&
    typeof candidate === "object" &&
    typeof candidate.version === "string" &&
    (candidate.error === null || typeof candidate.error === "object")
  ) {
    return {
      version: candidate.version,
      request_id: requestTraceId,
      idempotency_key: idempotencyKey,
      idempotency_replayed: true,
      data: candidate.data ?? null,
      error:
        candidate.error && typeof candidate.error === "object"
          ? {
              message:
                typeof (candidate.error as { message?: unknown }).message === "string"
                  ? ((candidate.error as { message: string }).message)
                  : "Request failed",
              ...((candidate.error as { details?: unknown }).details !== undefined
                ? { details: (candidate.error as { details?: unknown }).details }
                : {}),
            }
          : null,
    };
  }

  return buildTenantEnvelope({
    requestTraceId,
    status: 200,
    body: value,
    idempotencyKey,
    idempotencyReplayed: true,
  });
}

export function withTenantRequestTraceHeader<T extends Response>(
  response: T,
  requestTraceId: string
): T {
  return withStandardTenantHeaders(response, requestTraceId, null, false);
}

export function jsonWithTenantRequestTrace(
  requestTraceId: string,
  body: Record<string, unknown>,
  init?: ResponseInit
): Response {
  const status = init?.status ?? 200;
  const envelope = buildTenantEnvelope({
    requestTraceId,
    status,
    body,
    idempotencyKey: null,
    idempotencyReplayed: false,
  });
  const response = Response.json(envelope, init);
  return withStandardTenantHeaders(response, requestTraceId, null, false);
}

export async function parseTenantRouteParams<T>({
  request,
  params,
  schema,
  errorMessage,
}: {
  request: Request;
  params: Promise<unknown>;
  schema: ZodType<T>;
  errorMessage: string;
}): Promise<ParsedTenantRouteParams<T> | Response> {
  const requestTraceId = resolveRequestTraceIdFromHeaders(request.headers);
  const parsed = schema.safeParse(await params);

  if (!parsed.success) {
    return jsonWithTenantRequestTrace(
      requestTraceId,
      { error: errorMessage },
      { status: 400 }
    );
  }

  return {
    requestTraceId,
    data: parsed.data,
  };
}

export async function runTenantRoute(
  request: Request,
  options: TenantRouteOptions,
  handler: (state: TenantRouteState) => Promise<Response>
): Promise<Response> {
  const requestTraceId =
    options.requestTraceId ?? resolveRequestTraceIdFromHeaders(request.headers);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonWithTenantRequestTrace(
        requestTraceId,
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const tenantContext = await resolveAuthorizedTenantContext(
      supabase,
      user.id,
      options.tenantId
    );
    if (!tenantContext) {
      return jsonWithTenantRequestTrace(
        requestTraceId,
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    if (
      options.requireManageRuntimeData &&
      !canManageTenantRuntimeData(tenantContext.memberRole)
    ) {
      return jsonWithTenantRequestTrace(
        requestTraceId,
        {
          error:
            options.roleErrorMessage ??
            "Insufficient role for tenant runtime data management",
        },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const runtimeGates = await resolveTenantRuntimeGateState(
      admin,
      tenantContext.customerId
    );

    if (options.requiredGate === "reads" && !runtimeGates.reads_enabled) {
      return jsonWithTenantRequestTrace(
        requestTraceId,
        { error: "Tenant runtime reads are disabled for this tenant" },
        { status: 409 }
      );
    }

    if (options.requiredGate === "writes" && !runtimeGates.writes_enabled) {
      return jsonWithTenantRequestTrace(
        requestTraceId,
        { error: "Tenant runtime writes are disabled for this tenant" },
        { status: 409 }
      );
    }

    const idempotency = await resolveTenantIdempotencyContext(request, requestTraceId);
    if (idempotency) {
      const replay = await findTenantIdempotentReplay(
        admin,
        tenantContext.tenantId,
        request.method,
        idempotency
      );

      if (replay) {
        const replayEnvelope = asReplayEnvelope(
          replay.body,
          requestTraceId,
          idempotency.key
        );
        const replayResponse = Response.json(replayEnvelope, {
          status: replay.status,
        });
        return withStandardTenantHeaders(
          replayResponse,
          requestTraceId,
          idempotency.key,
          true
        );
      }
    }

    const rawResponse = await handler({
      requestTraceId,
      user,
      admin,
      tenantContext,
      runtimeGates,
    });

    const wrapped = await toTenantEnvelopeResponse(
      rawResponse,
      requestTraceId,
      idempotency?.key || null,
      false
    );

    if (idempotency && wrapped.envelope && wrapped.response.status < 500) {
      await storeTenantIdempotentResponse(
        admin,
        tenantContext.tenantId,
        tenantContext.customerId,
        user.id,
        request.method,
        idempotency,
        {
          status: wrapped.response.status,
          body: wrapped.envelope,
        }
      );
    }

    return wrapped.response;
  } catch (error) {
    if (isServiceLikeError(error)) {
      return jsonWithTenantRequestTrace(
        requestTraceId,
        { error: error.message, details: error.details },
        { status: error.status }
      );
    }

    return jsonWithTenantRequestTrace(
      requestTraceId,
      {
        error: safeErrorMessage(error, options.fallbackErrorMessage),
      },
      { status: 500 }
    );
  }
}
