-- Phase 6: Add advanced guardrail event kinds and config columns
-- Supports ping-pong detection, browser no-progress, delegation recursion,
-- and adaptive threshold configuration.

-- ---------------------------------------------------------------------------
-- Widen event_kind CHECK constraint to include new kinds
-- ---------------------------------------------------------------------------

ALTER TABLE tenant_guardrail_events
  DROP CONSTRAINT IF EXISTS tenant_guardrail_events_event_kind_check;

ALTER TABLE tenant_guardrail_events
  ADD CONSTRAINT tenant_guardrail_events_event_kind_check
  CHECK (event_kind IN (
    'loop_warning', 'loop_hard_stop',
    'budget_tool_invocations', 'budget_elapsed_time',
    'budget_tokens', 'budget_spend',
    'budget_browser_actions', 'budget_browser_session_time',
    'ping_pong_detected', 'browser_no_progress', 'delegation_recursion'
  ));

-- ---------------------------------------------------------------------------
-- Add Phase 6 config columns to run budget configs
-- ---------------------------------------------------------------------------

ALTER TABLE tenant_run_budget_configs
  ADD COLUMN IF NOT EXISTS ping_pong_threshold integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS browser_no_progress_threshold integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_delegation_depth integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS retry_allowed_tools text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN tenant_run_budget_configs.ping_pong_threshold IS
  'Phase 6: Number of A→B→A→B alternation cycles before halt (0 = disabled)';
COMMENT ON COLUMN tenant_run_budget_configs.browser_no_progress_threshold IS
  'Phase 6: Consecutive browser actions with no page-state change before halt (0 = disabled)';
COMMENT ON COLUMN tenant_run_budget_configs.max_delegation_depth IS
  'Phase 6: Maximum delegation chain depth before halt (0 = disabled)';
COMMENT ON COLUMN tenant_run_budget_configs.retry_allowed_tools IS
  'Phase 6: Tool names that get relaxed (2x) loop thresholds for legitimate retry patterns';
