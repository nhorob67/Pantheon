-- Agent-generated files: track files created by agents via the file_create tool.
-- Files are stored in Supabase Storage bucket "agent-files".

CREATE TABLE IF NOT EXISTS tenant_agent_files (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenant_instances(id) ON DELETE CASCADE,
  customer_id  uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_id     uuid REFERENCES tenant_agents(id) ON DELETE SET NULL,
  file_name    text NOT NULL,
  file_format  text NOT NULL CHECK (file_format IN ('csv','xlsx','pdf','json','txt','md','html')),
  content_type text NOT NULL,
  size_bytes   integer NOT NULL CHECK (size_bytes > 0),
  storage_key  text NOT NULL,
  channel_id   text,
  delivered_via text NOT NULL DEFAULT 'discord_attachment' CHECK (delivered_via IN ('discord_attachment','signed_url')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS: customers see their own files
ALTER TABLE tenant_agent_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_see_own_files"
  ON tenant_agent_files FOR SELECT
  USING (customer_id = auth.uid());

-- Indexes
CREATE INDEX idx_agent_files_tenant_created ON tenant_agent_files(tenant_id, created_at DESC);
CREATE INDEX idx_agent_files_customer ON tenant_agent_files(customer_id);
