-- Tenant Secrets Vault
-- Encrypted key/value store with per-secret scoping to agents, tools, and domains.
-- Secrets are accessed via opaque handles — the LLM never sees raw values.

CREATE TABLE tenant_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,

  -- Encrypted secret value (AES-256-GCM via src/lib/crypto.ts)
  encrypted_value TEXT NOT NULL,
  -- Masked hint for display (e.g., "sk_test***xyz")
  value_hint TEXT NOT NULL,

  -- How the secret is used: inject = server-side header injection (default),
  -- break_glass = raw value retrieval (disabled by default, always approval-gated)
  usage_mode TEXT NOT NULL DEFAULT 'inject'
    CHECK (usage_mode IN ('inject', 'break_glass')),

  -- Injection configuration (when usage_mode = 'inject')
  -- Which HTTP auth scheme to use when injecting
  inject_scheme TEXT NOT NULL DEFAULT 'bearer'
    CHECK (inject_scheme IN ('bearer', 'basic', 'header', 'query_param')),
  -- Custom header name (when inject_scheme = 'header'), e.g., 'X-API-Key'
  inject_header_name TEXT,
  -- Custom query param name (when inject_scheme = 'query_param'), e.g., 'api_key'
  inject_param_name TEXT,

  -- Scoping: which agents can use this secret (NULL = all agents)
  allowed_agent_ids UUID[],
  -- Scoping: which domains this secret can be sent to (NULL = any domain)
  allowed_domains TEXT[],

  -- Audit
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES customers(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One label per tenant
  CONSTRAINT tenant_secrets_label_unique UNIQUE (tenant_id, label)
);

-- RLS
ALTER TABLE tenant_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_secrets_select ON tenant_secrets
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY tenant_secrets_insert ON tenant_secrets
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY tenant_secrets_update ON tenant_secrets
  FOR UPDATE USING (customer_id = auth.uid());

CREATE POLICY tenant_secrets_delete ON tenant_secrets
  FOR DELETE USING (customer_id = auth.uid());

CREATE INDEX idx_tenant_secrets_tenant ON tenant_secrets(tenant_id);
CREATE INDEX idx_tenant_secrets_customer ON tenant_secrets(customer_id);

-- Audit log for every secret access (handle creation + injection)
CREATE TABLE tenant_secret_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  secret_id UUID NOT NULL REFERENCES tenant_secrets(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('handle_created', 'injected', 'reveal_attempted', 'reveal_approved', 'reveal_denied')),
  -- Which tool consumed the handle
  tool_name TEXT,
  -- Target domain for injection
  target_domain TEXT,
  -- Which agent requested it
  agent_id UUID,
  -- Runtime run that triggered this
  run_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenant_secret_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_secret_audit_log_select ON tenant_secret_audit_log
  FOR SELECT USING (customer_id = auth.uid());

-- Admin can insert audit entries (service role bypasses RLS)
CREATE INDEX idx_tenant_secret_audit_tenant ON tenant_secret_audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_tenant_secret_audit_secret ON tenant_secret_audit_log(secret_id, created_at DESC);
