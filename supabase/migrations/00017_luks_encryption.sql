-- LUKS encryption support: passphrase storage + one-time boot token
-- Enables encrypted Docker storage on Hetzner VPSes

ALTER TABLE instances
  ADD COLUMN luks_passphrase_encrypted TEXT,
  ADD COLUMN boot_token TEXT UNIQUE,
  ADD COLUMN boot_token_expires_at TIMESTAMPTZ;

CREATE INDEX idx_instances_boot_token ON instances (boot_token)
  WHERE boot_token IS NOT NULL;

-- Atomically consume a boot token: returns the encrypted passphrase and
-- nulls the token so it cannot be reused.
CREATE OR REPLACE FUNCTION consume_boot_token(p_token TEXT)
RETURNS TABLE(luks_passphrase_encrypted TEXT) AS $$
BEGIN
  RETURN QUERY
  UPDATE instances
  SET boot_token = NULL,
      boot_token_expires_at = NULL
  WHERE instances.boot_token = p_token
    AND instances.boot_token_expires_at > NOW()
  RETURNING instances.luks_passphrase_encrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only service_role may call this function
REVOKE ALL ON FUNCTION consume_boot_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_boot_token(TEXT) TO service_role;
