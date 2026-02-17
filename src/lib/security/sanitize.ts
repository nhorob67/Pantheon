const SENSITIVE_INSTANCE_FIELDS = [
  "channel_config",
  "server_ip",
  "hetzner_server_id",
  "hetzner_action_id",
  "hetzner_location",
  "coolify_uuid",
  "coolify_server_uuid",
  "luks_passphrase_encrypted",
  "boot_token",
  "boot_token_expires_at",
  "api_key_hash",
] as const;

/**
 * Strips infrastructure secrets and PII from an instance record
 * before returning it to the client.
 */
export function sanitizeInstanceForClient<T extends Record<string, unknown>>(
  instance: T
): Omit<T, (typeof SENSITIVE_INSTANCE_FIELDS)[number]> {
  const sanitized = { ...instance };
  for (const field of SENSITIVE_INSTANCE_FIELDS) {
    delete sanitized[field];
  }
  return sanitized as Omit<T, (typeof SENSITIVE_INSTANCE_FIELDS)[number]>;
}
