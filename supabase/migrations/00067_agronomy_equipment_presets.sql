-- Add agronomy and equipment personality presets + soil characteristic fields

-- 1. Update legacy agents CHECK constraint to include new preset values
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_personality_preset_check;
ALTER TABLE agents ADD CONSTRAINT agents_personality_preset_check
  CHECK (personality_preset IN ('general','grain','weather','scale-tickets','operations','agronomy','equipment','custom'));

-- 2. Add soil characteristic fields to farm_profiles (all nullable/optional)
ALTER TABLE farm_profiles
  ADD COLUMN IF NOT EXISTS soil_ph DECIMAL,
  ADD COLUMN IF NOT EXISTS soil_cec DECIMAL,
  ADD COLUMN IF NOT EXISTS organic_matter_pct DECIMAL,
  ADD COLUMN IF NOT EXISTS avg_annual_rainfall_in DECIMAL;
