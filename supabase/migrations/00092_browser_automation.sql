-- Migration: Browser Automation — Phase 5
--
-- Adds browser automation support: policies, sessions, artifacts,
-- and seeds 5 browser tools for existing tenants.

-- ---------------------------------------------------------------------------
-- Browser session status enum
-- ---------------------------------------------------------------------------
CREATE TYPE browser_session_status AS ENUM (
  'idle', 'active', 'completed', 'failed', 'timed_out'
);

-- ---------------------------------------------------------------------------
-- Browser artifact kind enum
-- ---------------------------------------------------------------------------
CREATE TYPE browser_artifact_kind AS ENUM (
  'screenshot', 'dom_snapshot', 'structured_output', 'step_log'
);

-- ---------------------------------------------------------------------------
-- tenant_browser_policies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_browser_policies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  domain_allowlist   text[] NOT NULL DEFAULT '{}',
  domain_blocklist   text[] NOT NULL DEFAULT '{}',
  require_approval_actions text[] NOT NULL DEFAULT '{}',
  max_sessions_per_day     int NOT NULL DEFAULT 10,
  max_actions_per_session  int NOT NULL DEFAULT 25,
  max_session_duration_ms  int NOT NULL DEFAULT 120000,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE tenant_browser_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_browser_policies_customer" ON tenant_browser_policies
  FOR ALL USING (customer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- tenant_browser_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_browser_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  run_id        uuid REFERENCES tenant_runtime_runs(id) ON DELETE SET NULL,
  agent_id      uuid REFERENCES tenant_agents(id) ON DELETE SET NULL,
  status        browser_session_status NOT NULL DEFAULT 'idle',
  action_count  int NOT NULL DEFAULT 0,
  current_url   text,
  cost_cents    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz,
  completed_at  timestamptz,
  metadata      jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE tenant_browser_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_browser_sessions_customer" ON tenant_browser_sessions
  FOR ALL USING (customer_id = auth.uid());

CREATE INDEX idx_browser_sessions_tenant ON tenant_browser_sessions(tenant_id);
CREATE INDEX idx_browser_sessions_run ON tenant_browser_sessions(run_id);
CREATE INDEX idx_browser_sessions_created ON tenant_browser_sessions(created_at DESC);

-- ---------------------------------------------------------------------------
-- tenant_browser_artifacts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_browser_artifacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES tenant_browser_sessions(id) ON DELETE CASCADE,
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  kind          browser_artifact_kind NOT NULL,
  storage_key   text NOT NULL,
  metadata      jsonb NOT NULL DEFAULT '{}',
  action_index  int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenant_browser_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_browser_artifacts_customer" ON tenant_browser_artifacts
  FOR ALL USING (customer_id = auth.uid());

CREATE INDEX idx_browser_artifacts_session ON tenant_browser_artifacts(session_id);

-- ---------------------------------------------------------------------------
-- Add browser columns to run budget configs
-- ---------------------------------------------------------------------------
ALTER TABLE tenant_run_budget_configs
  ADD COLUMN IF NOT EXISTS max_browser_actions int DEFAULT 25,
  ADD COLUMN IF NOT EXISTS max_browser_session_ms int DEFAULT 120000;

-- ---------------------------------------------------------------------------
-- Add browser_sessions to conversation traces
-- ---------------------------------------------------------------------------
ALTER TABLE tenant_conversation_traces
  ADD COLUMN IF NOT EXISTS browser_sessions jsonb DEFAULT NULL;

-- ---------------------------------------------------------------------------
-- Seed 5 browser tools for existing tenants
-- ---------------------------------------------------------------------------
WITH tenant_list AS (
  SELECT id AS tenant_id, customer_id
  FROM tenants
  WHERE status = 'active'
),
tool_defs (tool_key, display_name, description, status, risk_level, category, approval_mode) AS (
  VALUES
    ('browser_navigate',   'Browser Navigate',   'Navigate to a URL in a headless browser',                         'disabled', 'high',   'browser', 'none'),
    ('browser_extract',    'Browser Extract',    'Extract structured data from the current page',                   'disabled', 'medium', 'browser', 'none'),
    ('browser_click',      'Browser Click',      'Click an element on the current page by description',             'disabled', 'high',   'browser', 'always'),
    ('browser_fill',       'Browser Fill',       'Fill a form field on the current page by description',            'disabled', 'high',   'browser', 'always'),
    ('browser_screenshot', 'Browser Screenshot', 'Take a screenshot of the current page',                          'disabled', 'medium', 'browser', 'none')
),
inserted_tools AS (
  INSERT INTO tenant_tools (tenant_id, customer_id, tool_key, display_name, description, status, risk_level, config, metadata)
  SELECT
    tl.tenant_id,
    tl.customer_id,
    td.tool_key,
    td.display_name,
    td.description,
    td.status,
    td.risk_level,
    '{}'::jsonb,
    jsonb_build_object(
      'provider', 'native',
      'category', td.category,
      'seeded_by', 'migration_00092'
    )
  FROM tenant_list tl
  CROSS JOIN tool_defs td
  ON CONFLICT (tenant_id, tool_key) DO NOTHING
  RETURNING id, tenant_id, customer_id, tool_key
)
INSERT INTO tenant_tool_policies (
  tenant_id, customer_id, tool_id,
  approval_mode, allow_roles, max_calls_per_hour, timeout_ms, metadata
)
SELECT
  it.tenant_id,
  it.customer_id,
  it.id,
  td.approval_mode,
  ARRAY['owner', 'admin', 'operator', 'viewer']::text[],
  60,
  30000,
  jsonb_build_object('seeded_by', 'migration_00092')
FROM inserted_tools it
JOIN tool_defs td ON td.tool_key = it.tool_key
ON CONFLICT (tenant_id, tool_id) DO NOTHING;
