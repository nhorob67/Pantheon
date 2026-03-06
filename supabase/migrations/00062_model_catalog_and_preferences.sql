-- Model catalog: admin-managed list of approved LLM models
CREATE TABLE model_catalog (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openrouter')),
  display_name TEXT NOT NULL,
  description TEXT,
  context_window INTEGER,
  max_output_tokens INTEGER,
  supports_vision BOOLEAN DEFAULT false,
  supports_tools BOOLEAN DEFAULT false,
  input_cost_per_million INTEGER NOT NULL DEFAULT 0,
  output_cost_per_million INTEGER NOT NULL DEFAULT 0,
  tier_hint TEXT CHECK (tier_hint IN ('primary', 'fast', 'both')) DEFAULT 'both',
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS on model_catalog -- accessed via admin client only

-- Tenant model preferences
CREATE TABLE tenant_model_preferences (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  primary_model_id TEXT REFERENCES model_catalog(id),
  fast_model_id TEXT REFERENCES model_catalog(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE tenant_model_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_model_preferences_select"
  ON tenant_model_preferences FOR SELECT
  USING (
    tenant_id IN (
      SELECT t.id FROM tenants t
      JOIN customers c ON c.id = t.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_model_preferences_update"
  ON tenant_model_preferences FOR UPDATE
  USING (
    tenant_id IN (
      SELECT t.id FROM tenants t
      JOIN customers c ON c.id = t.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_model_preferences_insert"
  ON tenant_model_preferences FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT t.id FROM tenants t
      JOIN customers c ON c.id = t.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

-- Catalog sync log
CREATE TABLE model_catalog_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  models_fetched INTEGER DEFAULT 0,
  models_added INTEGER DEFAULT 0,
  models_updated INTEGER DEFAULT 0,
  error TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed current defaults as pre-approved
INSERT INTO model_catalog (id, provider, display_name, description, context_window, max_output_tokens, supports_vision, supports_tools, input_cost_per_million, output_cost_per_million, tier_hint, is_approved, approved_at)
VALUES
  ('claude-sonnet-4-5-20250514', 'anthropic', 'Claude Sonnet 4.5', 'High-performance model for complex reasoning and tool use', 200000, 8192, true, true, 300, 1500, 'primary', true, now()),
  ('claude-haiku-4-5-20251001', 'anthropic', 'Claude Haiku 4.5', 'Fast, efficient model for lightweight tasks', 200000, 8192, true, true, 100, 500, 'fast', true, now());
