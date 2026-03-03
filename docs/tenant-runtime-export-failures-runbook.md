# Tenant Runtime Export Failures Runbook

Last updated: February 24, 2026  
Scope: Failures in `/api/tenants/[tenantId]/export*` and `/api/admin/tenants/exports/process`

## Detection signals

1. Export job stuck in `queued`/`running`.
2. Export status transitions to `failed`.
3. Missing `manifest.json` or `manifest.signed.json` files.

## Triage steps

1. Fetch export status via tenant API:
   - `GET /api/tenants/[tenantId]/export`
   - `GET /api/tenants/[tenantId]/export/[exportId]`
2. Validate processor auth token:
   - `TENANT_RUNTIME_PROCESSOR_TOKEN`
   - request header `x-tenant-export-processor-token`
3. Validate storage health:
   - bucket exists (`tenant-exports` unless overridden)
   - write permission for service-role key
4. Inspect `last_error` in export/job records for root cause signature.

## Common remediations

1. Auth mismatch:
   - rotate or align processor token and retry job.
2. Storage write failures:
   - verify bucket ACL and service-role credentials.
3. Partial bundle/manifest failure:
   - trigger retry endpoint:
   - `POST /api/tenants/[tenantId]/export/[exportId]/retry`

## Exit criteria

1. Export reaches `completed`.
2. Manifest and signed manifest both present.
3. Download URLs resolve for the expected TTL window.
