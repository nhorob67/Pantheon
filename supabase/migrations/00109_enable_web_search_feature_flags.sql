-- Enable web_search and web_fetch for all tenants by seeding their
-- feature flags with default_enabled = true.
--
-- These flags were never inserted into feature_flags, so
-- resolve_customer_feature_flag() returned false for every customer,
-- blocking web research tools even when the tenant_tools rows existed.

INSERT INTO feature_flags (flag_key, description, default_enabled, owner)
VALUES
  ('tools.web_search', 'Enables the web_search tool for agents', true, 'platform'),
  ('tools.web_fetch',  'Enables the web_fetch tool for agents',  true, 'platform')
ON CONFLICT (flag_key) DO UPDATE
  SET default_enabled = true,
      updated_at = now();
