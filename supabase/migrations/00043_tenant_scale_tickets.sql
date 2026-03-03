-- Scale tickets table for multi-tenant model
-- Replaces per-instance SQLite storage with centralized Postgres + RLS

CREATE TABLE tenant_scale_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  crop TEXT NOT NULL,
  elevator TEXT NOT NULL,
  gross_weight_lbs INTEGER,
  tare_weight_lbs INTEGER,
  net_weight_lbs INTEGER NOT NULL,
  bushels NUMERIC(12,2) NOT NULL,
  moisture_pct NUMERIC(5,2),
  test_weight NUMERIC(5,1),
  dockage_pct NUMERIC(5,2),
  price_per_bushel NUMERIC(8,4),
  grade TEXT,
  truck_number TEXT,
  load_number TEXT,
  field TEXT,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'voice', 'ocr')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_scale_tickets_tenant_date ON tenant_scale_tickets(tenant_id, date DESC);
CREATE INDEX idx_tenant_scale_tickets_tenant_crop ON tenant_scale_tickets(tenant_id, crop);
CREATE INDEX idx_tenant_scale_tickets_tenant_elevator ON tenant_scale_tickets(tenant_id, elevator);

-- RLS
ALTER TABLE tenant_scale_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_scale_tickets_select ON tenant_scale_tickets
  FOR SELECT USING (
    tenant_id IN (
      SELECT tm.tenant_id FROM tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY tenant_scale_tickets_insert ON tenant_scale_tickets
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tm.tenant_id FROM tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY tenant_scale_tickets_update ON tenant_scale_tickets
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tm.tenant_id FROM tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY tenant_scale_tickets_delete ON tenant_scale_tickets
  FOR DELETE USING (
    tenant_id IN (
      SELECT tm.tenant_id FROM tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

-- Service role bypass
CREATE POLICY tenant_scale_tickets_service ON tenant_scale_tickets
  FOR ALL USING (auth.role() = 'service_role');
