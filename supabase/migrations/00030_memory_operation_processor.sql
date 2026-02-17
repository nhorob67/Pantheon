-- Concurrency-safe claim function for memory operation workers.

CREATE INDEX IF NOT EXISTS idx_memory_operations_status_queued_at
  ON memory_operations (status, queued_at)
  WHERE status = 'queued';

CREATE OR REPLACE FUNCTION claim_memory_operations(
  p_limit INTEGER
)
RETURNS TABLE (
  id UUID,
  instance_id UUID,
  customer_id UUID,
  operation_type TEXT,
  input JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH rows_to_claim AS (
    SELECT m.id
    FROM memory_operations m
    WHERE m.status = 'queued'
    ORDER BY m.queued_at ASC
    LIMIT GREATEST(p_limit, 1)
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE memory_operations m
    SET
      status = 'running',
      started_at = COALESCE(m.started_at, now()),
      error_message = NULL,
      updated_at = now()
    WHERE m.id IN (SELECT id FROM rows_to_claim)
    RETURNING
      m.id,
      m.instance_id,
      m.customer_id,
      m.operation_type,
      m.input
  )
  SELECT
    c.id,
    c.instance_id,
    c.customer_id,
    c.operation_type,
    c.input
  FROM claimed c;
END;
$$ LANGUAGE plpgsql;
