-- Phase 3: MCP Runtime Bridge
-- Extends mcp_server_configs to support runtime tool discovery, execution,
-- health monitoring, and multiple transport types (stdio + SSE/HTTP).

-- ---------------------------------------------------------------------------
-- 1. Add transport and runtime columns to mcp_server_configs
-- ---------------------------------------------------------------------------

-- Transport type: 'stdio' (local process) or 'sse' (remote HTTP+SSE)
ALTER TABLE mcp_server_configs
  ADD COLUMN IF NOT EXISTS transport TEXT NOT NULL DEFAULT 'stdio'
    CHECK (transport IN ('stdio', 'sse'));

-- For SSE transport: the remote URL to connect to
ALTER TABLE mcp_server_configs
  ADD COLUMN IF NOT EXISTS url TEXT;

-- For SSE transport: optional headers (e.g. auth tokens) — encrypted at rest
ALTER TABLE mcp_server_configs
  ADD COLUMN IF NOT EXISTS headers JSONB NOT NULL DEFAULT '{}';

-- Runtime health status
ALTER TABLE mcp_server_configs
  ADD COLUMN IF NOT EXISTS health_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (health_status IN ('unknown', 'healthy', 'degraded', 'unhealthy', 'unreachable'));

-- Last successful health check timestamp
ALTER TABLE mcp_server_configs
  ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ;

-- Last error message from connection or health check
ALTER TABLE mcp_server_configs
  ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Last time tools were discovered from this server
ALTER TABLE mcp_server_configs
  ADD COLUMN IF NOT EXISTS tools_discovered_at TIMESTAMPTZ;

-- Number of tools discovered on last hydration
ALTER TABLE mcp_server_configs
  ADD COLUMN IF NOT EXISTS tool_count INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 2. MCP discovered tools cache
-- ---------------------------------------------------------------------------
-- Caches the tool schemas discovered from each MCP server so we don't need
-- to reconnect on every agent run. Refreshed on health check or manual sync.

CREATE TABLE IF NOT EXISTS mcp_discovered_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES mcp_server_configs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  input_schema JSONB NOT NULL DEFAULT '{}',
  -- Whether the operator has explicitly blocked this tool
  blocked BOOLEAN NOT NULL DEFAULT false,
  -- Pantheon risk tier override (null = use default "high" for MCP tools)
  risk_level_override TEXT CHECK (risk_level_override IN ('low', 'medium', 'high', 'critical')),
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mcp_discovered_tools_server_tool
  ON mcp_discovered_tools(server_id, tool_name);

CREATE INDEX IF NOT EXISTS idx_mcp_discovered_tools_tenant
  ON mcp_discovered_tools(tenant_id);

-- RLS
ALTER TABLE mcp_discovered_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own MCP discovered tools"
  ON mcp_discovered_tools FOR SELECT
  USING (customer_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own MCP discovered tools"
  ON mcp_discovered_tools FOR UPDATE
  USING (customer_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  ));

-- Updated_at trigger
CREATE TRIGGER set_mcp_discovered_tools_updated_at
  BEFORE UPDATE ON mcp_discovered_tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- 3. MCP server health events (observability)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mcp_server_health_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES mcp_server_configs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'connection_success', 'connection_failure',
    'health_check_success', 'health_check_failure',
    'tool_discovery_success', 'tool_discovery_failure',
    'tool_execution_success', 'tool_execution_failure',
    'disconnected', 'reconnected'
  )),
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_health_events_server
  ON mcp_server_health_events(server_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mcp_health_events_tenant
  ON mcp_server_health_events(tenant_id, created_at DESC);

-- RLS
ALTER TABLE mcp_server_health_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own MCP health events"
  ON mcp_server_health_events FOR SELECT
  USING (customer_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  ));

-- Prune health events older than 30 days (run periodically)
-- This is a helper function, not auto-scheduled — call from a cron job or admin task.
CREATE OR REPLACE FUNCTION prune_mcp_health_events(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM mcp_server_health_events
  WHERE created_at < now() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
