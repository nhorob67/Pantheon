-- Foundation schema for Discord-only extensibility roadmap (P0-P2)
-- Covers: catalog/install state, operation targets, connectors, feature flags,
-- kill switches, telemetry envelopes, and eval primitives.

-- Extension catalog
CREATE TABLE extension_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL
    CHECK (kind IN ('skill', 'plugin', 'connector', 'mcp_server', 'tool_pack')),
  display_name TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('local', 'npm', 'git', 'clawhub', 'internal')),
  source_ref TEXT NOT NULL,
  homepage_url TEXT,
  docs_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT extension_catalog_items_slug_format
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,63}$')
);

CREATE TABLE extension_catalog_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES extension_catalog_items(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  release_notes TEXT,
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  checksum_sha256 TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT extension_catalog_versions_unique UNIQUE (item_id, version)
);

CREATE INDEX idx_extension_catalog_items_kind_active
  ON extension_catalog_items(kind, active);

CREATE INDEX idx_extension_catalog_items_source
  ON extension_catalog_items(source_type, verified);

CREATE INDEX idx_extension_catalog_versions_item_published
  ON extension_catalog_versions(item_id, published_at DESC);

-- Installation state by customer/instance
CREATE TABLE extension_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES extension_catalog_items(id) ON DELETE RESTRICT,
  version_id UUID REFERENCES extension_catalog_versions(id) ON DELETE SET NULL,
  pinned_version TEXT,
  install_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      install_status IN (
        'pending',
        'installing',
        'installed',
        'failed',
        'rollback_pending',
        'rolled_back',
        'removed'
      )
    ),
  health_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (health_status IN ('unknown', 'healthy', 'degraded', 'unhealthy')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  installed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX extension_installations_instance_item_unique
  ON extension_installations(instance_id, item_id)
  WHERE instance_id IS NOT NULL;

CREATE UNIQUE INDEX extension_installations_customer_item_unique
  ON extension_installations(customer_id, item_id)
  WHERE instance_id IS NULL;

CREATE INDEX idx_extension_installations_customer_status
  ON extension_installations(customer_id, install_status, updated_at DESC);

-- Long-running operation tracking for install/upgrade/rollback
CREATE TABLE extension_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL
    CHECK (operation_type IN ('install', 'upgrade', 'rollback', 'remove', 'sync_catalog')),
  scope_type TEXT NOT NULL
    CHECK (scope_type IN ('instance', 'customer', 'fleet', 'catalog')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'canceled')),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL,
  requested_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE extension_operation_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES extension_operations(id) ON DELETE CASCADE,
  installation_id UUID REFERENCES extension_installations(id) ON DELETE CASCADE,
  target_version_id UUID REFERENCES extension_catalog_versions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  last_error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT extension_operation_targets_unique UNIQUE (operation_id, installation_id)
);

CREATE INDEX idx_extension_operations_status
  ON extension_operations(status, created_at DESC);

CREATE INDEX idx_extension_operation_targets_claim
  ON extension_operation_targets(operation_id, status, created_at)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION claim_extension_operation_targets(
  p_operation_id UUID,
  p_limit INTEGER
)
RETURNS TABLE (
  id UUID,
  installation_id UUID,
  target_version_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH rows_to_claim AS (
    SELECT t.id
    FROM extension_operation_targets t
    WHERE t.operation_id = p_operation_id
      AND t.status = 'pending'
    ORDER BY t.created_at ASC
    LIMIT GREATEST(COALESCE(p_limit, 1), 1)
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE extension_operation_targets t
    SET
      status = 'in_progress',
      started_at = COALESCE(t.started_at, now())
    WHERE t.id IN (SELECT id FROM rows_to_claim)
    RETURNING t.id, t.installation_id, t.target_version_id
  )
  SELECT c.id, c.installation_id, c.target_version_id
  FROM claimed c;
END;
$$ LANGUAGE plpgsql;

-- Connector registry and per-account credentials
CREATE TABLE connector_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  auth_type TEXT NOT NULL
    CHECK (auth_type IN ('api_key', 'oauth2', 'token', 'none')),
  oauth_authorize_url TEXT,
  oauth_token_url TEXT,
  default_scopes TEXT[] NOT NULL DEFAULT '{}',
  config_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT connector_providers_slug_format
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,63}$')
);

CREATE TABLE connector_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES connector_providers(id) ON DELETE RESTRICT,
  instance_id UUID REFERENCES instances(id) ON DELETE SET NULL,
  alias TEXT NOT NULL DEFAULT 'default',
  encrypted_secret TEXT NOT NULL,
  secret_hint TEXT,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'revoked', 'error')),
  last_validated_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT connector_accounts_alias_format
    CHECK (alias ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  CONSTRAINT connector_accounts_unique UNIQUE (customer_id, provider_id, alias)
);

CREATE INDEX idx_connector_accounts_customer_status
  ON connector_accounts(customer_id, status, updated_at DESC);

-- Feature flags + kill switches
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL UNIQUE,
  description TEXT,
  default_enabled BOOLEAN NOT NULL DEFAULT false,
  owner TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT feature_flags_key_format
    CHECK (flag_key ~ '^[a-z][a-z0-9_.-]{2,127}$')
);

CREATE TABLE customer_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'experiment', 'rollout')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_feature_flags_unique UNIQUE (customer_id, feature_flag_id)
);

CREATE TABLE global_kill_switches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  switch_key TEXT NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT global_kill_switches_key_format
    CHECK (switch_key ~ '^[a-z][a-z0-9_.-]{2,127}$')
);

CREATE INDEX idx_customer_feature_flags_customer
  ON customer_feature_flags(customer_id);

CREATE OR REPLACE FUNCTION resolve_customer_feature_flag(
  p_customer_id UUID,
  p_flag_key TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT COALESCE(cff.enabled, ff.default_enabled, false)
      FROM feature_flags ff
      LEFT JOIN customer_feature_flags cff
        ON cff.feature_flag_id = ff.id
        AND cff.customer_id = p_customer_id
      WHERE ff.flag_key = trim(lower(p_flag_key))
      LIMIT 1
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION is_kill_switch_enabled(
  p_switch_key TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT gks.enabled
      FROM global_kill_switches gks
      WHERE gks.switch_key = trim(lower(p_switch_key))
      LIMIT 1
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION resolve_customer_feature_flag(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_customer_feature_flag(UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION is_kill_switch_enabled(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_kill_switch_enabled(TEXT) TO service_role;

-- Telemetry envelope for request/skill/tool/cost/latency tracking
CREATE TABLE telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id) ON DELETE SET NULL,
  request_id TEXT,
  correlation_id TEXT,
  event_type TEXT NOT NULL,
  agent_key TEXT,
  skill_name TEXT,
  tool_name TEXT,
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  input_tokens BIGINT NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens BIGINT NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  estimated_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (estimated_cost_cents >= 0),
  error_class TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telemetry_events_customer_created
  ON telemetry_events(customer_id, created_at DESC);

CREATE INDEX idx_telemetry_events_instance_created
  ON telemetry_events(instance_id, created_at DESC)
  WHERE instance_id IS NOT NULL;

CREATE INDEX idx_telemetry_events_event_type_created
  ON telemetry_events(event_type, created_at DESC);

-- Evaluation primitives for rollout gating
CREATE TABLE eval_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'global'
    CHECK (scope IN ('global', 'customer')),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  suite_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT eval_suites_scope_customer_check CHECK (
    (scope = 'global' AND customer_id IS NULL)
    OR
    (scope = 'customer' AND customer_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX eval_suites_global_key_unique
  ON eval_suites(suite_key)
  WHERE scope = 'global';

CREATE UNIQUE INDEX eval_suites_customer_key_unique
  ON eval_suites(customer_id, suite_key)
  WHERE scope = 'customer';

CREATE TABLE eval_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id UUID NOT NULL REFERENCES eval_suites(id) ON DELETE CASCADE,
  case_key TEXT NOT NULL,
  prompt TEXT NOT NULL,
  expected_output JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  weight NUMERIC(8, 3) NOT NULL DEFAULT 1.0 CHECK (weight > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT eval_cases_unique UNIQUE (suite_id, case_key)
);

CREATE TABLE eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id UUID NOT NULL REFERENCES eval_suites(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id) ON DELETE SET NULL,
  triggered_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'canceled')),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eval_runs_suite_status
  ON eval_runs(suite_id, status, created_at DESC);

CREATE TABLE eval_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES eval_cases(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'error', 'skipped')),
  score NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT eval_results_unique UNIQUE (run_id, case_id)
);

CREATE INDEX idx_eval_results_run_status
  ON eval_results(run_id, status);

-- Enable RLS
ALTER TABLE extension_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_catalog_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_operation_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_kill_switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_results ENABLE ROW LEVEL SECURITY;

-- Customer-facing RLS policies
CREATE POLICY "Users can view own extension installations"
  ON extension_installations FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own extension installations"
  ON extension_installations FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own extension installations"
  ON extension_installations FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own connector accounts"
  ON connector_accounts FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own connector accounts"
  ON connector_accounts FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own connector accounts"
  ON connector_accounts FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own connector accounts"
  ON connector_accounts FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own customer feature flags"
  ON customer_feature_flags FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own telemetry events"
  ON telemetry_events FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Updated_at triggers
CREATE TRIGGER extension_catalog_items_updated_at
  BEFORE UPDATE ON extension_catalog_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER extension_installations_updated_at
  BEFORE UPDATE ON extension_installations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER extension_operations_updated_at
  BEFORE UPDATE ON extension_operations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER connector_providers_updated_at
  BEFORE UPDATE ON connector_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER connector_accounts_updated_at
  BEFORE UPDATE ON connector_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER customer_feature_flags_updated_at
  BEFORE UPDATE ON customer_feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER global_kill_switches_updated_at
  BEFORE UPDATE ON global_kill_switches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER eval_suites_updated_at
  BEFORE UPDATE ON eval_suites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER eval_cases_updated_at
  BEFORE UPDATE ON eval_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER eval_runs_updated_at
  BEFORE UPDATE ON eval_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
