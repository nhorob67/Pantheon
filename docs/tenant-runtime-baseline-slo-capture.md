# Tenant Runtime Baseline SLO Capture

Date: February 24, 2026
Scope: Phase 0 baseline metrics capture for multi-tenant runtime

## Command

Run after staging Supabase credentials are configured:

```bash
npm run report:tenant-runtime-baseline-slos -- --window-minutes 1440 --run-kind discord_runtime
```

Optional:

```bash
npm run report:tenant-runtime-baseline-slos -- --window-minutes 1440 --run-kind all
```

## Output

The script prints a JSON report with:

1. Runtime success baseline (`success_rate`, completed/failed counts)
2. Latency baseline (`p95_queue_to_terminal_ms`, `p95_queue_to_start_ms`)
3. Memory hit-rate baseline if runtime metadata includes memory signals
4. Support-incident placeholder note where repository-backed metrics are unavailable

## Environment prerequisites

The report command fails fast when placeholders are still set in:

1. `NEXT_PUBLIC_SUPABASE_URL`
2. `SUPABASE_SERVICE_ROLE_KEY`

## Notes

1. `support_incidents` remains `null` because this repo does not currently include a support incidents table for tenant runtime.
2. `memory.hit_rate` remains `null` until runtime metadata includes either `memory_hit` or `retrieval_hit` fields in sampled runs.
