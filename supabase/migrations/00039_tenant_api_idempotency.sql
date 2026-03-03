-- Tenant API idempotency records for write-route replay safety.

CREATE TABLE IF NOT EXISTS tenant_api_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  route_path TEXT NOT NULL CHECK (char_length(route_path) BETWEEN 1 AND 500),
  http_method TEXT NOT NULL CHECK (http_method IN ('POST', 'PUT', 'PATCH', 'DELETE')),
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 1 AND 255),
  request_fingerprint TEXT NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  response_status INTEGER NOT NULL CHECK (response_status BETWEEN 100 AND 599),
  response_body JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenant_api_idempotency_tenant_customer_fk
    FOREIGN KEY (tenant_id, customer_id)
      REFERENCES tenants(id, customer_id) ON DELETE CASCADE,
  CONSTRAINT tenant_api_idempotency_unique_key
    UNIQUE (tenant_id, route_path, http_method, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_api_idempotency_lookup
  ON tenant_api_idempotency_keys(tenant_id, route_path, http_method, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_tenant_api_idempotency_expires
  ON tenant_api_idempotency_keys(expires_at);

ALTER TABLE tenant_api_idempotency_keys ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_api_idempotency_keys'
      AND policyname = 'Users can view tenant API idempotency keys'
  ) THEN
    CREATE POLICY "Users can view tenant API idempotency keys"
      ON tenant_api_idempotency_keys FOR SELECT
      USING (is_tenant_member(tenant_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_api_idempotency_keys'
      AND policyname = 'Tenant operators can insert tenant API idempotency keys'
  ) THEN
    CREATE POLICY "Tenant operators can insert tenant API idempotency keys"
      ON tenant_api_idempotency_keys FOR INSERT
      WITH CHECK (can_manage_tenant_data(tenant_id));
  END IF;
END $$;
