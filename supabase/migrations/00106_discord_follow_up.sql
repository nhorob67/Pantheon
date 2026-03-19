-- Allow "discord_follow_up" as a run_kind for tenant_runtime_runs.
-- Also catches up the constraint with run kinds added after the original migration (00056).

ALTER TABLE tenant_runtime_runs
  DROP CONSTRAINT IF EXISTS tenant_runtime_runs_run_kind_check;

ALTER TABLE tenant_runtime_runs
  ADD CONSTRAINT tenant_runtime_runs_run_kind_check
  CHECK (run_kind IN (
    'discord_canary',
    'discord_runtime',
    'discord_heartbeat',
    'email_runtime',
    'delegation_runtime',
    'discord_follow_up'
  ));
