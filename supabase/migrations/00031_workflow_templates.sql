-- Workflow templates foundation (Phase 6A)

CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  template_kind TEXT NOT NULL DEFAULT 'custom'
    CHECK (template_kind IN ('starter', 'custom')),
  latest_version INTEGER NOT NULL DEFAULT 1 CHECK (latest_version > 0),
  latest_graph JSONB NOT NULL CHECK (jsonb_typeof(latest_graph) = 'object'),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instance_id, name)
);

CREATE INDEX idx_workflow_templates_instance_updated
  ON workflow_templates(instance_id, updated_at DESC);
CREATE INDEX idx_workflow_templates_customer_updated
  ON workflow_templates(customer_id, updated_at DESC);
CREATE INDEX idx_workflow_templates_kind
  ON workflow_templates(template_kind);

CREATE TABLE workflow_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  graph JSONB NOT NULL CHECK (jsonb_typeof(graph) = 'object'),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, version)
);

CREATE INDEX idx_workflow_template_versions_template_version
  ON workflow_template_versions(template_id, version DESC);
CREATE INDEX idx_workflow_template_versions_instance_created
  ON workflow_template_versions(instance_id, created_at DESC);

-- Immutable snapshots: template versions can be inserted, but never updated/deleted.
CREATE OR REPLACE FUNCTION prevent_workflow_template_version_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'workflow_template_versions rows are immutable';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_template_versions_no_update
  BEFORE UPDATE ON workflow_template_versions
  FOR EACH ROW EXECUTE FUNCTION prevent_workflow_template_version_mutation();

CREATE TRIGGER workflow_template_versions_no_delete
  BEFORE DELETE ON workflow_template_versions
  FOR EACH ROW EXECUTE FUNCTION prevent_workflow_template_version_mutation();

CREATE OR REPLACE FUNCTION create_workflow_template_with_version(
  p_instance_id UUID,
  p_customer_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_graph JSONB DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  p_created_by UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS workflow_templates AS $$
DECLARE
  v_template workflow_templates%ROWTYPE;
  v_metadata JSONB := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  IF jsonb_typeof(v_metadata) <> 'object' THEN
    RAISE EXCEPTION 'WORKFLOW_TEMPLATE_METADATA_INVALID'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO workflow_templates (
    instance_id,
    customer_id,
    name,
    description,
    template_kind,
    latest_version,
    latest_graph,
    metadata,
    created_by,
    updated_by
  )
  VALUES (
    p_instance_id,
    p_customer_id,
    p_name,
    p_description,
    'custom',
    1,
    p_graph,
    v_metadata,
    p_created_by,
    p_created_by
  )
  RETURNING * INTO v_template;

  INSERT INTO workflow_template_versions (
    template_id,
    instance_id,
    customer_id,
    version,
    graph,
    metadata,
    created_by
  )
  VALUES (
    v_template.id,
    v_template.instance_id,
    v_template.customer_id,
    v_template.latest_version,
    v_template.latest_graph,
    v_template.metadata,
    p_created_by
  );

  RETURN v_template;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflow templates"
  ON workflow_templates FOR SELECT
  USING (
    customer_id IN (
      SELECT id
      FROM customers
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own workflow templates"
  ON workflow_templates FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id
      FROM customers
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own workflow templates"
  ON workflow_templates FOR UPDATE
  USING (
    customer_id IN (
      SELECT id
      FROM customers
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own workflow templates"
  ON workflow_templates FOR DELETE
  USING (
    customer_id IN (
      SELECT id
      FROM customers
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can view own workflow template versions"
  ON workflow_template_versions FOR SELECT
  USING (
    customer_id IN (
      SELECT id
      FROM customers
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own workflow template versions"
  ON workflow_template_versions FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id
      FROM customers
      WHERE user_id = (select auth.uid())
    )
  );

CREATE TRIGGER workflow_templates_updated_at
  BEFORE UPDATE ON workflow_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
