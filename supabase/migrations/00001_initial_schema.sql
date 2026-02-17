-- FarmClaw initial schema

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'active',
  plan TEXT DEFAULT 'standard',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Farm profiles (populated during onboarding)
CREATE TABLE farm_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  farm_name TEXT,
  state TEXT NOT NULL,
  county TEXT,
  primary_crops TEXT[] DEFAULT '{}',
  acres INTEGER,
  elevators TEXT[] DEFAULT '{}',
  elevator_urls JSONB DEFAULT '[]',
  weather_location TEXT,
  weather_lat DECIMAL,
  weather_lng DECIMAL,
  timezone TEXT DEFAULT 'America/Chicago',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Instance tracking
CREATE TABLE instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  coolify_uuid TEXT,
  container_id TEXT,
  server_ip TEXT,
  status TEXT DEFAULT 'provisioning',
  openclaw_version TEXT,
  last_health_check TIMESTAMPTZ,
  channel_type TEXT NOT NULL,
  channel_config JSONB DEFAULT '{}',
  api_key_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- API usage metering
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id),
  date DATE NOT NULL,
  model TEXT NOT NULL,
  input_tokens BIGINT DEFAULT 0,
  output_tokens BIGINT DEFAULT 0,
  estimated_cost_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, date, model)
);

-- Skill configurations (per-customer overrides)
CREATE TABLE skill_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, skill_name)
);

-- Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_configs ENABLE ROW LEVEL SECURITY;

-- Customers: users can only see their own record
CREATE POLICY "Users can view own customer record"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own customer record"
  ON customers FOR UPDATE
  USING (auth.uid() = user_id);

-- Farm profiles: via customer_id → user_id join
CREATE POLICY "Users can view own farm profile"
  ON farm_profiles FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own farm profile"
  ON farm_profiles FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own farm profile"
  ON farm_profiles FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Instances: via customer_id → user_id join
CREATE POLICY "Users can view own instances"
  ON instances FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- API usage: via customer_id → user_id join
CREATE POLICY "Users can view own usage"
  ON api_usage FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Skill configs: via customer_id → user_id join
CREATE POLICY "Users can view own skill configs"
  ON skill_configs FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own skill configs"
  ON skill_configs FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own skill configs"
  ON skill_configs FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER farm_profiles_updated_at BEFORE UPDATE ON farm_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER instances_updated_at BEFORE UPDATE ON instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
