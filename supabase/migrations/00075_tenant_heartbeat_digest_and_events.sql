BEGIN;

ALTER TABLE tenant_heartbeat_configs
  ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS digest_window_minutes INTEGER NOT NULL DEFAULT 120;

ALTER TABLE tenant_heartbeat_configs
  DROP CONSTRAINT IF EXISTS tenant_heartbeat_configs_digest_window_minutes_check;

ALTER TABLE tenant_heartbeat_configs
  ADD CONSTRAINT tenant_heartbeat_configs_digest_window_minutes_check
    CHECK (digest_window_minutes BETWEEN 15 AND 1440);

ALTER TABLE tenant_heartbeat_runs
  DROP CONSTRAINT IF EXISTS tenant_heartbeat_runs_delivery_status_check;

ALTER TABLE tenant_heartbeat_runs
  ADD CONSTRAINT tenant_heartbeat_runs_delivery_status_check
    CHECK (delivery_status IN (
      'not_applicable',
      'suppressed',
      'deferred',
      'awaiting_approval',
      'queued',
      'dispatched',
      'dispatch_failed',
      'preview'
    ));

CREATE TABLE IF NOT EXISTS tenant_heartbeat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  config_id UUID REFERENCES tenant_heartbeat_configs(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES tenant_agents(id) ON DELETE SET NULL,
  actor_user_id UUID,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'config_saved',
      'paused',
      'resumed',
      'manual_preview',
      'manual_run',
      'manual_test',
      'issue_acknowledged',
      'issue_snoozed',
      'issue_resolved'
    )),
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_heartbeat_events_tenant_created
  ON tenant_heartbeat_events(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_heartbeat_events_config_created
  ON tenant_heartbeat_events(config_id, created_at DESC);

ALTER TABLE tenant_heartbeat_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant heartbeat events"
  ON tenant_heartbeat_events FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert heartbeat events"
  ON tenant_heartbeat_events FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update heartbeat events"
  ON tenant_heartbeat_events FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can delete heartbeat events"
  ON tenant_heartbeat_events FOR DELETE
  USING (can_manage_tenant_data(tenant_id));

COMMIT;
