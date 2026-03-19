-- Cross-session summary bridges: tenant-scoped summary nodes that carry
-- narrative context between sessions (channels/conversations).
-- Created when depth-2+ condensation produces a high-level summary.

BEGIN;

CREATE TABLE IF NOT EXISTS tenant_summary_bridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES tenant_agents(id) ON DELETE SET NULL,
  source_session_id UUID NOT NULL REFERENCES tenant_sessions(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  time_start TIMESTAMPTZ,
  time_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for loading most recent bridges per agent
CREATE INDEX IF NOT EXISTS idx_tsb_tenant_agent
  ON tenant_summary_bridges(tenant_id, agent_id, created_at DESC);

-- RLS: inherit access from tenant membership
ALTER TABLE tenant_summary_bridges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_summary_bridges' AND policyname = 'Users can view own tenant summary bridges') THEN
    CREATE POLICY "Users can view own tenant summary bridges"
      ON tenant_summary_bridges FOR SELECT
      USING (is_tenant_member(tenant_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_summary_bridges' AND policyname = 'System can insert tenant summary bridges') THEN
    CREATE POLICY "System can insert tenant summary bridges"
      ON tenant_summary_bridges FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;
