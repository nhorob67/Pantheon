-- Drop unused VPS-era columns from instances table
ALTER TABLE instances
  DROP COLUMN IF EXISTS coolify_uuid,
  DROP COLUMN IF EXISTS container_id,
  DROP COLUMN IF EXISTS server_ip,
  DROP COLUMN IF EXISTS hetzner_server_id,
  DROP COLUMN IF EXISTS hetzner_action_id,
  DROP COLUMN IF EXISTS hetzner_location,
  DROP COLUMN IF EXISTS coolify_server_uuid,
  DROP COLUMN IF EXISTS openclaw_version,
  DROP COLUMN IF EXISTS api_key_hash,
  DROP COLUMN IF EXISTS last_health_check;

-- Drop obsolete fleet health SQL functions
DROP FUNCTION IF EXISTS admin_fleet_health_counts();
DROP FUNCTION IF EXISTS admin_fleet_stale_instances(TIMESTAMPTZ);
DROP FUNCTION IF EXISTS admin_fleet_version_breakdown();
