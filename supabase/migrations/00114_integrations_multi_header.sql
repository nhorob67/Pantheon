-- Allow multi_header auth method on tenant_integrations

ALTER TABLE tenant_integrations
  DROP CONSTRAINT IF EXISTS tenant_integrations_auth_method_check;

ALTER TABLE tenant_integrations
  ADD CONSTRAINT tenant_integrations_auth_method_check
    CHECK (auth_method IN ('api_key', 'bearer', 'basic', 'header', 'multi_header'));
