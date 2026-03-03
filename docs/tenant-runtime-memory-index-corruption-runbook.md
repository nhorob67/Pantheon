# Tenant Runtime Memory/Index Corruption Runbook

Last updated: February 24, 2026  
Scope: Suspected corruption, poisoning, or integrity drift in tenant memory/index flows

## Containment

1. Enable `tenant.runtime.memory_writes_pause`.
2. Keep read paths on unless data exposure risk is suspected.
3. If cross-tenant leakage is suspected, disable `tenant.runtime.reads` for impacted customer scope.

## Triage checklist

1. Identify impacted tenant(s), session(s), and time window.
2. Compare recent memory writes against expected sources:
   - runtime
   - import
   - operator
   - system
3. Check for anomaly signatures:
   - unexpected confidence spikes
   - repeated duplicate inserts
   - supersession/tombstone inconsistencies

## Recovery

1. Isolate bad records with tombstones or supersession markers.
2. Rebuild affected retrieval artifacts from authoritative tenant records.
3. Re-run representative retrieval checks for impacted workflows.

## Re-enable criteria

1. Validation sample shows no cross-tenant contamination.
2. Retrieval quality for impacted workflows returns to baseline.
3. Memory write path patch is deployed and reviewed.
