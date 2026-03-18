-- Runtime helpers for additive api_usage accounting and atomic async delegation rollups

CREATE OR REPLACE FUNCTION public.upsert_api_usage(
  p_customer_id UUID,
  p_date DATE,
  p_model TEXT,
  p_input_tokens BIGINT,
  p_output_tokens BIGINT,
  p_estimated_cost_cents INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.api_usage (
    customer_id,
    date,
    model,
    input_tokens,
    output_tokens,
    estimated_cost_cents
  )
  VALUES (
    p_customer_id,
    p_date,
    p_model,
    COALESCE(p_input_tokens, 0),
    COALESCE(p_output_tokens, 0),
    COALESCE(p_estimated_cost_cents, 0)
  )
  ON CONFLICT (customer_id, date, model)
  DO UPDATE SET
    input_tokens = api_usage.input_tokens + COALESCE(EXCLUDED.input_tokens, 0),
    output_tokens = api_usage.output_tokens + COALESCE(EXCLUDED.output_tokens, 0),
    estimated_cost_cents = api_usage.estimated_cost_cents + COALESCE(EXCLUDED.estimated_cost_cents, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_api_usage(UUID, DATE, TEXT, BIGINT, BIGINT, INTEGER)
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
