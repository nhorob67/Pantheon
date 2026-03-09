BEGIN;

ALTER TABLE tenant_heartbeat_runs
  DROP CONSTRAINT IF EXISTS tenant_heartbeat_runs_trigger_mode_check;

ALTER TABLE tenant_heartbeat_runs
  ADD CONSTRAINT tenant_heartbeat_runs_trigger_mode_check
    CHECK (trigger_mode IN ('scheduled', 'manual_run', 'manual_preview', 'manual_test'));

COMMIT;
