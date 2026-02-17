-- Phase 1: per-account email identities + inbound webhook ingestion tables

CREATE TABLE email_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  address TEXT NOT NULL,
  sender_alias TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_identities_slug_format
    CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$'),
  CONSTRAINT email_identities_slug_len
    CHECK (char_length(slug) BETWEEN 3 AND 63),
  CONSTRAINT email_identities_address_lower
    CHECK (address = lower(address)),
  CONSTRAINT email_identities_sender_alias_lower
    CHECK (sender_alias = lower(sender_alias))
);

CREATE UNIQUE INDEX email_identities_slug_unique ON email_identities(slug);
CREATE UNIQUE INDEX email_identities_address_unique ON email_identities(address);
CREATE UNIQUE INDEX email_identities_active_customer_unique
  ON email_identities(customer_id) WHERE is_active = true;
CREATE INDEX idx_email_identities_instance_id ON email_identities(instance_id)
  WHERE instance_id IS NOT NULL;

CREATE TABLE email_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX email_webhook_events_provider_event_unique
  ON email_webhook_events(provider, provider_event_id);

CREATE TABLE email_inbound (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id) ON DELETE SET NULL,
  identity_id UUID REFERENCES email_identities(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_email_id TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  from_email TEXT,
  from_name TEXT,
  to_email TEXT NOT NULL,
  subject TEXT,
  message_id TEXT,
  cc JSONB NOT NULL DEFAULT '[]',
  bcc JSONB NOT NULL DEFAULT '[]',
  attachment_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued',
  metadata JSONB NOT NULL DEFAULT '{}',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_inbound_status_check
    CHECK (status IN ('queued', 'processed', 'failed')),
  CONSTRAINT email_inbound_provider_email_unique
    UNIQUE (provider, provider_email_id)
);

CREATE INDEX idx_email_inbound_customer_id ON email_inbound(customer_id);
CREATE INDEX idx_email_inbound_status ON email_inbound(status);
CREATE INDEX idx_email_inbound_received_at ON email_inbound(received_at DESC);

ALTER TABLE email_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_inbound ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email identities"
  ON email_identities FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own email identities"
  ON email_identities FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own inbound emails"
  ON email_inbound FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE TRIGGER email_identities_updated_at BEFORE UPDATE ON email_identities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER email_inbound_updated_at BEFORE UPDATE ON email_inbound
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
