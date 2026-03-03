-- Phase 3 skeleton: tenant runtime run queue + canary ingress plumbing.

-- Idempotent: drop partial state from any prior failed attempt.
DROP TABLE IF EXISTS tenant_runtime_runs CASCADE;

CREATE TABLE tenant_runtime_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  run_kind TEXT NOT NULL
    CHECK (run_kind IN ('discord_canary')),
  source TEXT NOT NULL DEFAULT 'discord_ingress'
    CHECK (source IN ('discord_ingress', 'api', 'system')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (
      status IN (
        'queued',
        'running',
        'awaiting_approval',
        'completed',
        'failed',
        'canceled'
      )
    ),
  attempt_count INTEGER NOT NULL DEFAULT 0
    CHECK (attempt_count BETWEEN 0 AND 100),
  max_attempts INTEGER NOT NULL DEFAULT 3
    CHECK (max_attempts BETWEEN 1 AND 100),
  idempotency_key TEXT,
  request_trace_id TEXT,
  correlation_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(payload) = 'object'),
  result JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(result) = 'object'),
  error_message TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  lock_expires_at TIMESTAMPTZ,
  worker_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_runtime_runs_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE,
  CONSTRAINT tenant_runtime_runs_idempotency_unique
    UNIQUE (tenant_id, run_kind, idempotency_key)
);

CREATE INDEX idx_tenant_runtime_runs_status_queue
  ON tenant_runtime_runs(status, queued_at ASC);

CREATE INDEX idx_tenant_runtime_runs_tenant_status
  ON tenant_runtime_runs(tenant_id, status, created_at DESC);

ALTER TABLE tenant_runtime_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_runtime_runs_select_member"
  ON tenant_runtime_runs FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "tenant_runtime_runs_insert_manage"
  ON tenant_runtime_runs FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "tenant_runtime_runs_update_manage"
  ON tenant_runtime_runs FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "tenant_runtime_runs_delete_manage"
  ON tenant_runtime_runs FOR DELETE
  USING (can_manage_tenant_data(tenant_id));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tenant_runtime_runs_updated_at'
      AND tgrelid = 'tenant_runtime_runs'::regclass
  ) THEN
    CREATE TRIGGER tenant_runtime_runs_updated_at
      BEFORE UPDATE ON tenant_runtime_runs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
