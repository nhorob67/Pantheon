-- Add business_type and country to farm_profiles; make county optional
ALTER TABLE farm_profiles ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE farm_profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
ALTER TABLE farm_profiles ALTER COLUMN county DROP NOT NULL;
