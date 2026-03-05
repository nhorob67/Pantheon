-- Custom scheduled messages: extend tenant_scheduled_messages for custom cron jobs
-- Adds schedule_type, display_name, prompt, tools, and created_by columns

ALTER TABLE tenant_scheduled_messages
  ADD COLUMN schedule_type TEXT NOT NULL DEFAULT 'predefined',
  ADD COLUMN display_name TEXT,
  ADD COLUMN prompt TEXT,
  ADD COLUMN tools TEXT[] DEFAULT '{}',
  ADD COLUMN created_by TEXT NOT NULL DEFAULT 'system';

-- Add check constraints
ALTER TABLE tenant_scheduled_messages
  ADD CONSTRAINT chk_schedule_type CHECK (schedule_type IN ('predefined', 'custom', 'briefing')),
  ADD CONSTRAINT chk_created_by CHECK (created_by IN ('dashboard', 'discord_chat', 'system'));

-- Custom schedules require a prompt
ALTER TABLE tenant_scheduled_messages
  ADD CONSTRAINT chk_custom_has_prompt CHECK (
    schedule_type != 'custom' OR prompt IS NOT NULL
  );

-- Drop old unique constraint and replace with conditional one
-- Predefined schedules keep uniqueness on (tenant_id, agent_id, schedule_key)
-- Custom schedules use generated keys so won't collide
ALTER TABLE tenant_scheduled_messages DROP CONSTRAINT IF EXISTS tenant_scheduled_messages_tenant_id_agent_id_schedule_key_key;

CREATE UNIQUE INDEX uq_predefined_schedule_key
  ON tenant_scheduled_messages (tenant_id, agent_id, schedule_key)
  WHERE schedule_type = 'predefined';

-- Index for filtering by schedule type
CREATE INDEX idx_scheduled_messages_type ON tenant_scheduled_messages (tenant_id, schedule_type);
