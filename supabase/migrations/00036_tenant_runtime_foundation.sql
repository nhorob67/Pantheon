-- Multi-tenant runtime foundation for Discord-first execution.
-- Adds tenant-scoped runtime entities while preserving existing customer/billing anchors.

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE
    CHECK (
      char_length(slug) BETWEEN 3 AND 120
      AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  name TEXT NOT NULL
    CHECK (char_length(name) BETWEEN 1 AND 120),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  primary_channel_type TEXT NOT NULL DEFAULT 'discord'
    CHECK (primary_channel_type IN ('discord')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenants_customer_unique UNIQUE (customer_id),
  CONSTRAINT tenants_id_customer_unique UNIQUE (id, customer_id)
);

CREATE INDEX idx_tenants_status
  ON tenants(status, updated_at DESC);

CREATE TABLE tenant_roles (
  role_key TEXT PRIMARY KEY
    CHECK (role_key IN ('owner', 'admin', 'operator', 'viewer')),
  precedence INTEGER NOT NULL UNIQUE
    CHECK (precedence BETWEEN 1 AND 1000),
  description TEXT NOT NULL,
  can_manage_members BOOLEAN NOT NULL DEFAULT false,
  can_manage_integrations BOOLEAN NOT NULL DEFAULT false,
  can_manage_tools BOOLEAN NOT NULL DEFAULT false,
  can_export_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL REFERENCES tenant_roles(role_key) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'suspended')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_members_unique_user_per_tenant UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_user
  ON tenant_members(user_id, status);

CREATE INDEX idx_tenant_members_tenant_role
  ON tenant_members(tenant_id, role, status);

CREATE TABLE tenant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  integration_key TEXT NOT NULL
    CHECK (integration_key ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  provider TEXT NOT NULL
    CHECK (char_length(provider) BETWEEN 2 AND 80),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'disabled', 'error')),
  external_ref TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(config) = 'object'),
  secret_ref TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_integrations_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE,
  CONSTRAINT tenant_integrations_unique UNIQUE (tenant_id, integration_key, provider)
);

CREATE INDEX idx_tenant_integrations_tenant_status
  ON tenant_integrations(tenant_id, status, updated_at DESC);

CREATE TABLE tenant_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  legacy_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  agent_key TEXT NOT NULL
    CHECK (agent_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  display_name TEXT NOT NULL
    CHECK (char_length(display_name) BETWEEN 1 AND 120),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  policy_profile TEXT NOT NULL DEFAULT 'normal'
    CHECK (policy_profile IN ('safe', 'normal', 'unsafe')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  skills TEXT[] NOT NULL DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(config) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_agents_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE,
  CONSTRAINT tenant_agents_unique_key UNIQUE (tenant_id, agent_key)
);

CREATE UNIQUE INDEX tenant_agents_one_default_per_tenant
  ON tenant_agents(tenant_id)
  WHERE is_default = true;

CREATE INDEX idx_tenant_agents_tenant_status
  ON tenant_agents(tenant_id, status, sort_order, updated_at DESC);

CREATE TABLE tenant_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES tenant_agents(id) ON DELETE SET NULL,
  legacy_instance_id UUID REFERENCES instances(id) ON DELETE SET NULL,
  session_kind TEXT NOT NULL
    CHECK (session_kind IN ('channel', 'dm', 'thread', 'system')),
  external_id TEXT NOT NULL
    CHECK (char_length(external_id) BETWEEN 1 AND 255),
  peer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'idle', 'closed')),
  title TEXT CHECK (
    title IS NULL OR char_length(title) BETWEEN 1 AND 160
  ),
  rolling_summary TEXT,
  summary_version INTEGER NOT NULL DEFAULT 0
    CHECK (summary_version >= 0),
  last_message_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_sessions_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE,
  CONSTRAINT tenant_sessions_unique_scope UNIQUE (tenant_id, session_kind, external_id)
);

CREATE INDEX idx_tenant_sessions_tenant_status
  ON tenant_sessions(tenant_id, status, updated_at DESC);

CREATE INDEX idx_tenant_sessions_tenant_last_message
  ON tenant_sessions(tenant_id, last_message_at DESC);

CREATE TABLE tenant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES tenant_sessions(id) ON DELETE CASCADE,
  direction TEXT NOT NULL
    CHECK (direction IN ('inbound', 'outbound', 'system', 'tool')),
  author_type TEXT NOT NULL
    CHECK (author_type IN ('user', 'agent', 'system', 'tool')),
  author_id TEXT,
  content_text TEXT,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(content_json) = 'object'),
  citation_traces JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(citation_traces) = 'array'),
  token_count INTEGER CHECK (token_count IS NULL OR token_count >= 0),
  source_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_messages_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_messages_session_created
  ON tenant_messages(session_id, created_at DESC);

CREATE INDEX idx_tenant_messages_tenant_created
  ON tenant_messages(tenant_id, created_at DESC);

CREATE UNIQUE INDEX tenant_messages_source_event_unique
  ON tenant_messages(session_id, source_event_id)
  WHERE source_event_id IS NOT NULL;

CREATE TABLE tenant_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tool_key TEXT NOT NULL
    CHECK (tool_key ~ '^[a-z0-9][a-z0-9_.-]{1,127}$'),
  display_name TEXT NOT NULL
    CHECK (char_length(display_name) BETWEEN 1 AND 120),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'enabled'
    CHECK (status IN ('enabled', 'disabled', 'shadow')),
  risk_level TEXT NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(config) = 'object'),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_tools_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE,
  CONSTRAINT tenant_tools_unique_key UNIQUE (tenant_id, tool_key)
);

CREATE INDEX idx_tenant_tools_tenant_status
  ON tenant_tools(tenant_id, status, risk_level);

CREATE TABLE tenant_tool_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tenant_tools(id) ON DELETE CASCADE,
  approval_mode TEXT NOT NULL DEFAULT 'none'
    CHECK (approval_mode IN ('none', 'owner', 'admin', 'operator', 'always')),
  allow_roles TEXT[] NOT NULL DEFAULT ARRAY['owner', 'admin', 'operator', 'viewer']::text[]
    CHECK (allow_roles <@ ARRAY['owner', 'admin', 'operator', 'viewer']::text[])
    CHECK (cardinality(allow_roles) > 0),
  max_calls_per_hour INTEGER NOT NULL DEFAULT 120
    CHECK (max_calls_per_hour >= 1 AND max_calls_per_hour <= 50000),
  timeout_ms INTEGER NOT NULL DEFAULT 30000
    CHECK (timeout_ms >= 100 AND timeout_ms <= 600000),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_tool_policies_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE,
  CONSTRAINT tenant_tool_policies_unique_tool UNIQUE (tenant_id, tool_id)
);

CREATE INDEX idx_tenant_tool_policies_tenant
  ON tenant_tool_policies(tenant_id, approval_mode, updated_at DESC);

CREATE TABLE tenant_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  approval_type TEXT NOT NULL
    CHECK (approval_type IN ('tool', 'export', 'runtime', 'policy')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'canceled')),
  required_role TEXT NOT NULL REFERENCES tenant_roles(role_key) ON DELETE RESTRICT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tool_id UUID REFERENCES tenant_tools(id) ON DELETE SET NULL,
  request_hash TEXT,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(request_payload) = 'object'),
  decision_payload JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(decision_payload) = 'object'),
  expires_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_approvals_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_approvals_tenant_status
  ON tenant_approvals(tenant_id, status, created_at DESC);

CREATE UNIQUE INDEX tenant_approvals_request_hash_unique
  ON tenant_approvals(tenant_id, request_hash)
  WHERE request_hash IS NOT NULL;

CREATE TABLE tenant_knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  legacy_knowledge_file_id UUID REFERENCES knowledge_files(id) ON DELETE SET NULL,
  title TEXT NOT NULL
    CHECK (char_length(title) BETWEEN 1 AND 255),
  source_type TEXT NOT NULL DEFAULT 'file'
    CHECK (source_type IN ('file', 'note', 'url', 'integration')),
  mime_type TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  content_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('processing', 'active', 'archived', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_knowledge_items_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_knowledge_items_tenant_status
  ON tenant_knowledge_items(tenant_id, status, updated_at DESC);

CREATE UNIQUE INDEX tenant_knowledge_items_storage_unique
  ON tenant_knowledge_items(tenant_id, storage_bucket, storage_path)
  WHERE storage_bucket IS NOT NULL AND storage_path IS NOT NULL;

CREATE TABLE tenant_memory_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  session_id UUID REFERENCES tenant_sessions(id) ON DELETE SET NULL,
  source_message_id UUID REFERENCES tenant_messages(id) ON DELETE SET NULL,
  memory_tier TEXT NOT NULL
    CHECK (memory_tier IN ('working', 'episodic', 'knowledge')),
  memory_type TEXT NOT NULL
    CHECK (memory_type IN ('fact', 'preference', 'commitment', 'outcome', 'summary', 'other')),
  content_text TEXT NOT NULL
    CHECK (char_length(content_text) BETWEEN 1 AND 12000),
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(content_json) = 'object'),
  confidence NUMERIC(5, 4) NOT NULL DEFAULT 0.5
    CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL DEFAULT 'runtime'
    CHECK (source IN ('runtime', 'import', 'operator', 'system')),
  superseded_by UUID REFERENCES tenant_memory_records(id) ON DELETE SET NULL,
  is_tombstoned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_memory_records_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_memory_records_tenant_tier_created
  ON tenant_memory_records(tenant_id, memory_tier, created_at DESC);

CREATE INDEX idx_tenant_memory_records_session_created
  ON tenant_memory_records(session_id, created_at DESC)
  WHERE session_id IS NOT NULL;

CREATE TABLE tenant_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  export_scope TEXT NOT NULL DEFAULT 'full'
    CHECK (export_scope IN ('full', 'knowledge_only', 'metadata_only')),
  format TEXT NOT NULL DEFAULT 'jsonl'
    CHECK (format IN ('jsonl', 'csv')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'expired', 'canceled')),
  include_blobs BOOLEAN NOT NULL DEFAULT true,
  manifest_path TEXT,
  file_count INTEGER NOT NULL DEFAULT 0 CHECK (file_count >= 0),
  total_size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (total_size_bytes >= 0),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_exports_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_exports_tenant_status
  ON tenant_exports(tenant_id, status, created_at DESC);

CREATE TABLE tenant_export_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id UUID NOT NULL REFERENCES tenant_exports(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  file_type TEXT NOT NULL CHECK (char_length(file_type) BETWEEN 1 AND 80),
  storage_bucket TEXT NOT NULL CHECK (char_length(storage_bucket) BETWEEN 1 AND 120),
  storage_path TEXT NOT NULL CHECK (char_length(storage_path) BETWEEN 1 AND 500),
  checksum_sha256 TEXT CHECK (
    checksum_sha256 IS NULL OR checksum_sha256 ~ '^[a-f0-9]{64}$'
  ),
  size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_export_files_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE,
  CONSTRAINT tenant_export_files_unique_name UNIQUE (export_id, file_name)
);

CREATE INDEX idx_tenant_export_files_export
  ON tenant_export_files(export_id, created_at DESC);

CREATE TABLE tenant_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id UUID NOT NULL REFERENCES tenant_exports(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_kind TEXT NOT NULL DEFAULT 'export'
    CHECK (job_kind IN ('export', 'cleanup')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'canceled')),
  attempt INTEGER NOT NULL DEFAULT 1 CHECK (attempt >= 1),
  worker_id TEXT,
  lock_expires_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_export_jobs_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_export_jobs_export_status
  ON tenant_export_jobs(export_id, status, created_at DESC);

CREATE INDEX idx_tenant_export_jobs_tenant_status
  ON tenant_export_jobs(tenant_id, status, created_at DESC);

CREATE TABLE instance_tenant_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  mapping_source TEXT NOT NULL DEFAULT 'backfill'
    CHECK (mapping_source IN ('backfill', 'manual', 'runtime')),
  mapping_status TEXT NOT NULL DEFAULT 'active'
    CHECK (mapping_status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT instance_tenant_mappings_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE,
  CONSTRAINT instance_tenant_mappings_instance_unique UNIQUE (instance_id),
  CONSTRAINT instance_tenant_mappings_unique_pair UNIQUE (tenant_id, instance_id)
);

CREATE INDEX idx_instance_tenant_mappings_tenant
  ON instance_tenant_mappings(tenant_id, updated_at DESC);

CREATE INDEX idx_instance_tenant_mappings_customer
  ON instance_tenant_mappings(customer_id, updated_at DESC);

INSERT INTO tenant_roles (
  role_key,
  precedence,
  description,
  can_manage_members,
  can_manage_integrations,
  can_manage_tools,
  can_export_data
)
VALUES
  ('owner', 400, 'Tenant owner with full control.', true, true, true, true),
  ('admin', 300, 'Tenant administrator for runtime operations.', true, true, true, true),
  ('operator', 200, 'Operational role for day-to-day runtime/tool actions.', false, true, true, false),
  ('viewer', 100, 'Read-only role for observability and diagnostics.', false, false, false, false)
ON CONFLICT (role_key) DO UPDATE
SET
  precedence = EXCLUDED.precedence,
  description = EXCLUDED.description,
  can_manage_members = EXCLUDED.can_manage_members,
  can_manage_integrations = EXCLUDED.can_manage_integrations,
  can_manage_tools = EXCLUDED.can_manage_tools,
  can_export_data = EXCLUDED.can_export_data;

INSERT INTO tenants (
  customer_id,
  slug,
  name,
  metadata
)
SELECT
  c.id AS customer_id,
  'tenant-' || substr(replace(c.id::text, '-', ''), 1, 12) AS slug,
  COALESCE(
    NULLIF(fp.farm_name, ''),
    NULLIF(split_part(COALESCE(c.email, ''), '@', 1), ''),
    'Pantheon Tenant'
  ) AS name,
  jsonb_build_object(
    'seed_migration', '00036_tenant_runtime_foundation',
    'legacy_instance_count', COALESCE(ic.instance_count, 0)
  ) AS metadata
FROM customers c
LEFT JOIN LATERAL (
  SELECT farm_name
  FROM farm_profiles fp
  WHERE fp.customer_id = c.id
  ORDER BY fp.created_at ASC
  LIMIT 1
) fp ON true
LEFT JOIN LATERAL (
  SELECT count(*)::integer AS instance_count
  FROM instances i
  WHERE i.customer_id = c.id
) ic ON true
ON CONFLICT (customer_id) DO NOTHING;

INSERT INTO tenant_members (
  tenant_id,
  user_id,
  role,
  status,
  invited_by
)
SELECT
  t.id AS tenant_id,
  c.user_id,
  'owner' AS role,
  'active' AS status,
  c.user_id AS invited_by
FROM tenants t
JOIN customers c
  ON c.id = t.customer_id
WHERE c.user_id IS NOT NULL
ON CONFLICT (tenant_id, user_id) DO UPDATE
SET
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO instance_tenant_mappings (
  instance_id,
  tenant_id,
  customer_id,
  mapping_source,
  mapping_status
)
SELECT
  i.id AS instance_id,
  t.id AS tenant_id,
  i.customer_id,
  'backfill' AS mapping_source,
  'active' AS mapping_status
FROM instances i
JOIN tenants t
  ON t.customer_id = i.customer_id
ON CONFLICT (instance_id) DO NOTHING;

INSERT INTO feature_flags (
  flag_key,
  description,
  default_enabled,
  owner
)
VALUES
  (
    'tenant.runtime.reads',
    'Enables tenant runtime read path resolution for API and worker requests.',
    false,
    'runtime'
  ),
  (
    'tenant.runtime.writes',
    'Enables tenant runtime write path execution for API and worker requests.',
    false,
    'runtime'
  )
ON CONFLICT (flag_key) DO NOTHING;

INSERT INTO global_kill_switches (
  switch_key,
  description,
  enabled,
  reason
)
VALUES
  (
    'tenant.runtime.discord_ingress_pause',
    'Emergency pause for Discord ingress into tenant runtime workers.',
    false,
    'seeded by tenant runtime foundation migration'
  ),
  (
    'tenant.runtime.tool_execution_pause',
    'Emergency pause for tenant runtime mutating tool execution.',
    false,
    'seeded by tenant runtime foundation migration'
  ),
  (
    'tenant.runtime.memory_writes_pause',
    'Emergency pause for tenant runtime memory writes and compaction jobs.',
    false,
    'seeded by tenant runtime foundation migration'
  )
ON CONFLICT (switch_key) DO NOTHING;

CREATE OR REPLACE FUNCTION is_tenant_member(
  p_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION has_tenant_role(
  p_tenant_id UUID,
  p_allowed_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role = ANY(p_allowed_roles)
  );
$$;

CREATE OR REPLACE FUNCTION can_manage_tenant_data(
  p_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_tenant_role(p_tenant_id, ARRAY['owner', 'admin', 'operator']::text[]);
$$;

CREATE OR REPLACE FUNCTION can_admin_tenant(
  p_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_tenant_role(p_tenant_id, ARRAY['owner', 'admin']::text[]);
$$;

REVOKE ALL ON FUNCTION is_tenant_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION has_tenant_role(UUID, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_manage_tenant_data(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_admin_tenant(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION is_tenant_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_tenant_member(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION has_tenant_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION has_tenant_role(UUID, TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION can_manage_tenant_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_tenant_data(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION can_admin_tenant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_admin_tenant(UUID) TO service_role;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_tool_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_export_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_tenant_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant records"
  ON tenants FOR SELECT
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR is_tenant_member(id)
  );

CREATE POLICY "Users can insert own tenant records"
  ON tenants FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Tenant admins can update tenant records"
  ON tenants FOR UPDATE
  USING (can_admin_tenant(id))
  WITH CHECK (can_admin_tenant(id));

CREATE POLICY "Tenant owners can delete tenant records"
  ON tenants FOR DELETE
  USING (has_tenant_role(id, ARRAY['owner']::text[]));

CREATE POLICY "Users can view tenant role catalog"
  ON tenant_roles FOR SELECT
  USING (true);

CREATE POLICY "Users can view tenant memberships"
  ON tenant_members FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant admins can insert tenant memberships"
  ON tenant_members FOR INSERT
  WITH CHECK (can_admin_tenant(tenant_id));

CREATE POLICY "Tenant admins can update tenant memberships"
  ON tenant_members FOR UPDATE
  USING (can_admin_tenant(tenant_id))
  WITH CHECK (can_admin_tenant(tenant_id));

CREATE POLICY "Tenant admins can delete tenant memberships"
  ON tenant_members FOR DELETE
  USING (can_admin_tenant(tenant_id));

CREATE POLICY "Users can view tenant integrations"
  ON tenant_integrations FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert tenant integrations"
  ON tenant_integrations FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update tenant integrations"
  ON tenant_integrations FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can delete tenant integrations"
  ON tenant_integrations FOR DELETE
  USING (can_manage_tenant_data(tenant_id));

CREATE POLICY "Users can view tenant agents"
  ON tenant_agents FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert tenant agents"
  ON tenant_agents FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update tenant agents"
  ON tenant_agents FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can delete tenant agents"
  ON tenant_agents FOR DELETE
  USING (can_manage_tenant_data(tenant_id));

CREATE POLICY "Users can view tenant sessions"
  ON tenant_sessions FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert tenant sessions"
  ON tenant_sessions FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update tenant sessions"
  ON tenant_sessions FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can delete tenant sessions"
  ON tenant_sessions FOR DELETE
  USING (can_manage_tenant_data(tenant_id));

CREATE POLICY "Users can view tenant messages"
  ON tenant_messages FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert tenant messages"
  ON tenant_messages FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Users can view tenant tools"
  ON tenant_tools FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert tenant tools"
  ON tenant_tools FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update tenant tools"
  ON tenant_tools FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can delete tenant tools"
  ON tenant_tools FOR DELETE
  USING (can_manage_tenant_data(tenant_id));

CREATE POLICY "Users can view tenant tool policies"
  ON tenant_tool_policies FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert tenant tool policies"
  ON tenant_tool_policies FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update tenant tool policies"
  ON tenant_tool_policies FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can delete tenant tool policies"
  ON tenant_tool_policies FOR DELETE
  USING (can_manage_tenant_data(tenant_id));

CREATE POLICY "Users can view tenant approvals"
  ON tenant_approvals FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert tenant approvals"
  ON tenant_approvals FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update tenant approvals"
  ON tenant_approvals FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Users can view tenant knowledge items"
  ON tenant_knowledge_items FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert tenant knowledge items"
  ON tenant_knowledge_items FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update tenant knowledge items"
  ON tenant_knowledge_items FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can delete tenant knowledge items"
  ON tenant_knowledge_items FOR DELETE
  USING (can_manage_tenant_data(tenant_id));

CREATE POLICY "Users can view tenant memory records"
  ON tenant_memory_records FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert tenant memory records"
  ON tenant_memory_records FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update tenant memory records"
  ON tenant_memory_records FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can delete tenant memory records"
  ON tenant_memory_records FOR DELETE
  USING (can_manage_tenant_data(tenant_id));

CREATE POLICY "Users can view tenant exports"
  ON tenant_exports FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert tenant exports"
  ON tenant_exports FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update tenant exports"
  ON tenant_exports FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Users can view tenant export files"
  ON tenant_export_files FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert tenant export files"
  ON tenant_export_files FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can delete tenant export files"
  ON tenant_export_files FOR DELETE
  USING (can_manage_tenant_data(tenant_id));

CREATE POLICY "Users can view tenant export jobs"
  ON tenant_export_jobs FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant operators can insert tenant export jobs"
  ON tenant_export_jobs FOR INSERT
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Tenant operators can update tenant export jobs"
  ON tenant_export_jobs FOR UPDATE
  USING (can_manage_tenant_data(tenant_id))
  WITH CHECK (can_manage_tenant_data(tenant_id));

CREATE POLICY "Users can view instance tenant mappings"
  ON instance_tenant_mappings FOR SELECT
  USING (
    is_tenant_member(tenant_id)
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tenants_updated_at'
      AND tgrelid = 'tenants'::regclass
  ) THEN
    CREATE TRIGGER tenants_updated_at
      BEFORE UPDATE ON tenants
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tenant_members_updated_at'
      AND tgrelid = 'tenant_members'::regclass
  ) THEN
    CREATE TRIGGER tenant_members_updated_at
      BEFORE UPDATE ON tenant_members
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tenant_integrations_updated_at'
      AND tgrelid = 'tenant_integrations'::regclass
  ) THEN
    CREATE TRIGGER tenant_integrations_updated_at
      BEFORE UPDATE ON tenant_integrations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tenant_agents_updated_at'
      AND tgrelid = 'tenant_agents'::regclass
  ) THEN
    CREATE TRIGGER tenant_agents_updated_at
      BEFORE UPDATE ON tenant_agents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tenant_sessions_updated_at'
      AND tgrelid = 'tenant_sessions'::regclass
  ) THEN
    CREATE TRIGGER tenant_sessions_updated_at
      BEFORE UPDATE ON tenant_sessions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tenant_tools_updated_at'
      AND tgrelid = 'tenant_tools'::regclass
  ) THEN
    CREATE TRIGGER tenant_tools_updated_at
      BEFORE UPDATE ON tenant_tools
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tenant_tool_policies_updated_at'
      AND tgrelid = 'tenant_tool_policies'::regclass
  ) THEN
    CREATE TRIGGER tenant_tool_policies_updated_at
      BEFORE UPDATE ON tenant_tool_policies
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tenant_approvals_updated_at'
      AND tgrelid = 'tenant_approvals'::regclass
  ) THEN
    CREATE TRIGGER tenant_approvals_updated_at
      BEFORE UPDATE ON tenant_approvals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tenant_knowledge_items_updated_at'
      AND tgrelid = 'tenant_knowledge_items'::regclass
  ) THEN
    CREATE TRIGGER tenant_knowledge_items_updated_at
      BEFORE UPDATE ON tenant_knowledge_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tenant_memory_records_updated_at'
      AND tgrelid = 'tenant_memory_records'::regclass
  ) THEN
    CREATE TRIGGER tenant_memory_records_updated_at
      BEFORE UPDATE ON tenant_memory_records
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tenant_exports_updated_at'
      AND tgrelid = 'tenant_exports'::regclass
  ) THEN
    CREATE TRIGGER tenant_exports_updated_at
      BEFORE UPDATE ON tenant_exports
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tenant_export_jobs_updated_at'
      AND tgrelid = 'tenant_export_jobs'::regclass
  ) THEN
    CREATE TRIGGER tenant_export_jobs_updated_at
      BEFORE UPDATE ON tenant_export_jobs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'instance_tenant_mappings_updated_at'
      AND tgrelid = 'instance_tenant_mappings'::regclass
  ) THEN
    CREATE TRIGGER instance_tenant_mappings_updated_at
      BEFORE UPDATE ON instance_tenant_mappings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
