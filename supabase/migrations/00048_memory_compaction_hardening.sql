-- 00048_memory_compaction_hardening.sql
-- Harden memory compaction: settings view, exact message tracking,
-- content-hash unique index, stuck-job recovery with attempt_count.

BEGIN;

-- 1a. View bridging tenant → legacy instance_memory_settings
-- DISTINCT ON ensures exactly one row per tenant even if multiple active mappings exist.
-- Tie-break: prefer the most recently created mapping.
CREATE OR REPLACE VIEW tenant_memory_settings_v AS
SELECT DISTINCT ON (t.id)
  t.id AS tenant_id,
  t.customer_id,
  COALESCE(ims.capture_level, 'standard') AS capture_level,
  COALESCE(ims.exclude_categories, '{}') AS exclude_categories,
  COALESCE(ims.auto_compress, true) AS auto_compress,
  COALESCE(ims.auto_checkpoint, true) AS auto_checkpoint,
  COALESCE(ims.retention_days, 365) AS retention_days
FROM tenants t
LEFT JOIN instance_tenant_mappings itm
  ON itm.tenant_id = t.id AND itm.mapping_status = 'active'
LEFT JOIN instance_memory_settings ims
  ON ims.instance_id = itm.instance_id
ORDER BY t.id, itm.created_at DESC NULLS LAST;

-- 1b. Track last summarized message for exact counting
ALTER TABLE tenant_sessions
  ADD COLUMN IF NOT EXISTS last_summarized_message_id UUID
    REFERENCES tenant_messages(id) ON DELETE SET NULL;

-- 1c. Deduplicate existing records, then add unique partial index
WITH dups AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY tenant_id, content_hash ORDER BY created_at DESC
  ) AS rn
  FROM tenant_memory_records
  WHERE content_hash IS NOT NULL AND is_tombstoned = false
)
UPDATE tenant_memory_records SET is_tombstoned = true
WHERE id IN (SELECT id FROM dups WHERE rn > 1);

DROP INDEX IF EXISTS idx_tmr_content_hash;
CREATE UNIQUE INDEX idx_tmr_content_hash_unique
  ON tenant_memory_records(tenant_id, content_hash)
  WHERE content_hash IS NOT NULL AND is_tombstoned = false;

-- 1d. Attempt counter for stuck-job recovery
ALTER TABLE memory_operations
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

-- Update claim_memory_operations to also reclaim stuck jobs
-- Must drop first because the return type is changing (TABLE → SETOF)
DROP FUNCTION IF EXISTS claim_memory_operations(INTEGER);
CREATE OR REPLACE FUNCTION claim_memory_operations(p_limit INTEGER)
RETURNS SETOF memory_operations
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH claimable AS (
    SELECT id FROM memory_operations
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
  UPDATE memory_operations mo
  SET
    status = 'running',
    started_at = now(),
    attempt_count = mo.attempt_count + 1
  FROM claimable c
  WHERE mo.id = c.id
  RETURNING mo.*;
END;
$$;

-- Dead-letter function: permanently fail jobs that exceeded max attempts
CREATE OR REPLACE FUNCTION dead_letter_stuck_memory_operations()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE memory_operations
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

COMMIT;
