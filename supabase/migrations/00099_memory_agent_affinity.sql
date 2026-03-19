-- Add agent_id to memory records for agent-affinity scoring.
-- All memories remain visible to all agents (no RLS filter on agent_id).
-- The column is used as a scoring signal: the authoring agent gets a small
-- relevance boost when it searches, but other agents still see the memory.

ALTER TABLE tenant_memory_records
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES tenant_agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tmr_agent_id
  ON tenant_memory_records(agent_id)
  WHERE agent_id IS NOT NULL AND is_tombstoned = false;

-- Update semantic search RPC to return agent_id
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
  similarity FLOAT,
  agent_id UUID
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
    (1 - (tmr.embedding <=> p_embedding))::FLOAT AS similarity,
    tmr.agent_id
  FROM tenant_memory_records tmr
  WHERE tmr.tenant_id = p_tenant_id
    AND tmr.is_tombstoned = false
    AND tmr.embedding IS NOT NULL
    AND (1 - (tmr.embedding <=> p_embedding)) >= p_match_threshold
  ORDER BY tmr.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$;

-- Update keyword search RPC to return agent_id
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
  rank FLOAT,
  agent_id UUID
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
    ts_rank_cd(tmr.content_tsv, plainto_tsquery('english', p_query))::FLOAT AS rank,
    tmr.agent_id
  FROM tenant_memory_records tmr
  WHERE tmr.tenant_id = p_tenant_id
    AND tmr.is_tombstoned = false
    AND tmr.content_tsv @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC
  LIMIT p_match_count;
END;
$$;

-- Update atomic upsert to accept agent_id
CREATE OR REPLACE FUNCTION upsert_memory_with_dedup(
  p_tenant_id UUID,
  p_customer_id UUID,
  p_session_id UUID,
  p_memory_tier TEXT,
  p_memory_type TEXT,
  p_content_text TEXT,
  p_content_json JSONB DEFAULT '{}'::JSONB,
  p_confidence NUMERIC DEFAULT 0.5,
  p_source TEXT DEFAULT 'runtime',
  p_content_hash TEXT DEFAULT NULL,
  p_embedding vector(1536) DEFAULT NULL,
  p_dedup_threshold FLOAT DEFAULT 0.95,
  p_agent_id UUID DEFAULT NULL
)
RETURNS TABLE (new_id UUID, superseded_id UUID, was_duplicate BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_id UUID;
  v_superseded_id UUID;
  v_existing_id UUID;
  v_closest RECORD;
BEGIN
  -- Fast path: exact content hash match
  IF p_content_hash IS NOT NULL THEN
    SELECT tmr.id INTO v_existing_id
    FROM tenant_memory_records tmr
    WHERE tmr.tenant_id = p_tenant_id
      AND tmr.content_hash = p_content_hash
      AND tmr.is_tombstoned = false
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN QUERY SELECT NULL::UUID, NULL::UUID, true;
      RETURN;
    END IF;
  END IF;

  -- Semantic dedup: find nearest match above threshold
  IF p_embedding IS NOT NULL THEN
    SELECT tmr.id, tmr.memory_type, tmr.confidence,
           1 - (tmr.embedding <=> p_embedding) AS similarity
    INTO v_closest
    FROM tenant_memory_records tmr
    WHERE tmr.tenant_id = p_tenant_id
      AND tmr.is_tombstoned = false
      AND tmr.embedding IS NOT NULL
      AND 1 - (tmr.embedding <=> p_embedding) >= p_dedup_threshold
    ORDER BY tmr.embedding <=> p_embedding ASC
    LIMIT 1
    FOR UPDATE OF tmr;

    IF v_closest IS NOT NULL THEN
      -- Same type + existing confidence >= new -> reject as duplicate
      IF v_closest.memory_type = p_memory_type AND v_closest.confidence >= p_confidence THEN
        RETURN QUERY SELECT NULL::UUID, NULL::UUID, true;
        RETURN;
      END IF;

      -- Same type + existing confidence < new -> supersede
      IF v_closest.memory_type = p_memory_type AND v_closest.confidence < p_confidence THEN
        v_superseded_id := v_closest.id;
      END IF;
    END IF;
  END IF;

  -- Insert the new record (now includes agent_id)
  INSERT INTO tenant_memory_records (
    tenant_id, customer_id, session_id,
    memory_tier, memory_type, content_text, content_json,
    confidence, source, is_tombstoned, content_hash, embedding,
    agent_id
  ) VALUES (
    p_tenant_id, p_customer_id, p_session_id,
    p_memory_tier, p_memory_type, p_content_text, p_content_json,
    p_confidence, p_source, false, p_content_hash,
    p_embedding,
    p_agent_id
  )
  RETURNING id INTO v_new_id;

  -- Atomically tombstone the superseded record
  IF v_superseded_id IS NOT NULL THEN
    UPDATE tenant_memory_records
    SET is_tombstoned = true,
        superseded_by = v_new_id
    WHERE id = v_superseded_id;
  END IF;

  RETURN QUERY SELECT v_new_id, v_superseded_id, false;
END;
$$;
