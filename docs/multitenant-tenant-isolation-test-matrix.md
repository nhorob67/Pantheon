# Multi-Tenant Isolation + RLS Test Matrix

Last updated: February 24, 2026  
Status: Active implementation artifact

## Goal

Validate launch-critical tenant isolation across database policies and API authorization paths before canary runtime rollout.

## Matrix

| Layer | Scenario | Expected |
|---|---|---|
| RLS table access | Member of tenant A queries tenant B rows | 0 rows returned |
| RLS table mutation | Member of tenant A attempts update/delete in tenant B | Denied |
| API tenant route | Authenticated user without membership calls `/api/tenants/[tenantId]/*` | `404` tenant not found |
| API role guard | `viewer` attempts operator/admin action | `403` |
| API runtime gate | Writes disabled for customer | `409` on write paths |
| Legacy bridge route | Instance route with tenant runtime enabled | Uses bridge path, returns compatibility payload |
| Backfill integrity | Customers/tenants/mappings verification | Zero critical findings |

## Role matrix (minimum expected)

| Role | Read tenant context | Manage tenant runtime data | Tenant admin operations |
|---|---|---|---|
| `viewer` | Yes | No | No |
| `operator` | Yes | Yes | No |
| `admin` | Yes | Yes | Yes |
| `owner` | Yes | Yes | Yes |

## Execution checklist

- [~] Add automated role and denial tests for tenant auth helpers (role policy denial tests + tenant context authorization denial tests + DB-level RLS denial integration harness added; execution with real staging Supabase credentials still pending).
- [~] Add route-level tests for representative tenant read/write endpoints (tenant memory settings `GET`/`PUT` endpoint tests added with auth/role/gate denial and trace-header assertions; broader tenant endpoint set still pending).
- [~] Add route-level tests for bridged instance endpoints under runtime gates (shared bridge gate/header decision tests and memory bridge parity tests added; endpoint-level matrix still pending).
- [!] Run `npm run backfill:tenant-runtime -- --reconcile-owner-membership --refresh-legacy-instance-count` (blocked: placeholder Supabase credentials).
- [!] Run `npm run verify:tenant-runtime-backfill -- --sample=20` (blocked: placeholder Supabase credentials).
- [~] Record findings summary with pass/fail counts (blocked report captured in `docs/multitenant-backfill-verification-report-2026-02-24.md`).

Current blocker note (2026-02-24): local execution of backfill verification commands is blocked because `.env.local` still contains placeholder Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co` and placeholder service-role key).

## Release gate mapping

- Phase 1 exit criteria: RLS isolation tests pass.
- Phase 2 exit criteria: parity integration tests green.
- Phase 9 continuity target: no Sev1 tenant isolation/security incidents during canary window.
