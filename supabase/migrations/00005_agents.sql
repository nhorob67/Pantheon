-- Multi-agent support: one instance can have multiple specialized assistants

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  personality_preset TEXT NOT NULL DEFAULT 'general'
    CHECK (personality_preset IN ('general', 'grain', 'weather', 'custom')),
  custom_personality TEXT,
  discord_channel_id TEXT,
  discord_channel_name TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  skills TEXT[] NOT NULL DEFAULT '{}',
  cron_jobs JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instance_id, agent_key)
);

-- Exactly one default agent per instance
CREATE UNIQUE INDEX agents_one_default_per_instance
  ON agents (instance_id) WHERE is_default = true;

-- Atomic default-swap function
CREATE OR REPLACE FUNCTION set_default_agent(p_instance_id UUID, p_agent_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE agents SET is_default = false WHERE instance_id = p_instance_id AND is_default = true;
  UPDATE agents SET is_default = true WHERE id = p_agent_id AND instance_id = p_instance_id;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agents"
  ON agents FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own agents"
  ON agents FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own agents"
  ON agents FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own agents"
  ON agents FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Updated_at trigger (reuses function from 00001)
CREATE TRIGGER agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
