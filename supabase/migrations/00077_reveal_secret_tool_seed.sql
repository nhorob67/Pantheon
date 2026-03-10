-- Seed reveal_secret tool record for every tenant that already has secrets.
-- For future tenants, the tool record is auto-provisioned on first secret creation
-- (see src/lib/secrets/vault.ts).

INSERT INTO tenant_tools (tenant_id, customer_id, tool_key, display_name, description, status, risk_level)
SELECT DISTINCT ON (ts.tenant_id)
  ts.tenant_id,
  ts.customer_id,
  'reveal_secret',
  'Reveal Secret (Break Glass)',
  'Reveals the raw value of a stored secret. Requires owner approval.',
  'disabled',
  'critical'
FROM tenant_secrets ts
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_tools tt
  WHERE tt.tenant_id = ts.tenant_id AND tt.tool_key = 'reveal_secret'
)
ORDER BY ts.tenant_id, ts.created_at ASC;

INSERT INTO tenant_tool_policies (tenant_id, customer_id, tool_id, approval_mode, allow_roles, max_calls_per_hour, timeout_ms)
SELECT tt.tenant_id, tt.customer_id, tt.id, 'always', ARRAY['owner']::text[], 5, 30000
FROM tenant_tools tt
WHERE tt.tool_key = 'reveal_secret'
  AND NOT EXISTS (
    SELECT 1 FROM tenant_tool_policies ttp
    WHERE ttp.tenant_id = tt.tenant_id AND ttp.tool_id = tt.id
  );
