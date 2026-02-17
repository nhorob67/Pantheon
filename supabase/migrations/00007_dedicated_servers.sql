-- Dedicated Hetzner CX VPS per customer
-- Each instance gets its own server instead of sharing a single Coolify server.

ALTER TABLE instances
  ADD COLUMN IF NOT EXISTS hetzner_server_id INTEGER,
  ADD COLUMN IF NOT EXISTS coolify_server_uuid TEXT,
  ADD COLUMN IF NOT EXISTS hetzner_action_id INTEGER,
  ADD COLUMN IF NOT EXISTS hetzner_location TEXT DEFAULT 'nbg1';

CREATE INDEX IF NOT EXISTS idx_instances_hetzner_server_id
  ON instances (hetzner_server_id) WHERE hetzner_server_id IS NOT NULL;
