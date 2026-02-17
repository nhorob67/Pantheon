-- MCP Server Configurations
-- Stores MCP server configs that get passed to OpenClaw instances

CREATE TABLE IF NOT EXISTS mcp_server_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  server_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  command TEXT NOT NULL,
  args TEXT[] NOT NULL DEFAULT '{}',
  env_vars JSONB NOT NULL DEFAULT '{}',
  scope TEXT NOT NULL DEFAULT 'instance' CHECK (scope IN ('instance', 'agent')),
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique server_key per instance
CREATE UNIQUE INDEX idx_mcp_server_configs_instance_key
  ON mcp_server_configs(instance_id, server_key);

-- Lookup by customer
CREATE INDEX idx_mcp_server_configs_customer
  ON mcp_server_configs(customer_id);

-- RLS
ALTER TABLE mcp_server_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own MCP server configs"
  ON mcp_server_configs FOR SELECT
  USING (customer_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own MCP server configs"
  ON mcp_server_configs FOR INSERT
  WITH CHECK (customer_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own MCP server configs"
  ON mcp_server_configs FOR UPDATE
  USING (customer_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own MCP server configs"
  ON mcp_server_configs FOR DELETE
  USING (customer_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  ));

-- Updated_at trigger
CREATE TRIGGER set_mcp_server_configs_updated_at
  BEFORE UPDATE ON mcp_server_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
