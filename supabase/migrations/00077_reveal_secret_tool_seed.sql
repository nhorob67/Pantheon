-- Seed reveal_secret tool record for every tenant that already has secrets.
-- For future tenants, the tool record is auto-provisioned on first secret creation
-- (see src/lib/secrets/vault.ts).

INSERT INTO tenant_tools (tenant_id, tool_key, status, risk_level)
SELECT DISTINCT ts.tenant_id, 'reveal_secret', 'disabled', 'critical'
FROM tenant_secrets ts
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_tools tt
  WHERE tt.tenant_id = ts.tenant_id AND tt.tool_key = 'reveal_secret'
);

INSERT INTO tenant_tool_policies (tenant_id, tool_key, approval_mode, allow_roles, max_calls_per_hour, timeout_ms)
SELECT DISTINCT ts.tenant_id, 'reveal_secret', 'always', ARRAY['owner']::text[], 5, 30000
FROM tenant_secrets ts
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_tool_policies ttp
  WHERE ttp.tenant_id = ts.tenant_id AND ttp.tool_key = 'reveal_secret'
);
