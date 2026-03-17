-- Phase 4b: Async Delegation and Subagent Orchestration
-- Adds deadline_at, delegation_kind, budget columns, and async delegation tool seeds

-- 1. Add async delegation columns to tenant_runtime_runs
ALTER TABLE tenant_runtime_runs
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delegation_kind TEXT;

-- Composite index for efficient child polling by parent
CREATE INDEX IF NOT EXISTS idx_runtime_runs_parent_status
  ON tenant_runtime_runs (parent_run_id, status)
  WHERE parent_run_id IS NOT NULL;

-- 2. Add delegation budget columns to tenant_run_budget_configs
ALTER TABLE tenant_run_budget_configs
  ADD COLUMN IF NOT EXISTS max_concurrent_delegations SMALLINT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_delegation_spend_cents INTEGER DEFAULT 1000;

-- 3. Seed async delegation tools for all active tenants
-- delegate_task_async
INSERT INTO tenant_tools (tenant_id, customer_id, tool_key, display_name, description, status, risk_level, config, metadata)
SELECT
  t.id AS tenant_id,
  t.customer_id,
  'delegate_task_async',
  'Delegate Task (Async)',
  'Enqueue an asynchronous task for another agent. Returns a handle to poll for results.',
  'enabled',
  'high',
  '{}'::jsonb,
  jsonb_build_object(
    'provider', 'native',
    'category', 'delegation',
    'seeded_by', 'native_tool_catalog'
  )
FROM tenants t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM tenant_tools tt
    WHERE tt.tenant_id = t.id AND tt.tool_key = 'delegate_task_async'
  );

-- delegation_poll
INSERT INTO tenant_tools (tenant_id, customer_id, tool_key, display_name, description, status, risk_level, config, metadata)
SELECT
  t.id AS tenant_id,
  t.customer_id,
  'delegation_poll',
  'Delegation Poll',
  'Check the status and collect results of one or more async delegations.',
  'enabled',
  'high',
  '{}'::jsonb,
  jsonb_build_object(
    'provider', 'native',
    'category', 'delegation',
    'seeded_by', 'native_tool_catalog'
  )
FROM tenants t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM tenant_tools tt
    WHERE tt.tenant_id = t.id AND tt.tool_key = 'delegation_poll'
  );

-- delegation_cancel
INSERT INTO tenant_tools (tenant_id, customer_id, tool_key, display_name, description, status, risk_level, config, metadata)
SELECT
  t.id AS tenant_id,
  t.customer_id,
  'delegation_cancel',
  'Delegation Cancel',
  'Cancel an in-progress async delegation.',
  'enabled',
  'high',
  '{}'::jsonb,
  jsonb_build_object(
    'provider', 'native',
    'category', 'delegation',
    'seeded_by', 'native_tool_catalog'
  )
FROM tenants t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM tenant_tools tt
    WHERE tt.tenant_id = t.id AND tt.tool_key = 'delegation_cancel'
  );

-- Seed corresponding policies for all three new tools
INSERT INTO tenant_tool_policies (tenant_id, customer_id, tool_id, approval_mode, allow_roles, max_calls_per_hour, timeout_ms, metadata)
SELECT
  tt.tenant_id,
  tt.customer_id,
  tt.id AS tool_id,
  'none',
  ARRAY['owner', 'admin', 'operator', 'viewer'],
  120,
  60000,
  jsonb_build_object('seeded_by', 'native_tool_catalog')
FROM tenant_tools tt
WHERE tt.tool_key IN ('delegate_task_async', 'delegation_poll', 'delegation_cancel')
  AND NOT EXISTS (
    SELECT 1 FROM tenant_tool_policies ttp
    WHERE ttp.tool_id = tt.id
  );
