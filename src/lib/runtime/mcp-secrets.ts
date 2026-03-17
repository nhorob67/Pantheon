/**
 * Encryption/decryption for MCP server secrets (env_vars and headers).
 *
 * Reuses the AES-256-GCM implementation from `src/lib/crypto.ts`.
 * Encrypts individual values in env_vars/headers objects.
 * Gracefully handles plaintext values for migration safety.
 */
import { encrypt, decrypt } from "../crypto.ts";

const ENCRYPTED_PREFIX = "v1:";

/**
 * Check if a value is already encrypted (has the `v1:` prefix with
 * the expected colon-separated structure).
 */
export function isEncrypted(value: string): boolean {
  if (!value.startsWith(ENCRYPTED_PREFIX)) return false;
  // v1:iv:ciphertext:tag — must have exactly 4 colon-separated parts
  return value.split(":").length === 4;
}

/**
 * Encrypt each value in a key-value record.
 * Already-encrypted values are returned as-is.
 */
export function encryptMcpSecrets(
  vars: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars)) {
    result[key] = isEncrypted(value) ? value : encrypt(value);
  }
  return result;
}

/**
 * Decrypt each value in a key-value record.
 * Plaintext values are returned as-is (graceful fallback for migration safety).
 */
export function decryptMcpSecrets(
  vars: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars)) {
    if (isEncrypted(value)) {
      try {
        result[key] = decrypt(value);
      } catch {
        // Graceful fallback: return raw value if decryption fails
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}
