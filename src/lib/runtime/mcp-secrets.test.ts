import { describe, it } from "node:test";
import assert from "node:assert/strict";

// We need ENCRYPTION_KEY set for tests. Generate a deterministic 32-byte key.
import { randomBytes } from "node:crypto";
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
}

import { encryptMcpSecrets, decryptMcpSecrets, isEncrypted } from "./mcp-secrets.ts";

describe("mcp-secrets", () => {
  describe("isEncrypted", () => {
    it("returns false for plaintext values", () => {
      assert.equal(isEncrypted("my-api-key"), false);
      assert.equal(isEncrypted("Bearer token123"), false);
      assert.equal(isEncrypted(""), false);
    });

    it("returns true for encrypted values", () => {
      // v1:iv:ciphertext:tag
      assert.equal(isEncrypted("v1:aabbccdd:eeff0011:22334455"), true);
    });

    it("returns false for partial v1: prefix", () => {
      assert.equal(isEncrypted("v1:"), false);
      assert.equal(isEncrypted("v1:abc"), false);
      assert.equal(isEncrypted("v1:abc:def"), false);
    });
  });

  describe("round-trip encrypt/decrypt", () => {
    it("encrypts and decrypts a single value", () => {
      const original = { API_KEY: "sk-12345", DB_PASS: "hunter2" };
      const encrypted = encryptMcpSecrets(original);

      // All values should be encrypted
      for (const value of Object.values(encrypted)) {
        assert.equal(isEncrypted(value), true);
      }

      // Keys are preserved
      assert.deepEqual(Object.keys(encrypted), Object.keys(original));

      // Round-trip
      const decrypted = decryptMcpSecrets(encrypted);
      assert.deepEqual(decrypted, original);
    });

    it("handles empty record", () => {
      assert.deepEqual(encryptMcpSecrets({}), {});
      assert.deepEqual(decryptMcpSecrets({}), {});
    });
  });

  describe("graceful plaintext passthrough", () => {
    it("decrypts plaintext values without error", () => {
      const plaintext = { API_KEY: "sk-12345", TOKEN: "abc" };
      const result = decryptMcpSecrets(plaintext);
      assert.deepEqual(result, plaintext);
    });

    it("handles mixed encrypted and plaintext values", () => {
      const mixed: Record<string, string> = {};
      const encrypted = encryptMcpSecrets({ ENCRYPTED: "secret1" });
      mixed.ENCRYPTED = encrypted.ENCRYPTED;
      mixed.PLAIN = "not-encrypted";

      const result = decryptMcpSecrets(mixed);
      assert.equal(result.ENCRYPTED, "secret1");
      assert.equal(result.PLAIN, "not-encrypted");
    });
  });

  describe("idempotent encryption", () => {
    it("does not double-encrypt already-encrypted values", () => {
      const original = { KEY: "value" };
      const encrypted = encryptMcpSecrets(original);
      const doubleEncrypted = encryptMcpSecrets(encrypted);

      // Should be the same as single encryption (not re-encrypted)
      assert.deepEqual(encrypted, doubleEncrypted);

      // Should still decrypt correctly
      const decrypted = decryptMcpSecrets(doubleEncrypted);
      assert.deepEqual(decrypted, original);
    });
  });
});
