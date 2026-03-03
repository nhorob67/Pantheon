# Multi-Tenant Runtime Rollout + Rollback Playbook

Last updated: February 24, 2026  
Scope: Discord multi-tenant runtime migration

## Control Switches

- Feature flag `tenant.runtime.reads`: gates tenant runtime read path.
- Feature flag `tenant.runtime.writes`: gates tenant runtime write path.
- Kill switch `tenant.runtime.discord_ingress_pause`: halts Discord ingress.
- Kill switch `tenant.runtime.tool_execution_pause`: halts mutating tool execution.
- Kill switch `tenant.runtime.memory_writes_pause`: halts memory writes and compaction.

## Phase-Gated Rollout Steps

1. Enable `tenant.runtime.reads` for internal dogfood customers only.
2. Validate parity dashboards and request traces for at least 24 hours.
3. Enable `tenant.runtime.writes` for internal dogfood customers.
4. Enable canary customers in batches with explicit monitoring windows.
5. Keep `/api/instances/*` bridge routes enabled until each cohort is stable.

## Rollback Decision Triggers

Rollback immediately when any condition is true:

1. Cross-tenant data exposure or RLS bypass is detected.
2. p95 latency or error-rate exceeds migration SLO thresholds for two consecutive windows.
3. Tool execution policy bypass occurs.
4. Memory write corruption or export data integrity failures are confirmed.

## Rollback Procedure

1. Enable `tenant.runtime.discord_ingress_pause`.
2. Disable `tenant.runtime.writes`.
3. Disable `tenant.runtime.reads` if read consistency or tenant isolation is impacted.
4. Enable `tenant.runtime.tool_execution_pause` and/or `tenant.runtime.memory_writes_pause` as needed.
5. Route requests exclusively to legacy `/api/instances/*` behavior.
6. Announce incident mode, open incident timeline, and preserve all request/correlation IDs.
7. Validate customer operations on legacy path before closing rollback action.

## Forward-Fix Re-entry Checklist

1. Root cause documented with owner and remediation PR(s).
2. Isolation/security tests green.
3. Parity integration tests green for affected route families.
4. Canary replay confirms stability for at least one full monitoring window.
5. Change approval recorded before re-enabling tenant runtime switches.

## Phase Appendices

### Appendix A: Phase 1 (Tenant Foundation + Backfill)

Rollback triggers:
1. Backfill verification reports missing tenant mappings or ownership gaps.
2. Stripe/customer linkage checks fail for any seeded tenant.
3. RLS denial tests fail for cross-tenant read/write probes.

Rollback actions:
1. Pause all tenant-runtime write paths (`tenant.runtime.writes` off).
2. Re-run backfill in dry-run mode and collect diff report.
3. Reconcile broken mappings before any further tenant runtime rollout.

Evidence required before re-entry:
1. `verify:tenant-runtime-backfill` passes with zero critical findings.
2. Tenant isolation matrix status updated to pass for Phase 1 rows.

### Appendix B: Phase 2 (API Strangler + Bridge Contracts)

Rollback triggers:
1. Tenant API contract mismatch in launch-critical adapters.
2. Missing deprecation/sunset headers on active bridge routes.
3. Request trace propagation missing from tenant or bridge responses.

Rollback actions:
1. Route affected traffic back through legacy `/api/instances/*` handlers.
2. Disable tenant write gate for impacted route family.
3. Patch contract mismatch and re-run route contract tests.

Evidence required before re-entry:
1. Tenant and bridge route contract tests pass.
2. Typed contract artifact is updated and reviewed.

### Appendix C: Phase 3 (Discord Runtime Processing)

Rollback triggers:
1. Queue backlog grows beyond operational threshold for two windows.
2. Dead-letter volume exceeds expected baseline for canary tenants.
3. Release-gates endpoint returns runtime/system failure instead of threshold result.

Rollback actions:
1. Enable `tenant.runtime.discord_ingress_pause`.
2. Keep processor routes available only for recovery drain actions.
3. Retry safe dead-letter runs after fix; dismiss only with explicit operator reason.

Evidence required before re-entry:
1. `loadtest:tenant-runtime-phase3` and `check:tenant-runtime-recovery` pass.
2. Release-gates endpoint returns `200` or `409` (not `500`).

### Appendix D: Phase 4 (Tools + Approvals)

Rollback triggers:
1. Unapproved mutating tool action executes.
2. Approval queue decision/resume flow fails to update invocation/run state.
3. Audit trail records are missing for protected tool actions.

Rollback actions:
1. Enable `tenant.runtime.tool_execution_pause`.
2. Force high-risk tools into approval-required mode.
3. Drain pending approvals after policy patch and replay only approved runs.

Evidence required before re-entry:
1. Approval decision route tests pass.
2. Tool invocation audit records are present for sampled approvals.
