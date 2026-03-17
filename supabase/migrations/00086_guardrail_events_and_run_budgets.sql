-- Phase 1.5: Guardrail events table and run budget configuration
-- Records loop detection triggers, budget exceeded events, and other guardrail actions.

-- ---------------------------------------------------------------------------
-- Guardrail events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenant_guardrail_events (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  run_id        uuid NOT NULL,
  agent_id      uuid,
  event_kind    text NOT NULL CHECK (event_kind IN (
    'loop_warning', 'loop_hard_stop',
    'budget_tool_invocations', 'budget_elapsed_time',
    'budget_tokens', 'budget_spend'
  )),
  tool_name     text,
  threshold     double precision NOT NULL DEFAULT 0,
  actual        double precision NOT NULL DEFAULT 0,
  action        text NOT NULL CHECK (action IN ('warn', 'halt')),
  message       text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_guardrail_events_tenant ON tenant_guardrail_events(tenant_id, created_at DESC);
CREATE INDEX idx_guardrail_events_run    ON tenant_guardrail_events(run_id);
CREATE INDEX idx_guardrail_events_kind   ON tenant_guardrail_events(event_kind, action);

ALTER TABLE tenant_guardrail_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their guardrail events"
  ON tenant_guardrail_events FOR SELECT
  USING (customer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Run budget configuration per tenant (optional overrides)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenant_run_budget_configs (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id              uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id            uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_id               uuid,  -- NULL = tenant-wide default
  loop_warning_threshold integer NOT NULL DEFAULT 3,
  loop_hard_stop_threshold integer NOT NULL DEFAULT 5,
  max_tool_invocations   integer NOT NULL DEFAULT 50,
  max_elapsed_ms         integer NOT NULL DEFAULT 300000,
  max_tokens             integer NOT NULL DEFAULT 200000,
  max_spend_cents        integer NOT NULL DEFAULT 500,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, agent_id)
);

ALTER TABLE tenant_run_budget_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their run budget configs"
  ON tenant_run_budget_configs FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can manage their run budget configs"
  ON tenant_run_budget_configs FOR ALL
  USING (customer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Add guardrail_summary to conversation traces
-- ---------------------------------------------------------------------------

ALTER TABLE tenant_conversation_traces
  ADD COLUMN IF NOT EXISTS guardrail_summary jsonb DEFAULT NULL;

COMMENT ON COLUMN tenant_conversation_traces.guardrail_summary IS
  'Phase 1.5: Guardrail state summary at end of run — invocation counts, budget usage, halt info, event counts';
