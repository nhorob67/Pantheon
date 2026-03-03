-- Add full-text search support to knowledge chunks.

-- Generated tsvector column for keyword search
ALTER TABLE tenant_knowledge_chunks
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- GIN index for fast keyword search
CREATE INDEX IF NOT EXISTS idx_tkc_content_tsv
  ON tenant_knowledge_chunks USING GIN (content_tsv);

-- Keyword match function for knowledge chunks (mirrors keyword_match_tenant_memories)
CREATE OR REPLACE FUNCTION keyword_match_tenant_knowledge_chunks(
  p_tenant_id UUID,
  p_agent_id UUID DEFAULT NULL,
  p_query TEXT DEFAULT '',
  p_match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  knowledge_item_id UUID,
  chunk_index INT,
  rank REAL,
  source_title TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tsquery tsquery;
BEGIN
  v_tsquery := plainto_tsquery('english', p_query);

  RETURN QUERY
  SELECT
    tkc.id,
    tkc.content,
    tkc.knowledge_item_id,
    tkc.chunk_index,
    ts_rank(tkc.content_tsv, v_tsquery) AS rank,
    tki.title AS source_title
  FROM tenant_knowledge_chunks tkc
  LEFT JOIN tenant_knowledge_items tki ON tki.id = tkc.knowledge_item_id
  WHERE tkc.tenant_id = p_tenant_id
    AND (p_agent_id IS NULL OR tkc.agent_id IS NULL OR tkc.agent_id = p_agent_id)
    AND tkc.content_tsv @@ v_tsquery
  ORDER BY rank DESC
  LIMIT p_match_count;
END;
$$;
