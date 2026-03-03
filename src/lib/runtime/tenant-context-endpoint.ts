import {
  REQUEST_ID_HEADER,
  resolveRequestTraceIdFromHeaders,
} from "./request-trace.ts";
import type { TenantRole } from "./tenant-role-policy.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface TenantContext {
  tenantId: string;
  customerId: string;
  tenantSlug: string;
  tenantName: string;
  tenantStatus: string;
  memberRole: TenantRole;
  memberStatus: string;
}

export interface TenantRuntimeGates {
  reads_enabled: boolean;
  writes_enabled: boolean;
  discord_ingress_paused: boolean;
  tool_execution_paused: boolean;
  memory_writes_paused: boolean;
}

export interface TenantContextEndpointDependencies {
  resolveUserId: (request: Request) => Promise<string | null>;
  resolveTenantContext: (
    userId: string,
    tenantId: string
  ) => Promise<TenantContext | null>;
  resolveRuntimeGates: (customerId: string) => Promise<TenantRuntimeGates>;
  canManageTenantRuntimeData: (role: TenantRole) => boolean;
  canAdministerTenant: (role: TenantRole) => boolean;
  formatSafeErrorMessage: (error: unknown, fallbackMessage: string) => string;
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

export function createTenantContextEndpoint(
  dependencies: TenantContextEndpointDependencies
) {
  return async function handleTenantContext(
    request: Request,
    tenantId: string
  ): Promise<Response> {
    const requestTraceId = resolveRequestTraceIdFromHeaders(request.headers);

    if (!UUID_PATTERN.test(tenantId)) {
      return jsonWithRequestTrace(
        requestTraceId,
        { error: "Invalid tenant ID" },
        { status: 400 }
      );
    }

    const userId = await dependencies.resolveUserId(request);
    if (!userId) {
      return jsonWithRequestTrace(
        requestTraceId,
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    try {
      const tenantContext = await dependencies.resolveTenantContext(userId, tenantId);
      if (!tenantContext) {
        return jsonWithRequestTrace(
          requestTraceId,
          { error: "Tenant not found" },
          { status: 404 }
        );
      }

      const runtimeGates = await dependencies.resolveRuntimeGates(
        tenantContext.customerId
      );

      return jsonWithRequestTrace(requestTraceId, {
        tenant: {
          id: tenantContext.tenantId,
          customer_id: tenantContext.customerId,
          slug: tenantContext.tenantSlug,
          name: tenantContext.tenantName,
          status: tenantContext.tenantStatus,
        },
        membership: {
          role: tenantContext.memberRole,
          status: tenantContext.memberStatus,
          can_manage_runtime_data: dependencies.canManageTenantRuntimeData(
            tenantContext.memberRole
          ),
          can_admin_tenant: dependencies.canAdministerTenant(
            tenantContext.memberRole
          ),
        },
        runtime_gates: runtimeGates,
      });
    } catch (error) {
      return jsonWithRequestTrace(
        requestTraceId,
        {
          error: dependencies.formatSafeErrorMessage(
            error,
            "Failed to resolve tenant context"
          ),
        },
        { status: 500 }
      );
    }
  };
}
