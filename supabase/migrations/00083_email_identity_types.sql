-- Distinguish managed team identities from agent-scoped identities that later
-- fall back to the default agent after agent deletion.

ALTER TABLE email_identities
  ADD COLUMN IF NOT EXISTS identity_type TEXT NOT NULL DEFAULT 'team';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_identities_identity_type_check'
      AND conrelid = 'email_identities'::regclass
  ) THEN
    ALTER TABLE email_identities
      ADD CONSTRAINT email_identities_identity_type_check
      CHECK (identity_type IN ('team', 'agent'));
  END IF;
END $$;

UPDATE email_identities
SET identity_type = 'agent'
WHERE agent_id IS NOT NULL
  AND identity_type <> 'agent';

CREATE INDEX IF NOT EXISTS idx_email_identities_team_lookup
  ON email_identities(customer_id, created_at)
  WHERE is_active = true AND identity_type = 'team';
