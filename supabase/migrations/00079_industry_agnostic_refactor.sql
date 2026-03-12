-- Migration: Industry-Agnostic Platform Refactor
-- Transforms farm-specific schema to generic team-based schema.
-- Farm-specific columns are kept but made nullable for backward compatibility.

-- 1. Create team_profiles table (replaces farm_profiles for new tenants)
CREATE TABLE IF NOT EXISTS team_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL DEFAULT 'My Team',
  description TEXT,
  industry TEXT,
  team_goal TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  location_label TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id)
);

-- RLS for team_profiles
ALTER TABLE team_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_profiles_select_own"
  ON team_profiles FOR SELECT
  USING (customer_id = (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "team_profiles_insert_own"
  ON team_profiles FOR INSERT
  WITH CHECK (customer_id = (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "team_profiles_update_own"
  ON team_profiles FOR UPDATE
  USING (customer_id = (SELECT id FROM customers WHERE user_id = auth.uid()));

-- 2. Add new agent columns to tenant_agents config
-- These are stored in the JSONB config column, so no ALTER TABLE needed.
-- The application layer now reads: role, autonomy_level, can_delegate, can_receive_delegation

-- 3. Add role and autonomy_level columns to legacy agents table for compatibility
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS agent_goal TEXT,
  ADD COLUMN IF NOT EXISTS autonomy_level TEXT DEFAULT 'copilot';

-- 4. Relax personality_preset constraint to allow any value
-- Drop the old CHECK constraint if it exists
DO $$
BEGIN
  ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_personality_preset_check;
EXCEPTION WHEN undefined_object THEN
  -- constraint doesn't exist, that's fine
END;
$$;

-- 5. Make farm-specific columns nullable on farm_profiles (soft deprecation)
ALTER TABLE farm_profiles
  ALTER COLUMN state DROP NOT NULL;

-- 6. Migrate existing farm_profiles into team_profiles for existing customers
INSERT INTO team_profiles (customer_id, team_name, timezone, location_label, location_lat, location_lng)
SELECT
  customer_id,
  COALESCE(farm_name, 'My Team'),
  COALESCE(timezone, 'America/Chicago'),
  weather_location,
  weather_lat,
  weather_lng
FROM farm_profiles
ON CONFLICT (customer_id) DO NOTHING;

-- 7. Index for team_profiles lookups
CREATE INDEX IF NOT EXISTS idx_team_profiles_customer_id ON team_profiles(customer_id);
