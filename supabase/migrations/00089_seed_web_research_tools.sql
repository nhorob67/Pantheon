-- Migration: Seed web_search and web_fetch tools for existing tenants
--
-- Phase 2 added web_search and web_fetch to the TypeScript catalog
-- (tool-catalog.ts) but they were not included in migration 00085
-- which only seeded the original 23 tools. This migration backfills
-- the 2 web research tools for all active tenants.

WITH tenant_list AS (
  SELECT id AS tenant_id, customer_id
  FROM tenants
  WHERE status = 'active'
),
tool_defs (tool_key, display_name, description, status, risk_level, category) AS (
  VALUES
    ('web_search', 'Web Search',  'Search the web for current information using a search engine', 'enabled', 'low', 'network'),
    ('web_fetch',  'Web Fetch',   'Fetch and extract content from a web page URL',                'enabled', 'low', 'network')
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
      'seeded_by', 'migration_00089'
    )
  FROM tenant_list tl
  CROSS JOIN tool_defs td
  ON CONFLICT (tenant_id, tool_key) DO NOTHING
  RETURNING id, tenant_id, customer_id, tool_key, risk_level
)
INSERT INTO tenant_tool_policies (
  tenant_id, customer_id, tool_id,
  approval_mode, allow_roles, max_calls_per_hour, timeout_ms, metadata
)
SELECT
  it.tenant_id,
  it.customer_id,
  it.id,
  'none',
  ARRAY['owner', 'admin', 'operator', 'viewer']::text[],
  120,
  30000,
  jsonb_build_object('seeded_by', 'migration_00089')
FROM inserted_tools it
ON CONFLICT (tenant_id, tool_id) DO NOTHING;
