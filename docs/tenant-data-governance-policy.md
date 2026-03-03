# Tenant Data Governance Policy Controls

Last updated: February 24, 2026  
Scope: Explicit tenant retention/deletion controls for Phase 6 governance

## Endpoints

1. `GET /api/tenants/[tenantId]/data-governance`
2. `PUT /api/tenants/[tenantId]/data-governance`

## Access model

1. `GET` requires tenant read access.
2. `PUT` requires tenant runtime-data management role (`owner`/`admin`/`operator` per existing role policy).
3. Policy updates are audit-logged.

## Policy fields

1. `export_retention_days` (1-30)
2. `memory_tombstone_retention_days` (7-3650)
3. `deletion_guard_enabled` (boolean)
4. `hard_delete_requires_owner` (boolean)

## Storage model

Policy is stored in tenant metadata under:

1. `tenants.metadata.data_governance.export_retention_days`
2. `tenants.metadata.data_governance.memory_tombstone_retention_days`
3. `tenants.metadata.data_governance.deletion_guard_enabled`
4. `tenants.metadata.data_governance.hard_delete_requires_owner`
5. `tenants.metadata.data_governance.updated_by`
6. `tenants.metadata.data_governance.updated_at`
