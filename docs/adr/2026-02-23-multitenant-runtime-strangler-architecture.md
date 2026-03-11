# ADR: Multi-Tenant Runtime Strangler Architecture

- Date: 2026-02-23
- Status: Accepted (Execution started)
- Owner: Runtime migration workstream

## Context

Pantheon currently runs a per-customer, per-instance OpenClaw runtime surface with 51 `/api/instances/*` handlers and a schema centered around `instances` + `customer_id`. The product direction is to preserve customer/billing and SaaS control-plane UX while replacing instance-hosted runtime execution with a centralized multi-tenant Discord-first runtime.

Constraints:

1. Active billing and customer lifecycle flows cannot break during migration.
2. Existing APIs must remain operational while capability slices move.
3. Tenant isolation must be explicit in schema, RLS, and API authorization.
4. Workflow builder expansion is deprecated; only break/fix is allowed.

## Decision

Pantheon will implement a strangler migration with three explicit planes and a compatibility bridge:

1. Control Plane: Keep Next.js + Supabase + Stripe account/billing surface.
2. Runtime Plane: Introduce centralized multi-tenant runtime workers and Discord ingress.
3. Data Plane: Add tenant-first runtime entities and map legacy instances into tenants.
4. Compatibility: Keep `/api/instances/*` operational through adapters while new `/api/tenants/[tenantId]/*` contracts are introduced.

Implementation boundaries:

1. Tenant identity anchors to existing `customers` to preserve billing continuity.
2. New tenant runtime tables are additive (no destructive rewrites in initial phase).
3. Feature flags gate tenant runtime reads/writes.
4. Global kill switches gate Discord ingress, tool execution, and memory writes.
5. Workflow-builder-specific APIs are marked for retirement, replaced by tenant runtime primitives where needed (for example, generic approvals).

## Consequences

Positive:

1. Migration risk is reduced because existing customer paths stay online.
2. Tenant-first primitives can ship incrementally without blocking current operations.
3. Rollback remains possible via feature flags and bridge routes.

Tradeoffs:

1. Temporary dual-surface complexity (`instances` + `tenants`) is expected.
2. Duplicate observability and parity checks are required during shadow periods.
3. API cleanup is deferred until cutover completion.

## Rollback and Safety

1. Disable tenant runtime writes via `tenant.runtime.writes`.
2. Disable tenant runtime reads via `tenant.runtime.reads`.
3. Enable global kill switches for Discord ingress/tool execution/memory writes as needed.
4. Route traffic back to legacy `/api/instances/*` behavior while preserving event logs.

## Validation Criteria

1. Tenant isolation/RLS tests pass for all new tenant tables.
2. First customer-critical actions function through `/api/tenants/[tenantId]/*`.
3. Bridge routes preserve current behavior during phased cutover.
4. No customer or billing linkage regressions in migration/backfill verification.
