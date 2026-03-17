-- 00096_conversation_search_and_summary_dag.sql
-- Phase 2: Full-text conversation search via tsvector + GIN index
-- Phase 3: Hierarchical summary DAG for lossless compaction

BEGIN;

-- ─── Phase 2: Conversation Search ─────────────────────────────────────────────

-- Add generated tsvector column for full-text search
ALTER TABLE tenant_messages
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', COALESCE(content_text, ''))) STORED;

-- GIN index for efficient full-text search
CREATE INDEX IF NOT EXISTS idx_tenant_messages_tsv
  ON tenant_messages USING gin(content_tsv);

-- RPC for ranked conversation search scoped to a tenant
CREATE OR REPLACE FUNCTION search_tenant_messages(
  p_tenant_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  session_id UUID,
  direction TEXT,
  content_text TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE sql STABLE
AS $$
  SELECT
    tm.id,
    tm.session_id,
    tm.direction,
    tm.content_text,
    tm.created_at,
    ts_rank_cd(tm.content_tsv, websearch_to_tsquery('english', p_query)) AS rank
  FROM tenant_messages tm
  JOIN tenant_sessions ts ON ts.id = tm.session_id
  WHERE ts.tenant_id = p_tenant_id
    AND tm.content_tsv @@ websearch_to_tsquery('english', p_query)
  ORDER BY rank DESC, tm.created_at DESC
  LIMIT p_limit;
$$;

-- ─── Phase 3: Summary DAG ─────────────────────────────────────────────────────

CREATE TABLE session_summary_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES tenant_sessions(id) ON DELETE CASCADE,
  parent_node_id UUID REFERENCES session_summary_nodes(id) ON DELETE SET NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  summary_text TEXT NOT NULL,
  source_message_ids UUID[] NOT NULL DEFAULT '{}',
  source_node_ids UUID[] NOT NULL DEFAULT '{}',
  token_count INTEGER NOT NULL DEFAULT 0,
  message_time_start TIMESTAMPTZ,
  message_time_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient DAG traversal
CREATE INDEX idx_ssn_session_depth
  ON session_summary_nodes(session_id, depth, created_at DESC);

CREATE INDEX idx_ssn_parent
  ON session_summary_nodes(parent_node_id)
  WHERE parent_node_id IS NOT NULL;

-- RLS: inherit access from tenant_sessions
ALTER TABLE session_summary_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session summary nodes"
  ON session_summary_nodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_sessions ts
      WHERE ts.id = session_summary_nodes.session_id
        AND is_tenant_member(ts.tenant_id)
    )
  );

CREATE POLICY "System can insert session summary nodes"
  ON session_summary_nodes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update session summary nodes"
  ON session_summary_nodes FOR UPDATE
  USING (true)
  WITH CHECK (true);

COMMIT;
