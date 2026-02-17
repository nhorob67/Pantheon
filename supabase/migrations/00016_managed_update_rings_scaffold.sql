-- Managed update rings scaffold (P0.2)
-- Adds rollout + ring target primitives for canary/standard/delayed progression.

CREATE TABLE extension_update_rollouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES extension_catalog_items(id) ON DELETE CASCADE,
  target_version_id UUID NOT NULL REFERENCES extension_catalog_versions(id) ON DELETE RESTRICT,
  initiated_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'in_progress',
        'paused',
        'completed',
        'failed',
        'canceled',
        'halted'
      )
    ),
  current_ring TEXT
    CHECK (current_ring IS NULL OR current_ring IN ('canary', 'standard', 'delayed')),
  ring_order TEXT[] NOT NULL DEFAULT ARRAY['canary', 'standard', 'delayed']::text[],
  ring_config JSONB NOT NULL DEFAULT jsonb_build_object(
    'canary',
    jsonb_build_object('batch_size', 1),
    'standard',
    jsonb_build_object('batch_size', 10),
    'delayed',
    jsonb_build_object('batch_size', 100)
  ),
  gate_config JSONB NOT NULL DEFAULT jsonb_build_object(
    'max_failure_rate_pct',
    10,
    'max_p95_latency_ms',
    10000,
    'max_timeout_rate_pct',
    5,
    'max_hard_error_rate_pct',
    3
  ),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT extension_update_rollouts_ring_order_valid
    CHECK (
      ring_order <@ ARRAY['canary', 'standard', 'delayed']::text[]
      AND cardinality(ring_order) = 3
    )
);

CREATE INDEX idx_extension_update_rollouts_status_created
  ON extension_update_rollouts(status, created_at DESC);

CREATE INDEX idx_extension_update_rollouts_customer_status
  ON extension_update_rollouts(customer_id, status, created_at DESC)
  WHERE customer_id IS NOT NULL;

CREATE TABLE extension_update_rollout_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rollout_id UUID NOT NULL REFERENCES extension_update_rollouts(id) ON DELETE CASCADE,
  installation_id UUID NOT NULL REFERENCES extension_installations(id) ON DELETE CASCADE,
  ring TEXT NOT NULL CHECK (ring IN ('canary', 'standard', 'delayed')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'in_progress',
        'completed',
        'failed',
        'skipped',
        'rolled_back'
      )
    ),
  operation_id UUID REFERENCES extension_operations(id) ON DELETE SET NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  timeout_count INTEGER NOT NULL DEFAULT 0 CHECK (timeout_count >= 0),
  hard_error_count INTEGER NOT NULL DEFAULT 0 CHECK (hard_error_count >= 0),
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT extension_update_rollout_targets_unique UNIQUE (rollout_id, installation_id)
);

CREATE INDEX idx_extension_update_rollout_targets_rollout_status
  ON extension_update_rollout_targets(rollout_id, status, ring);

CREATE INDEX idx_extension_update_rollout_targets_installation
  ON extension_update_rollout_targets(installation_id, created_at DESC);

ALTER TABLE extension_update_rollouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_update_rollout_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own extension update rollouts"
  ON extension_update_rollouts FOR SELECT
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own extension update rollout targets"
  ON extension_update_rollout_targets FOR SELECT
  USING (
    rollout_id IN (
      SELECT id
      FROM extension_update_rollouts
      WHERE customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    )
  );

CREATE TRIGGER extension_update_rollouts_updated_at
  BEFORE UPDATE ON extension_update_rollouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER extension_update_rollout_targets_updated_at
  BEFORE UPDATE ON extension_update_rollout_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
