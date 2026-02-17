-- Security hardening:
-- 1) Durable, database-backed rate limiting
-- 2) Persistent Stripe webhook idempotency and retry state

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_action_key_created_at
  ON rate_limit_events (action, key, created_at DESC);

ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION consume_rate_limit_token(
  p_action TEXT,
  p_key TEXT,
  p_window_seconds INTEGER,
  p_max_attempts INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_seconds INTEGER;
  v_max_attempts INTEGER;
  v_count INTEGER;
BEGIN
  v_window_seconds := GREATEST(COALESCE(p_window_seconds, 0), 1);
  v_max_attempts := GREATEST(COALESCE(p_max_attempts, 0), 1);

  IF p_action IS NULL OR length(trim(p_action)) = 0 THEN
    RETURN false;
  END IF;

  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RETURN false;
  END IF;

  -- Serialize checks for the same limiter key across concurrent workers.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(trim(lower(p_action)) || ':' || trim(lower(p_key)), 0)
  );

  DELETE FROM rate_limit_events
  WHERE action = trim(lower(p_action))
    AND key = trim(lower(p_key))
    AND created_at < now() - make_interval(secs => v_window_seconds);

  SELECT count(*)
  INTO v_count
  FROM rate_limit_events
  WHERE action = trim(lower(p_action))
    AND key = trim(lower(p_key));

  IF v_count >= v_max_attempts THEN
    RETURN false;
  END IF;

  INSERT INTO rate_limit_events (action, key)
  VALUES (trim(lower(p_action)), trim(lower(p_key)));

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION consume_rate_limit_token(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_rate_limit_token(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 1
    CHECK (attempt_count >= 1),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status
  ON stripe_webhook_events (status);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_last_attempt_at
  ON stripe_webhook_events (last_attempt_at DESC);

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'stripe_webhook_events_updated_at'
      AND tgrelid = 'stripe_webhook_events'::regclass
  ) THEN
    CREATE TRIGGER stripe_webhook_events_updated_at
      BEFORE UPDATE ON stripe_webhook_events
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
