-- Phase 1: Email AI Runtime Schema
-- Extends the email pipeline to support AI processing and response delivery.

-- 1a. Extend check constraints for email runtime support

-- Add 'email' to tenant_sessions.session_kind
ALTER TABLE tenant_sessions DROP CONSTRAINT IF EXISTS tenant_sessions_session_kind_check;
ALTER TABLE tenant_sessions ADD CONSTRAINT tenant_sessions_session_kind_check
  CHECK (session_kind IN ('channel', 'dm', 'thread', 'system', 'email'));

-- Add 'email_runtime' to tenant_runtime_runs.run_kind
ALTER TABLE tenant_runtime_runs DROP CONSTRAINT IF EXISTS tenant_runtime_runs_run_kind_check;
ALTER TABLE tenant_runtime_runs ADD CONSTRAINT tenant_runtime_runs_run_kind_check
  CHECK (run_kind IN ('discord_canary', 'discord_runtime', 'email_runtime'));

-- Add 'email_ingress' to tenant_runtime_runs.source
ALTER TABLE tenant_runtime_runs DROP CONSTRAINT IF EXISTS tenant_runtime_runs_source_check;
ALTER TABLE tenant_runtime_runs ADD CONSTRAINT tenant_runtime_runs_source_check
  CHECK (source IN ('discord_ingress', 'api', 'system', 'email_ingress'));

-- Extend email_inbound.status to include AI processing states
ALTER TABLE email_inbound DROP CONSTRAINT IF EXISTS email_inbound_status_check;
ALTER TABLE email_inbound ADD CONSTRAINT email_inbound_status_check
  CHECK (status IN ('queued', 'processing', 'processed', 'failed', 'ai_processing', 'ai_responded', 'ai_failed'));


-- 1b. Add email threading columns to email_inbound

ALTER TABLE email_inbound ADD COLUMN IF NOT EXISTS in_reply_to TEXT;
ALTER TABLE email_inbound ADD COLUMN IF NOT EXISTS references_header TEXT;
ALTER TABLE email_inbound ADD COLUMN IF NOT EXISTS thread_id TEXT;
ALTER TABLE email_inbound ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES tenant_sessions(id) ON DELETE SET NULL;
ALTER TABLE email_inbound ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES tenant_runtime_runs(id) ON DELETE SET NULL;
ALTER TABLE email_inbound ADD COLUMN IF NOT EXISTS ack_message_id TEXT;
ALTER TABLE email_inbound ADD COLUMN IF NOT EXISTS response_message_id TEXT;

CREATE INDEX IF NOT EXISTS idx_email_inbound_thread_id ON email_inbound(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_inbound_session_id ON email_inbound(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_inbound_ai_queue ON email_inbound(status, processed_at) WHERE status = 'processed';


-- 1c. Create email_outbound table

CREATE TABLE IF NOT EXISTS email_outbound (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  identity_id UUID REFERENCES email_identities(id) ON DELETE SET NULL,
  inbound_id UUID REFERENCES email_inbound(id) ON DELETE SET NULL,
  session_id UUID REFERENCES tenant_sessions(id) ON DELETE SET NULL,
  run_id UUID REFERENCES tenant_runtime_runs(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  provider_message_id TEXT,
  email_message_id TEXT,
  in_reply_to TEXT,
  references_header TEXT,
  thread_id TEXT,
  outbound_type TEXT NOT NULL CHECK (outbound_type IN ('acknowledgment', 'response', 'error')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE email_outbound ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outbound emails"
  ON email_outbound FOR SELECT
  USING (customer_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_email_outbound_inbound_id ON email_outbound(inbound_id) WHERE inbound_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_outbound_session_id ON email_outbound(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_outbound_thread_id ON email_outbound(thread_id) WHERE thread_id IS NOT NULL;


-- 1d. claim_email_ai_jobs() function

CREATE OR REPLACE FUNCTION claim_email_ai_jobs(
  p_limit INT DEFAULT 5
)
RETURNS SETOF email_inbound
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE email_inbound
  SET status = 'ai_processing',
      updated_at = now()
  WHERE id IN (
    SELECT id FROM email_inbound
    WHERE status = 'processed'
    ORDER BY processed_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  RETURNING *;
END;
$$;


-- 1e. Add tenant_id to email_identities for fast tenant resolution

ALTER TABLE email_identities ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_identities_tenant_id ON email_identities(tenant_id) WHERE tenant_id IS NOT NULL;

-- Backfill tenant_id from customer_id -> tenants mapping
UPDATE email_identities ei
SET tenant_id = t.id
FROM tenants t
WHERE t.customer_id = ei.customer_id
  AND ei.tenant_id IS NULL;
