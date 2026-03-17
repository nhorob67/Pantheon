-- Migration: Add cost configuration columns to browser policies
--
-- Allows tenants to configure per-session base cost and per-action cost
-- for browser automation, instead of relying on hardcoded defaults.

ALTER TABLE tenant_browser_policies
  ADD COLUMN IF NOT EXISTS base_cost_cents int NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS per_action_cost_cents int NOT NULL DEFAULT 1;
