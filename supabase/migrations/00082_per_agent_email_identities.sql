-- Per-agent email identities
-- Allows each agent to have its own email address instead of one per customer.

-- 1. Add agent_id column (nullable, SET NULL on agent deletion)
-- ON DELETE SET NULL: when an agent is hard-deleted, the identity's agent_id
-- becomes NULL, making it a team-level identity that routes to the default agent.
ALTER TABLE email_identities
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES tenant_agents(id) ON DELETE SET NULL;

-- 2. Replace the one-per-customer constraint.
-- Old: only ONE active identity per customer (any kind).
-- New: only ONE active identity per agent. No constraint on team-level
-- identities (agent_id IS NULL) — multiple are fine, they all route
-- to the default agent.
DROP INDEX IF EXISTS email_identities_active_customer_unique;

CREATE UNIQUE INDEX email_identities_active_agent_unique
  ON email_identities(agent_id) WHERE is_active = true AND agent_id IS NOT NULL;

-- 3. Lookup index for agent_id queries
CREATE INDEX IF NOT EXISTS idx_email_identities_agent_id
  ON email_identities(agent_id) WHERE agent_id IS NOT NULL;
