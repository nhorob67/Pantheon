BEGIN;

ALTER TABLE tenant_heartbeat_runs
  ADD COLUMN IF NOT EXISTS decision_trace JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS freshness_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS dispatch_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE tenant_heartbeat_runs
  DROP CONSTRAINT IF EXISTS tenant_heartbeat_runs_decision_trace_object_check,
  DROP CONSTRAINT IF EXISTS tenant_heartbeat_runs_freshness_metadata_object_check,
  DROP CONSTRAINT IF EXISTS tenant_heartbeat_runs_dispatch_metadata_object_check;

ALTER TABLE tenant_heartbeat_runs
  ADD CONSTRAINT tenant_heartbeat_runs_decision_trace_object_check
    CHECK (jsonb_typeof(decision_trace) = 'object'),
  ADD CONSTRAINT tenant_heartbeat_runs_freshness_metadata_object_check
    CHECK (jsonb_typeof(freshness_metadata) = 'object'),
  ADD CONSTRAINT tenant_heartbeat_runs_dispatch_metadata_object_check
    CHECK (jsonb_typeof(dispatch_metadata) = 'object');

UPDATE tenant_heartbeat_runs
SET
  decision_trace = CASE
    WHEN decision_trace = '{}'::jsonb THEN jsonb_build_object(
      'request_trace_id', NULL,
      'preview_only', trigger_mode = 'manual_preview',
      'had_signal', had_signal,
      'check_results', '[]'::jsonb,
      'signal_types', COALESCE(to_jsonb(signal_fingerprints), '[]'::jsonb),
      'signal_fingerprints', COALESCE(to_jsonb(signal_fingerprints), '[]'::jsonb),
      'issue_counts', jsonb_build_object(
        'active', 0,
        'new', 0,
        'updated', 0,
        'resolved', 0,
        'notification_candidates', 0
      ),
      'lifecycle_suppressed_reasons', '[]'::jsonb,
      'busy_runtime_reason', NULL,
      'selected_signal_types', '[]'::jsonb,
      'selected_attention_types', '[]'::jsonb,
      'delivery_attempted', delivery_attempted,
      'delivery_status', delivery_status,
      'final_state', delivery_status,
      'final_reason', suppressed_reason
    )
    ELSE decision_trace
  END,
  freshness_metadata = COALESCE(freshness_metadata, '{}'::jsonb),
  dispatch_metadata = CASE
    WHEN dispatch_metadata = '{}'::jsonb THEN jsonb_build_object(
      'request_trace_id', NULL,
      'test_mode', trigger_mode = 'manual_test'
    )
    ELSE dispatch_metadata
  END;

COMMIT;
