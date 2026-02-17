-- Workflow builder core schema (Phase 1A)

CREATE TABLE workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  draft_graph JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb
    CHECK (jsonb_typeof(draft_graph) = 'object'),
  draft_version INTEGER NOT NULL DEFAULT 1 CHECK (draft_version > 0),
  published_version INTEGER CHECK (published_version IS NULL OR published_version > 0),
  is_valid BOOLEAN NOT NULL DEFAULT false,
  last_validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(last_validation_errors) = 'array'),
  last_validated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instance_id, name)
);

CREATE INDEX idx_workflow_definitions_instance_status
  ON workflow_definitions(instance_id, status);
CREATE INDEX idx_workflow_definitions_customer
  ON workflow_definitions(customer_id);

CREATE TABLE workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  source TEXT NOT NULL DEFAULT 'snapshot'
    CHECK (source IN ('snapshot', 'publish')),
  graph JSONB NOT NULL CHECK (jsonb_typeof(graph) = 'object'),
  compiled_ir JSONB,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(validation_errors) = 'array'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, version)
);

CREATE INDEX idx_workflow_versions_workflow_version
  ON workflow_versions(workflow_id, version DESC);
CREATE INDEX idx_workflow_versions_instance_created
  ON workflow_versions(instance_id, created_at DESC);

-- Immutable snapshots: versions can be inserted, but never updated/deleted.
CREATE OR REPLACE FUNCTION prevent_workflow_version_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'workflow_versions rows are immutable';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_versions_no_update
  BEFORE UPDATE ON workflow_versions
  FOR EACH ROW EXECUTE FUNCTION prevent_workflow_version_mutation();

CREATE TRIGGER workflow_versions_no_delete
  BEFORE DELETE ON workflow_versions
  FOR EACH ROW EXECUTE FUNCTION prevent_workflow_version_mutation();

ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflows"
  ON workflow_definitions FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own workflows"
  ON workflow_definitions FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own workflows"
  ON workflow_definitions FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own workflows"
  ON workflow_definitions FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflow versions"
  ON workflow_versions FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own workflow versions"
  ON workflow_versions FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE TRIGGER workflow_definitions_updated_at BEFORE UPDATE ON workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
