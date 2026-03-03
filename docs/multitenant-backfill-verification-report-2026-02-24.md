# Tenant Runtime Backfill Verification Report

Date: February 24, 2026
Environment: local attempt intended for staging credentials
Status: Blocked (environment configuration)

## Commands executed

1. `npm run backfill:tenant-runtime -- --reconcile-owner-membership --refresh-legacy-instance-count`
2. `npm run verify:tenant-runtime-backfill -- --sample=20`

## Result

- Backfill command failed before data evaluation due invalid Supabase endpoint configuration.
- `NEXT_PUBLIC_SUPABASE_URL` resolved to placeholder value `https://your-project.supabase.co` from `.env.local`.
- `SUPABASE_SERVICE_ROLE_KEY` is also placeholder-length and not a usable service key.
- No customer/tenant/mapping verification could be completed; Phase 1 staging verification gate cannot be closed yet.

## Required remediation

1. Set real staging values for:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Re-run:
   - `npm run backfill:tenant-runtime -- --reconcile-owner-membership --refresh-legacy-instance-count`
   - `npm run verify:tenant-runtime-backfill -- --sample=20`
3. Attach pass/fail summary from verify output and close Phase 1 verification gate.

## Notes

- Backfill and verify scripts now fail fast when placeholder Supabase values are detected, to avoid ambiguous `fetch failed` errors.
