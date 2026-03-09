-- Free trial support: track trial end date on customers
ALTER TABLE customers ADD COLUMN trial_ends_at TIMESTAMPTZ DEFAULT NULL;

-- Partial index for fast lookup of active trials
CREATE INDEX idx_customers_active_trials
  ON customers (id)
  WHERE trial_ends_at IS NOT NULL AND subscription_status = 'trialing';
