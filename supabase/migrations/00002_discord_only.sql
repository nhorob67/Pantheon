-- Narrow channel_type to Discord only
-- Update any existing non-discord instances
UPDATE instances SET channel_type = 'discord' WHERE channel_type != 'discord';

-- Add CHECK constraint to enforce discord-only
ALTER TABLE instances ADD CONSTRAINT instances_channel_type_discord CHECK (channel_type = 'discord');
