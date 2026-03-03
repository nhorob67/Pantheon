-- Seed tenant runtime tool entries for scale ticket, grain bid, and memory search tools.

WITH tool_catalog AS (
  SELECT *
  FROM (
    VALUES
      (
        'tenant_scale_ticket_create',
        'Scale Ticket Create',
        'Creates a new scale ticket record for the tenant.',
        'medium',
        'none',
        ARRAY['owner', 'admin', 'operator']::text[],
        120,
        45000,
        'mutating'
      ),
      (
        'tenant_scale_ticket_query',
        'Scale Ticket Query',
        'Queries scale ticket records with optional filters and aggregation.',
        'low',
        'none',
        ARRAY['owner', 'admin', 'operator', 'viewer']::text[],
        600,
        30000,
        'query'
      ),
      (
        'tenant_scale_ticket_update',
        'Scale Ticket Update',
        'Updates an existing scale ticket record.',
        'medium',
        'none',
        ARRAY['owner', 'admin', 'operator']::text[],
        120,
        45000,
        'mutating'
      ),
      (
        'tenant_scale_ticket_delete',
        'Scale Ticket Delete',
        'Deletes a scale ticket record.',
        'high',
        'owner',
        ARRAY['owner', 'admin']::text[],
        60,
        45000,
        'mutating'
      ),
      (
        'tenant_grain_bid_query',
        'Grain Bid Query',
        'Queries cached grain bid data from configured elevators.',
        'low',
        'none',
        ARRAY['owner', 'admin', 'operator', 'viewer']::text[],
        600,
        30000,
        'query'
      ),
      (
        'tenant_memory_search',
        'Memory Search',
        'Searches tenant memory records by text content.',
        'low',
        'none',
        ARRAY['owner', 'admin', 'operator', 'viewer']::text[],
        600,
        30000,
        'query'
      )
  ) AS v(
    tool_key,
    display_name,
    description,
    risk_level,
    approval_mode,
    allow_roles,
    max_calls_per_hour,
    timeout_ms,
    runtime_kind
  )
),
inserted_tools AS (
  INSERT INTO tenant_tools (
    tenant_id,
    customer_id,
    tool_key,
    display_name,
    description,
    status,
    risk_level,
    config,
    metadata
  )
  SELECT
    t.id AS tenant_id,
    t.customer_id,
    c.tool_key,
    c.display_name,
    c.description,
    'enabled',
    c.risk_level,
    '{}'::jsonb,
    jsonb_build_object(
      'runtime_kind', c.runtime_kind,
      'seed_migration', '00053_tenant_scale_ticket_tools_seed'
    )
  FROM tenants t
  CROSS JOIN tool_catalog c
  ON CONFLICT (tenant_id, tool_key) DO NOTHING
  RETURNING tenant_id, customer_id, id AS tool_id, tool_key
),
catalog_tools AS (
  SELECT tenant_id, customer_id, tool_id, tool_key
  FROM inserted_tools
  UNION ALL
  SELECT tt.tenant_id, tt.customer_id, tt.id AS tool_id, tt.tool_key
  FROM tenant_tools tt
  JOIN tool_catalog c
    ON c.tool_key = tt.tool_key
)
INSERT INTO tenant_tool_policies (
  tenant_id,
  customer_id,
  tool_id,
  approval_mode,
  allow_roles,
  max_calls_per_hour,
  timeout_ms,
  metadata
)
SELECT
  ct.tenant_id,
  ct.customer_id,
  ct.tool_id,
  c.approval_mode,
  c.allow_roles,
  c.max_calls_per_hour,
  c.timeout_ms,
  jsonb_build_object(
    'seed_migration', '00053_tenant_scale_ticket_tools_seed'
  )
FROM catalog_tools ct
JOIN tool_catalog c
  ON c.tool_key = ct.tool_key
ON CONFLICT (tenant_id, tool_id) DO NOTHING;
