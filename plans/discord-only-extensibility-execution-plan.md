# FarmClaw Discord-Only Extensibility Execution Plan (P0-P2)

Last updated: February 15, 2026
Status: In Progress
Scope: Discord only (explicitly excludes multi-channel support)

## 1) Objective

1. Reach and exceed hosted OpenClaw feature parity for extensibility, reliability, and operational control.
2. Keep all features compatible with hosted container execution.
3. Deliver in phased increments with rollback-safe deployment and measurable quality gates.

## 2) Quick Context Snapshot (for new context windows)

1. Current phase: Phase P0.1 validation + Phase P0.2 scaffold -> actively executing; Phase 0 staging gate still open.
2. Active milestone: Staging validation unblock + managed update rings execution/control enforcement.
3. Next milestone gate: Discord-instance E2E validation and rollout simulation proof.
4. Out of scope: Telegram/WhatsApp/Slack and any other multi-channel support.

## 3) Status Legend

- [ ] Not started
- [~] In progress
- [x] Completed
- [!] Blocked

## 4) Phase Overview

| Phase | Name | Target Window | Status |
|---|---|---|---|
| 0 | Foundation for P0-P2 | Week 1 | [~] |
| P0.1 | Marketplace v1 | Weeks 2-3 | [~] |
| P0.2 | Managed update rings | Weeks 4-5 | [~] |
| P0.3 | Reliability scraping stack | Weeks 6-7 | [ ] |
| P0.4 | Integration superconnector | Weeks 7-8 | [ ] |
| P1.1 | MCP hub | Week 9 | [ ] |
| P1.2 | Ag market data pack | Weeks 10-11 | [ ] |
| P1.3 | Agronomy intelligence pack | Week 12 | [ ] |
| P1.4 | Automation builder | Weeks 13-14 | [ ] |
| P1.5 | Observability + eval expansion | Weeks 9-14 | [ ] |
| P2.1 | Pluggable vector memory backend | Weeks 15-16 | [ ] |
| P2.2 | Controlled `node` tool enablement | Week 17 | [ ] |

## 5) Detailed Checklist

## Phase 0: Foundation (Week 1)

### 0.1 Platform schema and state model
- [x] Define initial schema for catalog/install/ops/connectors/flags/telemetry/evals.
- [x] Add migration `supabase/migrations/00013_extensibility_foundation.sql`.
- [x] Add app-layer types + repository helpers for extensibility schema.
- [ ] Apply migration in staging and validate RLS + indexes.

### 0.2 Job execution model
- [x] Add DB claim function for extension operation targets.
- [x] Implement app-level runner endpoint/worker using claim function.
- [x] Add retry/backoff policy and terminal-state handling.

### 0.3 Feature-flag and kill-switch framework
- [x] Add canonical feature flag + customer override + kill switch tables.
- [x] Add server-side resolution helpers in SQL (`resolve_customer_feature_flag`, `is_kill_switch_enabled`).
- [x] Wire app reads for high-risk operations (install/upgrade/scraping fallback).

### 0.4 Connector and secret posture
- [x] Add connector provider/account schema with encrypted secret storage field.
- [x] Implement encryption/decryption service abstraction in app layer.
- [x] Add key rotation strategy and operational runbook.

### 0.5 Telemetry envelope
- [x] Add telemetry event table for request/skill/tool/cost/latency/error envelope.
- [x] Emit first telemetry event path in extension operation execution flow.
- [x] Emit telemetry events from additional key execution paths.
- [x] Build initial operational query/dashboard views.

### Phase 0 exit criteria
- [ ] Foundation schema applied in staging.
- [ ] First operation runner path functional end-to-end.
- [ ] Feature gates and kill switches enforceable at runtime.
- [ ] Telemetry emitted for at least one production-like flow.

## Phase P0.1: Marketplace v1 (Weeks 2-3)

### Build
- [x] Catalog API (list/search/filter by kind/source/verified).
- [x] Install API (pin version, validate trust policy).
- [x] Rollback API (revert to prior known-good version).
- [x] Installed-state API (status, health, last error, timestamps).

### Dashboard
- [x] Marketplace catalog view.
- [x] Installed extensions view.
- [x] One-click install/upgrade/rollback actions.
- [x] Trust-policy admin controls (allowed sources).

### Exit criteria
- [ ] Install + rollback working on a Discord instance.
- [x] Every action writes operation + audit record.

## Phase P0.2: Managed Update Rings (Weeks 4-5)

### Build
- [x] Ring model (`canary`, `standard`, `delayed`) with configurable batch size.
- [x] Health gates (failure-rate, latency, timeout, hard error thresholds).
- [x] Auto-halt and auto-rollback on failed gate.
- [x] Operator controls for pause/resume/cancel.

### Exit criteria
- [ ] Rollout simulation proves gate-driven progression.
- [ ] Failed canary triggers rollback without manual intervention.

## Phase P0.3: Reliability Scraping Stack (Weeks 6-7)

### Build
- [ ] Provider abstraction (`native browser` -> `fallback 1` -> `fallback 2`).
- [ ] Extractor profiles with versioned selectors per source.
- [ ] Retries, anti-bot strategy, and output freshness validation.
- [ ] Provenance labels in responses (source + timestamp + confidence).

### Exit criteria
- [ ] Grain-bid scrape success rate materially improved against baseline.
- [ ] Failures include actionable diagnostics.

## Phase P0.4: Integration Superconnector (Weeks 7-8)

### Build
- [ ] Connector registry and account linkage UX.
- [ ] OAuth/token lifecycle where applicable.
- [ ] Action template layer for Discord workflows.
- [ ] Rate-limit + timeout policies per connector.

### Exit criteria
- [ ] At least 5 no-code automations available in Discord-only mode.

## Phase P1.1: MCP Hub (Week 9)

- [ ] Curated MCP server catalog and policy model.
- [ ] Per-account enable/disable and health checks.
- [ ] Runtime attach/detach controls per instance.

## Phase P1.2: Ag Market Data Pack (Weeks 10-11)

- [ ] API ingestion adapters for structured market feeds.
- [ ] Normalization layer for bids/basis/futures context.
- [ ] Source reconciliation and conflict handling.

## Phase P1.3: Agronomy Intelligence Pack (Week 12)

- [ ] Multi-source weather/agronomy signal fusion.
- [ ] Seasonal alert templates and proactive brief triggers.
- [ ] Confidence + freshness metadata in outputs.

## Phase P1.4: Automation Builder (Weeks 13-14)

- [ ] Rule model (`if` condition -> `then` action).
- [ ] Trigger types (threshold, schedule, event).
- [ ] Test mode + dry-run output before activation.

## Phase P1.5: Observability + Eval Expansion (Weeks 9-14)

- [ ] Skill/tool SLO definitions and alert thresholds.
- [ ] Eval suite runner integrated into rollout gates.
- [ ] Regression dashboards (quality, latency, cost).

## Phase P2.1: Pluggable Vector Memory Backend (Weeks 15-16)

- [ ] Memory provider interface.
- [ ] Vector backend implementation and migration path.
- [ ] Tenant-level retention/index tuning.

## Phase P2.2: Controlled `node` Tool Enablement (Week 17)

- [ ] Runtime policy framework (default-off, allowlist, limits).
- [ ] Resource caps (CPU/memory/time/network/package allowlist).
- [ ] Audit logs for every `node` tool invocation.

## 6) Execution Tracker

### Current focus
- Staging migration credential unblock + Discord-instance E2E + rollout simulation validation.

### Next 3 actions
1. Validate `00013_extensibility_foundation.sql`, `00015_extension_trust_policy.sql`, and `00016_managed_update_rings_scaffold.sql` against staging database.
2. Validate install/upgrade/rollback flow end-to-end on a Discord instance in staging.
3. Run rollout simulation proving gate breach triggers halt + rollback queue behavior.

### Risks / blockers
- Staging migration validation is blocked in this workspace until `SUPABASE_ACCESS_TOKEN` is provided for linked CLI access.
- Telemetry/extension tables are unavailable until `00013_extensibility_foundation.sql` is applied in target environment.

## 7) Concise Update Log (append-only)

- 2026-02-15: Created Discord-only P0-P2 execution plan with phased checklists and exit criteria.
- 2026-02-15: Started execution by implementing Phase 0 schema foundation migration (`00013_extensibility_foundation.sql`).
- 2026-02-15: Marked initial Phase 0 schema/control-plane checklist items complete; staging apply remains pending.
- 2026-02-15: Hardened feature-flag resolver SQL to default safely to `false` when no flag record exists.
- 2026-02-15: Added extensibility app-layer types and repository helpers (`src/types/extensibility.ts`, `src/lib/queries/extensibility.ts`).
- 2026-02-15: Implemented first extension operation runner endpoint (`POST /api/admin/extensions/operations/[id]/execute`) using target-claim RPC.
- 2026-02-15: Validation: lint passed for new extensibility files; full `npx tsc --noEmit` still fails on pre-existing `.test.ts` import-path settings.
- 2026-02-15: Hardened extension operation runner with retry/backoff and terminal failed-state behavior for target execution.
- 2026-02-15: Wired kill-switch + customer feature-flag reads into extension operation execution path.
- 2026-02-15: Added best-effort telemetry emission for extension operation execution batches/errors.
- 2026-02-15: Added connector secret encryption/decryption abstraction (`src/lib/connectors/secrets.ts`) for connector credential handling.
- 2026-02-15: Added extensibility telemetry analytics query/API and admin overview telemetry card for operational visibility.
- 2026-02-15: Added crypto key-rotation support (`ENCRYPTION_KEY_PREVIOUS`) with backward-compatible decrypt for legacy payload format.
- 2026-02-15: Added connector secret key-rotation runbook (`docs/extensibility-connector-secret-key-rotation-runbook.md`) and env template updates.
- 2026-02-15: Validation rerun: lint passes on updated extensibility/crypto/admin files; `tsc` remains blocked only by pre-existing `.test.ts` import-extension config errors.
- 2026-02-15: Added telemetry emission to additional high-risk path (`admin/upgrades/[id]/execute`) for per-instance upgrade events.
- 2026-02-15: Validation rerun: lint passes on all touched extensibility/telemetry files; `tsc` unchanged with only existing test import-extension errors.
- 2026-02-15: Attempted staging migration validation via `supabase migration list --linked`; blocked due missing `SUPABASE_ACCESS_TOKEN` in workspace environment.
- 2026-02-15: Implemented initial P0.1 catalog API (`GET /api/extensions/catalog`) with search/filter/pagination and latest-version enrichment.
- 2026-02-15: Implemented `POST /api/extensions/installations` install queuing API with trust-policy gating and version pinning support.
- 2026-02-15: Implemented `GET /api/extensions/installations` installed-state API with status/health/error/version metadata.
- 2026-02-15: Implemented `POST /api/extensions/installations/[id]/rollback` rollback queuing API with previous-version targeting and `rollback_pending` status transition.
- 2026-02-15: Implemented Extensions dashboard surface (`/settings/extensions`) with marketplace catalog, installed extensions view, and one-click install/upgrade/rollback actions.
- 2026-02-15: Validation rerun for Extensions dashboard files: targeted lint passed; full `tsc` remains blocked by pre-existing repository type errors outside extensibility scope.
- 2026-02-15: Implemented trust-policy admin controls with new API (`GET/PUT /api/extensions/trust-policy`), per-customer source allowlist persistence migration (`00015_extension_trust_policy.sql`), and dashboard policy toggles in settings.
- 2026-02-15: Wired install queuing to evaluate extension trust against customer policy with safe fallback defaults when trust-policy schema is unavailable.
- 2026-02-15: Validation rerun: lint passes on all trust-policy/install/dashboard updates; `tsc` remains blocked only by existing `.test.ts` import-extension config errors.
- 2026-02-15: Added structured audit logging for extension install/upgrade/rollback queue actions to satisfy action-level audit trail requirements.
- 2026-02-15: Retried staging migration validation (`supabase migration list --linked`); still blocked due missing `SUPABASE_ACCESS_TOKEN` in workspace environment.
- 2026-02-15: Added managed update rings schema scaffold migration (`00016_managed_update_rings_scaffold.sql`) with rollout/target tables and ring/gate config primitives.
- 2026-02-15: Implemented admin rollout API scaffold (`/api/admin/extensions/rollouts`) with rollout creation, target ring assignment, and summary listing.
- 2026-02-15: Implemented admin rollout operator controls (`pause`, `resume`, `cancel`) and rollout query helpers with transition guardrails + audit logs.
- 2026-02-15: Validation rerun: lint passes on rollout scaffolding files; `tsc` remains blocked only by existing `.test.ts` import-extension config errors.
- 2026-02-15: Implemented rollout health-gate evaluator + enforcement API (`POST /api/admin/extensions/rollouts/[id]/evaluate`) with threshold checks (failure, timeout, hard error, p95 latency).
- 2026-02-15: Implemented auto-halt + auto-rollback queue path on breached gates, including pending-target skip and rollback operation creation.
- 2026-02-15: Validation rerun: lint passes on gate enforcement files; `tsc` unchanged with only existing `.test.ts` import-extension config errors.
