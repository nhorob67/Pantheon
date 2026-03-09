BEGIN;

ALTER TABLE tenant_heartbeat_configs
  ADD COLUMN IF NOT EXISTS reminder_interval_minutes INTEGER NOT NULL DEFAULT 1440,
  ADD COLUMN IF NOT EXISTS heartbeat_instructions TEXT NOT NULL DEFAULT '';

ALTER TABLE tenant_heartbeat_configs
  DROP CONSTRAINT IF EXISTS tenant_heartbeat_configs_reminder_interval_minutes_check,
  DROP CONSTRAINT IF EXISTS tenant_heartbeat_configs_heartbeat_instructions_length_check;

ALTER TABLE tenant_heartbeat_configs
  ADD CONSTRAINT tenant_heartbeat_configs_reminder_interval_minutes_check
    CHECK (reminder_interval_minutes BETWEEN 30 AND 10080),
  ADD CONSTRAINT tenant_heartbeat_configs_heartbeat_instructions_length_check
    CHECK (char_length(heartbeat_instructions) <= 1000);

CREATE TABLE IF NOT EXISTS tenant_heartbeat_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES tenant_heartbeat_configs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES tenant_agents(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  severity INTEGER NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  state TEXT NOT NULL DEFAULT 'new'
    CHECK (state IN ('new', 'acknowledged', 'snoozed', 'resolved')),
  summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_notified_at TIMESTAMPTZ,
  last_notification_kind TEXT
    CHECK (last_notification_kind IN ('new_issue', 'reminder', 'worsened')),
  snoozed_until TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_heartbeat_signals_active_fingerprint
  ON tenant_heartbeat_signals(config_id, fingerprint)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_heartbeat_signals_tenant_active
  ON tenant_heartbeat_signals(tenant_id, resolved_at, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_heartbeat_signals_config_active
  ON tenant_heartbeat_signals(config_id, resolved_at, severity DESC, last_seen_at DESC);

ALTER TABLE tenant_heartbeat_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant heartbeat signals"
  ON tenant_heartbeat_signals FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert heartbeat signals"
  ON tenant_heartbeat_signals FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update heartbeat signals"
  ON tenant_heartbeat_signals FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can delete heartbeat signals"
  ON tenant_heartbeat_signals FOR DELETE
  USING (can_manage_tenant_data(tenant_id));

DROP TRIGGER IF EXISTS set_tenant_heartbeat_signals_updated_at ON tenant_heartbeat_signals;
CREATE TRIGGER set_tenant_heartbeat_signals_updated_at
  BEFORE UPDATE ON tenant_heartbeat_signals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
