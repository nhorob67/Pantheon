-- Disable RLS on pending_signups.
-- This table is only accessed server-side via admin client.
-- Contains temporary data (30-min expiry) and is not exposed to any client-side code.
-- The service_role bypass is not working as expected, so disable RLS entirely.

DROP POLICY IF EXISTS "Service role full access" ON pending_signups;
ALTER TABLE pending_signups DISABLE ROW LEVEL SECURITY;
