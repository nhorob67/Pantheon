-- Convenience view for morning briefing configurations
-- Briefing config is stored in tenant_scheduled_messages.metadata JSONB

CREATE OR REPLACE VIEW tenant_briefing_configs AS
SELECT
  id,
  tenant_id,
  customer_id,
  schedule_key,
  enabled,
  cron_expression,
  channel_id,
  metadata->>'send_time' AS send_time,
  metadata->>'timezone' AS timezone,
  metadata->'briefing_sections' AS briefing_sections,
  next_run_at,
  last_run_at,
  created_at,
  updated_at
FROM tenant_scheduled_messages
WHERE schedule_key = 'morning_briefing';
