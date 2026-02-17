-- Knowledge files: farmer-uploaded reference documents for agent context
CREATE TABLE knowledge_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,  -- NULL = shared across all agents
  file_name TEXT NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'md', 'txt')),
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0),
  storage_path TEXT NOT NULL,           -- Supabase Storage path for raw file backup
  parsed_markdown TEXT NOT NULL,        -- converted content for transport to container
  parsed_size_bytes INTEGER NOT NULL,   -- size of parsed markdown
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'processing', 'failed', 'archived')),
  error_message TEXT,                   -- populated if parsing fails
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_knowledge_files_instance ON knowledge_files(instance_id) WHERE status = 'active';
CREATE INDEX idx_knowledge_files_customer ON knowledge_files(customer_id);

-- RLS
ALTER TABLE knowledge_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own knowledge files"
  ON knowledge_files FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own knowledge files"
  ON knowledge_files FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own knowledge files"
  ON knowledge_files FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own knowledge files"
  ON knowledge_files FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Auto-update timestamp
CREATE TRIGGER knowledge_files_updated_at BEFORE UPDATE ON knowledge_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
