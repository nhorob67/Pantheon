-- Add failure notification preference to scheduled messages
-- Default ON for all schedules — farmers should know when things break

ALTER TABLE tenant_scheduled_messages
  ADD COLUMN notify_on_failure BOOLEAN NOT NULL DEFAULT true;

-- Add retry config columns for auto-retry before alerting
ALTER TABLE tenant_scheduled_messages
  ADD COLUMN max_retries INTEGER NOT NULL DEFAULT 2
    CHECK (max_retries BETWEEN 0 AND 5),
  ADD COLUMN retry_delay_seconds INTEGER NOT NULL DEFAULT 60
    CHECK (retry_delay_seconds BETWEEN 10 AND 600);
