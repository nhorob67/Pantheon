import assert from "node:assert/strict";
import test from "node:test";
import {
  TENANT_IMPORT_SUPPORTED_SCHEMA_VERSION,
  evaluateImportSchemaCompatibility,
  runTenantImportDryRun,
} from "./tenant-import.ts";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";

test("tenant import dry-run accepts valid full-scope records", () => {
  const result = runTenantImportDryRun(TENANT_ID, {
    schema_version: TENANT_IMPORT_SUPPORTED_SCHEMA_VERSION,
    format: "jsonl",
    scope: "full",
    strict_tenant_match: true,
    fail_on_unknown_tables: true,
    records: [
      {
        table: "tenants",
        record: {
          id: TENANT_ID,
          name: "Pantheon Tenant",
        },
      },
      {
        table: "tenant_agents",
        record: {
          tenant_id: TENANT_ID,
          agent_key: "ops",
        },
      },
    ],
  });

  assert.equal(result.accepted, true);
  assert.equal(result.compatibility.status, "compatible");
  assert.equal(result.summary.errors, 0);
  assert.equal(result.summary.records_total, 2);
});

test("tenant import dry-run rejects tenant mismatches when strict match is enabled", () => {
  const result = runTenantImportDryRun(TENANT_ID, {
    schema_version: TENANT_IMPORT_SUPPORTED_SCHEMA_VERSION,
    format: "jsonl",
    scope: "full",
    strict_tenant_match: true,
    fail_on_unknown_tables: true,
    records: [
      {
        table: "tenant_agents",
        record: {
          tenant_id: "22222222-2222-4222-8222-222222222222",
          agent_key: "ops",
        },
      },
    ],
  });

  assert.equal(result.accepted, false);
  assert.equal(result.compatibility.status, "compatible");
  assert.equal(result.summary.tenant_mismatches, 1);
  assert.equal(result.summary.errors, 1);
  assert.equal(result.issues[0]?.code, "tenant_mismatch");
});

test("tenant import dry-run emits warning for unknown tables when configured non-fatal", () => {
  const result = runTenantImportDryRun(TENANT_ID, {
    schema_version: TENANT_IMPORT_SUPPORTED_SCHEMA_VERSION,
    format: "jsonl",
    scope: "full",
    strict_tenant_match: true,
    fail_on_unknown_tables: false,
    records: [
      {
        table: "tenant_future_table",
        record: {
          tenant_id: TENANT_ID,
        },
      },
    ],
  });

  assert.equal(result.accepted, true);
  assert.equal(result.compatibility.status, "compatible");
  assert.equal(result.summary.unknown_tables, 1);
  assert.equal(result.summary.warnings, 1);
  assert.equal(result.issues[0]?.severity, "warning");
});

test("tenant import dry-run rejects unsupported schema versions", () => {
  const result = runTenantImportDryRun(TENANT_ID, {
    schema_version: 999,
    format: "jsonl",
    scope: "full",
    strict_tenant_match: true,
    fail_on_unknown_tables: true,
    records: [],
  });

  assert.equal(result.accepted, false);
  assert.equal(result.compatibility.status, "unsupported");
  assert.equal(result.summary.errors >= 1, true);
  assert.equal(
    result.issues.some((issue) => issue.code === "unsupported_schema_version"),
    true
  );
});

test("tenant import dry-run rejects records outside selected_tables", () => {
  const result = runTenantImportDryRun(TENANT_ID, {
    schema_version: TENANT_IMPORT_SUPPORTED_SCHEMA_VERSION,
    format: "jsonl",
    scope: "full",
    strict_tenant_match: true,
    fail_on_unknown_tables: true,
    selected_tables: ["tenant_agents"],
    records: [
      {
        table: "tenant_messages",
        record: {
          tenant_id: TENANT_ID,
          content: "hello",
        },
      },
    ],
  });

  assert.equal(result.accepted, false);
  assert.equal(result.issues.some((issue) => issue.code === "table_not_selected"), true);
});

test("tenant import dry-run rejects selected tables that are outside scope", () => {
  const result = runTenantImportDryRun(TENANT_ID, {
    schema_version: TENANT_IMPORT_SUPPORTED_SCHEMA_VERSION,
    format: "jsonl",
    scope: "knowledge_only",
    strict_tenant_match: true,
    fail_on_unknown_tables: true,
    selected_tables: ["tenant_agents"],
    records: [
      {
        table: "tenant_knowledge_items",
        record: {
          tenant_id: TENANT_ID,
        },
      },
    ],
  });

  assert.equal(result.accepted, false);
  assert.equal(
    result.issues.some((issue) => issue.code === "selected_table_outside_scope"),
    true
  );
});

test("evaluateImportSchemaCompatibility distinguishes older/newer schema versions", () => {
  const older = evaluateImportSchemaCompatibility(0);
  assert.equal(older.status, "requires_migration");

  const newer = evaluateImportSchemaCompatibility(2);
  assert.equal(newer.status, "unsupported");
});
