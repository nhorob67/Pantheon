-- Shared grain bid cache table
-- Background scraper populates this; tools read from it
-- Not tenant-scoped — shared across tenants using same elevators

CREATE TABLE grain_bid_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elevator_key TEXT NOT NULL,
  crop TEXT NOT NULL,
  cash_price NUMERIC(8,4),
  basis_cents INTEGER,
  futures_month TEXT,
  delivery_period TEXT,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scraper_source TEXT,
  metadata JSONB DEFAULT '{}',
  UNIQUE(elevator_key, crop, delivery_period)
);

CREATE INDEX idx_grain_bid_cache_elevator ON grain_bid_cache(elevator_key);
CREATE INDEX idx_grain_bid_cache_crop ON grain_bid_cache(crop);
CREATE INDEX idx_grain_bid_cache_scraped_at ON grain_bid_cache(scraped_at DESC);

-- RLS: readable by authenticated users, writable by service role
ALTER TABLE grain_bid_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY grain_bid_cache_read ON grain_bid_cache
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY grain_bid_cache_write ON grain_bid_cache
  FOR ALL USING (auth.role() = 'service_role');
