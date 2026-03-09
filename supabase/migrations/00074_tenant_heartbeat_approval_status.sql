BEGIN;

ALTER TABLE tenant_heartbeat_runs
  DROP CONSTRAINT IF EXISTS tenant_heartbeat_runs_delivery_status_check;

ALTER TABLE tenant_heartbeat_runs
  ADD CONSTRAINT tenant_heartbeat_runs_delivery_status_check
    CHECK (delivery_status IN (
      'not_applicable',
      'suppressed',
      'awaiting_approval',
      'queued',
      'dispatched',
      'dispatch_failed',
      'preview'
    ));

COMMIT;
