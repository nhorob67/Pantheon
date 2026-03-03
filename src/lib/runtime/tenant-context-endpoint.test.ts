import assert from "node:assert/strict";
import test from "node:test";
import { createTenantContextEndpoint } from "./tenant-context-endpoint.ts";

const VALID_TENANT_ID = "11111111-1111-4111-8111-111111111111";

function makeRequest(requestId?: string): Request {
  const headers = new Headers();
  if (requestId) {
    headers.set("x-request-id", requestId);
  }

  return new Request("http://localhost/api/tenants/tenant/context", {
    method: "GET",
    headers,
  });
}

test("tenant context endpoint returns 401 with propagated request id when user is missing", async () => {
  const handler = createTenantContextEndpoint({
    resolveUserId: async () => null,
    resolveTenantContext: async () => null,
    resolveRuntimeGates: async () => ({
      reads_enabled: true,
      writes_enabled: true,
      discord_ingress_paused: false,
      tool_execution_paused: false,
      memory_writes_paused: false,
    }),
    canManageTenantRuntimeData: () => false,
    canAdministerTenant: () => false,
    formatSafeErrorMessage: (_error, fallback) => fallback,
  });

  const response = await handler(
    makeRequest("req-tenant-401"),
    VALID_TENANT_ID
  );

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("x-request-id"), "req-tenant-401");
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});

test("tenant context endpoint returns 404 when user is not a tenant member", async () => {
  const handler = createTenantContextEndpoint({
    resolveUserId: async () => "user-1",
    resolveTenantContext: async () => null,
    resolveRuntimeGates: async () => ({
      reads_enabled: true,
      writes_enabled: true,
      discord_ingress_paused: false,
      tool_execution_paused: false,
      memory_writes_paused: false,
    }),
    canManageTenantRuntimeData: () => false,
    canAdministerTenant: () => false,
    formatSafeErrorMessage: (_error, fallback) => fallback,
  });

  const response = await handler(
    makeRequest("req-tenant-404"),
    VALID_TENANT_ID
  );

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("x-request-id"), "req-tenant-404");
  assert.deepEqual(await response.json(), { error: "Tenant not found" });
});

test("tenant context endpoint enforces role capabilities and generates request id when missing", async () => {
  const handler = createTenantContextEndpoint({
    resolveUserId: async () => "user-1",
    resolveTenantContext: async () => ({
      tenantId: VALID_TENANT_ID,
      customerId: "customer-1",
      tenantSlug: "tenant-1",
      tenantName: "Tenant 1",
      tenantStatus: "active",
      memberRole: "viewer",
      memberStatus: "active",
    }),
    resolveRuntimeGates: async () => ({
      reads_enabled: true,
      writes_enabled: false,
      discord_ingress_paused: false,
      tool_execution_paused: false,
      memory_writes_paused: true,
    }),
    canManageTenantRuntimeData: (role) =>
      role === "operator" || role === "admin" || role === "owner",
    canAdministerTenant: (role) => role === "admin" || role === "owner",
    formatSafeErrorMessage: (_error, fallback) => fallback,
  });

  const response = await handler(
    makeRequest(),
    VALID_TENANT_ID
  );

  assert.equal(response.status, 200);
  const generatedRequestId = response.headers.get("x-request-id");
  assert.ok(generatedRequestId);
  assert.match(String(generatedRequestId), /^[0-9a-f-]{36}$/i);

  const payload = (await response.json()) as {
    membership: {
      can_manage_runtime_data: boolean;
      can_admin_tenant: boolean;
    };
  };

  assert.equal(payload.membership.can_manage_runtime_data, false);
  assert.equal(payload.membership.can_admin_tenant, false);
});
