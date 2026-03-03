-- Seed baseline tenant runtime tool catalog entries and default policies.
-- Adds first mutating tool path (`tenant_memory_write`) with mandatory approval.

WITH tool_catalog AS (
  SELECT *
  FROM (
    VALUES
      (
        'echo',
        'Echo',
        'Returns the provided message payload.',
        'low',
        'none',
        ARRAY['owner', 'admin', 'operator', 'viewer']::text[],
        1200,
        30000,
        'safe'
      ),
      (
        'time',
        'Time',
        'Returns current ISO timestamp.',
        'low',
        'none',
        ARRAY['owner', 'admin', 'operator', 'viewer']::text[],
        1200,
        30000,
        'safe'
      ),
      (
        'hash',
        'Hash',
        'Returns SHA-256 hash for provided payload.',
        'low',
        'none',
        ARRAY['owner', 'admin', 'operator', 'viewer']::text[],
        1200,
        30000,
        'safe'
      ),
      (
        'uuid',
        'UUID',
        'Returns generated UUIDv4.',
        'low',
        'none',
        ARRAY['owner', 'admin', 'operator', 'viewer']::text[],
        1200,
        30000,
        'safe'
      ),
      (
        'base64_encode',
        'Base64 Encode',
        'Encodes UTF-8 payload into base64.',
        'low',
        'none',
        ARRAY['owner', 'admin', 'operator', 'viewer']::text[],
        1200,
        30000,
        'safe'
      ),
      (
        'base64_decode',
        'Base64 Decode',
        'Decodes base64 payload into UTF-8 text.',
        'low',
        'none',
        ARRAY['owner', 'admin', 'operator', 'viewer']::text[],
        1200,
        30000,
        'safe'
      ),
      (
        'tenant_memory_write',
        'Tenant Memory Write',
        'Writes a tenant memory record with runtime source metadata.',
        'high',
        'always',
        ARRAY['owner', 'admin', 'operator', 'viewer']::text[],
        120,
        45000,
        'mutating'
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
      'seed_migration', '00042_tenant_runtime_tool_catalog_seed'
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
    'seed_migration', '00042_tenant_runtime_tool_catalog_seed'
  )
FROM catalog_tools ct
JOIN tool_catalog c
  ON c.tool_key = ct.tool_key
ON CONFLICT (tenant_id, tool_id) DO NOTHING;

