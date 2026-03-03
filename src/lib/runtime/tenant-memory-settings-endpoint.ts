import {
  REQUEST_ID_HEADER,
  resolveRequestTraceIdFromHeaders,
} from "./request-trace.ts";
import type { TenantRole } from "./tenant-role-policy.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface TenantMemorySettingsUser {
  id: string;
  email?: string | null;
}

export interface TenantMemorySettingsTenantContext {
  tenantId: string;
  customerId: string;
  memberRole: TenantRole;
}

export interface TenantMemorySettingsRuntimeGates {
  reads_enabled: boolean;
  writes_enabled: boolean;
}

export interface TenantMemorySettingsLegacyMapping {
  instanceId: string | null;
  ambiguous: boolean;
}

export interface TenantMemoryMutationContextInput {
  tenantId: string;
  customerId: string;
  legacyInstanceId: string | null;
}

export interface TenantMemorySettingsGetResult {
  settings: unknown;
  source: "stored" | "default";
}

export interface TenantMemorySettingsEndpointDependencies {
  resolveUser: (request: Request) => Promise<TenantMemorySettingsUser | null>;
  resolveTenantContext: (
    userId: string,
    tenantId: string
  ) => Promise<TenantMemorySettingsTenantContext | null>;
  resolveRuntimeGates: (
    customerId: string
  ) => Promise<TenantMemorySettingsRuntimeGates>;
  resolveLegacyMapping: (
    tenantId: string
  ) => Promise<TenantMemorySettingsLegacyMapping>;
  canManageTenantRuntimeData: (role: TenantRole) => boolean;
  consumeConfigUpdateRateLimit: (
    userId: string
  ) => Promise<"ok" | "blocked" | "unavailable">;
  parseUpdatePayload: (
    body: unknown
  ) =>
    | { success: true; data: Record<string, unknown> }
    | { success: false; details?: unknown };
  createMemoryMutationContext: (
    input: TenantMemoryMutationContextInput
  ) => unknown;
  getTenantMemorySettings: (
    context: unknown
  ) => Promise<TenantMemorySettingsGetResult>;
  updateTenantMemorySettings: (
    context: unknown,
    payload: Record<string, unknown>,
    updatedBy: string
  ) => Promise<unknown>;
  notifyConfigChanged: (tenantId: string, reason: string) => Promise<void>;
  formatSafeErrorMessage: (error: unknown, fallbackMessage: string) => string;
}

interface TenantState {
  user: TenantMemorySettingsUser;
  tenantContext: TenantMemorySettingsTenantContext;
  runtimeGates: TenantMemorySettingsRuntimeGates;
  mapping: TenantMemorySettingsLegacyMapping;
}

function jsonWithRequestTrace(
  requestTraceId: string,
  body: Record<string, unknown>,
  init?: ResponseInit
): Response {
  const response = Response.json(body, init);
  response.headers.set(REQUEST_ID_HEADER, requestTraceId);
  return response;
}

function getUpdatedBy(user: TenantMemorySettingsUser): string {
  if (typeof user.email === "string" && user.email.length > 0) {
    return user.email;
  }

  return user.id;
}

function isServiceError(
  value: unknown
): value is { status: number; message: string; details?: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { status?: unknown }).status === "number" &&
    typeof (value as { message?: unknown }).message === "string"
  );
}

export function createTenantMemorySettingsEndpoint(
  dependencies: TenantMemorySettingsEndpointDependencies
) {
  async function resolveState(
    request: Request,
    tenantId: string,
    requestTraceId: string
  ): Promise<TenantState | Response> {
    if (!UUID_PATTERN.test(tenantId)) {
      return jsonWithRequestTrace(
        requestTraceId,
        { error: "Invalid tenant ID" },
        { status: 400 }
      );
    }

    const user = await dependencies.resolveUser(request);
    if (!user) {
      return jsonWithRequestTrace(
        requestTraceId,
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const tenantContext = await dependencies.resolveTenantContext(user.id, tenantId);
    if (!tenantContext) {
      return jsonWithRequestTrace(
        requestTraceId,
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    const [runtimeGates, mapping] = await Promise.all([
      dependencies.resolveRuntimeGates(tenantContext.customerId),
      dependencies.resolveLegacyMapping(tenantContext.tenantId),
    ]);

    return {
      user,
      tenantContext,
      runtimeGates,
      mapping,
    };
  }

  async function handleGet(request: Request, tenantId: string): Promise<Response> {
    const requestTraceId = resolveRequestTraceIdFromHeaders(request.headers);

    try {
      const state = await resolveState(request, tenantId, requestTraceId);
      if (state instanceof Response) {
        return state;
      }

      if (!state.runtimeGates.reads_enabled) {
        return jsonWithRequestTrace(
          requestTraceId,
          { error: "Tenant runtime reads are disabled for this tenant" },
          { status: 409 }
        );
      }

      const context = dependencies.createMemoryMutationContext({
        tenantId: state.tenantContext.tenantId,
        customerId: state.tenantContext.customerId,
        legacyInstanceId: state.mapping.instanceId,
      });
      const result = await dependencies.getTenantMemorySettings(context);

      const responseBody: Record<string, unknown> = {
        ...result,
        legacy_instance_id: state.mapping.instanceId,
      };
      if (state.mapping.ambiguous) {
        responseBody.warning =
          "Multiple active legacy instance mappings detected. Using most recent mapping for memory settings.";
      }

      return jsonWithRequestTrace(requestTraceId, responseBody);
    } catch (error) {
      if (isServiceError(error)) {
        return jsonWithRequestTrace(
          requestTraceId,
          { error: error.message, details: error.details },
          { status: error.status }
        );
      }

      return jsonWithRequestTrace(
        requestTraceId,
        {
          error: dependencies.formatSafeErrorMessage(
            error,
            "Failed to load tenant memory settings"
          ),
        },
        { status: 500 }
      );
    }
  }

  async function handlePut(request: Request, tenantId: string): Promise<Response> {
    const requestTraceId = resolveRequestTraceIdFromHeaders(request.headers);

    try {
      const state = await resolveState(request, tenantId, requestTraceId);
      if (state instanceof Response) {
        return state;
      }

      if (!dependencies.canManageTenantRuntimeData(state.tenantContext.memberRole)) {
        return jsonWithRequestTrace(
          requestTraceId,
          { error: "Insufficient role for tenant memory settings management" },
          { status: 403 }
        );
      }

      if (!state.runtimeGates.writes_enabled) {
        return jsonWithRequestTrace(
          requestTraceId,
          { error: "Tenant runtime writes are disabled for this tenant" },
          { status: 409 }
        );
      }

      const rateLimit = await dependencies.consumeConfigUpdateRateLimit(state.user.id);
      if (rateLimit === "unavailable") {
        return jsonWithRequestTrace(
          requestTraceId,
          { error: "Rate limiter unavailable. Please try again shortly." },
          { status: 503 }
        );
      }

      if (rateLimit === "blocked") {
        return jsonWithRequestTrace(
          requestTraceId,
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return jsonWithRequestTrace(
          requestTraceId,
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }

      const parsedBody = dependencies.parseUpdatePayload(body);
      if (!parsedBody.success) {
        return jsonWithRequestTrace(
          requestTraceId,
          { error: "Invalid data", details: parsedBody.details },
          { status: 400 }
        );
      }

      const context = dependencies.createMemoryMutationContext({
        tenantId: state.tenantContext.tenantId,
        customerId: state.tenantContext.customerId,
        legacyInstanceId: state.mapping.instanceId,
      });
      const settings = await dependencies.updateTenantMemorySettings(
        context,
        parsedBody.data,
        getUpdatedBy(state.user)
      );

      const rebuild = {
        attempted: !!state.mapping.instanceId,
        succeeded: false,
      };
      const warnings: string[] = [];

      if (state.mapping.instanceId) {
        try {
          await dependencies.notifyConfigChanged(state.mapping.instanceId, "memory_settings_updated");
          rebuild.succeeded = true;
        } catch {
          warnings.push(
            "Memory settings updated but config deploy failed. Try restarting."
          );
        }
      }

      if (state.mapping.ambiguous) {
        warnings.push(
          "Memory settings updated. Multiple active legacy instance mappings detected; using most recent mapping for deploy sync."
        );
      }

      const responseBody: Record<string, unknown> = {
        settings,
        rebuild,
        legacy_instance_id: state.mapping.instanceId,
      };
      if (warnings.length > 0) {
        responseBody.warning = warnings[0];
        responseBody.warnings = warnings;
      }

      return jsonWithRequestTrace(requestTraceId, responseBody);
    } catch (error) {
      if (isServiceError(error)) {
        return jsonWithRequestTrace(
          requestTraceId,
          { error: error.message, details: error.details },
          { status: error.status }
        );
      }

      return jsonWithRequestTrace(
        requestTraceId,
        {
          error: dependencies.formatSafeErrorMessage(
            error,
            "Failed to update tenant memory settings"
          ),
        },
        { status: 500 }
      );
    }
  }

  return {
    handleGet,
    handlePut,
  };
}
