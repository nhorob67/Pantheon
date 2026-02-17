-- Enforce one instance per customer.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'instances_customer_id_unique'
  ) THEN
    ALTER TABLE instances
      ADD CONSTRAINT instances_customer_id_unique UNIQUE (customer_id);
  END IF;
END $$;

-- Speeds up batch claim queries for upgrade execution.
CREATE INDEX IF NOT EXISTS idx_upgrade_logs_upgrade_status_created_at
  ON upgrade_instance_logs (upgrade_id, status, created_at);

-- Atomically claim pending logs so concurrent workers cannot process the same rows.
CREATE OR REPLACE FUNCTION claim_upgrade_instance_logs(
  p_upgrade_id UUID,
  p_limit INTEGER
)
RETURNS TABLE (
  id UUID,
  instance_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH rows_to_claim AS (
    SELECT l.id
    FROM upgrade_instance_logs l
    WHERE l.upgrade_id = p_upgrade_id
      AND l.status = 'pending'
    ORDER BY l.created_at ASC
    LIMIT GREATEST(p_limit, 1)
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE upgrade_instance_logs l
    SET
      status = 'in_progress',
      started_at = COALESCE(l.started_at, now())
    WHERE l.id IN (SELECT id FROM rows_to_claim)
    RETURNING l.id, l.instance_id
  )
  SELECT c.id, c.instance_id
  FROM claimed c;
END;
$$ LANGUAGE plpgsql;
