-- Fix ambiguous "id" column reference in claim_email_inbound_jobs.
-- The subselect `SELECT id FROM rows_to_claim` was ambiguous because
-- the UPDATE CTE also aliases email_inbound as "e" which has an "id" column.

CREATE OR REPLACE FUNCTION claim_email_inbound_jobs(
  p_limit INTEGER,
  p_max_retries INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH rows_to_claim AS (
    SELECT e.id
    FROM email_inbound e
    WHERE (
      e.status = 'queued'
      OR (
        e.status = 'failed'
        AND e.retry_count < GREATEST(p_max_retries, 1)
      )
    )
      AND e.next_attempt_at <= now()
    ORDER BY e.received_at ASC
    LIMIT GREATEST(p_limit, 1)
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE email_inbound e
    SET
      status = 'processing',
      processing_started_at = now(),
      updated_at = now()
    WHERE e.id IN (SELECT rtc.id FROM rows_to_claim rtc)
    RETURNING e.id
  )
  SELECT c.id
  FROM claimed c;
END;
$$ LANGUAGE plpgsql;
