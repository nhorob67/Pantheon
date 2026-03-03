-- Scheduled messages for proactive agent communication
-- Cron processor queries this table to find due messages

CREATE TABLE tenant_scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES tenant_agents(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  schedule_key TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, agent_id, schedule_key)
);

CREATE INDEX idx_scheduled_messages_due ON tenant_scheduled_messages(next_run_at)
  WHERE enabled = true;
CREATE INDEX idx_scheduled_messages_tenant ON tenant_scheduled_messages(tenant_id);

-- RLS
ALTER TABLE tenant_scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY scheduled_messages_select ON tenant_scheduled_messages
  FOR SELECT USING (
    tenant_id IN (
      SELECT tm.tenant_id FROM tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY scheduled_messages_manage ON tenant_scheduled_messages
  FOR ALL USING (
    tenant_id IN (
      SELECT tm.tenant_id FROM tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin', 'operator')
    )
  );

CREATE POLICY scheduled_messages_service ON tenant_scheduled_messages
  FOR ALL USING (auth.role() = 'service_role');
