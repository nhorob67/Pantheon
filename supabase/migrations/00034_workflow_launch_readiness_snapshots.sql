-- Persisted workflow launch-readiness snapshots for auditable Phase 7/8 evidence.

CREATE TABLE workflow_launch_readiness_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  timeframe_days INTEGER NOT NULL CHECK (timeframe_days BETWEEN 1 AND 365),
  min_samples_per_metric INTEGER NOT NULL CHECK (min_samples_per_metric BETWEEN 1 AND 5000),
  capture_source TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (capture_source IN ('scheduled', 'manual', 'api')),
  performance_overall_status TEXT NOT NULL
    CHECK (performance_overall_status IN ('pass', 'fail', 'insufficient_data')),
  rollout_assigned_ring TEXT NOT NULL
    CHECK (rollout_assigned_ring IN ('canary', 'standard', 'delayed')),
  rollout_target_ring TEXT NOT NULL
    CHECK (rollout_target_ring IN ('canary', 'standard', 'delayed')),
  release_open_for_customer BOOLEAN NOT NULL,
  snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  generated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_launch_snapshots_customer_instance_created
  ON workflow_launch_readiness_snapshots(customer_id, instance_id, created_at DESC);

CREATE INDEX idx_workflow_launch_snapshots_instance_generated
  ON workflow_launch_readiness_snapshots(instance_id, generated_at DESC);

CREATE INDEX idx_workflow_launch_snapshots_status_generated
  ON workflow_launch_readiness_snapshots(performance_overall_status, generated_at DESC);

ALTER TABLE workflow_launch_readiness_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflow launch snapshots"
  ON workflow_launch_readiness_snapshots FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own workflow launch snapshots"
  ON workflow_launch_readiness_snapshots FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
