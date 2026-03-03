# Tenant Runtime Discord Outage Mode Runbook

Last updated: February 24, 2026  
Scope: Discord API/gateway degradation impacting runtime ingress/dispatch

## Activate outage mode

1. Enable `tenant.runtime.discord_ingress_pause` to stop new ingress pressure.
2. Keep worker processors running for safe drain/retry where possible.
3. Communicate degraded mode to internal operators.

## Triage checklist

1. Confirm external outage vs internal failure:
   - Discord status signals and API error patterns
   - local runtime processor health
2. Inspect retry behavior:
   - `retry_after` propagation from Discord responses
   - exponential backoff counters on runtime runs
3. Review dead-letter growth:
   - `GET /api/admin/tenants/runtime/dead-letter`

## Stabilization actions

1. If outbound dispatch failures dominate:
   - keep ingress paused
   - allow retries to continue with backoff
2. If queue contention grows:
   - reduce processor batch pressure
   - prioritize recovery for canary/internal tenants first
3. Avoid manual replay storms while outage is active.

## Recovery and re-entry

1. Confirm Discord API recovery window.
2. Clear ingress pause and observe canary traffic first.
3. Run recovery check and release-gate report:
   - `npm run check:tenant-runtime-recovery -- --tenant-id <id> --customer-id <id> --app-url <url> --processor-token <token>`
   - `GET /api/admin/tenants/runtime/release-gates`
4. Resume standard rollout posture after stable window.
