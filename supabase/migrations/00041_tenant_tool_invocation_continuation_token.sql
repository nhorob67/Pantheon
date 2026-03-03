ALTER TABLE tenant_tool_invocations
  ADD COLUMN IF NOT EXISTS continuation_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_tool_invocations_continuation_token_unique
  ON tenant_tool_invocations(continuation_token)
  WHERE continuation_token IS NOT NULL;
