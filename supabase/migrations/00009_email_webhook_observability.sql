-- Phase 1A hardening: basic webhook counters for success/failure monitoring

CREATE TABLE email_webhook_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  outcome TEXT NOT NULL,
  bucket_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_webhook_counters_nonnegative CHECK (count >= 0),
  CONSTRAINT email_webhook_counters_unique
    UNIQUE (provider, event_type, outcome, bucket_date)
);

CREATE INDEX idx_email_webhook_counters_bucket_date
  ON email_webhook_counters(bucket_date DESC, provider, event_type, outcome);

CREATE OR REPLACE FUNCTION increment_email_webhook_counter(
  p_provider TEXT,
  p_event_type TEXT,
  p_outcome TEXT,
  p_bucket_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO email_webhook_counters (
    provider,
    event_type,
    outcome,
    bucket_date,
    count
  )
  VALUES (
    p_provider,
    p_event_type,
    p_outcome,
    COALESCE(p_bucket_date, CURRENT_DATE),
    1
  )
  ON CONFLICT (provider, event_type, outcome, bucket_date)
  DO UPDATE SET
    count = email_webhook_counters.count + 1,
    updated_at = now();
END;
$$;
