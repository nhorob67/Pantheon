export const TENANT_IMPORT_SUPPORTED_SCHEMA_VERSION = 1 as const;

const TENANT_IMPORT_TABLES_BY_SCOPE: Record<string, Set<string>> = {
  metadata_only: new Set([
    "tenants",
    "tenant_members",
    "tenant_integrations",
    "tenant_agents",
    "tenant_tools",
    "tenant_tool_policies",
  ]),
  knowledge_only: new Set(["tenant_knowledge_items", "tenant_memory_records"]),
  full: new Set([
    "tenants",
    "tenant_members",
    "tenant_integrations",
    "tenant_agents",
    "tenant_sessions",
    "tenant_messages",
    "tenant_runtime_runs",
    "tenant_tools",
    "tenant_tool_policies",
    "tenant_tool_invocations",
    "tenant_approvals",
    "tenant_knowledge_items",
    "tenant_memory_records",
    "instance_tenant_mappings",
  ]),
};

const TENANT_IMPORT_KNOWN_TABLES = new Set(
  Array.from(
    new Set(
      Object.values(TENANT_IMPORT_TABLES_BY_SCOPE).flatMap((tables) =>
        Array.from(tables.values())
      )
    )
  )
);

type TenantImportSeverity = "error" | "warning";

export interface TenantImportDryRunIssue {
  severity: TenantImportSeverity;
  code: string;
  message: string;
  table?: string;
  record_index?: number;
}

export interface TenantImportDryRunResult {
  accepted: boolean;
  compatibility: {
    status: "compatible" | "requires_migration" | "unsupported";
    schema_version: number;
    supported_version: number;
    message: string;
  };
  summary: {
    records_total: number;
    tables_detected: number;
    errors: number;
    warnings: number;
    unknown_tables: number;
    tenant_mismatches: number;
  };
  issues: TenantImportDryRunIssue[];
}

interface DryRunInput {
  schema_version: number;
  format: "jsonl" | "csv";
  scope: "full" | "knowledge_only" | "metadata_only";
  strict_tenant_match: boolean;
  fail_on_unknown_tables: boolean;
  selected_tables?: string[];
  records: Array<{
    table: string;
    record: Record<string, unknown>;
  }>;
  manifest?: {
    format?: "jsonl" | "csv";
    rows_by_table?: Record<string, number>;
  };
}

export function evaluateImportSchemaCompatibility(
  schemaVersion: number
): TenantImportDryRunResult["compatibility"] {
  if (schemaVersion === TENANT_IMPORT_SUPPORTED_SCHEMA_VERSION) {
    return {
      status: "compatible",
      schema_version: schemaVersion,
      supported_version: TENANT_IMPORT_SUPPORTED_SCHEMA_VERSION,
      message: `Schema version '${schemaVersion}' is compatible.`,
    };
  }

  if (schemaVersion < TENANT_IMPORT_SUPPORTED_SCHEMA_VERSION) {
    return {
      status: "requires_migration",
      schema_version: schemaVersion,
      supported_version: TENANT_IMPORT_SUPPORTED_SCHEMA_VERSION,
      message: `Schema version '${schemaVersion}' is older than supported version '${TENANT_IMPORT_SUPPORTED_SCHEMA_VERSION}' and requires migration.`,
    };
  }

  return {
    status: "unsupported",
    schema_version: schemaVersion,
    supported_version: TENANT_IMPORT_SUPPORTED_SCHEMA_VERSION,
    message: `Schema version '${schemaVersion}' is newer than supported version '${TENANT_IMPORT_SUPPORTED_SCHEMA_VERSION}' and is not supported yet.`,
  };
}

function tenantIdFromRecord(table: string, record: Record<string, unknown>): string | null {
  if (table === "tenants") {
    return typeof record.id === "string" ? record.id : null;
  }

  return typeof record.tenant_id === "string" ? record.tenant_id : null;
}

export function runTenantImportDryRun(
  tenantId: string,
  input: DryRunInput
): TenantImportDryRunResult {
  const issues: TenantImportDryRunIssue[] = [];
  const recordCountsByTable: Record<string, number> = {};
  const allowedTables = TENANT_IMPORT_TABLES_BY_SCOPE[input.scope];
  const selectedTables = new Set(
    Array.isArray(input.selected_tables)
      ? input.selected_tables
      : []
  );
  let unknownTables = 0;
  let tenantMismatches = 0;
  const compatibility = evaluateImportSchemaCompatibility(input.schema_version);

  const pushIssue = (issue: TenantImportDryRunIssue) => {
    issues.push(issue);
  };

  if (compatibility.status !== "compatible") {
    pushIssue({
      severity: "error",
      code: "unsupported_schema_version",
      message: compatibility.message,
    });
  }

  if (input.records.length === 0) {
    pushIssue({
      severity: "error",
      code: "empty_records",
      message: "Import dry-run payload must include at least one record.",
    });
  }

  if (input.manifest?.format && input.manifest.format !== input.format) {
    pushIssue({
      severity: "warning",
      code: "manifest_format_mismatch",
      message: `Manifest format '${input.manifest.format}' differs from payload format '${input.format}'.`,
    });
  }

  for (const table of selectedTables) {
    if (!TENANT_IMPORT_KNOWN_TABLES.has(table)) {
      pushIssue({
        severity: input.fail_on_unknown_tables ? "error" : "warning",
        code: "selected_unknown_table",
        message: `Selected table '${table}' is not recognized by the tenant import validator.`,
        table,
      });
      continue;
    }

    if (!allowedTables.has(table)) {
      pushIssue({
        severity: "error",
        code: "selected_table_outside_scope",
        message: `Selected table '${table}' is not allowed for scope '${input.scope}'.`,
        table,
      });
    }
  }

  for (let index = 0; index < input.records.length; index += 1) {
    const row = input.records[index];
    const table = row.table;
    recordCountsByTable[table] = (recordCountsByTable[table] || 0) + 1;

    if (!TENANT_IMPORT_KNOWN_TABLES.has(table)) {
      unknownTables += 1;
      pushIssue({
        severity: input.fail_on_unknown_tables ? "error" : "warning",
        code: "unknown_table",
        message: `Table '${table}' is not recognized by the tenant import validator.`,
        table,
        record_index: index,
      });
      continue;
    }

    if (selectedTables.size > 0 && !selectedTables.has(table)) {
      pushIssue({
        severity: "error",
        code: "table_not_selected",
        message: `Table '${table}' is outside selected_tables for this dry-run request.`,
        table,
        record_index: index,
      });
      continue;
    }

    if (!allowedTables.has(table)) {
      pushIssue({
        severity: "error",
        code: "table_outside_scope",
        message: `Table '${table}' is not allowed for scope '${input.scope}'.`,
        table,
        record_index: index,
      });
      continue;
    }

    const recordTenantId = tenantIdFromRecord(table, row.record);
    if (!recordTenantId) {
      pushIssue({
        severity: input.strict_tenant_match ? "error" : "warning",
        code: "missing_tenant_id",
        message: `Record is missing a tenant identifier field for table '${table}'.`,
        table,
        record_index: index,
      });
      continue;
    }

    if (recordTenantId !== tenantId) {
      tenantMismatches += 1;
      pushIssue({
        severity: input.strict_tenant_match ? "error" : "warning",
        code: "tenant_mismatch",
        message: `Record tenant id '${recordTenantId}' does not match target tenant '${tenantId}'.`,
        table,
        record_index: index,
      });
    }
  }

  if (input.manifest?.rows_by_table) {
    for (const [table, declaredCount] of Object.entries(input.manifest.rows_by_table)) {
      const observed = recordCountsByTable[table] || 0;
      if (declaredCount < observed) {
        pushIssue({
          severity: "warning",
          code: "rows_by_table_exceeded",
          message: `Observed ${observed} records for table '${table}' but manifest declares ${declaredCount}.`,
          table,
        });
      }
    }
  }

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;

  return {
    accepted: errors === 0,
    compatibility,
    summary: {
      records_total: input.records.length,
      tables_detected: Object.keys(recordCountsByTable).length,
      errors,
      warnings,
      unknown_tables: unknownTables,
      tenant_mismatches: tenantMismatches,
    },
    issues,
  };
}
