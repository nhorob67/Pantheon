import assert from "node:assert/strict";
import test from "node:test";
import { getTenantRouteTenantStatusError } from "./tenant-route-access.ts";

test("getTenantRouteTenantStatusError allows active tenants", () => {
  assert.equal(getTenantRouteTenantStatusError("active"), null);
});

test("getTenantRouteTenantStatusError blocks paused tenants", () => {
  assert.equal(getTenantRouteTenantStatusError("paused"), "Tenant access is paused");
});

test("getTenantRouteTenantStatusError blocks archived tenants", () => {
  assert.equal(getTenantRouteTenantStatusError("archived"), "Tenant is archived");
});
