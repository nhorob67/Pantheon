-- 00084_hierarchical_summary_dag.sql
-- Hierarchical summary DAG: multi-level summaries with parent-child linking
-- so older conversation context can be drilled into rather than permanently lost.

BEGIN;

-- Summary nodes table: each row is a summary of a conversation window
CREATE TABLE IF NOT EXISTS tenant_summary_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES tenant_sessions(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES tenant_summary_nodes(id) ON DELETE SET NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  summary_text TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  child_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient traversal
CREATE INDEX IF NOT EXISTS idx_tsn_session_depth
  ON tenant_summary_nodes(session_id, depth, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tsn_parent
  ON tenant_summary_nodes(parent_id)
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tsn_tenant_session
  ON tenant_summary_nodes(tenant_id, session_id);

-- Track which leaf summary is the current rolling summary for each session
ALTER TABLE tenant_sessions
  ADD COLUMN IF NOT EXISTS current_summary_node_id UUID
    REFERENCES tenant_summary_nodes(id) ON DELETE SET NULL;

COMMIT;
