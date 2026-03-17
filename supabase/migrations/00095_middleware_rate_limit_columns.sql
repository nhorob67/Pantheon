-- Phase 6.2.4: Per-capability rate limit columns for middleware pipeline
-- These allow operators to override the hardcoded defaults in guardrail-middleware.ts

ALTER TABLE tenant_run_budget_configs
  ADD COLUMN IF NOT EXISTS max_web_fetch_per_run integer,
  ADD COLUMN IF NOT EXISTS max_delegation_fan_out integer,
  ADD COLUMN IF NOT EXISTS max_browser_actions_per_minute integer;

COMMENT ON COLUMN tenant_run_budget_configs.max_web_fetch_per_run
  IS 'Maximum web_fetch calls per run (default: 20 in middleware)';
COMMENT ON COLUMN tenant_run_budget_configs.max_delegation_fan_out
  IS 'Maximum delegation fan-out per run (default: 3 in middleware)';
COMMENT ON COLUMN tenant_run_budget_configs.max_browser_actions_per_minute
  IS 'Maximum browser actions per minute (default: 30 in middleware)';
