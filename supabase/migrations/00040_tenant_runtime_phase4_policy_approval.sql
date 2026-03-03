-- Phase 3/4 follow-up: production runtime run kind + tool invocation audit trail.

ALTER TABLE tenant_runtime_runs
  DROP CONSTRAINT tenant_runtime_runs_run_kind_check;

ALTER TABLE tenant_runtime_runs
  ADD CONSTRAINT tenant_runtime_runs_run_kind_check
  CHECK (run_kind IN ('discord_canary', 'discord_runtime'));

CREATE TABLE IF NOT EXISTS tenant_tool_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  run_id UUID REFERENCES tenant_runtime_runs(id) ON DELETE SET NULL,
  tool_id UUID REFERENCES tenant_tools(id) ON DELETE SET NULL,
  tool_key TEXT NOT NULL CHECK (char_length(tool_key) BETWEEN 1 AND 120),
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  policy_decision TEXT NOT NULL
    CHECK (policy_decision IN ('allowed', 'denied', 'requires_approval')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'failed')),
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(request_payload) = 'object'),
  result_payload JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(result_payload) = 'object'),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_tool_invocations_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_tool_invocations_tenant_status
  ON tenant_tool_invocations(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_tool_invocations_run
  ON tenant_tool_invocations(run_id, created_at DESC)
  WHERE run_id IS NOT NULL;

ALTER TABLE tenant_tool_invocations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_tool_invocations'
      AND policyname = 'tenant_tool_invocations_select_member'
  ) THEN
    CREATE POLICY "tenant_tool_invocations_select_member"
      ON tenant_tool_invocations FOR SELECT
      USING (is_tenant_member(tenant_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_tool_invocations'
      AND policyname = 'tenant_tool_invocations_insert_manage'
  ) THEN
    CREATE POLICY "tenant_tool_invocations_insert_manage"
      ON tenant_tool_invocations FOR INSERT
      WITH CHECK (can_manage_tenant_data(tenant_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_tool_invocations'
      AND policyname = 'tenant_tool_invocations_update_manage'
  ) THEN
    CREATE POLICY "tenant_tool_invocations_update_manage"
      ON tenant_tool_invocations FOR UPDATE
      USING (can_manage_tenant_data(tenant_id))
      WITH CHECK (can_manage_tenant_data(tenant_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_tool_invocations'
      AND policyname = 'tenant_tool_invocations_delete_manage'
  ) THEN
    CREATE POLICY "tenant_tool_invocations_delete_manage"
      ON tenant_tool_invocations FOR DELETE
      USING (can_manage_tenant_data(tenant_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tenant_tool_invocations_updated_at'
      AND tgrelid = 'tenant_tool_invocations'::regclass
  ) THEN
    CREATE TRIGGER tenant_tool_invocations_updated_at
      BEFORE UPDATE ON tenant_tool_invocations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
