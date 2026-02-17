/**
 * AES-256-GCM encryption/decryption for sensitive data (Discord tokens, etc.).
 *
 * Key rotation plan:
 * 1. Add a version prefix to encrypted values (e.g., "v1:iv:ciphertext:tag")
 * 2. Support ENCRYPTION_KEY and ENCRYPTION_KEY_PREVIOUS env vars
 * 3. decrypt() tries current key first, falls back to previous key
 * 4. A migration script re-encrypts all values with the new key
 * 5. After migration completes, remove ENCRYPTION_KEY_PREVIOUS
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_BYTES = 32;
const VERSION_PREFIX = "v1";

function decodeBase64Key(raw: string, envName: string): Buffer {
  const key = Buffer.from(raw, "base64");
  if (key.byteLength !== KEY_BYTES) {
    throw new Error(`${envName} must decode to ${KEY_BYTES} bytes`);
  }
  return key;
}

function getCurrentKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY env var is not set");
  return decodeBase64Key(key, "ENCRYPTION_KEY");
}

function getPreviousKey(): Buffer | null {
  const key = process.env.ENCRYPTION_KEY_PREVIOUS;
  if (!key) return null;
  return decodeBase64Key(key, "ENCRYPTION_KEY_PREVIOUS");
}

function decryptWithKey(
  key: Buffer,
  ivHex: string,
  ciphertextHex: string,
  tagHex: string
): string {
  const iv = Buffer.from(ivHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

function parseEncodedPayload(
  encoded: string
): { ivHex: string; ciphertextHex: string; tagHex: string } {
  const parts = encoded.split(":");

  // Current format: v1:iv:ciphertext:tag
  if (parts.length === 4 && parts[0] === VERSION_PREFIX) {
    return {
      ivHex: parts[1],
      ciphertextHex: parts[2],
      tagHex: parts[3],
    };
  }

  // Backward-compatible legacy format: iv:ciphertext:tag
  if (parts.length === 3) {
    return {
      ivHex: parts[0],
      ciphertextHex: parts[1],
      tagHex: parts[2],
    };
  }

  throw new Error("Invalid encrypted payload format");
}

/** Encrypt a string. Returns `v1:iv:ciphertext:tag` in hex. */
export function encrypt(plaintext: string): string {
  const key = getCurrentKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    VERSION_PREFIX,
    iv.toString("hex"),
    encrypted.toString("hex"),
    tag.toString("hex"),
  ].join(":");
}

/** Decrypt a value produced by `encrypt()`. */
export function decrypt(encoded: string): string {
  const { ivHex, ciphertextHex, tagHex } = parseEncodedPayload(encoded);
  const keys = [getCurrentKey(), getPreviousKey()].filter(
    (value): value is Buffer => !!value
  );

  let lastError: unknown = null;
  for (const key of keys) {
    try {
      return decryptWithKey(key, ivHex, ciphertextHex, tagHex);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    lastError instanceof Error
      ? lastError.message
      : "Failed to decrypt encrypted payload"
  );
}
