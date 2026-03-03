# Instance API Retirement Schedule

Last updated: February 24, 2026
Scope: `src/app/api/instances/*` route families
Owner: Runtime platform

## Policy

- All bridged legacy instance routes now return `Deprecation: true` and `Sunset: Wed, 01 Jul 2026 00:00:00 GMT`.
- No new capability work is permitted on `retire` families beyond break/fix.
- Tenant-native replacements are required before any family sunset date is enforced.

## Family Schedule

| Family | Inventory tag(s) | Tenant replacement path | Status | Deprecation date | Planned sunset date |
|---|---|---|---|---|---|
| Agents (`/agents*`) | `adapt` | `/api/tenants/[tenantId]/agents*` | Bridged live | 2026-02-24 | 2026-07-01 |
| Knowledge (`/knowledge*`) | `adapt` | `/api/tenants/[tenantId]/knowledge*` | Bridged live | 2026-02-24 | 2026-07-01 |
| Memory (`/memory/*`) | `adapt` | `/api/tenants/[tenantId]/memory/*` | Bridged live | 2026-02-24 | 2026-07-01 |
| MCP servers (`/mcp-servers*`) | `adapt` | `/api/tenants/[tenantId]/mcp-servers*` | Tenant API live; bridge cleanup pending | 2026-02-24 | 2026-07-01 |
| Composio (`/composio*`) | `adapt` | `/api/tenants/[tenantId]/composio*` | Tenant API live; bridge cleanup pending | 2026-02-24 | 2026-07-01 |
| Skills/config (`/update-skills`, `/config`) | `bridge` | `/api/tenants/[tenantId]/update-skills`, `/api/tenants/[tenantId]/config` | Tenant API live; bridge cleanup pending | 2026-02-24 | 2026-07-01 |
| Legacy lifecycle (`/status`, `/stop`, `/restart`, `/deprovision`, `/provision`) | `bridge` | Tenant runtime/admin lifecycle endpoints | Transitional | 2026-02-24 | 2026-09-01 |
| Workflow approvals/runs/builder families (`/workflow-*`, `/workflows*`) | `retire` | Tenant approvals + runtime governance surfaces | Sunset path active | 2026-02-24 | 2026-05-15 |
| Boot key (`/boot-key`) | `retain` | None while legacy boot flow exists | Retained until legacy infra retirement | n/a | Post-cutover (TBD) |

## Review Cadence

- Weekly: update this schedule with route-family readiness and blockers.
- Before sunset execution: announce at least 14 calendar days in advance in release notes and internal runbook.
- If any family misses replacement readiness by planned sunset date, move sunset date and document explicit blocker owner.
