-- Memory quality hardening: RPCs, content_hash, and tsvector for hybrid search

-- content_hash for fast exact dedup
ALTER TABLE tenant_memory_records ADD COLUMN IF NOT EXISTS content_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_tmr_content_hash
  ON tenant_memory_records(tenant_id, content_hash)
  WHERE content_hash IS NOT NULL AND is_tombstoned = false;

-- tsvector for keyword search (auto-generated column)
ALTER TABLE tenant_memory_records ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content_text)) STORED;
CREATE INDEX IF NOT EXISTS idx_tmr_content_tsv
  ON tenant_memory_records USING gin(content_tsv)
  WHERE is_tombstoned = false;

-- Semantic search RPC (called from memory-retrieval.ts — was missing)
CREATE OR REPLACE FUNCTION match_tenant_memories(
  p_tenant_id UUID,
  p_embedding vector(1536),
  p_match_count INT DEFAULT 5,
  p_match_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  content_text TEXT,
  memory_type TEXT,
  memory_tier TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tmr.id,
    tmr.content_text,
    tmr.memory_type::TEXT,
    tmr.memory_tier::TEXT,
    tmr.confidence,
    tmr.created_at,
    (1 - (tmr.embedding <=> p_embedding))::FLOAT AS similarity
  FROM tenant_memory_records tmr
  WHERE tmr.tenant_id = p_tenant_id
    AND tmr.is_tombstoned = false
    AND tmr.embedding IS NOT NULL
    AND (1 - (tmr.embedding <=> p_embedding)) >= p_match_threshold
  ORDER BY tmr.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$;

-- Keyword search RPC (new — for hybrid search)
CREATE OR REPLACE FUNCTION keyword_match_tenant_memories(
  p_tenant_id UUID,
  p_query TEXT,
  p_match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  content_text TEXT,
  memory_type TEXT,
  memory_tier TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ,
  rank FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tmr.id,
    tmr.content_text,
    tmr.memory_type::TEXT,
    tmr.memory_tier::TEXT,
    tmr.confidence,
    tmr.created_at,
    ts_rank_cd(tmr.content_tsv, plainto_tsquery('english', p_query))::FLOAT AS rank
  FROM tenant_memory_records tmr
  WHERE tmr.tenant_id = p_tenant_id
    AND tmr.is_tombstoned = false
    AND tmr.content_tsv @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC
  LIMIT p_match_count;
END;
$$;

-- Knowledge chunks RPC (called from knowledge-retrieval.ts — was missing)
CREATE OR REPLACE FUNCTION match_tenant_knowledge_chunks(
  p_tenant_id UUID,
  p_agent_id UUID,
  p_embedding vector(1536),
  p_match_count INT DEFAULT 5,
  p_match_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  knowledge_item_id UUID,
  chunk_index INT,
  similarity FLOAT,
  source_title TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tkc.id,
    tkc.content,
    tkc.knowledge_item_id,
    tkc.chunk_index,
    (1 - (tkc.embedding <=> p_embedding))::FLOAT AS similarity,
    tki.title AS source_title
  FROM tenant_knowledge_chunks tkc
  JOIN tenant_knowledge_items tki ON tki.id = tkc.knowledge_item_id
  WHERE tkc.tenant_id = p_tenant_id
    AND tkc.embedding IS NOT NULL
    AND (1 - (tkc.embedding <=> p_embedding)) >= p_match_threshold
    AND (p_agent_id IS NULL OR tkc.agent_id IS NULL OR tkc.agent_id = p_agent_id)
  ORDER BY tkc.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$;
