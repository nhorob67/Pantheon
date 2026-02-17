-- Extension trust policy controls (customer-level)
-- Allows dashboard users to define which extension source types are installable.

CREATE TABLE extension_customer_trust_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  allowed_source_types TEXT[] NOT NULL DEFAULT ARRAY[
    'local',
    'npm',
    'git',
    'clawhub',
    'internal'
  ]::text[],
  require_verified_source_types TEXT[] NOT NULL DEFAULT ARRAY[
    'npm',
    'git',
    'clawhub'
  ]::text[],
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT extension_customer_trust_policies_customer_unique UNIQUE (customer_id),
  CONSTRAINT extension_customer_trust_policies_allowed_non_empty
    CHECK (cardinality(allowed_source_types) > 0),
  CONSTRAINT extension_customer_trust_policies_allowed_valid
    CHECK (
      allowed_source_types <@ ARRAY[
        'local',
        'npm',
        'git',
        'clawhub',
        'internal'
      ]::text[]
    ),
  CONSTRAINT extension_customer_trust_policies_verified_valid
    CHECK (
      require_verified_source_types <@ ARRAY[
        'local',
        'npm',
        'git',
        'clawhub',
        'internal'
      ]::text[]
    ),
  CONSTRAINT extension_customer_trust_policies_verified_subset
    CHECK (require_verified_source_types <@ allowed_source_types)
);

CREATE INDEX idx_extension_customer_trust_policies_customer
  ON extension_customer_trust_policies(customer_id);

ALTER TABLE extension_customer_trust_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own extension trust policy"
  ON extension_customer_trust_policies FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own extension trust policy"
  ON extension_customer_trust_policies FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own extension trust policy"
  ON extension_customer_trust_policies FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE TRIGGER extension_customer_trust_policies_updated_at
  BEFORE UPDATE ON extension_customer_trust_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
