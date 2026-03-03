import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTenantDataGovernanceMetadataPatch,
  sanitizeTenantDataGovernancePolicy,
} from "./tenant-data-governance.ts";

test("sanitizeTenantDataGovernancePolicy clamps invalid values and defaults booleans", () => {
  const policy = sanitizeTenantDataGovernancePolicy({
    export_retention_days: 365,
    memory_tombstone_retention_days: 1,
    deletion_guard_enabled: "yes",
    hard_delete_requires_owner: false,
  });

  assert.equal(policy.export_retention_days, 30);
  assert.equal(policy.memory_tombstone_retention_days, 7);
  assert.equal(policy.deletion_guard_enabled, true);
  assert.equal(policy.hard_delete_requires_owner, false);
});

test("buildTenantDataGovernanceMetadataPatch preserves existing metadata", () => {
  const existing = {
    runtime_governance: {
      max_requests_per_minute: 100,
    },
  };

  const metadata = buildTenantDataGovernanceMetadataPatch(
    existing,
    {
      export_retention_days: 14,
      memory_tombstone_retention_days: 400,
      deletion_guard_enabled: true,
      hard_delete_requires_owner: true,
    },
    "user-123",
    "2026-02-24T00:00:00.000Z"
  );

  assert.deepEqual(metadata.runtime_governance, existing.runtime_governance);
  assert.deepEqual(metadata.data_governance, {
    export_retention_days: 14,
    memory_tombstone_retention_days: 400,
    deletion_guard_enabled: true,
    hard_delete_requires_owner: true,
    updated_by: "user-123",
    updated_at: "2026-02-24T00:00:00.000Z",
  });
});
