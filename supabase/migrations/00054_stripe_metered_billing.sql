-- Add metered billing columns to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS stripe_metered_item_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spending_paused_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_spending_paused
  ON customers (id) WHERE spending_paused_at IS NOT NULL;
