-- Upgrade operations: tracks fleet-wide upgrade jobs
CREATE TABLE upgrade_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_version TEXT NOT NULL,
  docker_image TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'canceled')),
  total_instances INTEGER NOT NULL DEFAULT 0,
  completed_instances INTEGER NOT NULL DEFAULT 0,
  failed_instances INTEGER NOT NULL DEFAULT 0,
  concurrency INTEGER NOT NULL DEFAULT 3,
  initiated_by TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-instance status within an upgrade
CREATE TABLE upgrade_instance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upgrade_id UUID NOT NULL REFERENCES upgrade_operations(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS — admin-only access via service role client
ALTER TABLE upgrade_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrade_instance_logs ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_upgrade_instance_logs_upgrade_id ON upgrade_instance_logs(upgrade_id);
CREATE INDEX idx_upgrade_instance_logs_status ON upgrade_instance_logs(status);
CREATE INDEX idx_upgrade_operations_status ON upgrade_operations(status);

-- Updated_at trigger for upgrade_operations
CREATE TRIGGER update_upgrade_operations_updated_at
  BEFORE UPDATE ON upgrade_operations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
