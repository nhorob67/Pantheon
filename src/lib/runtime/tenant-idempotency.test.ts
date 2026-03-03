import assert from "node:assert/strict";
import test from "node:test";
import {
  IDEMPOTENCY_HEADER,
  LEGACY_IDEMPOTENCY_HEADER,
  requiresTenantIdempotency,
  resolveTenantIdempotencyContext,
} from "./tenant-idempotency.ts";

test("requiresTenantIdempotency matches mutation methods", () => {
  assert.equal(requiresTenantIdempotency("POST"), true);
  assert.equal(requiresTenantIdempotency("PUT"), true);
  assert.equal(requiresTenantIdempotency("PATCH"), true);
  assert.equal(requiresTenantIdempotency("DELETE"), true);
  assert.equal(requiresTenantIdempotency("GET"), false);
});

test("resolveTenantIdempotencyContext uses explicit idempotency header", async () => {
  const request = new Request("http://localhost/api/tenants/t/export", {
    method: "POST",
    headers: {
      [IDEMPOTENCY_HEADER]: "idem-explicit-1",
      "content-type": "application/json",
    },
    body: JSON.stringify({ hello: "world" }),
  });

  const context = await resolveTenantIdempotencyContext(request, "trace-1");

  assert.ok(context);
  assert.equal(context?.key, "idem-explicit-1");
  assert.equal(context?.routePath, "/api/tenants/t/export");
  assert.match(context?.fingerprint || "", /^[a-f0-9]{64}$/);
});

test("resolveTenantIdempotencyContext falls back to legacy header", async () => {
  const request = new Request("http://localhost/api/tenants/t/export", {
    method: "PUT",
    headers: {
      [LEGACY_IDEMPOTENCY_HEADER]: "idem-legacy-1",
      "content-type": "application/json",
    },
    body: JSON.stringify({ hello: "world" }),
  });

  const context = await resolveTenantIdempotencyContext(request, "trace-2");

  assert.ok(context);
  assert.equal(context?.key, "idem-legacy-1");
  assert.match(context?.fingerprint || "", /^[a-f0-9]{64}$/);
});

test("resolveTenantIdempotencyContext returns null for read methods", async () => {
  const request = new Request("http://localhost/api/tenants/t/context", {
    method: "GET",
  });

  const context = await resolveTenantIdempotencyContext(request, "trace-3");

  assert.equal(context, null);
});
