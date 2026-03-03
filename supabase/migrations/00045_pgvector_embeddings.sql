-- Enable pgvector extension for memory and knowledge embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to tenant_memory_records
ALTER TABLE tenant_memory_records
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Knowledge chunks table for RAG
CREATE TABLE tenant_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  knowledge_item_id UUID NOT NULL REFERENCES tenant_knowledge_items(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES tenant_agents(id) ON DELETE SET NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_chunks_tenant ON tenant_knowledge_chunks(tenant_id);
CREATE INDEX idx_knowledge_chunks_item ON tenant_knowledge_chunks(knowledge_item_id);
CREATE INDEX idx_knowledge_chunks_agent ON tenant_knowledge_chunks(tenant_id, agent_id);

-- IVFFlat indexes for cosine similarity search
-- These require data to exist; for initial setup, use exact search
-- Upgrade to HNSW at scale
CREATE INDEX idx_memory_embedding ON tenant_memory_records
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX idx_knowledge_chunk_embedding ON tenant_knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RLS for knowledge chunks
ALTER TABLE tenant_knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_chunks_select ON tenant_knowledge_chunks
  FOR SELECT USING (
    tenant_id IN (
      SELECT tm.tenant_id FROM tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY knowledge_chunks_service ON tenant_knowledge_chunks
  FOR ALL USING (auth.role() = 'service_role');
