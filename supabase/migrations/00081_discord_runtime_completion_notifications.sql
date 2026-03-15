ALTER TABLE team_profiles
  ADD COLUMN IF NOT EXISTS discord_completion_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;
