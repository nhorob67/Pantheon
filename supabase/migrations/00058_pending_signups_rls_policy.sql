-- Allow service_role full access to pending_signups.
-- This table is only accessed via the admin client (service_role).
-- Belt-and-suspenders: service_role should bypass RLS by default,
-- but adding an explicit policy ensures it works regardless.

CREATE POLICY "Service role full access"
  ON pending_signups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
