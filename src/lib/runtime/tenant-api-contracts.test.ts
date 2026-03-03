import assert from "node:assert/strict";
import test from "node:test";
import {
  createTenantExportRequestSchema,
  tenantApiEnvelopeSchema,
  tenantApprovalDecisionDataSchema,
  tenantApprovalDecisionRequestSchema,
  tenantDiscordIngressAcceptedDataSchema,
  tenantImportDryRunDataSchema,
  tenantImportDryRunRequestSchema,
} from "./tenant-api-contracts.ts";

test("create tenant export request defaults are applied", () => {
  const parsed = createTenantExportRequestSchema.parse({});
  assert.equal(parsed.export_scope, "full");
  assert.equal(parsed.format, "jsonl");
  assert.equal(parsed.include_blobs, true);
});

test("tenant approval decision request rejects unsupported decisions", () => {
  const parsed = tenantApprovalDecisionRequestSchema.safeParse({
    decision: "pending",
  });
  assert.equal(parsed.success, false);
});

test("tenant API envelope parses expected standardized shape", () => {
  const parsed = tenantApiEnvelopeSchema.parse({
    version: "2026-02-24",
    request_id: "req-123",
    idempotency_key: null,
    idempotency_replayed: false,
    data: { ok: true },
    error: null,
  });

  assert.equal(parsed.version, "2026-02-24");
});

test("tenant approval decision response contract validates", () => {
  const parsed = tenantApprovalDecisionDataSchema.parse({
    approval_id: "5dd07f4e-bd67-4e4d-85ab-b42fdd31f025",
    status: "approved",
  });
  assert.equal(parsed.status, "approved");
});

test("tenant discord ingress accepted response contract validates", () => {
  const parsed = tenantDiscordIngressAcceptedDataSchema.parse({
    run: {
      id: "7605d976-1cfe-40cb-80c8-9e25324869ca",
      status: "queued",
    },
    accepted: true,
    worker_endpoint: "/api/admin/tenants/runtime/process",
  });

  assert.equal(parsed.accepted, true);
});

test("tenant import dry-run request defaults are applied", () => {
  const parsed = tenantImportDryRunRequestSchema.parse({
    records: [],
  });

  assert.equal(parsed.schema_version, 1);
  assert.equal(parsed.scope, "full");
  assert.equal(parsed.strict_tenant_match, true);
  assert.equal(parsed.fail_on_unknown_tables, true);
  assert.equal(parsed.selected_tables, undefined);
});

test("tenant import dry-run response contract validates", () => {
  const parsed = tenantImportDryRunDataSchema.parse({
    accepted: false,
    compatibility: {
      status: "compatible",
      schema_version: 1,
      supported_version: 1,
      message: "Schema version '1' is compatible.",
    },
    summary: {
      records_total: 1,
      tables_detected: 1,
      errors: 1,
      warnings: 0,
      unknown_tables: 0,
      tenant_mismatches: 1,
    },
    issues: [
      {
        severity: "error",
        code: "tenant_mismatch",
        message: "Record tenant id does not match target tenant.",
        table: "tenant_agents",
        record_index: 0,
      },
    ],
  });

  assert.equal(parsed.accepted, false);
  assert.equal(parsed.summary.errors, 1);
});
