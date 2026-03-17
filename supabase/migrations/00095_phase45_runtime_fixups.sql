-- Phase 4/5 fixups:
-- - move browser click/fill approval to browser-policy-managed approvals
-- - seed safer browser policy defaults for existing tenants
-- - reserve/release async delegation spend so concurrent children stay bounded

UPDATE public.tenant_tool_policies AS policy
SET approval_mode = 'none',
    metadata = COALESCE(policy.metadata, '{}'::jsonb)
      || jsonb_build_object('updated_by', 'migration_00095_phase45_runtime_fixups')
FROM public.tenant_tools AS tool
WHERE policy.tool_id = tool.id
  AND tool.tool_key IN ('browser_click', 'browser_fill')
  AND policy.approval_mode = 'always';

UPDATE public.tenant_browser_policies
SET require_approval_actions = ARRAY['click', 'fill']::text[],
    updated_at = NOW()
WHERE require_approval_actions IS NULL
   OR cardinality(require_approval_actions) = 0;

CREATE OR REPLACE FUNCTION public.reserve_async_delegation_budget(
  p_parent_run_id UUID,
  p_child_run_id UUID,
  p_max_total_cost_cents INTEGER,
  p_reserved_cost_cents INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent tenant_runtime_runs%ROWTYPE;
  v_child tenant_runtime_runs%ROWTYPE;
  v_child_reserved BIGINT;
  v_parent_accounted BIGINT;
  v_parent_reserved BIGINT;
  v_available BIGINT;
  v_requested BIGINT;
BEGIN
  SELECT *
  INTO v_child
  FROM tenant_runtime_runs
  WHERE id = p_child_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Child run not found: %', p_child_run_id;
  END IF;

  v_child_reserved := COALESCE((v_child.metadata->>'reserved_delegation_spend_cents')::BIGINT, 0);
  IF v_child_reserved > 0 THEN
    RETURN jsonb_build_object(
      'reserved_cents', v_child_reserved,
      'already_reserved', true
    );
  END IF;

  SELECT *
  INTO v_parent
  FROM tenant_runtime_runs
  WHERE id = p_parent_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent run not found: %', p_parent_run_id;
  END IF;

  v_parent_accounted := COALESCE((v_parent.metadata->>'async_delegation_spend_cents')::BIGINT, 0);
  v_parent_reserved := COALESCE((v_parent.metadata->>'async_delegation_reserved_spend_cents')::BIGINT, 0);
  v_available := GREATEST(0, COALESCE(p_max_total_cost_cents, 0) - v_parent_accounted - v_parent_reserved);
  v_requested := GREATEST(1, COALESCE(p_reserved_cost_cents, 0));

  IF v_available <= 0 THEN
    RAISE EXCEPTION 'Async delegation budget exhausted for parent run: %', p_parent_run_id;
  END IF;

  v_requested := LEAST(v_requested, v_available);

  UPDATE tenant_runtime_runs
  SET metadata = COALESCE(metadata, '{}'::jsonb)
    || jsonb_build_object(
      'async_delegation_reserved_spend_cents', v_parent_reserved + v_requested,
      'async_delegation_last_reserved_child_run_id', p_child_run_id,
      'async_delegation_last_reserved_at', NOW(),
      'metadata_patched_at', NOW()
    ),
    updated_at = NOW()
  WHERE id = p_parent_run_id;

  UPDATE tenant_runtime_runs
  SET metadata = COALESCE(metadata, '{}'::jsonb)
    || jsonb_build_object(
      'reserved_delegation_spend_cents', v_requested,
      'budget_reserved_to_parent_run_id', p_parent_run_id,
      'budget_reserved_at', NOW(),
      'metadata_patched_at', NOW()
    ),
    updated_at = NOW()
  WHERE id = p_child_run_id;

  RETURN jsonb_build_object(
    'reserved_cents', v_requested,
    'already_reserved', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_async_delegation_budget(UUID, UUID, INTEGER, INTEGER)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.release_async_delegation_budget_reservation(
  p_parent_run_id UUID,
  p_child_run_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent tenant_runtime_runs%ROWTYPE;
  v_child tenant_runtime_runs%ROWTYPE;
  v_child_reserved BIGINT;
  v_parent_reserved BIGINT;
BEGIN
  SELECT *
  INTO v_child
  FROM tenant_runtime_runs
  WHERE id = p_child_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Child run not found: %', p_child_run_id;
  END IF;

  IF COALESCE(v_child.metadata->>'budget_accounted_to_parent_run_id', '') = p_parent_run_id::TEXT THEN
    RETURN jsonb_build_object(
      'released', false,
      'released_cents', 0
    );
  END IF;

  v_child_reserved := COALESCE((v_child.metadata->>'reserved_delegation_spend_cents')::BIGINT, 0);
  IF v_child_reserved <= 0 THEN
    RETURN jsonb_build_object(
      'released', false,
      'released_cents', 0
    );
  END IF;

  SELECT *
  INTO v_parent
  FROM tenant_runtime_runs
  WHERE id = p_parent_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent run not found: %', p_parent_run_id;
  END IF;

  v_parent_reserved := COALESCE((v_parent.metadata->>'async_delegation_reserved_spend_cents')::BIGINT, 0);

  UPDATE tenant_runtime_runs
  SET metadata = COALESCE(metadata, '{}'::jsonb)
    || jsonb_build_object(
      'async_delegation_reserved_spend_cents', GREATEST(0, v_parent_reserved - v_child_reserved),
      'async_delegation_last_released_child_run_id', p_child_run_id,
      'async_delegation_last_released_at', NOW(),
      'metadata_patched_at', NOW()
    ),
    updated_at = NOW()
  WHERE id = p_parent_run_id;

  UPDATE tenant_runtime_runs
  SET metadata = COALESCE(metadata, '{}'::jsonb)
    || jsonb_build_object(
      'reserved_delegation_spend_cents', 0,
      'budget_reservation_released_at', NOW(),
      'metadata_patched_at', NOW()
    ),
    updated_at = NOW()
  WHERE id = p_child_run_id;

  RETURN jsonb_build_object(
    'released', true,
    'released_cents', v_child_reserved
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_async_delegation_budget_reservation(UUID, UUID)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.account_async_delegation_budget(
  p_parent_run_id UUID,
  p_child_run_id UUID,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER,
  p_estimated_cost_cents INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent tenant_runtime_runs%ROWTYPE;
  v_child tenant_runtime_runs%ROWTYPE;
  v_child_reserved BIGINT;
  v_parent_reserved BIGINT;
  v_next_input BIGINT;
  v_next_output BIGINT;
  v_next_spend BIGINT;
BEGIN
  SELECT *
  INTO v_child
  FROM tenant_runtime_runs
  WHERE id = p_child_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Child run not found: %', p_child_run_id;
  END IF;

  IF COALESCE(v_child.metadata->>'budget_accounted_to_parent_run_id', '') = p_parent_run_id::TEXT THEN
    RETURN jsonb_build_object(
      'accounted', false,
      'already_accounted', true,
      'parent_run_id', p_parent_run_id,
      'child_run_id', p_child_run_id
    );
  END IF;

  SELECT *
  INTO v_parent
  FROM tenant_runtime_runs
  WHERE id = p_parent_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent run not found: %', p_parent_run_id;
  END IF;

  v_child_reserved := COALESCE((v_child.metadata->>'reserved_delegation_spend_cents')::BIGINT, 0);
  v_parent_reserved := COALESCE((v_parent.metadata->>'async_delegation_reserved_spend_cents')::BIGINT, 0);
  v_next_input :=
    COALESCE((v_parent.metadata->>'async_delegation_input_tokens')::BIGINT, 0)
    + COALESCE(p_input_tokens, 0);
  v_next_output :=
    COALESCE((v_parent.metadata->>'async_delegation_output_tokens')::BIGINT, 0)
    + COALESCE(p_output_tokens, 0);
  v_next_spend :=
    COALESCE((v_parent.metadata->>'async_delegation_spend_cents')::BIGINT, 0)
    + COALESCE(p_estimated_cost_cents, 0);

  UPDATE tenant_runtime_runs
  SET metadata = COALESCE(metadata, '{}'::jsonb)
    || jsonb_build_object(
      'async_delegation_input_tokens', v_next_input,
      'async_delegation_output_tokens', v_next_output,
      'async_delegation_spend_cents', v_next_spend,
      'async_delegation_reserved_spend_cents', GREATEST(0, v_parent_reserved - v_child_reserved),
      'async_delegation_accounted_children', COALESCE((metadata->>'async_delegation_accounted_children')::BIGINT, 0) + 1,
      'async_delegation_last_accounted_child_run_id', p_child_run_id,
      'async_delegation_last_accounted_at', NOW(),
      'metadata_patched_at', NOW()
    ),
    updated_at = NOW()
  WHERE id = p_parent_run_id;

  UPDATE tenant_runtime_runs
  SET metadata = COALESCE(metadata, '{}'::jsonb)
    || jsonb_build_object(
      'budget_accounted_to_parent_run_id', p_parent_run_id,
      'budget_accounted_at', NOW(),
      'budget_accounted_input_tokens', COALESCE(p_input_tokens, 0),
      'budget_accounted_output_tokens', COALESCE(p_output_tokens, 0),
      'budget_accounted_cost_cents', COALESCE(p_estimated_cost_cents, 0),
      'reserved_delegation_spend_cents', 0,
      'metadata_patched_at', NOW()
    ),
    updated_at = NOW()
  WHERE id = p_child_run_id;

  RETURN jsonb_build_object(
    'accounted', true,
    'already_accounted', false,
    'parent_run_id', p_parent_run_id,
    'child_run_id', p_child_run_id,
    'async_delegation_input_tokens', v_next_input,
    'async_delegation_output_tokens', v_next_output,
    'async_delegation_spend_cents', v_next_spend
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.account_async_delegation_budget(UUID, UUID, INTEGER, INTEGER, INTEGER)
  TO authenticated, service_role;
