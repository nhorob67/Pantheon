-- 00066_tenant_heartbeat.sql
-- Heartbeat feature: periodic proactive agent check-ins with "cheap checks first" strategy.
-- Runs lightweight DB/API queries before invoking LLM, so heartbeat costs near-zero when nothing is happening.

BEGIN;

-- 1. tenant_heartbeat_configs: per-tenant (or per-agent) heartbeat configuration
CREATE TABLE tenant_heartbeat_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES tenant_agents(id) ON DELETE CASCADE,  -- NULL = tenant default
  enabled BOOLEAN NOT NULL DEFAULT false,
  interval_minutes INTEGER NOT NULL DEFAULT 60
    CHECK (interval_minutes IN (15, 30, 60, 120, 240)),
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  active_hours_start TEXT NOT NULL DEFAULT '05:00',
  active_hours_end TEXT NOT NULL DEFAULT '21:00',
  checks JSONB NOT NULL DEFAULT '{
    "weather_severe": true,
    "grain_price_movement": true,
    "grain_price_threshold_cents": 10,
    "unreviewed_tickets": true,
    "unreviewed_tickets_threshold_hours": 4,
    "unanswered_emails": true,
    "unanswered_emails_threshold_hours": 2
  }',
  custom_checks TEXT[] DEFAULT '{}',
  delivery_channel_id TEXT,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, agent_id)
);

-- Partial unique index for tenant-level default (agent_id IS NULL)
CREATE UNIQUE INDEX uq_heartbeat_tenant_default
  ON tenant_heartbeat_configs (tenant_id) WHERE agent_id IS NULL;

CREATE INDEX idx_heartbeat_configs_due
  ON tenant_heartbeat_configs(next_run_at) WHERE enabled = true;

CREATE INDEX idx_heartbeat_configs_tenant
  ON tenant_heartbeat_configs(tenant_id);

ALTER TABLE tenant_heartbeat_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant heartbeat configs"
  ON tenant_heartbeat_configs FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert heartbeat configs"
  ON tenant_heartbeat_configs FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update heartbeat configs"
  ON tenant_heartbeat_configs FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can delete heartbeat configs"
  ON tenant_heartbeat_configs FOR DELETE
  USING (can_manage_tenant_data(tenant_id));

CREATE TRIGGER set_tenant_heartbeat_configs_updated_at
  BEFORE UPDATE ON tenant_heartbeat_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. tenant_heartbeat_runs: logs each heartbeat execution for activity heatmap
CREATE TABLE tenant_heartbeat_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES tenant_heartbeat_configs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checks_executed JSONB NOT NULL DEFAULT '{}',
  had_signal BOOLEAN NOT NULL DEFAULT false,
  llm_invoked BOOLEAN NOT NULL DEFAULT false,
  runtime_run_id UUID,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_heartbeat_runs_config
  ON tenant_heartbeat_runs(config_id, ran_at DESC);

CREATE INDEX idx_heartbeat_runs_tenant
  ON tenant_heartbeat_runs(tenant_id, ran_at DESC);

ALTER TABLE tenant_heartbeat_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant heartbeat runs"
  ON tenant_heartbeat_runs FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert heartbeat runs"
  ON tenant_heartbeat_runs FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update heartbeat runs"
  ON tenant_heartbeat_runs FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can delete heartbeat runs"
  ON tenant_heartbeat_runs FOR DELETE
  USING (can_manage_tenant_data(tenant_id));

COMMIT;
