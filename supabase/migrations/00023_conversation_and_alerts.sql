-- =============================================
-- FEATURE #1: Conversation event tracking
-- =============================================
CREATE TABLE conversation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  agent_key TEXT,
  date DATE NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  user_message_count INTEGER NOT NULL DEFAULT 0,
  assistant_message_count INTEGER NOT NULL DEFAULT 0,
  conversation_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instance_id, agent_key, date)
);

CREATE INDEX idx_ce_customer_date ON conversation_events(customer_id, date);

ALTER TABLE conversation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversation events"
  ON conversation_events FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Atomic upsert for webhook increments
CREATE OR REPLACE FUNCTION upsert_conversation_event(
  p_customer_id UUID, p_instance_id UUID, p_agent_key TEXT, p_date DATE,
  p_message_count INTEGER DEFAULT 0, p_user_message_count INTEGER DEFAULT 0,
  p_assistant_message_count INTEGER DEFAULT 0, p_conversation_count INTEGER DEFAULT 0
) RETURNS void AS $$
BEGIN
  INSERT INTO conversation_events (customer_id, instance_id, agent_key, date,
    message_count, user_message_count, assistant_message_count, conversation_count)
  VALUES (p_customer_id, p_instance_id, p_agent_key, p_date,
    p_message_count, p_user_message_count, p_assistant_message_count, p_conversation_count)
  ON CONFLICT (instance_id, agent_key, date) DO UPDATE SET
    message_count = conversation_events.message_count + EXCLUDED.message_count,
    user_message_count = conversation_events.user_message_count + EXCLUDED.user_message_count,
    assistant_message_count = conversation_events.assistant_message_count + EXCLUDED.assistant_message_count,
    conversation_count = conversation_events.conversation_count + EXCLUDED.conversation_count,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Webhook idempotency tracking
CREATE TABLE openclaw_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','processed','failed')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Webhook auth secret on instances
ALTER TABLE instances ADD COLUMN IF NOT EXISTS webhook_secret_encrypted TEXT;

-- =============================================
-- FEATURE #2: Spending caps & alerts
-- =============================================
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS spending_cap_cents INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spending_cap_auto_pause BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS alert_email TEXT DEFAULT NULL;

CREATE TABLE alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  alert_key TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  delivery_channels TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_customer ON alert_events(customer_id, created_at DESC);
CREATE UNIQUE INDEX idx_alert_dedup ON alert_events(customer_id, alert_key) WHERE acknowledged = false;

ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own alerts" ON alert_events FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own alerts" ON alert_events FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- =============================================
-- FEATURE #3: Alert preferences
-- =============================================
CREATE TABLE alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
  spending_alerts_enabled BOOLEAN DEFAULT true,
  spending_alert_email BOOLEAN DEFAULT true,
  spending_alert_dashboard BOOLEAN DEFAULT true,
  weather_severe_enabled BOOLEAN DEFAULT true,
  weather_severe_discord BOOLEAN DEFAULT true,
  price_movement_enabled BOOLEAN DEFAULT true,
  price_movement_threshold_cents INTEGER DEFAULT 10,
  price_movement_discord BOOLEAN DEFAULT true,
  ticket_anomaly_enabled BOOLEAN DEFAULT true,
  ticket_anomaly_discord BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own prefs" ON alert_preferences FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
