# Fix Integration Setup — Diagnosis & Plan

## Problem Summary

Integration registration and API calls fail due to a **database schema conflict**: the `tenant_integrations` table is created twice with incompatible schemas, and the code references columns that don't exist on the table that actually gets created first.

## Root Cause

### Conflicting Table Definitions

1. **Migration 00036** (`tenant_runtime_foundation.sql`) creates `tenant_integrations` with the **old schema**:
   - Columns: `integration_key`, `provider`, `external_ref`, `secret_ref`, `last_synced_at`
   - Unique constraint: `(tenant_id, integration_key, provider)`
   - Status values: `pending`, `active`, `disabled`, `error`

2. **Migration 00103** (`tenant_integrations.sql`) attempts to `CREATE TABLE tenant_integrations` again with the **new schema**:
   - Columns: `slug`, `display_name`, `service_type`, `base_url`, `auth_method`, `auth_header`, `api_docs_url`, `discovered_endpoints`, `capabilities_summary`, `last_used_at`, `last_error`, `created_by_agent_id`, `setup_conversation_id`
   - Unique constraint: `(tenant_id, slug)`
   - Status values: `active`, `inactive`, `error`

**Migration 00103 will fail** because the table already exists from 00036. The database is left with the old schema that the new code doesn't understand.

### Stale Type Definition

- `src/types/tenant-runtime.ts` (lines 72-85) exports `TenantIntegration` matching the **old** 00036 schema (`integration_key`, `provider`, `secret_ref`, etc.)
- `src/types/integration.ts` defines `TenantIntegration` matching the **new** 00103 schema (`slug`, `display_name`, `service_type`, etc.)
- `src/types/database.ts` re-exports `TenantIntegration` from `tenant-runtime.ts` — the **stale** version
- The runtime code (`src/lib/runtime/tenant-integrations.ts`) correctly imports from `@/types/integration`, but any consumer importing from `@/types/database` gets the wrong type

### Cascading Failures

Because the database has the old schema:
- **Integration registration** fails: code tries to upsert columns (`slug`, `display_name`, `service_type`, `base_url`, etc.) that don't exist
- **Integration lookup** fails: code queries by `slug` column which doesn't exist
- **API calls** fail: lookup by slug returns nothing, so "integration not found"

## Fix Plan

### Step 1: Replace old table with new schema (migration)

Create a new migration (e.g., `00104_fix_tenant_integrations.sql`) that:

1. Drops the old `tenant_integrations` table from migration 00036 (it has no production data since integrations never worked)
2. Drops the conflicting RLS policies, triggers, and indexes from 00036 for `tenant_integrations`
3. Converts migration 00103 into an `ALTER`-based migration, or simply ensures the table is dropped before recreation

Alternatively (simpler approach): modify migration 00103 to use `DROP TABLE IF EXISTS tenant_integrations CASCADE` before the `CREATE TABLE`, so it cleanly replaces the old schema. This is acceptable since the old table was never usable.

**Recommended approach:** Write a new migration `00104_fix_tenant_integrations.sql`:
```sql
-- Drop the stale tenant_integrations table from migration 00036.
-- The old schema (integration_key, provider, secret_ref) was never used in
-- production; migration 00103 defined the correct schema but failed because
-- the table already existed.

DROP TABLE IF EXISTS tenant_integration_schedules CASCADE;
DROP TABLE IF EXISTS tenant_integrations CASCADE;

-- Re-run the 00103 schema (copy the CREATE TABLE + indexes + RLS from 00103)
-- ... (full CREATE TABLE from 00103 goes here)
```

### Step 2: Fix the stale type in `tenant-runtime.ts`

Replace the `TenantIntegration` interface in `src/types/tenant-runtime.ts` (lines 72-85) to match the actual 00103 schema:

- Remove: `integration_key`, `provider`, `external_ref`, `secret_ref`, `last_synced_at`
- Add: `slug`, `display_name`, `service_type`, `base_url`, `connector_account_id`, `auth_method`, `auth_header`, `api_docs_url`, `discovered_endpoints`, `capabilities_summary`, `status` (with correct values: `active | inactive | error`), `last_used_at`, `last_error`, `created_by_agent_id`, `setup_conversation_id`

Or better: re-export from `@/types/integration` instead of defining a duplicate.

### Step 3: Verify `database.ts` re-export

Confirm `src/types/database.ts` re-exports the updated `TenantIntegration`. After Step 2, this should be correct automatically.

### Step 4: Verify the tenant_scheduled_messages FK reference

Migration 00103 references `tenant_scheduled_messages(id)` for the `tenant_integration_schedules` table. Verify this table exists from a prior migration. If not, the FK needs to be adjusted.

### Step 5: Run tests

Run `npm run test` and `npm run build` to verify no type errors or test failures.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/00103_tenant_integrations.sql` | Prepend `DROP TABLE IF EXISTS tenant_integrations CASCADE;` OR create a new 00104 migration |
| `src/types/tenant-runtime.ts` | Replace stale `TenantIntegration` interface with correct schema or re-export from `integration.ts` |
| `src/types/database.ts` | May need to re-export `TenantIntegration` from `integration.ts` instead of `tenant-runtime.ts` |

## Risk Assessment

- **Low risk**: The old `tenant_integrations` table from 00036 was never usable (code targets the 00103 schema). Dropping it loses no data.
- **No breaking changes**: All runtime code already imports from `@/types/integration` with the correct type. Fixing `tenant-runtime.ts` only corrects the stale duplicate that would confuse future consumers.
