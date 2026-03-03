CREATE TABLE tenant_conversation_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  run_id UUID REFERENCES tenant_runtime_runs(id),
  agent_id UUID,
  agent_name TEXT,
  tools_available TEXT[] DEFAULT '{}',
  tools_invoked JSONB DEFAULT '[]',
  memories_referenced JSONB DEFAULT '[]',
  knowledge_referenced JSONB DEFAULT '[]',
  model_id TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversation_traces_tenant ON tenant_conversation_traces(tenant_id);
CREATE INDEX idx_conversation_traces_session ON tenant_conversation_traces(session_id);
CREATE INDEX idx_conversation_traces_created ON tenant_conversation_traces(created_at DESC);
CREATE INDEX idx_conversation_traces_run ON tenant_conversation_traces(run_id) WHERE run_id IS NOT NULL;

-- RLS
ALTER TABLE tenant_conversation_traces ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_conversation_traces_select ON tenant_conversation_traces
  FOR SELECT USING (
    customer_id = auth.uid()
    OR (SELECT current_setting('role', true)) = 'service_role'
  );

CREATE POLICY tenant_conversation_traces_insert ON tenant_conversation_traces
  FOR INSERT WITH CHECK (
    (SELECT current_setting('role', true)) = 'service_role'
  );
