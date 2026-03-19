-- Fix tenant_integrations schema conflict.
--
-- Migration 00036 created tenant_integrations with an old schema
-- (integration_key, provider, secret_ref) that was never used in production.
-- Migration 00103 defined the correct schema (slug, display_name, service_type, etc.)
-- but failed because the table already existed.
--
-- This migration drops the stale table and recreates it with the correct schema
-- from 00103, along with its dependent table, indexes, RLS policies, and trigger.

-- Drop stale objects from migration 00036
DROP TABLE IF EXISTS tenant_integration_schedules CASCADE;
DROP TABLE IF EXISTS tenant_integrations CASCADE;

-- Recreate with the correct schema (from migration 00103)
CREATE TABLE tenant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Identity
  slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  service_type TEXT NOT NULL,

  -- Connection details
  base_url TEXT,
  connector_account_id UUID REFERENCES connector_accounts(id) ON DELETE SET NULL,
  auth_method TEXT NOT NULL DEFAULT 'api_key'
    CHECK (auth_method IN ('api_key', 'bearer', 'basic', 'header')),
  auth_header TEXT DEFAULT 'Api-Key',

  -- Agent-discovered metadata (populated during setup)
  api_docs_url TEXT,
  discovered_endpoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  capabilities_summary TEXT,

  -- Configuration
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'error')),
  last_used_at TIMESTAMPTZ,
  last_error TEXT,

  -- Provenance
  created_by_agent_id UUID REFERENCES tenant_agents(id) ON DELETE SET NULL,
  setup_conversation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tenant_integrations_slug_unique UNIQUE (tenant_id, slug),
  CONSTRAINT tenant_integrations_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,63}$')
);

CREATE INDEX idx_tenant_integrations_tenant_status
  ON tenant_integrations(tenant_id, status);

CREATE INDEX idx_tenant_integrations_customer
  ON tenant_integrations(customer_id);

-- Links integrations to their scheduled jobs for observability
CREATE TABLE tenant_integration_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES tenant_integrations(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES tenant_scheduled_messages(id) ON DELETE CASCADE,
  purpose TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tenant_integration_schedules_unique UNIQUE (integration_id, schedule_id)
);

-- RLS
ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_integration_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations"
  ON tenant_integrations FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own integrations"
  ON tenant_integrations FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own integrations"
  ON tenant_integrations FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own integrations"
  ON tenant_integrations FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own integration schedules"
  ON tenant_integration_schedules FOR SELECT
  USING (integration_id IN (
    SELECT id FROM tenant_integrations
    WHERE customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can insert own integration schedules"
  ON tenant_integration_schedules FOR INSERT
  WITH CHECK (integration_id IN (
    SELECT id FROM tenant_integrations
    WHERE customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can delete own integration schedules"
  ON tenant_integration_schedules FOR DELETE
  USING (integration_id IN (
    SELECT id FROM tenant_integrations
    WHERE customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  ));

-- Updated-at trigger
CREATE TRIGGER tenant_integrations_updated_at
  BEFORE UPDATE ON tenant_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
