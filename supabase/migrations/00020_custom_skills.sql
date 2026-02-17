-- Custom skill authoring: customers can create their own SKILL.md-based skills

CREATE TABLE custom_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  slug TEXT NOT NULL
    CHECK (slug ~ '^custom-[a-z0-9][a-z0-9-]{0,58}$'),
  display_name TEXT NOT NULL
    CHECK (char_length(display_name) BETWEEN 1 AND 100),
  description TEXT
    CHECK (description IS NULL OR char_length(description) <= 500),
  icon TEXT NOT NULL DEFAULT 'Puzzle',
  skill_md TEXT NOT NULL
    CHECK (char_length(skill_md) BETWEEN 10 AND 50000),
  "references" JSONB NOT NULL DEFAULT '{}',
  config_schema JSONB NOT NULL DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  template_id TEXT,
  generation_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, slug)
);

CREATE INDEX idx_custom_skills_customer_status
  ON custom_skills (customer_id, status);

CREATE TABLE custom_skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES custom_skills(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  skill_md TEXT NOT NULL,
  "references" JSONB,
  config JSONB,
  change_summary TEXT
    CHECK (change_summary IS NULL OR char_length(change_summary) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(skill_id, version)
);

CREATE INDEX idx_custom_skill_versions_skill
  ON custom_skill_versions (skill_id, version DESC);

-- Row Level Security
ALTER TABLE custom_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom skills"
  ON custom_skills FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own custom skills"
  ON custom_skills FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own custom skills"
  ON custom_skills FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own custom skills"
  ON custom_skills FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

ALTER TABLE custom_skill_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skill versions"
  ON custom_skill_versions FOR SELECT
  USING (skill_id IN (
    SELECT id FROM custom_skills
    WHERE customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can insert own skill versions"
  ON custom_skill_versions FOR INSERT
  WITH CHECK (skill_id IN (
    SELECT id FROM custom_skills
    WHERE customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  ));

-- Updated_at trigger (reuses function from 00001)
CREATE TRIGGER custom_skills_updated_at BEFORE UPDATE ON custom_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
