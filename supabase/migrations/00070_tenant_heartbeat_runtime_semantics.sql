BEGIN;

ALTER TABLE tenant_heartbeat_configs
  ADD COLUMN IF NOT EXISTS cooldown_minutes INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS max_alerts_per_day INTEGER NOT NULL DEFAULT 6;

ALTER TABLE tenant_heartbeat_configs
  DROP CONSTRAINT IF EXISTS tenant_heartbeat_configs_cooldown_minutes_check,
  DROP CONSTRAINT IF EXISTS tenant_heartbeat_configs_max_alerts_per_day_check;

ALTER TABLE tenant_heartbeat_configs
  ADD CONSTRAINT tenant_heartbeat_configs_cooldown_minutes_check
    CHECK (cooldown_minutes BETWEEN 5 AND 1440),
  ADD CONSTRAINT tenant_heartbeat_configs_max_alerts_per_day_check
    CHECK (max_alerts_per_day BETWEEN 1 AND 50);

ALTER TABLE tenant_heartbeat_runs
  ADD COLUMN IF NOT EXISTS run_slot TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trigger_mode TEXT NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS check_durations JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS signal_fingerprints TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS delivery_attempted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS suppressed_reason TEXT;

ALTER TABLE tenant_heartbeat_runs
  DROP CONSTRAINT IF EXISTS tenant_heartbeat_runs_trigger_mode_check,
  DROP CONSTRAINT IF EXISTS tenant_heartbeat_runs_delivery_status_check;

ALTER TABLE tenant_heartbeat_runs
  ADD CONSTRAINT tenant_heartbeat_runs_trigger_mode_check
    CHECK (trigger_mode IN ('scheduled', 'manual_run', 'manual_preview')),
  ADD CONSTRAINT tenant_heartbeat_runs_delivery_status_check
    CHECK (delivery_status IN (
      'not_applicable',
      'suppressed',
      'queued',
      'dispatched',
      'dispatch_failed',
      'preview'
    ));

UPDATE tenant_heartbeat_runs
SET
  run_slot = date_trunc('minute', ran_at),
  trigger_mode = 'scheduled',
  check_durations = COALESCE(check_durations, '{}'::jsonb),
  signal_fingerprints = COALESCE(signal_fingerprints, '{}'::text[]),
  delivery_attempted = COALESCE(delivery_attempted, llm_invoked),
  delivery_status = CASE
    WHEN runtime_run_id IS NOT NULL THEN 'dispatched'
    WHEN had_signal AND llm_invoked THEN 'queued'
    WHEN had_signal THEN 'suppressed'
    ELSE 'not_applicable'
  END,
  suppressed_reason = CASE
    WHEN had_signal AND runtime_run_id IS NULL AND NOT llm_invoked THEN 'legacy_missing_delivery_state'
    ELSE suppressed_reason
  END
WHERE run_slot IS NULL
   OR trigger_mode IS NULL
   OR delivery_status IS NULL;

DROP INDEX IF EXISTS uq_tenant_heartbeat_runs_config_slot;
CREATE UNIQUE INDEX uq_tenant_heartbeat_runs_config_slot
  ON tenant_heartbeat_runs(config_id, run_slot)
  WHERE run_slot IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_heartbeat_runs_tenant_delivery
  ON tenant_heartbeat_runs(tenant_id, delivery_status, created_at DESC);

COMMIT;
