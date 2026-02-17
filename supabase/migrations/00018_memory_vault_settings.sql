-- Memory settings + operation queue for hybrid native + local vault mode

CREATE TABLE IF NOT EXISTS instance_memory_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'native_only'
    CHECK (mode IN ('native_only', 'hybrid_local_vault')),
  capture_level TEXT NOT NULL DEFAULT 'standard'
    CHECK (capture_level IN ('conservative', 'standard', 'aggressive')),
  retention_days INTEGER NOT NULL DEFAULT 365
    CHECK (retention_days >= 7 AND retention_days <= 3650),
  exclude_categories TEXT[] NOT NULL DEFAULT '{}',
  auto_checkpoint BOOLEAN NOT NULL DEFAULT true,
  auto_compress BOOLEAN NOT NULL DEFAULT true,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT instance_memory_settings_instance_unique UNIQUE (instance_id)
);

CREATE INDEX IF NOT EXISTS idx_instance_memory_settings_customer
  ON instance_memory_settings(customer_id);

ALTER TABLE instance_memory_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memory settings"
  ON instance_memory_settings FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own memory settings"
  ON instance_memory_settings FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own memory settings"
  ON instance_memory_settings FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own memory settings"
  ON instance_memory_settings FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS memory_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL
    CHECK (operation_type IN ('checkpoint', 'compress')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  requested_by TEXT,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_operations_instance_created
  ON memory_operations(instance_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_operations_customer_created
  ON memory_operations(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_operations_status
  ON memory_operations(status);

ALTER TABLE memory_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memory operations"
  ON memory_operations FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own memory operations"
  ON memory_operations FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own memory operations"
  ON memory_operations FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own memory operations"
  ON memory_operations FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_instance_memory_settings_updated_at'
      AND tgrelid = 'instance_memory_settings'::regclass
  ) THEN
    CREATE TRIGGER set_instance_memory_settings_updated_at
      BEFORE UPDATE ON instance_memory_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_memory_operations_updated_at'
      AND tgrelid = 'memory_operations'::regclass
  ) THEN
    CREATE TRIGGER set_memory_operations_updated_at
      BEFORE UPDATE ON memory_operations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
