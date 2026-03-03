# Tenant Runtime Incident Response Runbook

Last updated: February 24, 2026  
Scope: P1/P2 incidents affecting multi-tenant Discord runtime

## Immediate containment

1. Pause ingress: enable `tenant.runtime.discord_ingress_pause`.
2. Pause writes if needed: disable `tenant.runtime.writes`.
3. Pause risky actions if needed:
   - enable `tenant.runtime.tool_execution_pause`
   - enable `tenant.runtime.memory_writes_pause`

## Triage checklist

1. Capture scope:
   - impacted tenants
   - first observed timestamp
   - current runtime run statuses (`queued`, `running`, `awaiting_approval`, `failed`)
2. Pull evidence:
   - request IDs from tenant responses (`x-request-id`)
   - dead-letter entries via `/api/admin/tenants/runtime/dead-letter`
   - release-gate output (`/api/admin/tenants/runtime/release-gates`)
3. Classify severity:
   - security/isolation issue -> immediate rollback mode
   - availability/latency issue -> ingress pause and queue stabilization

## Recovery flow

1. Fix root cause and deploy patch.
2. Re-run runtime checks:
   - `npm run check:tenant-runtime-recovery -- --tenant-id <id> --customer-id <id> --app-url <url> --processor-token <token>`
3. Retry safe dead-letter runs; dismiss only with operator reason.
4. Re-enable flags in order:
   - `tenant.runtime.reads`
   - `tenant.runtime.writes`
   - clear ingress/tool/memory kill switches

## Exit criteria

1. No active isolation/security alarms.
2. Recovery checks pass.
3. Release-gates endpoint returns threshold result (`200` or `409`), not runtime failure.
