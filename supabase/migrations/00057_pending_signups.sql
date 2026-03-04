-- Temporary holding table for signup flow.
-- Stores encrypted password between form submission and Stripe webhook arrival.
-- Rows auto-expire after 30 minutes; only accessed via service_role (admin client).

CREATE TABLE pending_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'payment_processing', 'completed', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active signup per email at a time
CREATE UNIQUE INDEX idx_pending_signups_email_active
  ON pending_signups (email) WHERE status IN ('pending', 'payment_processing');

CREATE INDEX idx_pending_signups_stripe_sub
  ON pending_signups (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE pending_signups ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS policies; only accessed via admin client (service_role)
