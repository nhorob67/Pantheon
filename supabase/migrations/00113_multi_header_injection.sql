-- Multi-header credential injection
--
-- Services like Discourse require multiple headers sent together
-- (e.g., Api-Key + Api-Username). The new "multi_header" inject_scheme
-- stores a JSON object as the encrypted value, and at runtime each
-- key/value pair is injected as a separate HTTP header.

ALTER TABLE tenant_secrets
  DROP CONSTRAINT IF EXISTS tenant_secrets_inject_scheme_check;

ALTER TABLE tenant_secrets
  ADD CONSTRAINT tenant_secrets_inject_scheme_check
    CHECK (inject_scheme IN ('bearer', 'basic', 'header', 'query_param', 'multi_header'));
