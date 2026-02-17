-- Workflow V3 scope:
-- 1) environment promotion flow (dev/stage/prod)
-- 2) marketplace-grade reusable playbooks

CREATE TABLE workflow_environment_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  environment TEXT NOT NULL CHECK (environment IN ('dev', 'stage', 'prod')),
  version INTEGER NOT NULL CHECK (version > 0),
  source_environment TEXT CHECK (
    source_environment IS NULL
    OR source_environment IN ('dev', 'stage', 'prod')
  ),
  promotion_note TEXT CHECK (
    promotion_note IS NULL OR char_length(promotion_note) <= 500
  ),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  promoted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, environment)
);

CREATE INDEX idx_workflow_environment_versions_instance_workflow
  ON workflow_environment_versions(instance_id, workflow_id);
CREATE INDEX idx_workflow_environment_versions_customer
  ON workflow_environment_versions(customer_id);
CREATE INDEX idx_workflow_environment_versions_environment
  ON workflow_environment_versions(environment);

CREATE TABLE workflow_environment_promotion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  from_environment TEXT CHECK (
    from_environment IS NULL
    OR from_environment IN ('dev', 'stage', 'prod')
  ),
  to_environment TEXT NOT NULL CHECK (to_environment IN ('dev', 'stage', 'prod')),
  version INTEGER NOT NULL CHECK (version > 0),
  promotion_note TEXT CHECK (
    promotion_note IS NULL OR char_length(promotion_note) <= 500
  ),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  promoted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_environment_promotion_events_workflow
  ON workflow_environment_promotion_events(workflow_id, created_at DESC);
CREATE INDEX idx_workflow_environment_promotion_events_instance
  ON workflow_environment_promotion_events(instance_id, created_at DESC);
CREATE INDEX idx_workflow_environment_promotion_events_customer
  ON workflow_environment_promotion_events(customer_id, created_at DESC);

CREATE TABLE workflow_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL CHECK (
    char_length(slug) BETWEEN 3 AND 120
    AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description TEXT CHECK (
    description IS NULL OR char_length(description) <= 1000
  ),
  summary TEXT CHECK (
    summary IS NULL OR char_length(summary) <= 280
  ),
  category TEXT CHECK (
    category IS NULL OR char_length(category) <= 80
  ),
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::text[] CHECK (cardinality(tags) <= 20),
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('public', 'private', 'unlisted')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  source_workflow_id UUID REFERENCES workflow_definitions(id) ON DELETE SET NULL,
  source_instance_id UUID REFERENCES instances(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  latest_version INTEGER NOT NULL DEFAULT 1 CHECK (latest_version > 0),
  latest_graph JSONB NOT NULL CHECK (jsonb_typeof(latest_graph) = 'object'),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  install_count INTEGER NOT NULL DEFAULT 0 CHECK (install_count >= 0),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_workflow_playbooks_slug_unique
  ON workflow_playbooks(lower(slug));
CREATE INDEX idx_workflow_playbooks_status_visibility
  ON workflow_playbooks(status, visibility, published_at DESC);
CREATE INDEX idx_workflow_playbooks_category
  ON workflow_playbooks(category);
CREATE INDEX idx_workflow_playbooks_customer
  ON workflow_playbooks(customer_id);
CREATE INDEX idx_workflow_playbooks_tags_gin
  ON workflow_playbooks
  USING GIN(tags);

CREATE TABLE workflow_playbook_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES workflow_playbooks(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  graph JSONB NOT NULL CHECK (jsonb_typeof(graph) = 'object'),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(playbook_id, version)
);

CREATE INDEX idx_workflow_playbook_versions_playbook
  ON workflow_playbook_versions(playbook_id, version DESC);

CREATE TABLE workflow_playbook_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES workflow_playbooks(id) ON DELETE CASCADE,
  playbook_version INTEGER NOT NULL CHECK (playbook_version > 0),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  installed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_playbook_installs_playbook
  ON workflow_playbook_installs(playbook_id, installed_at DESC);
CREATE INDEX idx_workflow_playbook_installs_instance
  ON workflow_playbook_installs(instance_id, installed_at DESC);
CREATE INDEX idx_workflow_playbook_installs_customer
  ON workflow_playbook_installs(customer_id, installed_at DESC);

-- Immutable snapshots for playbook versions.
CREATE OR REPLACE FUNCTION prevent_workflow_playbook_version_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'workflow_playbook_versions rows are immutable';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_playbook_versions_no_update
  BEFORE UPDATE ON workflow_playbook_versions
  FOR EACH ROW EXECUTE FUNCTION prevent_workflow_playbook_version_mutation();

CREATE TRIGGER workflow_playbook_versions_no_delete
  BEFORE DELETE ON workflow_playbook_versions
  FOR EACH ROW EXECUTE FUNCTION prevent_workflow_playbook_version_mutation();

CREATE TRIGGER workflow_environment_versions_updated_at
  BEFORE UPDATE ON workflow_environment_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER workflow_playbooks_updated_at
  BEFORE UPDATE ON workflow_playbooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE workflow_environment_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_environment_promotion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_playbook_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_playbook_installs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflow environment versions"
  ON workflow_environment_versions FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own workflow environment versions"
  ON workflow_environment_versions FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own workflow environment versions"
  ON workflow_environment_versions FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own workflow environment versions"
  ON workflow_environment_versions FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own workflow promotion events"
  ON workflow_environment_promotion_events FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own workflow promotion events"
  ON workflow_environment_promotion_events FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view workflow playbooks"
  ON workflow_playbooks FOR SELECT
  USING (
    (status = 'published' AND visibility = 'public')
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own workflow playbooks"
  ON workflow_playbooks FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own workflow playbooks"
  ON workflow_playbooks FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own workflow playbooks"
  ON workflow_playbooks FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view workflow playbook versions"
  ON workflow_playbook_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM workflow_playbooks
      WHERE workflow_playbooks.id = workflow_playbook_versions.playbook_id
        AND (
          (workflow_playbooks.status = 'published' AND workflow_playbooks.visibility = 'public')
          OR workflow_playbooks.customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Users can insert own workflow playbook versions"
  ON workflow_playbook_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM workflow_playbooks
      WHERE workflow_playbooks.id = workflow_playbook_versions.playbook_id
        AND workflow_playbooks.customer_id IN (
          SELECT id FROM customers WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can view own workflow playbook installs"
  ON workflow_playbook_installs FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own workflow playbook installs"
  ON workflow_playbook_installs FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
