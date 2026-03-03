-- Atomic memory dedup/supersede function.
-- Replaces the two-step tombstone-then-insert pattern that could orphan records.
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
  p_dedup_threshold FLOAT DEFAULT 0.95
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
    SELECT id INTO v_existing_id
    FROM tenant_memory_records
    WHERE tenant_id = p_tenant_id
      AND content_hash = p_content_hash
      AND is_tombstoned = false
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
    FOR UPDATE OF tmr;  -- Lock the row to prevent concurrent supersede races

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
      -- Different type -> allow (different purpose), v_superseded_id stays NULL
    END IF;
  END IF;

  -- Insert the new record
  INSERT INTO tenant_memory_records (
    tenant_id, customer_id, session_id,
    memory_tier, memory_type, content_text, content_json,
    confidence, source, is_tombstoned, content_hash, embedding
  ) VALUES (
    p_tenant_id, p_customer_id, p_session_id,
    p_memory_tier, p_memory_type, p_content_text, p_content_json,
    p_confidence, p_source, false, p_content_hash,
    p_embedding
  )
  RETURNING id INTO v_new_id;

  -- Atomically tombstone the superseded record now that the new one exists
  IF v_superseded_id IS NOT NULL THEN
    UPDATE tenant_memory_records
    SET is_tombstoned = true,
        superseded_by = v_new_id
    WHERE id = v_superseded_id;
  END IF;

  RETURN QUERY SELECT v_new_id, v_superseded_id, false;
END;
$$;
