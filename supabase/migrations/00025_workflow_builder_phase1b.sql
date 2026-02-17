-- Workflow builder Phase 1B:
-- Atomic create/update operations with immutable snapshot writes.

CREATE OR REPLACE FUNCTION create_workflow_definition_with_snapshot(
  p_instance_id UUID,
  p_customer_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_graph JSONB DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  p_created_by UUID DEFAULT NULL,
  p_is_valid BOOLEAN DEFAULT false,
  p_validation_errors JSONB DEFAULT '[]'::jsonb
)
RETURNS workflow_definitions AS $$
DECLARE
  v_workflow workflow_definitions%ROWTYPE;
BEGIN
  INSERT INTO workflow_definitions (
    instance_id,
    customer_id,
    name,
    description,
    draft_graph,
    draft_version,
    is_valid,
    last_validation_errors,
    last_validated_at,
    created_by,
    updated_by
  )
  VALUES (
    p_instance_id,
    p_customer_id,
    p_name,
    p_description,
    p_graph,
    1,
    p_is_valid,
    p_validation_errors,
    CASE WHEN p_is_valid OR jsonb_array_length(p_validation_errors) > 0 THEN now() ELSE NULL END,
    p_created_by,
    p_created_by
  )
  RETURNING * INTO v_workflow;

  INSERT INTO workflow_versions (
    workflow_id,
    instance_id,
    customer_id,
    version,
    source,
    graph,
    validation_errors,
    created_by
  )
  VALUES (
    v_workflow.id,
    v_workflow.instance_id,
    v_workflow.customer_id,
    v_workflow.draft_version,
    'snapshot',
    v_workflow.draft_graph,
    v_workflow.last_validation_errors,
    p_created_by
  );

  RETURN v_workflow;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_workflow_definition_draft_with_snapshot(
  p_workflow_id UUID,
  p_instance_id UUID,
  p_customer_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_graph JSONB,
  p_expected_draft_version INTEGER,
  p_updated_by UUID DEFAULT NULL,
  p_is_valid BOOLEAN DEFAULT false,
  p_validation_errors JSONB DEFAULT '[]'::jsonb
)
RETURNS workflow_definitions AS $$
DECLARE
  v_existing workflow_definitions%ROWTYPE;
  v_updated workflow_definitions%ROWTYPE;
  v_next_draft_version INTEGER;
BEGIN
  SELECT *
  INTO v_existing
  FROM workflow_definitions
  WHERE id = p_workflow_id
    AND instance_id = p_instance_id
    AND customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WORKFLOW_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_existing.draft_version <> p_expected_draft_version THEN
    RAISE EXCEPTION 'WORKFLOW_VERSION_CONFLICT'
      USING ERRCODE = '40001';
  END IF;

  v_next_draft_version := v_existing.draft_version + 1;

  UPDATE workflow_definitions
  SET
    name = p_name,
    description = p_description,
    draft_graph = p_graph,
    draft_version = v_next_draft_version,
    is_valid = p_is_valid,
    last_validation_errors = p_validation_errors,
    last_validated_at = CASE WHEN p_is_valid OR jsonb_array_length(p_validation_errors) > 0 THEN now() ELSE NULL END,
    updated_by = p_updated_by
  WHERE id = p_workflow_id
  RETURNING * INTO v_updated;

  INSERT INTO workflow_versions (
    workflow_id,
    instance_id,
    customer_id,
    version,
    source,
    graph,
    validation_errors,
    created_by
  )
  VALUES (
    v_updated.id,
    v_updated.instance_id,
    v_updated.customer_id,
    v_updated.draft_version,
    'snapshot',
    v_updated.draft_graph,
    v_updated.last_validation_errors,
    p_updated_by
  );

  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;
