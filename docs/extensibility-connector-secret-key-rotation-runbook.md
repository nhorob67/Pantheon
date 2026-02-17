# Connector Secret Key Rotation Runbook

Last updated: February 15, 2026

## Purpose

Rotate `ENCRYPTION_KEY` used for encrypted connector credentials and other encrypted runtime config without service interruption.

## Crypto Behavior

1. New encryptions use format `v1:iv:ciphertext:tag`.
2. Decrypt first tries `ENCRYPTION_KEY`, then falls back to `ENCRYPTION_KEY_PREVIOUS` if set.
3. Legacy payloads without prefix (`iv:ciphertext:tag`) are still readable.

## Prerequisites

1. Generate a new 32-byte key encoded as base64.
2. Keep the current key available as rollback fallback.
3. Confirm deploy mechanism can set both:
   - `ENCRYPTION_KEY`
   - `ENCRYPTION_KEY_PREVIOUS`

## Rotation Procedure

1. Generate a new key:
```bash
openssl rand -base64 32
```
2. Set env vars:
   - `ENCRYPTION_KEY=<new_key>`
   - `ENCRYPTION_KEY_PREVIOUS=<old_key>`
3. Deploy application/runtime with both keys set.
4. Verify decrypt reads still work for existing records:
   - Existing instance channel token decrypt path.
   - Existing connector secret decrypt path.
5. Trigger re-encryption pass so active secrets are rewritten using the new key:
   - Read decrypted value.
   - Re-encrypt and persist.
   - Prioritize `connector_accounts.encrypted_secret`, then other encrypted fields.
6. After re-encryption is complete and validated, remove `ENCRYPTION_KEY_PREVIOUS`.

## Validation Checklist

- [ ] New writes create `v1:*` formatted payloads.
- [ ] Existing pre-rotation payloads decrypt successfully.
- [ ] Connector auth workflows remain functional after rotation.
- [ ] No increase in decrypt/auth errors in logs/telemetry.

## Rollback

1. If decrypt failures spike, immediately revert:
   - `ENCRYPTION_KEY=<old_key>`
   - unset `ENCRYPTION_KEY_PREVIOUS` (or set to current failed key)
2. Redeploy.
3. Investigate malformed key lengths, base64 formatting, or partial env rollout.
