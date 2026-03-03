# Tenant Runtime Local Dev Profile (No VPS)

Last updated: February 24, 2026  
Scope: Local tenant-runtime development without external orchestration dependencies

## Goal

Run the app and tenant-runtime admin processors locally with mock infrastructure assumptions where possible.

## Prerequisites

1. Populate `.env.local` with non-placeholder Supabase values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Keep local orchestration mocked:
   - `COOLIFY_API_URL=mock`
3. Set tenant runtime processor auth token:
   - `TENANT_RUNTIME_PROCESSOR_TOKEN=local-test-token` (or any secure local value)

## Start profile

1. Start app in local tenant-runtime profile:
   - `npm run dev:tenant-runtime-local`
2. Optional: run phase-3 checks with same processor token:
   - `npm run loadtest:tenant-runtime-phase3 -- --tenant-id <tenant-id> --customer-id <customer-id> --app-url http://localhost:3000 --processor-token local-test-token`
   - `npm run check:tenant-runtime-recovery -- --tenant-id <tenant-id> --customer-id <customer-id> --app-url http://localhost:3000 --processor-token local-test-token`
3. Optional: check release-gate endpoint:
   - `curl -i -sS -H 'x-tenant-runtime-processor-token: local-test-token' 'http://localhost:3000/api/admin/tenants/runtime/release-gates?window_minutes=60&min_samples=10'`

## Troubleshooting

1. Placeholder Supabase errors (`your-project.supabase.co`):
   - replace `.env.local` placeholders before running runtime scripts.
2. `401 Unauthorized` from admin runtime endpoints:
   - ensure header token matches `TENANT_RUNTIME_PROCESSOR_TOKEN`.
3. `500` from release-gates endpoint:
   - verify local server is up and Supabase credentials are valid; rerun checks after fixing env.
