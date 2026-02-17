-- Harden email webhook observability primitives.
-- 1) Enable RLS on counters table.
-- 2) Restrict table access to service_role.
-- 3) Restrict SECURITY DEFINER function execution to service_role.

ALTER TABLE email_webhook_counters ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE email_webhook_counters FROM PUBLIC;
REVOKE ALL ON TABLE email_webhook_counters FROM anon;
REVOKE ALL ON TABLE email_webhook_counters FROM authenticated;
GRANT ALL ON TABLE email_webhook_counters TO service_role;

REVOKE ALL ON FUNCTION increment_email_webhook_counter(TEXT, TEXT, TEXT, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_email_webhook_counter(TEXT, TEXT, TEXT, DATE) FROM anon;
REVOKE ALL ON FUNCTION increment_email_webhook_counter(TEXT, TEXT, TEXT, DATE) FROM authenticated;
GRANT EXECUTE ON FUNCTION increment_email_webhook_counter(TEXT, TEXT, TEXT, DATE) TO service_role;
