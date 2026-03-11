-- Migration 00078: Self-configuration tools support tables
-- Adds Discord-to-role linking and config change audit log

-- Maps Discord snowflake IDs to Supabase auth users within a tenant
CREATE TABLE tenant_discord_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_via TEXT NOT NULL CHECK (linked_via IN ('auto', 'link_code', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, discord_user_id),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_tenant_discord_links_lookup
  ON tenant_discord_links (tenant_id, discord_user_id);

ALTER TABLE tenant_discord_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own discord links"
  ON tenant_discord_links FOR SELECT
  USING (user_id = auth.uid());

-- Rolling log of config changes for undo + audit
CREATE TABLE tenant_config_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_id UUID,
  tool_name TEXT NOT NULL,
  field_changed TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('agent', 'farm_profile')),
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  actor_role TEXT NOT NULL,
  actor_discord_id TEXT,
  run_id TEXT,
  undone_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_config_changelog_tenant_time
  ON tenant_config_changelog (tenant_id, created_at DESC);

CREATE INDEX idx_tenant_config_changelog_undoable
  ON tenant_config_changelog (tenant_id, created_at DESC)
  WHERE undone_at IS NULL;

ALTER TABLE tenant_config_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own config changelog"
  ON tenant_config_changelog FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );
