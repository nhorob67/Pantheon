# ADR: Runtime Blocker Decision Packet

Last updated: February 24, 2026  
Status: Finalized (owner sign-off recorded)

## Scope

This packet tracks the three blocker decisions that must close before Phase 3 runtime implementation:

1. Queue/runtime hosting choice.
2. Vector backend + budget envelope.
3. Export format priority (`jsonl` vs `jsonl + parquet`).

## Decision 1: Queue/runtime hosting

- Status: Finalized
- Owner: Nick Horob
- Required by: Action 11 (`Finalize central worker queue/runtime infra choice and implementation skeleton`)

### Final choice

- Option 1: Supabase-native + scheduled processor routes.

### Rationale

- Fastest path to Phase 3 implementation with current architecture and team bandwidth.
- Keeps operational surface area low during pre-launch/zero-customer mode.
- Existing scheduled processor patterns already exist in the codebase and reduce integration risk.

### Rejected alternatives

- Option 2 (managed queue/worker service): stronger long-term scaling primitives but higher setup and operational overhead before proving canary demand.
- Option 3 (hybrid): likely end-state for scale, but introduces coordination complexity too early.

### Fallback / rollback

- If queue-to-start p95 exceeds 5s under canary load or backlog depth remains high for more than 10 minutes, move to Option 3 (hybrid) with externalized worker fleet.
- Keep queue contract transport-agnostic so enqueue/claim APIs can switch backends without route contract changes.

### 90-day cost estimate (planning envelope)

- Incremental cost: $0-$900 over 90 days.
- Assumptions: pre-launch through canary load, low-medium job volume, no dedicated external worker vendor.

## Decision 2: Vector backend + budget envelope

- Status: Finalized
- Owner: Nick Horob
- Required by: Phase 5 retrieval hardening and memory quality gates.

### Final choice

- Option 1: Postgres/pgvector in primary stack.

### Rationale

- Tightest integration with existing Supabase data model and RLS posture.
- Lowest coordination overhead while retrieval quality baselines are being established.
- Sufficient for launch-critical recall/groundedness evaluation scope before large-scale optimization.

### Rejected alternatives

- Option 2 (dedicated vector service): improves specialized scale features but adds infrastructure and data-sync complexity prematurely.
- Option 3 (hybrid): reasonable future optimization, but unnecessary before measured bottlenecks appear.

### Fallback / rollback

- If median retrieval latency exceeds 250ms at target canary load or recall/groundedness targets are not met, adopt Option 3 hybrid split (hot set external, long tail in Postgres).
- Preserve stable retrieval interface in runtime modules so backend swap is internal.

### 90-day cost estimate (planning envelope)

- Incremental cost: $300-$2,400 over 90 days.
- Assumptions: embedding storage growth in primary Postgres, moderate retrieval query volume, no dedicated vector vendor subscription.

## Decision 3: Export format priority

- Status: Finalized
- Owner: Nick Horob
- Required by: Phase 6 export contract finalization.

### Final choice

- Option 1: `jsonl` primary (single canonical format).

### Rationale

- Lowest support burden and easiest customer portability/readability for first GA export contract.
- Simplifies validation and checksum manifest implementation.
- Avoids dual-format complexity before real customer demand for columnar analytics exports is observed.

### Rejected alternatives

- Option 2 (`jsonl + parquet` dual output): valuable for analytics-heavy consumers but doubles format support/testing burden in Phase 6.

### Fallback / rollback

- If two or more production tenants request columnar output for downstream analytics in the first 90 days post-launch, add optional `parquet` as a non-default secondary artifact while preserving `jsonl` as canonical.

### 90-day cost estimate (planning envelope)

- Incremental cost: $50-$450 over 90 days.
- Assumptions: single-format export generation, moderate artifact retention, no additional columnar transformation compute.

## Final sign-off checklist

- [x] Each decision has a named owner.
- [x] Final choice documented with rationale and rejected alternatives.
- [x] Rollback/fallback path documented for each decision.
- [x] 90-day cost estimate captured for each decision.
- [x] Master plan blocker section updated to `[x]` where applicable.
