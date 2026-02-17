-- Workflow runtime persistence (Phase 3A)

CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('manual', 'schedule', 'event', 'retry', 'system')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN (
      'queued',
      'running',
      'succeeded',
      'failed',
      'cancel_requested',
      'canceled'
    )),
  source_version INTEGER NOT NULL CHECK (source_version > 0),
  retry_of_run_id UUID REFERENCES workflow_runs(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  runtime_correlation_id TEXT,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(input_payload) = 'object'),
  output_payload JSONB
    CHECK (output_payload IS NULL OR jsonb_typeof(output_payload) = 'object'),
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_runs_instance_created
  ON workflow_runs(instance_id, created_at DESC);
CREATE INDEX idx_workflow_runs_customer_created
  ON workflow_runs(customer_id, created_at DESC);
CREATE INDEX idx_workflow_runs_workflow_created
  ON workflow_runs(workflow_id, created_at DESC);
CREATE INDEX idx_workflow_runs_status_created
  ON workflow_runs(status, created_at DESC);
CREATE UNIQUE INDEX idx_workflow_runs_runtime_correlation
  ON workflow_runs(instance_id, runtime_correlation_id)
  WHERE runtime_correlation_id IS NOT NULL;

CREATE TABLE workflow_run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL CHECK (char_length(node_id) BETWEEN 1 AND 120),
  node_type TEXT NOT NULL
    CHECK (node_type IN ('trigger', 'action', 'condition', 'delay', 'handoff', 'end')),
  step_index INTEGER NOT NULL CHECK (step_index >= 0),
  attempt INTEGER NOT NULL DEFAULT 1 CHECK (attempt > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'skipped', 'canceled')),
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(input_payload) = 'object'),
  output_payload JSONB
    CHECK (output_payload IS NULL OR jsonb_typeof(output_payload) = 'object'),
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(run_id, step_index, attempt)
);

CREATE INDEX idx_workflow_run_steps_run
  ON workflow_run_steps(run_id, step_index, attempt);
CREATE INDEX idx_workflow_run_steps_instance_created
  ON workflow_run_steps(instance_id, created_at DESC);
CREATE INDEX idx_workflow_run_steps_status
  ON workflow_run_steps(status);

CREATE TABLE workflow_run_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_id UUID REFERENCES workflow_run_steps(id) ON DELETE SET NULL,
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL CHECK (char_length(artifact_type) BETWEEN 1 AND 120),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  mime_type TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  payload JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_run_artifacts_run_created
  ON workflow_run_artifacts(run_id, created_at DESC);
CREATE INDEX idx_workflow_run_artifacts_instance_created
  ON workflow_run_artifacts(instance_id, created_at DESC);
CREATE INDEX idx_workflow_run_artifacts_step
  ON workflow_run_artifacts(step_id);

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_run_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_run_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflow runs"
  ON workflow_runs FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own workflow runs"
  ON workflow_runs FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own workflow runs"
  ON workflow_runs FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own workflow runs"
  ON workflow_runs FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own workflow run steps"
  ON workflow_run_steps FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own workflow run steps"
  ON workflow_run_steps FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own workflow run steps"
  ON workflow_run_steps FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own workflow run steps"
  ON workflow_run_steps FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own workflow run artifacts"
  ON workflow_run_artifacts FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own workflow run artifacts"
  ON workflow_run_artifacts FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own workflow run artifacts"
  ON workflow_run_artifacts FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own workflow run artifacts"
  ON workflow_run_artifacts FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE TRIGGER workflow_runs_updated_at BEFORE UPDATE ON workflow_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER workflow_run_steps_updated_at BEFORE UPDATE ON workflow_run_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
