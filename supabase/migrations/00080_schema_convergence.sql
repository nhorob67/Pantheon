-- Migration: Schema Convergence (Phase 3)
-- Establishes team_profiles as the canonical source of truth for team identity.
-- Retires farm_profiles and drops unused farm-era tables.

-- 1. Drop grain_bid_cache (unused since farm-era tools were removed)
DROP TABLE IF EXISTS grain_bid_cache;

-- 2. Mark farm_profiles as deprecated
-- The table is retained for backward compatibility with legacy data exports,
-- but all new reads/writes go through team_profiles (created in 00079).
COMMENT ON TABLE farm_profiles IS
  'DEPRECATED (00080): Superseded by team_profiles. Retained for legacy data access only. Do not use for new features.';

-- 3. Mark legacy agents columns as deprecated
COMMENT ON COLUMN agents.personality_preset IS
  'DEPRECATED (00080): Always set to "custom" by the application layer. Runtime behavior uses role/goal/backstory from tenant_agents.config.';

COMMENT ON COLUMN agents.cron_jobs IS
  'DEPRECATED (00080): Schedules are now managed via tenant_scheduled_messages. This column is preserved for legacy sync only.';

-- 4. Document team_profiles as canonical
COMMENT ON TABLE team_profiles IS
  'Canonical source of truth for team identity (name, description, industry, timezone, location). Replaces farm_profiles as of 00079.';

-- 5. Remove stale seed data for deprecated tenant tools (grain bids, scale tickets)
DO $$
BEGIN
  DELETE FROM tenant_tools_seed WHERE tool_key IN (
    'tenant_grain_bid_query',
    'tenant_scale_ticket_create',
    'tenant_scale_ticket_list'
  );
EXCEPTION WHEN undefined_table THEN
  -- tenant_tools_seed doesn't exist on this database, skip
END;
$$;
