# Tenant Export Format Contract

Last updated: February 24, 2026  
Status: Public contract draft for Phase 6 portability/governance

## Scope

Tenant export endpoints:

1. `POST /api/tenants/[tenantId]/export`
2. `GET /api/tenants/[tenantId]/export`
3. `GET /api/tenants/[tenantId]/export/[exportId]`
4. `POST /api/tenants/[tenantId]/export/[exportId]/retry`

Related import-validation endpoint:

1. `POST /api/tenants/[tenantId]/import/dry-run`

## Bundle contents

Each completed export produces:

1. Data file:
   - `tenant-export.jsonl` (default)
   - or `tenant-export.csv`
2. `manifest.json`
3. `manifest.signed.json`

## Data record shape

JSONL format stores one object per line:

```json
{"table":"tenant_messages","record":{"id":"...","tenant_id":"..."}}
```

CSV format stores:

1. `table`
2. `record_json` (JSON-encoded row payload)

## Full-scope table set (current)

1. `tenants`
2. `tenant_members`
3. `tenant_integrations`
4. `tenant_agents`
5. `tenant_sessions`
6. `tenant_messages`
7. `tenant_runtime_runs`
8. `tenant_tools`
9. `tenant_tool_policies`
10. `tenant_tool_invocations`
11. `tenant_approvals`
12. `tenant_knowledge_items`
13. `tenant_memory_records`
14. `instance_tenant_mappings`

## Manifest contract

`manifest.json` includes:

1. `export_id`
2. `tenant_id`
3. `customer_id`
4. `generated_at`
5. `scope`
6. `format`
7. `include_blobs`
8. `checksums`
9. `rows_by_table`
10. `billing_metadata_pointer` (customer plan/subscription/Stripe pointer fields only)
11. `skills_metadata` (custom-skill status/slugs + tenant-agent skill-reference summary)

`manifest.signed.json` includes the same manifest payload plus signature metadata used by the app for trusted download workflows.

## Compatibility notes

1. This contract is additive-first; new tables/fields may be added without breaking existing keys.
2. Consumers should ignore unknown keys.
3. Import validation must treat unknown tables as non-fatal unless explicitly configured otherwise.

## Dry-run validation response shape

`POST /api/tenants/[tenantId]/import/dry-run` returns:

1. `dry_run.accepted`
2. `dry_run.compatibility` (`status`, `schema_version`, `supported_version`, `message`)
3. `dry_run.summary` (`records_total`, `tables_detected`, `errors`, `warnings`, `unknown_tables`, `tenant_mismatches`)
4. `dry_run.issues[]` (`severity`, `code`, `message`, optional `table`, optional `record_index`)

Request options include:

1. `scope` (`full`, `knowledge_only`, `metadata_only`)
2. `selected_tables` (optional subset within the selected scope)
3. `strict_tenant_match` (enforce tenant-id match as errors)
4. `fail_on_unknown_tables` (treat unknown tables as errors vs warnings)
