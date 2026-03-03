import assert from "node:assert/strict";
import test from "node:test";
import {
  canAdministerTenant,
  canManageTenantRuntimeData,
  hasMinimumTenantRole,
} from "./tenant-role-policy.ts";

test("tenant role gates deny lower-privilege roles", () => {
  assert.equal(hasMinimumTenantRole("viewer", "operator"), false);
  assert.equal(hasMinimumTenantRole("operator", "admin"), false);
  assert.equal(hasMinimumTenantRole("admin", "owner"), false);
  assert.equal(hasMinimumTenantRole("owner", "viewer"), true);
});

test("tenant capability helpers enforce role thresholds", () => {
  assert.equal(canManageTenantRuntimeData("viewer"), false);
  assert.equal(canManageTenantRuntimeData("operator"), true);
  assert.equal(canAdministerTenant("operator"), false);
  assert.equal(canAdministerTenant("admin"), true);
});
