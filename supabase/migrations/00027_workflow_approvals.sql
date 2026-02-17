-- Workflow approvals foundation (Phase 5)

ALTER TABLE workflow_runs
  DROP CONSTRAINT IF EXISTS workflow_runs_status_check;

ALTER TABLE workflow_runs
  ADD CONSTRAINT workflow_runs_status_check
  CHECK (status IN (
    'queued',
    'awaiting_approval',
    'paused_waiting_approval',
    'running',
    'succeeded',
    'failed',
    'approval_rejected',
    'cancel_requested',
    'canceled'
  ));

ALTER TABLE workflow_run_steps
  DROP CONSTRAINT IF EXISTS workflow_run_steps_node_type_check;

ALTER TABLE workflow_run_steps
  ADD CONSTRAINT workflow_run_steps_node_type_check
  CHECK (node_type IN (
    'trigger',
    'action',
    'condition',
    'delay',
    'handoff',
    'approval',
    'end'
  ));

CREATE TABLE workflow_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL CHECK (char_length(node_id) BETWEEN 1 AND 120),
  node_label TEXT CHECK (node_label IS NULL OR char_length(node_label) <= 200),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'canceled', 'expired')),
  sla_due_at TIMESTAMPTZ,
  decision_comment TEXT CHECK (
    decision_comment IS NULL OR char_length(decision_comment) <= 2000
  ),
  decision_actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(run_id, node_id)
);

CREATE INDEX idx_workflow_approvals_instance_customer_status
  ON workflow_approvals(instance_id, customer_id, status, created_at DESC);

CREATE INDEX idx_workflow_approvals_run_id
  ON workflow_approvals(run_id);

ALTER TABLE workflow_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflow approvals"
  ON workflow_approvals FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own workflow approvals"
  ON workflow_approvals FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own workflow approvals"
  ON workflow_approvals FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own workflow approvals"
  ON workflow_approvals FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE TRIGGER workflow_approvals_updated_at BEFORE UPDATE ON workflow_approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
