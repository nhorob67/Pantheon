-- Phase 4a: Synchronous Delegation Support
-- Adds parent-child run linkage and depth tracking for delegation

-- 1. Add delegation columns to tenant_runtime_runs
ALTER TABLE tenant_runtime_runs
  ADD COLUMN IF NOT EXISTS parent_run_id UUID REFERENCES tenant_runtime_runs(id),
  ADD COLUMN IF NOT EXISTS parent_invocation_id UUID,
  ADD COLUMN IF NOT EXISTS delegation_depth SMALLINT NOT NULL DEFAULT 0;

-- Index for finding child runs of a parent
CREATE INDEX IF NOT EXISTS idx_runtime_runs_parent_run_id
  ON tenant_runtime_runs (parent_run_id)
  WHERE parent_run_id IS NOT NULL;

-- 2. Add delegation fields to tenant_conversation_traces
ALTER TABLE tenant_conversation_traces
  ADD COLUMN IF NOT EXISTS parent_run_id UUID,
  ADD COLUMN IF NOT EXISTS delegation_depth SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delegation_events JSONB;

-- 3. Seed delegate_task into native tool catalog for all active tenants
INSERT INTO tenant_tools (tenant_id, customer_id, tool_key, display_name, description, status, risk_level, config, metadata)
SELECT
  t.id AS tenant_id,
  t.customer_id,
  'delegate_task',
  'Delegate Task',
  'Delegate a task to another agent on your team for specialized handling',
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
    WHERE tt.tenant_id = t.id AND tt.tool_key = 'delegate_task'
  );

-- Seed corresponding policies
INSERT INTO tenant_tool_policies (tenant_id, customer_id, tool_id, approval_mode, allow_roles, max_calls_per_hour, timeout_ms, metadata)
SELECT
  tt.tenant_id,
  tt.customer_id,
  tt.id AS tool_id,
  'none',
  ARRAY['owner', 'admin', 'operator', 'viewer'],
  120,
  60000,  -- 60s timeout (delegation can take longer)
  jsonb_build_object('seeded_by', 'native_tool_catalog')
FROM tenant_tools tt
WHERE tt.tool_key = 'delegate_task'
  AND NOT EXISTS (
    SELECT 1 FROM tenant_tool_policies ttp
    WHERE ttp.tool_id = tt.id
  );
