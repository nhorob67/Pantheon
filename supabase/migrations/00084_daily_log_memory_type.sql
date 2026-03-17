-- Partial index for efficient daily_log memory queries
CREATE INDEX IF NOT EXISTS idx_tmr_daily_log
  ON tenant_memory_records(tenant_id, memory_type, created_at DESC)
  WHERE memory_type = 'daily_log' AND is_tombstoned = false;
