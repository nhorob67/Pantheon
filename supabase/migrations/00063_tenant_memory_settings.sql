-- 00062_tenant_memory_settings.sql
-- Migrate memory settings from instance-scoped to tenant-scoped.
-- New customers never get a legacy instances row, so instance_tenant_mappings
-- is always empty for them. This creates proper tenant_memory_settings and
-- tenant_memory_operations tables keyed on tenant_id.

BEGIN;

-- 1. tenant_memory_settings table
CREATE TABLE tenant_memory_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'native_only'
    CHECK (mode IN ('native_only', 'hybrid_local_vault')),
  capture_level TEXT NOT NULL DEFAULT 'standard'
    CHECK (capture_level IN ('conservative', 'standard', 'aggressive')),
  retention_days INTEGER NOT NULL DEFAULT 365
    CHECK (retention_days BETWEEN 7 AND 3650),
  exclude_categories TEXT[] NOT NULL DEFAULT '{}',
  auto_checkpoint BOOLEAN NOT NULL DEFAULT true,
  auto_compress BOOLEAN NOT NULL DEFAULT true,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenant_memory_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant memory settings"
  ON tenant_memory_settings FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert tenant memory settings"
  ON tenant_memory_settings FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update tenant memory settings"
  ON tenant_memory_settings FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can delete tenant memory settings"
  ON tenant_memory_settings FOR DELETE
  USING (can_manage_tenant_data(tenant_id));

CREATE TRIGGER set_tenant_memory_settings_updated_at
  BEFORE UPDATE ON tenant_memory_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. tenant_memory_operations table
CREATE TABLE tenant_memory_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL
    CHECK (operation_type IN ('checkpoint', 'compress')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  requested_by TEXT,
  input JSONB NOT NULL DEFAULT '{}',
  result JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenant_memory_operations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_tmo_tenant_created
  ON tenant_memory_operations(tenant_id, created_at DESC);

CREATE INDEX idx_tmo_queued
  ON tenant_memory_operations(status, queued_at)
  WHERE status = 'queued';

CREATE POLICY "Users can view own tenant memory operations"
  ON tenant_memory_operations FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert tenant memory operations"
  ON tenant_memory_operations FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update tenant memory operations"
  ON tenant_memory_operations FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can delete tenant memory operations"
  ON tenant_memory_operations FOR DELETE
  USING (can_manage_tenant_data(tenant_id));

CREATE TRIGGER set_tenant_memory_operations_updated_at
  BEFORE UPDATE ON tenant_memory_operations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Backfill from legacy tables through instance_tenant_mappings
INSERT INTO tenant_memory_settings (
  tenant_id, customer_id, mode, capture_level, retention_days,
  exclude_categories, auto_checkpoint, auto_compress,
  updated_by, created_at, updated_at
)
SELECT DISTINCT ON (itm.tenant_id)
  itm.tenant_id,
  ims.customer_id,
  ims.mode,
  ims.capture_level,
  ims.retention_days,
  ims.exclude_categories,
  ims.auto_checkpoint,
  ims.auto_compress,
  ims.updated_by,
  ims.created_at,
  ims.updated_at
FROM instance_tenant_mappings itm
JOIN instance_memory_settings ims ON ims.instance_id = itm.instance_id
WHERE itm.mapping_status = 'active'
ORDER BY itm.tenant_id, itm.updated_at DESC
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO tenant_memory_operations (
  tenant_id, customer_id, operation_type, status,
  requested_by, input, result, error_message,
  attempt_count, queued_at, started_at, completed_at,
  created_at, updated_at
)
SELECT
  itm.tenant_id,
  mo.customer_id,
  mo.operation_type,
  mo.status,
  mo.requested_by,
  mo.input,
  mo.result,
  mo.error_message,
  mo.attempt_count,
  mo.queued_at,
  mo.started_at,
  mo.completed_at,
  mo.created_at,
  mo.updated_at
FROM instance_tenant_mappings itm
JOIN memory_operations mo ON mo.instance_id = itm.instance_id
WHERE itm.mapping_status = 'active';

-- 4. Replace tenant_memory_settings_v view to read from new table directly
CREATE OR REPLACE VIEW tenant_memory_settings_v AS
SELECT
  tms.tenant_id,
  tms.customer_id,
  tms.capture_level,
  tms.exclude_categories,
  tms.auto_compress,
  tms.auto_checkpoint,
  tms.retention_days
FROM tenant_memory_settings tms
UNION ALL
SELECT
  t.id AS tenant_id,
  t.customer_id,
  'standard' AS capture_level,
  '{}'::text[] AS exclude_categories,
  true AS auto_compress,
  true AS auto_checkpoint,
  365 AS retention_days
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_memory_settings tms WHERE tms.tenant_id = t.id
);

-- 5. Replace claim/dead-letter functions to target tenant_memory_operations
DROP FUNCTION IF EXISTS claim_memory_operations(INTEGER);
CREATE OR REPLACE FUNCTION claim_memory_operations(p_limit INTEGER)
RETURNS SETOF tenant_memory_operations
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH claimable AS (
    SELECT id FROM tenant_memory_operations
    WHERE
      (status = 'queued')
      OR (
        status = 'running'
        AND started_at < now() - interval '10 minutes'
        AND attempt_count < 3
      )
    ORDER BY queued_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE tenant_memory_operations tmo
  SET
    status = 'running',
    started_at = now(),
    attempt_count = tmo.attempt_count + 1
  FROM claimable c
  WHERE tmo.id = c.id
  RETURNING tmo.*;
END;
$$;

CREATE OR REPLACE FUNCTION dead_letter_stuck_memory_operations()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE tenant_memory_operations
  SET
    status = 'failed',
    completed_at = now(),
    error_message = 'Exceeded maximum retry attempts (stuck in running state)'
  WHERE
    status = 'running'
    AND started_at < now() - interval '10 minutes'
    AND attempt_count >= 3;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Do NOT drop legacy tables (instance_memory_settings, memory_operations)
-- for rollback safety.

COMMIT;
