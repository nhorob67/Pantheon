-- Add session-aware lane support for conversational runtime runs.
-- Minimal implementation: store session_id on runtime runs and index
-- session-bound conversational work so claimers can serialize by session.

ALTER TABLE tenant_runtime_runs
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES tenant_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_runtime_runs_session_lane
  ON tenant_runtime_runs(tenant_id, session_id, status, queued_at, created_at)
  WHERE session_id IS NOT NULL
    AND run_kind IN ('discord_runtime', 'email_runtime');
