import type { NextResponse } from "next/server";
import { withRequestTraceHeader } from "./request-trace.ts";
import type { TenantRuntimeGateState } from "./tenant-runtime-gates.ts";

export const INSTANCE_BRIDGE_ROUTE_MODE_HEADER = "X-FarmClaw-Route-Mode";
export const INSTANCE_BRIDGE_ROUTE_MODE_VALUE = "tenant-bridge";
export const INSTANCE_BRIDGE_TENANT_ID_HEADER = "X-FarmClaw-Tenant-Id";
export const INSTANCE_BRIDGE_DEPRECATION_HEADER = "Deprecation";
export const INSTANCE_BRIDGE_SUNSET_HEADER = "Sunset";
export const INSTANCE_BRIDGE_DEPRECATION_VALUE = "true";
export const INSTANCE_BRIDGE_SUNSET_VALUE = "Wed, 01 Jul 2026 00:00:00 GMT";

function hasTenantId(tenantId: string | null | undefined): tenantId is string {
  return typeof tenantId === "string" && tenantId.trim().length > 0;
}

export function shouldBridgeInstanceRead(
  runtimeGates: Pick<TenantRuntimeGateState, "reads_enabled">,
  tenantId: string | null | undefined
): tenantId is string {
  return runtimeGates.reads_enabled && hasTenantId(tenantId);
}

export function shouldBridgeInstanceWrite(
  runtimeGates: Pick<TenantRuntimeGateState, "writes_enabled">,
  tenantId: string | null | undefined
): tenantId is string {
  return runtimeGates.writes_enabled && hasTenantId(tenantId);
}

export function withInstanceBridgeHeaders(
  response: NextResponse,
  tenantId: string,
  requestTraceId?: string
): NextResponse {
  response.headers.set(
    INSTANCE_BRIDGE_ROUTE_MODE_HEADER,
    INSTANCE_BRIDGE_ROUTE_MODE_VALUE
  );
  response.headers.set(INSTANCE_BRIDGE_TENANT_ID_HEADER, tenantId);
  response.headers.set(
    INSTANCE_BRIDGE_DEPRECATION_HEADER,
    INSTANCE_BRIDGE_DEPRECATION_VALUE
  );
  response.headers.set(INSTANCE_BRIDGE_SUNSET_HEADER, INSTANCE_BRIDGE_SUNSET_VALUE);

  if (requestTraceId) {
    withRequestTraceHeader(response, requestTraceId);
  }

  return response;
}
