-- Fix tenant_integrations foreign key: references instances(id) but should
-- reference tenants(id), matching every other tenant_* table in the schema.
-- This mismatch causes FK constraint violations when agents try to register
-- integrations using the tenant's UUID.

ALTER TABLE tenant_integrations
  DROP CONSTRAINT IF EXISTS tenant_integrations_tenant_id_fkey;

ALTER TABLE tenant_integrations
  ADD CONSTRAINT tenant_integrations_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
