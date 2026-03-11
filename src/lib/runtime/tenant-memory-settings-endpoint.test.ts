import assert from "node:assert/strict";
import test from "node:test";
import { createTenantMemorySettingsEndpoint } from "./tenant-memory-settings-endpoint.ts";

const VALID_TENANT_ID = "11111111-1111-4111-8111-111111111111";

interface TestDependenciesConfig {
  user?: { id: string; email?: string | null } | null;
  tenantContext?: {
    tenantId: string;
    customerId: string;
    memberRole: "owner" | "admin" | "operator" | "viewer";
  } | null;
  runtimeGates?: { reads_enabled: boolean; writes_enabled: boolean };
  mapping?: { instanceId: string | null; ambiguous: boolean };
  rateLimit?: "ok" | "blocked" | "unavailable";
  parseResult?:
    | { success: true; data: Record<string, unknown> }
    | { success: false; details?: unknown };
  getResult?: { settings: Record<string, unknown>; source: "stored" | "default" };
  updateResult?: Record<string, unknown>;
  canManage?: boolean;
  rebuildThrows?: boolean;
}

function createTestEndpoint(config: TestDependenciesConfig = {}) {
  const calls = {
    notifyConfigChanged: [] as Array<{ tenantId: string; reason: string }>,
    update: [] as Array<{
      context: unknown;
      payload: Record<string, unknown>;
      updatedBy: string;
    }>,
  };

  const endpoint = createTenantMemorySettingsEndpoint({
    async resolveUser() {
      if (config.user === undefined) {
        return { id: "user-1", email: "ops@pantheon.test" };
      }
      return config.user;
    },
    async resolveTenantContext() {
      if (config.tenantContext === undefined) {
        return {
          tenantId: VALID_TENANT_ID,
          customerId: "customer-1",
          memberRole: "operator",
        };
      }
      return config.tenantContext;
    },
    async resolveRuntimeGates() {
      return config.runtimeGates || { reads_enabled: true, writes_enabled: true };
    },
    async resolveLegacyMapping() {
      return config.mapping || { instanceId: "legacy-instance-1", ambiguous: false };
    },
    canManageTenantRuntimeData() {
      return config.canManage ?? true;
    },
    async consumeConfigUpdateRateLimit() {
      return config.rateLimit || "ok";
    },
    parseUpdatePayload() {
      return config.parseResult || { success: true, data: { mode: "native_only" } };
    },
    createMemoryMutationContext(input) {
      return input;
    },
    async getTenantMemorySettings() {
      return (
        config.getResult || {
          settings: { mode: "native_only" },
          source: "stored",
        }
      );
    },
    async updateTenantMemorySettings(context, payload, updatedBy) {
      calls.update.push({ context, payload, updatedBy });
      return (
        config.updateResult || {
          mode: "native_only",
          updated_by: updatedBy,
        }
      );
    },
    async notifyConfigChanged(tenantId, reason) {
      calls.notifyConfigChanged.push({ tenantId, reason });
      if (config.rebuildThrows) {
        throw new Error("deploy failed");
      }
    },
    formatSafeErrorMessage(_error, fallbackMessage) {
      return fallbackMessage;
    },
  });

  return { endpoint, calls };
}

function createRequest(method: "GET" | "PUT", body?: string, requestId?: string) {
  const headers = new Headers();
  if (requestId) {
    headers.set("x-request-id", requestId);
  }

  return new Request("http://localhost/test", {
    method,
    headers,
    body,
  });
}

test("tenant memory settings endpoint GET returns 401 with request id when user missing", async () => {
  const { endpoint } = createTestEndpoint({ user: null });
  const response = await endpoint.handleGet(
    createRequest("GET", undefined, "req-tenant-memory-401"),
    VALID_TENANT_ID
  );
  const body = (await response.json()) as { error: string };

  assert.equal(response.status, 401);
  assert.equal(body.error, "Unauthorized");
  assert.equal(response.headers.get("x-request-id"), "req-tenant-memory-401");
});

test("tenant memory settings endpoint GET enforces reads gate and emits generated request id", async () => {
  const { endpoint } = createTestEndpoint({
    runtimeGates: { reads_enabled: false, writes_enabled: true },
  });
  const response = await endpoint.handleGet(createRequest("GET"), VALID_TENANT_ID);
  const body = (await response.json()) as { error: string };

  assert.equal(response.status, 409);
  assert.equal(body.error, "Tenant runtime reads are disabled for this tenant");
  assert.match(response.headers.get("x-request-id") || "", /^[0-9a-f-]{36}$/i);
});

test("tenant memory settings endpoint GET includes mapping warning for ambiguous legacy mapping", async () => {
  const { endpoint } = createTestEndpoint({
    mapping: { instanceId: "legacy-instance-2", ambiguous: true },
  });
  const response = await endpoint.handleGet(
    createRequest("GET", undefined, "req-tenant-memory-get"),
    VALID_TENANT_ID
  );
  const body = (await response.json()) as {
    legacy_instance_id: string | null;
    warning?: string;
  };

  assert.equal(response.status, 200);
  assert.equal(body.legacy_instance_id, "legacy-instance-2");
  assert.ok(typeof body.warning === "string");
  assert.equal(response.headers.get("x-request-id"), "req-tenant-memory-get");
});

test("tenant memory settings endpoint PUT returns 403 for insufficient role", async () => {
  const { endpoint } = createTestEndpoint({ canManage: false });
  const response = await endpoint.handlePut(
    createRequest("PUT", JSON.stringify({ mode: "native_only" }), "req-tenant-memory-403"),
    VALID_TENANT_ID
  );
  const body = (await response.json()) as { error: string };

  assert.equal(response.status, 403);
  assert.equal(
    body.error,
    "Insufficient role for tenant memory settings management"
  );
  assert.equal(response.headers.get("x-request-id"), "req-tenant-memory-403");
});

test("tenant memory settings endpoint PUT updates settings and returns rebuild warning on deploy failure", async () => {
  const { endpoint, calls } = createTestEndpoint({
    rebuildThrows: true,
    mapping: { instanceId: "legacy-instance-3", ambiguous: false },
  });
  const response = await endpoint.handlePut(
    createRequest("PUT", JSON.stringify({ mode: "native_only" }), "req-tenant-memory-put"),
    VALID_TENANT_ID
  );
  const body = (await response.json()) as {
    warning?: string;
    rebuild: { attempted: boolean; succeeded: boolean };
  };

  assert.equal(response.status, 200);
  assert.equal(body.rebuild.attempted, true);
  assert.equal(body.rebuild.succeeded, false);
  assert.ok(typeof body.warning === "string");
  assert.equal(calls.notifyConfigChanged.length, 1);
  assert.equal(calls.notifyConfigChanged[0].tenantId, "legacy-instance-3");
  assert.equal(calls.notifyConfigChanged[0].reason, "memory_settings_updated");
  assert.equal(calls.update.length, 1);
  assert.equal(response.headers.get("x-request-id"), "req-tenant-memory-put");
});
