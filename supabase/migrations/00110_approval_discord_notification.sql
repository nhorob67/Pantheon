-- Add Discord message tracking columns to tenant_approvals
-- so we can edit the button message after a decision is made.

ALTER TABLE tenant_approvals
  ADD COLUMN IF NOT EXISTS discord_message_id TEXT,
  ADD COLUMN IF NOT EXISTS discord_channel_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tenant_approvals_discord_message
  ON tenant_approvals (discord_message_id)
  WHERE discord_message_id IS NOT NULL;
