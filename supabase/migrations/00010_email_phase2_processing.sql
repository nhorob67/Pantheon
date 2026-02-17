-- Phase 2 foundation: inbound processing queue + attachment metadata storage

-- Expand processing state machine + retry/backoff metadata.
ALTER TABLE email_inbound
  DROP CONSTRAINT email_inbound_status_check;

ALTER TABLE email_inbound
  ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN processing_started_at TIMESTAMPTZ,
  ADD COLUMN processed_at TIMESTAMPTZ,
  ADD COLUMN failed_at TIMESTAMPTZ,
  ADD COLUMN last_error TEXT,
  ADD COLUMN raw_storage_bucket TEXT,
  ADD COLUMN raw_storage_path TEXT;

ALTER TABLE email_inbound
  ADD CONSTRAINT email_inbound_status_check
  CHECK (status IN ('queued', 'processing', 'processed', 'failed'));

ALTER TABLE email_inbound
  ADD CONSTRAINT email_inbound_retry_count_nonnegative
  CHECK (retry_count >= 0);

-- Processor scans due jobs by status + next_attempt_at.
CREATE INDEX idx_email_inbound_processor_queue
  ON email_inbound (status, next_attempt_at, received_at)
  WHERE status IN ('queued', 'failed');

-- Canonical metadata for persisted attachments.
CREATE TABLE email_inbound_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_id UUID NOT NULL REFERENCES email_inbound(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_attachment_id TEXT,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  sha256 TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'email-attachments',
  storage_path TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_inbound_attachments_size_nonnegative
    CHECK (size_bytes >= 0)
);

CREATE UNIQUE INDEX email_inbound_attachments_inbound_provider_attachment_unique
  ON email_inbound_attachments(inbound_id, provider_attachment_id)
  WHERE provider_attachment_id IS NOT NULL;

CREATE UNIQUE INDEX email_inbound_attachments_storage_unique
  ON email_inbound_attachments(storage_bucket, storage_path);

CREATE INDEX idx_email_inbound_attachments_inbound_id
  ON email_inbound_attachments(inbound_id);

CREATE INDEX idx_email_inbound_attachments_sha256
  ON email_inbound_attachments(sha256);

ALTER TABLE email_inbound_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inbound attachments"
  ON email_inbound_attachments FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE TRIGGER email_inbound_attachments_updated_at
  BEFORE UPDATE ON email_inbound_attachments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Private storage buckets for raw inbound payload + attachment binaries.
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('email-raw', 'email-raw', false),
  ('email-attachments', 'email-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Concurrency-safe job claim function for processor workers.
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
    WHERE e.id IN (SELECT id FROM rows_to_claim)
    RETURNING e.id
  )
  SELECT c.id
  FROM claimed c;
END;
$$ LANGUAGE plpgsql;
