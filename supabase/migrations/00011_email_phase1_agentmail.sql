-- Phase 1 (Hybrid): provider mailbox metadata for email identities

ALTER TABLE email_identities
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_mailbox_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_metadata JSONB NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_identities_provider_check'
      AND conrelid = 'email_identities'::regclass
  ) THEN
    ALTER TABLE email_identities
      ADD CONSTRAINT email_identities_provider_check
      CHECK (provider IS NULL OR provider IN ('agentmail', 'resend'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS email_identities_provider_mailbox_unique
  ON email_identities(provider, provider_mailbox_id)
  WHERE provider_mailbox_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_identities_provider
  ON email_identities(provider)
  WHERE provider IS NOT NULL;
