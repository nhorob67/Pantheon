# Pantheon Multi-Tenant Discord SaaS Master Plan (OpenClaw-Inspired Runtime)

Last updated: February 24, 2026  
Status: Execution in progress (pre-launch / zero-customer mode)  
Scope: Build a tenant-first centralized multi-tenant Discord execution platform before public launch; keep legacy instance compatibility only where needed for internal development and safe fallback.

## 1) Executive Summary

### Product direction (confirmed)
- Keep: existing Vercel + Supabase SaaS control plane, customer accounts, billing data, skills, knowledge, and current tool surface.
- Change: stop depending on per-customer VPS/OpenClaw runtime as the core execution engine.
- Change: remove visual workflow builder from forward roadmap.
- Add: first-class multi-tenant runtime with Discord channel-first interactions and strong tenant data export guarantees.
- Add: stronger memory/search architecture to reduce context loss and improve long-horizon recall quality.

### Strategy
- Use a strangler migration, not a full rewrite and not a pure in-place refactor.
- Build a new tenant runtime plane in parallel and migrate capability slices incrementally.
- Prioritize tenant-native APIs and runtime paths as launch-critical.
- Treat broad legacy `/api/instances/*` bridge parity and customer cutover as post-launch work unless a route is required for internal dogfood.

### Pre-launch assumptions (updated)
- There are currently no production customers to migrate.
- Existing migration/backfill tooling remains useful for fixtures, staging, and rehearsals, but is not a launch gate.
- Phase 7 cutover work activates only when real customer data/runtime traffic exists.

## 2) Ground Truth from Prior Code Review + Current Repo State

- [x] `src/app/api/instances/*` remains large and instance-centric (currently 51 route handlers).
- [x] Existing contract is tightly coupled to per-instance OpenClaw webhook semantics and headers.
- [x] Discord is already enforced in schema (`instances.channel_type = 'discord'`).
- [x] Skills/extensions workstream already exists and should be preserved/migrated.
- [x] Existing memory work introduced vault/checkpoint/compress, but still instance/runtime-oriented.
- [x] Existing workflow builder implementation is extensive and should be sunset, not expanded.

### 2.1) Accuracy corrections from latest repo scan (2026-02-24)
- [x] Shared tenant route middleware/wrapper is already implemented and used (`runTenantRoute` in `src/lib/runtime/tenant-route.ts`).
- [x] Tenant export API routes are implemented (`/api/tenants/[tenantId]/export`, `/api/tenants/[tenantId]/export/[exportId]`, `/api/tenants/[tenantId]/export/[exportId]/retry`) with admin processor path (`/api/admin/tenants/exports/process`).

## 3) External Research Summary (What We Need Parity With)

## 3.1 OpenClaw capability baseline to match for common JTBD

From current OpenClaw docs/repo, the common user jobs are:
- Multi-agent conversations in channels and DMs.
- Session continuity per peer/channel and room-like context boundaries.
- Tool use with policy profiles (safe/normal/unsafe style controls).
- Human approval gates for sensitive actions.
- Extensibility via skills and MCP/tooling integrations.
- Built-in memory retrieval over long conversation history.
- Webhook/lifecycle events and operational visibility.

## 3.2 QMD + memory/search insights that matter for Pantheon

QMD (as implemented in OpenClaw memory docs/repo) contributes:
- Query decomposition and intent extraction from chat history.
- Hybrid retrieval modes (`semantic`, `keyword`, `mixed`).
- Merge/ranking strategies with time-decay and relevance weighting.
- Contextual compression and dynamic memory selection.
- Index hygiene flows (incremental indexing, clean/refresh).

Research-backed memory risks and mitigations:
- Long context alone is insufficient; retrieval placement and relevance ordering matter.
- Retrieval-augmented generation should remain the default for factual recall.
- Hierarchical memory patterns (working memory + archival memory) improve persistence.
- Hybrid search with sparse+dense fusion and reranking improves recall/precision over single-mode retrieval.

## 4) Target Architecture (Future-State)

## 4.1 Planes

### A. Control Plane (reuse + adapt)
- Next.js app (dashboard/admin/onboarding/billing).
- Supabase auth, RLS, metadata, and event state.
- Stripe customer/subscription/billing contracts preserved.

### B. Runtime Plane (new)
- Central execution service (multi-tenant worker fabric).
- Discord gateway ingestion + command dispatch.
- Tool executor with tenant policy and hard limits.
- Memory service (index/write/read/compaction).

### C. Data Plane (evolved)
- New `tenant/workspace`-first schema.
- Event ledger for messages, runs, tool invocations, and approvals.
- Knowledge corpus + memory records as first-class tenant assets.
- Export manifests and signed artifact bundles.

## 4.2 Non-goals
- No new visual workflow builder investments.
- No broad multi-channel expansion in this migration phase (Discord-first).
- No forced migration that breaks active billing/customers.

## 5) Capability Parity Matrix (OpenClaw-Inspired -> Pantheon Target)

| Capability (JTBD) | Current State | Target State | Gate |
|---|---|---|---|
| Channel/DM agent interaction | Instance-hosted OpenClaw | Central Discord runtime with tenant routing | Tenant can chat with assigned agents in Discord with <=2s p95 first token |
| Session continuity | OpenClaw session model | `tenant_sessions` + rolling summaries + retrieval context packs | 95% of follow-up prompts resolve with needed context |
| Tool invocation | Mixed instance APIs + runtime exec | Central tool gateway with per-tenant allowlists, quotas, approvals | 0 policy bypasses in security tests |
| Skills/extensions | Existing extensibility scaffolding | Preserve and rebind skills/extensions to central runtime | Existing top skills run with no behavior regression |
| Knowledge retrieval | Knowledge files + instance-centric flows | Tenant corpus + hybrid retrieval + rerank + citations | Top-k retrieval quality target met in eval set |
| Memory durability | Vault/checkpoint/compress operations | Tiered memory with explicit write policies + compaction | Memory regression suite passes across 30-day replay |
| Human approvals | Workflow approvals + status flows | Generic approval queue across tool actions | All protected tools require explicit approval where configured |
| Export/data ownership | Partial workflow export | Full tenant export bundle (DB + storage + manifest) | Self-serve export completes under SLA for P95 tenant size |
| Observability | Mixed admin metrics | Unified traces/events + quality/cost/latency dashboards | Release gate metrics available before GA |

## 6) Phased Execution Plan with Checklists

## Phase 0: Program Setup and Scope Reset (Week 1)

### 0.1 Product/roadmap decisions
- [x] Mark visual workflow builder as deprecated in roadmap/docs/UI copy.
- [x] Freeze new workflow-builder feature development (except break/fix) via explicit policy in `docs/workflow-builder-freeze-policy.md`.
- [x] Publish migration charter and success metrics to team docs (`docs/multitenant-runtime-migration-charter.md`).

### 0.2 Baseline instrumentation and inventory
- [x] Create complete endpoint inventory for `/api/instances/*`.
- [x] Tag each endpoint: `retain`, `adapt`, `bridge`, `retire`.
- [~] Capture baseline SLOs (latency, run success, memory hit rate, support incidents) (added baseline capture script/command + doc: `scripts/runtime-baseline-slo-report.ts`, `npm run report:tenant-runtime-baseline-slos`, `docs/tenant-runtime-baseline-slo-capture.md`; staging run still pending credentials).

### 0.3 Migration safety controls
- [x] Introduce feature flags for tenant-runtime read/write paths.
- [x] Add kill-switches for Discord ingress, tool execution, memory writes.
- [x] Define rollback playbook for every migration phase (shared rollout/rollback playbook expanded with phase-specific appendices A-D in `docs/multitenant-runtime-rollout-rollback-playbook.md`).

Exit criteria:
- [ ] Scope reset approved.
- [x] Endpoint inventory complete.
- [x] Runtime flags + kill-switches available.

## Phase 1: Tenant Data Model Foundation (Weeks 1-3)

### 1.1 Schema foundation
- [x] Add `tenants` (or `workspaces`) table with ownership model.
- [x] Add `tenant_members`, `tenant_roles`, `tenant_integrations`.
- [x] Add `tenant_agents`, `tenant_sessions`, `tenant_messages`.
- [x] Add `tenant_tools`, `tenant_tool_policies`, `tenant_approvals`.
- [x] Add `tenant_knowledge_items`, `tenant_memory_records`.
- [x] Add `tenant_exports`, `tenant_export_files`, `tenant_export_jobs`.

### 1.2 Compatibility mapping
- [x] Add mapping table from legacy `instances` -> new `tenants`.
- [x] Add backfill job to seed one tenant per existing customer/instance (migration-seeded inserts + standalone/re-runnable backfill and verification scripts added under `scripts/`).
- [x] Keep billing linkage intact (`customers`, Stripe IDs) with tenant foreign keys.

### 1.3 RLS and access model
- [x] Define RLS policies for all tenant-scoped tables.
- [x] Implement role model (`owner`, `admin`, `operator`, `viewer`).
- [x] Add test matrix for tenant isolation and cross-tenant denial (published in `docs/multitenant-tenant-isolation-test-matrix.md` with API/RLS/processor denial scenarios).

Exit criteria:
- [ ] Seed/staging fixture backfill and mapping verification pass with zero integrity findings.
- [ ] Tenant-scoped reads/writes available for launch-critical flows without regressions in internal dogfood.
- [ ] RLS isolation tests pass.

## Phase 2: API Strangler Layer (Weeks 2-5)

### 2.1 New namespace
- [~] Introduce `/api/tenants/[tenantId]/*` for all new runtime-facing contracts (now includes `context`, `agents`, `knowledge`, `memory`, `mcp-servers`, `composio`, `update-skills`, `config`, and `data-governance`; additional parity routes still pending).
- [x] Ship tenant auth resolver + policy guard middleware (implemented via shared `runTenantRoute` wrapper and centralized trace/error handling).
- [x] Add versioned response envelopes and idempotency keys.

### 2.2 Bridging layer
- [~] Build compatibility adapters from selected `/api/instances/*` routes into tenant services (agents + knowledge + memory settings/checkpoint/compress bridged behind runtime gates; remaining bridge families are non-blocking unless needed by internal dogfood).
- [x] Add deprecation headers on bridged instance routes that remain in internal use.
- [x] Publish retirement schedule for each major instance API family (published in `docs/multitenant-instance-api-retirement-schedule.md` with dated family-level sunset targets).

### 2.3 Contract hardening
- [~] Add OpenAPI/typed contracts for tenant APIs (shared Zod contract module is in place and launch-critical OpenAPI coverage now includes context/agents/knowledge/memory/approvals/export/discord ingress; full route-family request/response typing is still pending).
- [x] Add integration tests for parity-critical route groups (launch-critical tenant route contract matrix + bridge route contract matrix + existing bridge payload/trace tests now tracked in `npm test`).
- [x] Add request tracing IDs across APIs and workers.
- [x] Add versioned response envelopes and idempotency keys standard on all `/api/tenants/[tenantId]/*` routes (centralized in `runTenantRoute`, with persisted idempotency replay records).

Exit criteria:
- [~] First customer actions work fully via tenant APIs (agents + knowledge + memory + mcp/composio slices complete; channels assistant CRUD/presets and initial channels agent load are tenant-first with legacy fallback, and dashboard runtime-status polling now uses tenant APIs; remaining tenantization is primarily in workflows paths plus legacy provisioning/admin instance ops).
- [~] Internal dev/dogfood legacy routes that are still used remain operational via bridge (agents + knowledge + memory route families bridged; broader bridge coverage pending).
- [x] Parity integration tests green.

## Phase 3: Central Discord Runtime Service (Weeks 3-8)

### 3.1 Ingestion and routing
- [~] Implement Discord gateway connection manager with shard/intents policy (added runtime connection manager module with tenant registration, shard/intents snapshot, and ingress normalization/dedupe keys; live websocket lifecycle orchestration is still pending).
- [x] Add tenant routing by guild/channel/user mapping (implemented automatic canary routing resolver + admin ingress endpoint at `/api/admin/tenants/runtime/discord/ingress` using tenant-agent/legacy channel mapping with ambiguity handling).
- [~] Add inbound event normalization and dedupe (canary ingress schema validation + idempotency key dedupe scaffold added for `discord_canary` queue events).
- [x] Add rate-limit/backoff handling and replay-safe processing (Discord API 429 retry-after parsing is now propagated through worker results; canary processor schedules retries using max(exponential backoff, Discord retry-after) with idempotent ingress queueing).

### 3.2 Agent execution loop
- [~] Implement central run orchestrator (queue + worker + retry policy) (skeleton implemented: tenant runtime queue contract, claim/process route, optimistic-lock transitions; canary retry/backoff requeue logic implemented; production processor path `/api/admin/tenants/runtime/process` + `discord_runtime` worker path now available with policy/approval hooks; approval decisions now resume exact pending tool steps via stored continuation tokens; full long-lived tool execution integrations still pending).
- [~] Add deterministic state transitions (`queued`, `running`, `awaiting_approval`, `completed`, `failed`, `canceled`) (state machine scaffolding + transition assertions implemented in runtime module and queue transition helpers).
- [~] Add partial-response streaming back to Discord where applicable (runtime worker now sends progressive multi-part Discord responses with ordered part labels via `sendDiscordChannelMessageSequence`; true token-by-token streaming remains pending).
- [x] Add dead-letter queue and operator recovery actions (added dead-letter metadata tagging + admin DLQ APIs for listing, retrying, and dismissing dead-lettered runtime runs).

### 3.3 Runtime governance
- [x] Enforce tenant-level quotas (requests, estimated tokens, tool-call budget, and concurrent run ceilings are now enforced in Discord ingress governance checks before queue enqueue).
- [x] Add per-tool timeout/resource policies (Discord dispatch worker now resolves tenant runtime governance policy and enforces per-tenant dispatch timeout budgets).
- [x] Add abuse controls (spam duplicate detection, prompt abuse pattern blocking, and existing canary loop-guard protections are enforced in runtime governance path).

Exit criteria:
- [~] Discord canary tenants can run normal conversations reliably (release-gate evaluation endpoint + governance guardrails in place; staging execution evidence still pending).
- [~] Worker SLOs meet target under load test (added Phase 3 load-test harness script; staging run and report still pending).
- [~] Failure recovery paths validated (DLQ list/retry/dismiss APIs plus automated recovery-check harness added; staging execution sign-off still pending).

## Phase 4: Tools + Skills Preservation and Migration (Weeks 5-9)

### 4.1 Tool surface parity
- [x] Inventory all currently supported tools and classify by risk (current central runtime inventory documented in `docs/tenant-runtime-tool-risk-inventory.md`).
- [~] Port safe tools first (read-only and low side effects) (runtime now supports `echo`, `time`, `hash`, `uuid`, `base64_encode`, and `base64_decode` via shared safe-tool execution module with parity harness coverage).
- [~] Port mutating tools with approval + audit constraints (first mutating tool `tenant_memory_write` now executes through central runtime with mandatory approval queueing, invocation persistence, and resumed execution audit coverage; seeded baseline catalog/policy defaults added via `00042_tenant_runtime_tool_catalog_seed.sql`; broader mutating tool surface is still pending).
- [ ] Preserve current extension marketplace/install/update capabilities.

### 4.2 Policy and approvals
- [~] Build centralized policy evaluator (role + feature flag + trust policy + tenant limits) (tenant runtime tool policy evaluator now enforces role checks + kill-switches, blocks mutating tools during memory-write pause, applies customer extension trust-policy blocks for tool metadata source types, and forces approval queueing for mutating/`always` approval modes; remaining extensions are policy analytics/reporting and broader trust metadata coverage).
- [~] Create generic approval queue API/UI for high-risk tool calls (added tenant approval queue APIs + dashboard approvals page for decisioning in `/api/tenants/[tenantId]/approvals*` and `/settings/approvals`, including continuation-token handoff so approved requests resume exact pending tool invocations; advanced filtering/SLA UX still pending).
- [~] Add mandatory audit trail for all tool invocations and approval outcomes (added `tenant_tool_invocations` persistence + runtime/approval audit events for decisions/outcomes and resumed invocations; downstream analytics/reporting pipeline still pending).

### 4.3 Regression suite
- [x] Build tool parity test harness from real conversation transcripts (fixture-driven harness + tests in `src/lib/runtime/tenant-tool-parity-harness.ts` and `src/lib/runtime/tenant-tool-parity-harness.test.ts`).
- [x] Track pass/fail parity by tool and tenant role profile (harness summary includes `tool:role` pass/fail scoreboard from transcript scenarios).
- [x] Block rollout if high-usage tools regress (required high-usage tool gate is enforced in `npm test` via transcript harness assertions).

Exit criteria:
- [ ] Top 80% tool jobs-by-usage parity achieved.
- [ ] Approval policy works end-to-end.
- [~] No unaudited mutating tool executions (enforced for implemented mutating tool path; additional mutating tools still pending).

## Phase 5: Knowledge + Memory Hardening (QMD-Informed) (Weeks 5-10)

### 5.1 Memory architecture (tiered)
- [ ] Define three explicit tiers:
- [ ] `Working memory`: short-lived conversational state + rolling summary.
- [ ] `Episodic memory`: interaction facts/outcomes with timestamps and confidence.
- [ ] `Knowledge memory`: durable documents/chunks and canonical tenant facts.

### 5.2 Write policy to prevent memory bloat/poisoning
- [ ] Persist only structured, policy-allowed memory events (facts, preferences, commitments, outcomes).
- [ ] Require confidence thresholds or verifier pass before durable writes.
- [ ] Add duplicate/conflict detection and supersession markers.
- [ ] Add redaction pipeline for secrets/PII before indexing.

### 5.3 Retrieval pipeline
- [ ] Implement hybrid retrieval (`dense + sparse`) with fusion ranking.
- [ ] Add recency and source-trust weighting.
- [ ] Add reranker stage for top-k refinement.
- [ ] Add query decomposition/rewrite stage (QMD-style) before retrieval.
- [ ] Add context pack builder that enforces token budgets and citation traces.

### 5.4 Summarization/compaction
- [ ] Add periodic conversation summarization jobs by session.
- [ ] Add memory compaction jobs with reversible snapshots.
- [ ] Add tombstone/retention policies per tenant controls.

### 5.5 Memory quality evaluation
- [ ] Create eval dataset from real Pantheon use-cases (market, agronomy, ops, ticketing).
- [ ] Add recall@k, answer groundedness, stale-memory rate metrics.
- [ ] Add adversarial evals (contradictions, outdated facts, prompt injection).
- [ ] Gate deployment on memory quality thresholds.

Exit criteria:
- [ ] Memory regression suite stable across replay windows.
- [ ] Measurable reduction in context-loss support incidents.
- [ ] Retrieval quality targets met for core tenant workflows.

## Phase 6: Export and Data Ownership (Weeks 6-10)

### 6.1 Self-serve tenant export
- [x] Implement `POST /api/tenants/[id]/export` job endpoint.
- [x] Generate signed export bundle (`jsonl/csv + blobs + manifest.json + checksums`).
- [x] Include: agents, sessions, messages, tool logs, approvals, skills metadata, knowledge, memory records, billing metadata pointers (full export manifest now includes billing pointer fields sourced from `customers`, custom-skill metadata summary sourced from `custom_skills`, and tenant-agent skill reference summaries).
- [x] Provide status + retry + expiry lifecycle.

### 6.2 Import and portability
- [x] Implement dry-run validator for imports (`POST /api/tenants/[tenantId]/import/dry-run` with schema/scope/tenant-id safety checks, configurable unknown-table handling, and structured issue reporting).
- [x] Implement selective import scopes (knowledge only, full tenant, metadata only) in dry-run validation (`scope` + optional `selected_tables` subset enforcement).
- [x] Add schema-version compatibility handling (dry-run `compatibility` report with `compatible` / `requires_migration` / `unsupported` status).

### 6.3 Governance and compliance
- [x] Add explicit retention/deletion policy controls per tenant (tenant `data-governance` API added with metadata-backed policy persistence and audit events).
- [x] Add export audit logging and access controls (role gates enforced in tenant export/retry routes and audit events emitted across tenant export APIs + admin processor path).
- [x] Document export format contract publicly (`docs/tenant-export-format-contract.md`).

Exit criteria:
- [ ] Large-tenant export succeeds within SLA.
- [ ] Import dry-run catches incompatibilities safely.
- [ ] Ownership/export docs published and support-ready.

## Phase 7: Customer Migration and Cutover (Post-launch activation only)

Activation gate:
- First paying customer onboarded (or committed migration date set).
- Tenant-native runtime is stable in internal dogfood with Phase 2/3 release gates met.

### 7.1 Shadow mode
- [ ] Dual-write key runtime events to legacy + tenant stores.
- [ ] Run shadow reads for parity comparisons without user impact.
- [ ] Alert on divergence by route and capability.

### 7.2 Progressive rollout
- [ ] Internal dogfood tenants.
- [ ] Canary customer cohort (opt-in).
- [ ] Standard cohort.
- [ ] Delayed/high-risk cohort.

### 7.3 Legacy retirement
- [ ] Disable new VPS/OpenClaw instance provisioning.
- [ ] Move remaining customers to tenant runtime.
- [ ] Keep read-only historical access path for legacy instance data.
- [ ] Remove dependency on OpenClaw gateway webhooks for active runtime paths.

Exit criteria:
- [ ] 100% active tenants on central runtime.
- [ ] No critical regression in SLA/quality metrics for 30 days.
- [ ] Legacy provisioning path retired.

## Phase 8: Post-Cutover Hardening (Weeks 14-16)

- [ ] Remove dead code and migrations tied only to retired runtime paths.
- [ ] Optimize cost by workload class and tenant tier.
- [ ] Re-tune retrieval/memory policies using production eval telemetry.
- [ ] Finalize GA playbook and incident SOP updates.

## 7) Detailed Workstream Backlog (Trackable Checklists)

## 7.1 Database and migrations
- [~] Draft migration series `0003x_tenant_runtime_foundation.sql` through `0004x_*`.
- [~] Add reversible backfill scripts and verification queries (idempotent dry-run backfill + invariant verification scripts added; explicit rollback/reversal script still pending).
- [x] Add data validation scripts for customer/billing linkage integrity (added `scripts/verify-customer-billing-linkage.ts` + npm command `verify:customer-billing-linkage` with customer/tenant/billing/mapping drift checks).

## 7.2 Runtime service implementation
- [~] Create `src/lib/runtime/` domain modules for orchestration, tool gateway, policy, approvals (auth + gates + tenant-agent/tenant-knowledge/tenant-memory/tenant-mcp/tenant-composio parity services implemented; queue contract/state-machine/orchestrator/worker canary + production processor paths added; policy/approval engine implemented with continuation-token resume, while scheduler/analytics/reporting hardening remains pending).
- [~] Add job queue abstraction and worker scheduler routes (tenant runtime queue abstractions active for canary + production run kinds with admin processor routes `/api/admin/tenants/runtime/process-canary` and `/api/admin/tenants/runtime/process`; scheduler orchestration hardening still pending).
- [x] Add circuit breakers around external APIs/tools (shared in-memory runtime circuit-breaker added and wired into Discord dispatch + tool execution paths with cooldown/backoff semantics and test coverage).

## 7.3 UI updates
- [x] Introduce tenant/workspace switcher UI.
- [x] Add approvals inbox in dashboard.
- [x] Add memory controls and retrieval diagnostics panel.
- [x] Add export center page with job history/downloads.
- [~] De-emphasize/remove workflow-builder entry points.

## 7.4 DevEx and operations
- [x] Add local dev profile for central runtime without VPS (added `npm run dev:tenant-runtime-local`, `.env.local.example` token guidance, and `docs/tenant-runtime-local-dev-profile.md`).
- [x] Add staging load-test scenarios for Discord ingress and retrieval (added executable Phase 3 runtime load-test harness script + release-gate metrics endpoint for SLO evaluation).
- [x] Add runbooks: incident response, export failures, memory/index corruption, Discord outage mode (added dedicated docs in `docs/tenant-runtime-incident-response-runbook.md`, `docs/tenant-runtime-export-failures-runbook.md`, `docs/tenant-runtime-memory-index-corruption-runbook.md`, and `docs/tenant-runtime-discord-outage-mode-runbook.md`).

## 8) Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Underestimated coupling to instance APIs | Timeline slips, regression risk | Route inventory + bridge layer + phased retirement |
| Memory quality degrades during migration | User trust loss | Eval gates, replay tests, canary rollout, rollbacks |
| Tool policy gaps create security risk | Severe | Default-deny + approval + audit + kill-switches |
| Discord API/rate limit behavior under load | Service instability | Sharding, queue buffering, backoff, ingestion SLO tests |
| Export feature complexity | Delayed ownership promise | Build export in parallel by Phase 6, not as post-GA add-on |

## 9) Success Metrics and Release Gates

## 9.1 Product and quality targets
- [ ] Core conversation p95 latency meets target.
- [ ] Tool success rate and approval turnaround meet target.
- [ ] Memory recall quality exceeds baseline.
- [ ] Support tickets for “agent forgot context” trend down materially.
- [ ] Export completion SLA met for p95 tenant size.

## 9.2 Business continuity targets
- [ ] Seed/staging tenant datasets pass migration integrity checks with zero critical errors.
- [ ] Stripe billing lifecycle smoke tests pass in test mode for onboarding, upgrade, downgrade, cancel, and portal flows.
- [ ] Internal dogfood canary runs for 14 consecutive days with no Sev1 tenant isolation/security incidents.

## 10) Immediate Next 14 Execution Actions

1. [x] Create ADR documenting final migration architecture and boundaries.
2. [x] Freeze visual workflow builder roadmap and update docs/navigation.
3. [x] Build route inventory sheet for all `/api/instances/*` handlers.
4. [x] Draft tenant foundation schema migration set.
5. [x] Implement legacy `instances -> tenants` mapping and backfill (including rerunnable script + verification checks).
6. [x] Add shared tenant-scoped auth middleware and policy guards across all `/api/tenants/*` routes.
7. [x] Complete tenant API parity for launch-critical `adapt` families: memory settings/checkpoint/compress.
8. [x] Complete tenant API parity for launch-critical integration/tooling families: mcp-servers + composio.
9. [x] Add route-level parity integration tests for all launch-critical tenant/bridge families (tenant route contract matrix + bridge route contract matrix + existing parity/trace suites wired in `npm test`).
10. [x] Add request tracing IDs across tenant APIs and runtime workers (shared request-trace helper + proxy propagation + workflow worker trace propagation plus tenant wrapper standardization complete).
11. [x] Finalize central worker queue/runtime infra choice and implementation skeleton.
12. [~] Implement run orchestrator state machine + queue contract (canary retry backoff scheduling + dead-letter tagging added in processor route).
13. [x] Implement export job schema and manifest format (schema + RLS complete in `00036`; API endpoints, processor job lifecycle, retry path, and signed manifest bundle flow implemented).
14. [x] Expand rollback runbook with phase-specific appendices for active pre-launch phases.

## 10.1) Current Execution Sprint: Blockers + Safety + Trace

### A. Close blocker decisions first
- [x] Draft blocker decision packet for queue/runtime hosting, vector backend budget envelope, and export format priority.
- [x] Confirm final queue/runtime hosting decision and record owner sign-off (selected: Supabase-native queue/worker path for pre-launch; fallback: hybrid external workers on latency/backlog breach).
- [x] Confirm final vector backend + budget decision and record owner sign-off (selected: Postgres/pgvector in primary stack; fallback: hybrid hot-set externalization on latency/quality breach).
- [x] Confirm final export format contract (`jsonl` vs `jsonl + parquet`) and record owner sign-off (selected: `jsonl` primary; fallback: optional parquet artifact when validated demand exists).

### B. Finish safety/validation
- [x] Publish tenant isolation and RLS test matrix artifact for implementation tracking.
- [~] Add automated tenant-isolation denial test suite (role-gate + tenant-context authorization denial tests + DB-level RLS denial integration test harness added; run with real staging Supabase credentials still pending).
- [x] Expand route-level parity integration tests across launch-critical tenant/bridge families (tenant route contract matrix + bridge route contract matrix + existing parity/trace tests are now wired into `npm test`).
- [!] Execute staging backfill verification report with zero critical integrity findings (currently blocked: `.env.local` uses placeholder Supabase URL/service-role values).

### C. Add trace IDs across tenant APIs and workers
- [x] Add shared request-trace utility and middleware-level `x-request-id` propagation.
- [~] Propagate request trace IDs through workflow worker invocation, lifecycle events, and worker metadata.
- [x] Add automated tests for API + worker request trace propagation and response headers (tenant context + tenant memory + launch-critical bridge propagation + tenant route contract coverage are now in suite).

## 11) Tracking Template (Update as Work Proceeds)

### Status legend
- [ ] Not started
- [~] In progress
- [x] Completed
- [!] Blocked

### Execution log (append-only)
- 2026-02-24: Implemented unblocked Phase 4 mutating-tool starter slice without Supabase credentials: added mutating runtime tool module with first writable tool `tenant_memory_write` (`src/lib/runtime/tenant-runtime-mutating-tools.ts`) including strict payload validation and `tenant_memory_records` persistence, wired central runtime execution to route mutating tool keys through dedicated execution path (`src/lib/runtime/tenant-runtime-tools.ts`), added centralized approval requirement resolver enforcing mandatory queueing for mutating tools and `approval_mode=always` (`src/lib/runtime/tenant-runtime-tool-approval.ts`), integrated policy gate checks for memory-write kill-switch and new approval resolver (`src/lib/runtime/tenant-runtime-policy.ts`), seeded baseline tool catalog/default policies including `tenant_memory_write` via migration `supabase/migrations/00042_tenant_runtime_tool_catalog_seed.sql`, expanded tool risk inventory docs, and added focused unit tests for mutating tool validation + approval requirement behavior (`src/lib/runtime/tenant-runtime-mutating-tools.test.ts`, `src/lib/runtime/tenant-runtime-tool-approval.test.ts`) wired into `npm test`; validation passed (`npm test`, `npm run lint`, `npm run build`).
- 2026-02-24: Implemented unblocked data-integrity validation slice without Supabase credentials: added customer/billing linkage verifier script (`scripts/verify-customer-billing-linkage.ts`) with fail-fast placeholder credential checks plus tenant/customer/mapping and Stripe pointer integrity assertions (duplicate Stripe IDs, missing tenant anchors for billed customers, active/past_due billing pointer gaps, and mapping drift/orphan checks), wired npm command `npm run verify:customer-billing-linkage`, and reconciled backlog status notes in this plan for the new script and implemented policy/approval runtime modules.
- 2026-02-24: Implemented additional unblocked Phase 2 knowledge tenantization slice without Supabase credentials: migrated Knowledge settings initial data load to tenant-first reads (`tenant_knowledge_items`, `tenant_agents`) with legacy table fallback only when tenant rows are absent, including tenant-to-legacy ID/config mapping for UI compatibility (`src/app/(dashboard)/settings/knowledge/page.tsx`), and hardened Knowledge panel tenant API mutation handling to consume standardized tenant response envelopes (`payload.data.file`, `payload.data.success`, `payload.error.message`) in upload/reassign/delete flows (`src/components/settings/knowledge-panel.tsx`); validation passed (`npm test`, `npm run lint`).
- 2026-02-24: Implemented additional unblocked Phase 2 channels tenantization slice without Supabase credentials: switched Channels settings initial assistant data load to tenant-first reads from `tenant_agents` with config-to-agent mapping and legacy `agents` fallback only when tenant rows are absent (`src/app/(dashboard)/settings/channels/page.tsx`), reducing instance-table coupling while preserving compatibility; validation passed (`npm test`, `npm run lint`).
- 2026-02-24: Implemented unblocked Phase 6.2 portability UX slice without Supabase credentials: extended tenant exports/settings UI with import dry-run tooling in `src/components/settings/tenant-exports-panel.tsx` (scope/format/options controls, JSON records input, `POST /api/tenants/[tenantId]/import/dry-run` execution, and compatibility/summary/issues rendering with envelope-aware error handling) so existing dry-run backend validation is now directly usable from dashboard settings; validation passed (`npm test`, `npm run lint`).
- 2026-02-24: Added tenantization regression guard without Supabase credentials: introduced non-workflow dashboard/settings hygiene test that fails on legacy `/api/instances/*` usage (`src/lib/runtime/tenantization-hygiene.test.ts`), scoped with workflow-path exclusions, and wired it into `npm test` (`package.json`) to prevent accidental reintroduction of instance-centric endpoints in tenantized surfaces; validation passed (`npm test`, `npm run lint`).
- 2026-02-24: Completed follow-up cleanup for dashboard tenant-status migration without Supabase credentials: removed unused legacy instance-status polling hook after rewiring dashboard status card to tenant context (`src/hooks/use-instance-status.ts` removed; replacement remains `src/hooks/use-tenant-context-status.ts`), reducing accidental future regressions back to `/api/instances/[id]/status`; validation passed (`npm test`, `npm run lint`).
- 2026-02-24: Implemented additional unblocked Phase 2 dashboard tenantization slice without Supabase credentials: migrated dashboard status polling from legacy instance status endpoint to tenant context endpoint by adding tenant context status hook (`src/hooks/use-tenant-context-status.ts`), rewiring status card to consume tenant status/runtime gates from `/api/tenants/[tenantId]/context` (`src/components/dashboard/instance-status-card.tsx`), and removing direct dashboard instance lookup dependency (`src/app/(dashboard)/dashboard/page.tsx`); validation passed (`npm test`, `npm run lint`).
- 2026-02-24: Hardened the Phase 2 channels assistant tenantization slice by aligning client-side parsing with tenant API response envelopes: updated assistant list/preset deployment error and data handling to consume `payload.data` + `payload.error.message` for `/api/tenants/[tenantId]/agents*` responses (`src/components/dashboard/assistants-list.tsx`, `src/components/dashboard/agent-presets-picker.tsx`); validation passed (`npm test`, `npm run lint`).
- 2026-02-24: Implemented additional unblocked Phase 2 tenantization slice without Supabase credentials: migrated dashboard Channels assistant management flows from legacy instance APIs to tenant APIs by switching assistant list refresh/create/update/delete and suggested preset deployment from `/api/instances/[id]/agents*` to `/api/tenants/[tenantId]/agents*` (`src/components/dashboard/assistants-list.tsx`, `src/components/dashboard/agent-presets-picker.tsx`, `src/app/(dashboard)/settings/channels/page.tsx` with `getCustomerTenant` wiring); validation passed (`npm test`).
- 2026-02-24: Implemented additional unblocked Phase 4 policy hardening slice without Supabase credentials: extended tenant runtime policy evaluator to enforce customer extension trust policy on tool metadata source types (`source_type`, `verified`, `slug`) by integrating trust-policy loading/evaluation into tool decisioning (`src/lib/runtime/tenant-runtime-policy.ts`), added targeted unit tests for trust-context normalization and allow/deny outcomes (`src/lib/runtime/tenant-runtime-policy.test.ts`), and wired tests into `npm test`.
- 2026-02-24: Implemented additional unblocked Phase 4 safe-tool migration slice without Supabase credentials: introduced shared runtime safe-tool execution module (`src/lib/runtime/tenant-runtime-safe-tools.ts`) and wired both production tool execution and transcript parity harness to the same implementation (`src/lib/runtime/tenant-runtime-tools.ts`, `src/lib/runtime/tenant-tool-parity-harness.ts`) to prevent drift; expanded safe tool surface with `uuid`, `base64_encode`, and `base64_decode` (strict payload validation) plus dedicated unit tests (`src/lib/runtime/tenant-runtime-safe-tools.test.ts`) and expanded transcript fixtures to exercise new read-only tools (`src/lib/runtime/__fixtures__/tenant-tool-parity-transcripts.json`); updated tool inventory docs (`docs/tenant-runtime-tool-risk-inventory.md`).
- 2026-02-24: Implemented unblocked Phase 0/3 execution slice without Supabase credentials: added baseline SLO capture tooling (`scripts/runtime-baseline-slo-report.ts`, `npm run report:tenant-runtime-baseline-slos`) and usage/runbook doc (`docs/tenant-runtime-baseline-slo-capture.md`) to measure latency/success/memory-hit placeholders once staging credentials are available; implemented progressive multi-part Discord runtime response dispatch (`src/lib/runtime/tenant-runtime-discord.ts`, `src/lib/runtime/tenant-runtime-worker.ts`) so long responses are emitted as ordered message parts instead of a single truncated payload; expanded unit coverage for runtime message chunking and sequence dispatch (`src/lib/runtime/tenant-runtime-discord.test.ts`).
- 2026-02-24: Implemented runtime circuit-breaker safety slice without staging credentials: added shared runtime circuit-breaker utility (`src/lib/runtime/tenant-runtime-circuit-breaker.ts`) with failure-threshold and cooldown behavior plus tests (`src/lib/runtime/tenant-runtime-circuit-breaker.test.ts`), integrated breaker guards around external Discord dispatch calls in runtime workers (`src/lib/runtime/tenant-runtime-worker.ts`) and around tool execution paths (`src/lib/runtime/tenant-runtime-tools.ts`), and surfaced breaker-open diagnostics in runtime failure payloads; validation passed (`npm run lint`, `npm test`, `npm run build`).
- 2026-02-24: Extended Phase 6.2 import-validation for portability controls without staging credentials: added selective-scope targeting support (`selected_tables`) and schema compatibility reporting (`compatibility.status`) to tenant import dry-run contracts/runtime (`src/lib/runtime/tenant-api-contracts.ts`, `src/lib/runtime/tenant-import.ts`), expanded validation/test coverage for selected-table/scope mismatches and version compatibility (`src/lib/runtime/tenant-api-contracts.test.ts`, `src/lib/runtime/tenant-import.test.ts`), and updated import dry-run contract docs (`docs/tenant-export-format-contract.md`); validation passed (`npm run lint`, `npm test`, `npm run build`).
- 2026-02-24: Implemented Phase 6.2 import-validation slice without staging credentials: added tenant import dry-run validation service (`src/lib/runtime/tenant-import.ts`) and endpoint (`POST /api/tenants/[tenantId]/import/dry-run`) with role-gated access, tenant-route wrapper integration, scope/table compatibility checks, strict tenant-id match enforcement, and structured warning/error output (`src/app/api/tenants/[tenantId]/import/dry-run/route.ts`); added contract + runtime tests (`src/lib/runtime/tenant-api-contracts.test.ts`, `src/lib/runtime/tenant-import.test.ts`, `src/lib/runtime/tenant-route-contracts.test.ts`) and documented dry-run response shape in export/import contract docs (`docs/tenant-export-format-contract.md`); validation passed (`npm run lint`, `npm test`, `npm run build`).
- 2026-02-24: Implemented additional unblocked pre-credential hardening slice: hardened Phase 3 release-gates endpoint to fail fast with actionable `503` environment diagnostics (instead of opaque `500 [object Object]`) when Supabase env values are placeholders (`src/app/api/admin/tenants/runtime/release-gates/route.ts`, `src/lib/runtime/supabase-env.ts`, `src/lib/security/safe-error.ts`, `src/lib/runtime/supabase-env.test.ts`), and completed Phase 6 full-export metadata scope by adding billing metadata pointers + skills metadata summaries into `manifest.json` (`src/lib/runtime/tenant-exports.ts`, `src/lib/runtime/tenant-exports-metadata.test.ts`, `docs/tenant-export-format-contract.md`); validation passed (`npm run lint`, `npm test`, `npm run build`).
- 2026-02-24: Implemented Phase 6.3 retention/deletion controls without staging credentials: added tenant data-governance policy service + sanitizer (`src/lib/runtime/tenant-data-governance.ts`), added tenant policy API routes (`GET/PUT /api/tenants/[tenantId]/data-governance`) with role-gated updates and audit logging, expanded route contract coverage to include the new route, added unit coverage (`src/lib/runtime/tenant-data-governance.test.ts`), and published policy documentation (`docs/tenant-data-governance-policy.md`); updated OpenAPI contract to include `data-governance`.
- 2026-02-24: Implemented Phase 6.3 export governance hardening without staging credentials: added structured audit logging to tenant export list/create/detail/retry routes and admin export processor route (`src/app/api/tenants/[tenantId]/export/route.ts`, `src/app/api/tenants/[tenantId]/export/[exportId]/route.ts`, `src/app/api/tenants/[tenantId]/export/[exportId]/retry/route.ts`, `src/app/api/admin/tenants/exports/process/route.ts`), added governance contract tests (`src/lib/runtime/tenant-export-governance-contracts.test.ts`), and wired the test into `npm test`.
- 2026-02-24: Implemented Phase 4.3 regression harness without staging credentials: added transcript-based parity harness (`src/lib/runtime/tenant-tool-parity-harness.ts`), fixture scenarios (`src/lib/runtime/__fixtures__/tenant-tool-parity-transcripts.json`), and rollout-gating tests (`src/lib/runtime/tenant-tool-parity-harness.test.ts`) with pass/fail aggregation by tool and tenant role profile; wired harness into `npm test` and documented usage/extension in `docs/tenant-runtime-tool-parity-harness.md`.
- 2026-02-24: Advanced unblocked Phase 2/6 slices without staging credentials: expanded launch-critical OpenAPI contract coverage to additional tenant route families in `docs/openapi/tenant-runtime-launch-critical.openapi.yaml`; expanded full export bundle table scope to include runtime/tool logs (`tenant_runtime_runs`, `tenant_tool_invocations`) in `src/lib/runtime/tenant-exports.ts`; and published export format contract documentation in `docs/tenant-export-format-contract.md`.
- 2026-02-24: Completed roadmap/governance documentation slice without staging credentials: published migration charter + success metrics (`docs/multitenant-runtime-migration-charter.md`), formalized pre-launch workflow-builder freeze policy (`docs/workflow-builder-freeze-policy.md`), and documented current central runtime tool inventory with risk classification (`docs/tenant-runtime-tool-risk-inventory.md`); updated plan checkpoints for Phase 0 product decisions, Immediate Action #2, and Phase 4 tool inventory.
- 2026-02-24: Completed additional DevEx/operations slice without staging credentials: added local tenant-runtime dev profile script (`npm run dev:tenant-runtime-local`) and env guidance (`TENANT_RUNTIME_PROCESSOR_TOKEN` in `.env.local.example`), published local-profile setup/troubleshooting doc (`docs/tenant-runtime-local-dev-profile.md`), and added dedicated operational runbooks for incident response, export failures, memory/index corruption, and Discord outage mode (`docs/tenant-runtime-incident-response-runbook.md`, `docs/tenant-runtime-export-failures-runbook.md`, `docs/tenant-runtime-memory-index-corruption-runbook.md`, `docs/tenant-runtime-discord-outage-mode-runbook.md`).
- 2026-02-24: Implemented Phase 2 contract-hardening and rollback-playbook completion slice without staging credentials: added shared tenant API Zod contracts (`src/lib/runtime/tenant-api-contracts.ts`) with dedicated tests (`src/lib/runtime/tenant-api-contracts.test.ts`), migrated launch-critical tenant routes to shared request schemas (`/api/tenants/[tenantId]/export`, `/api/tenants/[tenantId]/approvals/[approvalId]/decision`, `/api/tenants/[tenantId]/discord/ingress`), published launch-critical OpenAPI artifact (`docs/openapi/tenant-runtime-launch-critical.openapi.yaml`), and expanded the rollout/rollback playbook with phase-specific appendices A-D (`docs/multitenant-runtime-rollout-rollback-playbook.md`).
- 2026-02-24: Implemented tenant/workspace switcher UI and selection persistence without external staging dependencies: added cookie-backed tenant selection support in dashboard session helpers (`getCustomerTenant`, `getCustomerTenants`) and new selection API route (`POST /api/tenants/select`), then wired Topbar workspace selector + layout data loading so dashboard/settings flows resolve against the active selected tenant (`src/lib/auth/dashboard-session.ts`, `src/app/api/tenants/select/route.ts`, `src/components/dashboard/topbar.tsx`, `src/app/(dashboard)/layout.tsx`).
- 2026-02-24: Implemented additional dashboard/settings UX priorities without requiring staging credentials: added dashboard approvals inbox card with pending count + latest request previews linking to `/settings/approvals` (`src/components/dashboard/tenant-approvals-inbox-card.tsx`, wired in `src/app/(dashboard)/dashboard/page.tsx`), and added memory retrieval diagnostics panel with total/active/tombstoned/recent writes, tier distribution, confidence sample average, and last-write timestamp (`src/components/settings/memory-retrieval-diagnostics-panel.tsx`, wired in `src/app/(dashboard)/settings/memory/page.tsx`).
- 2026-02-24: Implemented exports operations UI and additional workflow-builder de-emphasis: added settings exports page (`/settings/exports`) with tenant export queueing, retry, job-history/detail inspection, and signed manifest download actions (`src/app/(dashboard)/settings/exports/page.tsx`, `src/components/settings/tenant-exports-panel.tsx`); extended tenant export detail API to return signed artifact URLs (`/api/tenants/[tenantId]/export/[exportId]`); updated settings navigation/sidebar to expose Exports and moved workflow builder to a lower-prominence legacy label/position (`Workflows (Legacy Builder)`).
- 2026-02-24: Wired approval decision resume to exact pending tool invocation steps using continuation tokens: added continuation token persistence/index migration `00041_tenant_tool_invocation_continuation_token.sql`, extended `tenant-runtime-tools` with token encode/decode + resume execution path, updated tenant approval decision route to attach encoded `tool_resume_token` metadata on approved runs, and updated runtime worker path to consume continuation tokens and resume/replay the exact pending invocation.
- 2026-02-24: Implemented Phase 3 production runtime + Phase 4 security-critical starter slice: added production runtime processor route (`/api/admin/tenants/runtime/process`) and tenant ingress route (`/api/tenants/[tenantId]/discord/ingress`) backed by new `discord_runtime` run kind, added Discord gateway connection manager scaffold (`src/lib/runtime/tenant-runtime-discord-gateway.ts`) with shard/intents snapshot + ingress normalization, introduced centralized runtime tool policy evaluator (`src/lib/runtime/tenant-runtime-policy.ts`), added runtime tool execution + approval dispatch module (`src/lib/runtime/tenant-runtime-tools.ts`), added tenant approval queue APIs (`/api/tenants/[tenantId]/approvals`, `/api/tenants/[tenantId]/approvals/[approvalId]/decision`), added approvals dashboard UI (`/settings/approvals`), and added mandatory tool invocation persistence/audit foundation via migration `00040_tenant_runtime_phase4_policy_approval.sql` (`tenant_tool_invocations` + approval outcome wiring).
- 2026-02-24: Executed Phase 3 validation commands for load/recovery and release-gate endpoint checks; captured failed evidence and blocking prerequisites in `docs/tenant-runtime-phase3-validation-report-2026-02-24.md` (`NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` placeholders; initial local report captured a pre-hardening release-gates `500` response that was later replaced with explicit `503` diagnostics in the endpoint hardening slice).
- 2026-02-24: Added bridge lifecycle discipline for active instance compatibility routes by standardizing `Deprecation` + `Sunset` headers in `src/lib/runtime/instance-bridge.ts`, extended bridge header tests, and published route-family sunset schedule in `docs/multitenant-instance-api-retirement-schedule.md`.
- 2026-02-24: Implemented Phase 3 runtime governance controls and release-gate validation tooling: added tenant runtime governance module (request/token/tool-call/concurrency quotas, spam duplicate controls, prompt abuse blocking, policy-driven dispatch timeout), wired governance into tenant and admin Discord ingress routes, added Phase 3 release-gate report endpoint (`GET /api/admin/tenants/runtime/release-gates`), and added operational validation harness scripts (`npm run loadtest:tenant-runtime-phase3`, `npm run check:tenant-runtime-recovery`).
- 2026-02-24: Completed Phase 3 production-critical Discord runtime slice: implemented automatic tenant guild/channel mapping resolver + admin auto-routed ingress endpoint (`/api/admin/tenants/runtime/discord/ingress`), added Discord API rate-limit handling with retry-after propagation and processor-aware retry scheduling, and shipped dead-letter operator actions (`GET /api/admin/tenants/runtime/dead-letter`, `POST /api/admin/tenants/runtime/dead-letter/[runId]/retry`, `POST /api/admin/tenants/runtime/dead-letter/[runId]/dismiss`).
- 2026-02-23: Created master migration plan combining prior code review findings + OpenClaw/QMD research + memory/search hardening strategy.
- 2026-02-23: Added ADR `docs/adr/2026-02-23-multitenant-runtime-strangler-architecture.md`.
- 2026-02-23: Added full `/api/instances/*` inventory + migration tags in `plans/discord-multitenant-instance-route-inventory.md`.
- 2026-02-23: Added rollback runbook `docs/multitenant-runtime-rollout-rollback-playbook.md`.
- 2026-02-23: Added tenant runtime schema migration scaffold `supabase/migrations/00036_tenant_runtime_foundation.sql` (tenant tables, mapping/backfill, RLS, runtime flags/kill switches).
- 2026-02-23: Added tenant auth/gate app scaffolding and initial endpoint `GET /api/tenants/[tenantId]/context`.
- 2026-02-23: Added tenant runtime app contracts and helpers: `src/types/tenant-runtime.ts`, `src/lib/runtime/tenant-auth.ts`, `src/lib/runtime/tenant-runtime-gates.ts`, and `src/types/database.ts` re-exports.
- 2026-02-23: Updated settings navigation copy to de-emphasize workflow builder (`Workflows (Legacy)`) in `src/lib/navigation/settings.ts`.
- 2026-02-23: Validation passed on implementation slice (`npm run lint`, `npm run build`).
- 2026-02-23: Audited plan vs codebase and reconciled status checkboxes (Phase 0 safety controls, Phase 1 schema/mapping/RLS marked complete in code; Phase 2/7 wording corrected where implementation is scaffold-only).
- 2026-02-23: Implemented Phase 2 agents parity slice end-to-end: tenant agent CRUD APIs, tenant-agent runtime service with legacy hydration/sync, and gated instance-route bridges for `/api/instances/[id]/agents*` with compatibility responses.
- 2026-02-23: Re-ran validation after agents parity implementation (`npm run lint`, `npm run build`).
- 2026-02-23: Implemented Phase 2 knowledge parity slice end-to-end: tenant knowledge CRUD/upload APIs, tenant-knowledge runtime service with legacy hydration/sync, and gated instance-route bridges for `/api/instances/[id]/knowledge*`.
- 2026-02-23: Added bridge payload parity tests (`src/lib/runtime/tenant-bridge-parity.test.ts`) and updated `npm test` command list.
- 2026-02-23: Re-ran validation after knowledge parity implementation (`npm run lint`, `npm test`, `npm run build`).
- 2026-02-23: Corrected audit status mismatches: marked Phase 1 backfill job and Phase 0 per-phase rollback coverage as in progress, and marked Phase 2 legacy bridge exit criterion as partial (agents/knowledge families only).
- 2026-02-23: Added tenant runtime backfill/verification scripts (`scripts/backfill-tenant-runtime-foundation.ts`, `scripts/verify-tenant-runtime-backfill.ts`) plus npm commands (`backfill:tenant-runtime`, `verify:tenant-runtime-backfill`) and advanced Phase 1 mapping/backfill status.
- 2026-02-23: Reframed master plan for pre-launch/zero-customer execution mode: tenant-native paths marked launch-critical, migration/cutover work deferred behind explicit Phase 7 activation gate, and immediate actions reprioritized accordingly.
- 2026-02-23: Implemented Phase 2 memory parity slice: tenant memory settings/checkpoint/compress APIs, `tenant-memory` runtime service, and gated instance-route bridges for `/api/instances/[id]/memory/*`.
- 2026-02-23: Re-ran validation after memory parity implementation (`npm run lint`, `npm run build`).
- 2026-02-23: Implemented Phase 2 integration/tooling parity slice: tenant MCP + Composio runtime services and tenant route families for `/api/tenants/[tenantId]/mcp-servers*` and `/api/tenants/[tenantId]/composio*`.
- 2026-02-23: Migrated integrations and MCP settings surfaces to tenant APIs (`/settings/integrations`, `/settings/mcp-servers`) and added cached tenant resolver support in dashboard session helpers.
- 2026-02-23: Migrated remaining settings panels (knowledge, memory, skills, farm profile) from instance APIs to tenant APIs; added tenant routes `POST /api/tenants/[tenantId]/update-skills` and `PUT /api/tenants/[tenantId]/config`.
- 2026-02-23: Re-ran validation after integration/settings parity implementation (`npm run lint`, `npm test`, `npm run build`).
- 2026-02-23: Started execution sprint for blocker decisions + safety/validation + tracing: drafted blocker decision packet, added tenant isolation/RLS test matrix artifact, introduced shared request-trace helper + middleware propagation, and wired workflow run processor/worker path to propagate request trace IDs (`x-request-id`, worker context metadata, lifecycle/webhook headers).
- 2026-02-23: Re-ran validation after trace propagation + sprint planning updates (`npm run lint`, `npm test`, `npm run build`).
- 2026-02-23: Added automated safety/trace tests: tenant role-policy denial tests, tenant context endpoint authorization denial + trace-header tests, and workflow run context command trace propagation tests; refactored tenant context route to consume a dependency-injected endpoint handler for deterministic authorization testing.
- 2026-02-24: Expanded launch-critical bridge safety/trace coverage: added shared instance bridge gate/header helper, wired agents/knowledge/memory instance bridge routes to shared gate decisions with trace-aware bridge headers, extended bridge parity tests to memory settings/operations, and fixed workflow worker trace variable ordering in process-runs worker script.
- 2026-02-24: Re-ran validation after bridge safety/trace slice (`npm run lint`, `npm test`, `npm run build`).
- 2026-02-24: Added dependency-injected tenant memory settings endpoint (`GET`/`PUT`) with request-trace response headers, wired tenant memory settings route to shared endpoint handler, and added representative tenant read/write route tests for auth, runtime-gate denial, role denial, deploy warning path, and trace-header propagation.
- 2026-02-24: Re-ran validation after tenant route parity test slice (`npm run lint`, `npm test`, `npm run build`).
- 2026-02-24: Attempted staging backfill verification commands (`npm run backfill:tenant-runtime -- --reconcile-owner-membership --refresh-legacy-instance-count`) and confirmed execution is blocked by placeholder `.env.local` Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`; placeholder service-role key).
- 2026-02-24: Added explicit backfill verification artifact `docs/multitenant-backfill-verification-report-2026-02-24.md` documenting blocker status and rerun steps required to close the Phase 1 gate.
- 2026-02-24: Added DB-level RLS denial integration test harness `src/lib/runtime/tenant-rls-db-denial.test.ts` (cross-tenant read/write denial assertions using real Supabase auth + tenant fixture data; env-gated skip when credentials are placeholders).
- 2026-02-24: Hardened backfill verification scripts with fail-fast placeholder credential checks in `scripts/backfill-tenant-runtime-foundation.ts` and `scripts/verify-tenant-runtime-backfill.ts`.
- 2026-02-24: Blocker decision ownership assigned across queue/runtime hosting, vector backend budget, and export format decisions (owner: Nick Horob); remaining work is final option selection + rationale/fallback/cost sign-off in decision packet.
- 2026-02-24: Implemented shared tenant route wrapper (`src/lib/runtime/tenant-route.ts`) and migrated all tenant API routes under `/api/tenants/[tenantId]/*` to centralized auth/role/gate/trace handling; all tenant responses now consistently emit `x-request-id`.
- 2026-02-24: Expanded test coverage with additional bridge-header assertions in `src/lib/runtime/instance-bridge.test.ts`; route-family integration coverage remains tracked as in-progress pending a dedicated Next route-test harness compatible with path aliases in the current Node test runner.
- 2026-02-24: Finalized blocker ADR decisions with owner sign-off in `docs/adr/2026-02-23-runtime-blocker-decision-packet.md` (queue/runtime hosting: Supabase-native pre-launch, vector backend: Postgres/pgvector, export format: `jsonl` primary), including fallback triggers and 90-day planning cost envelopes.
- 2026-02-24: Implemented Phase 3 skeleton slice for canary validation: migration `supabase/migrations/00037_tenant_runtime_queue_canary.sql`, queue/state-machine/orchestrator/worker runtime modules, and tenant canary ingress path (`POST /api/tenants/[tenantId]/discord/ingress/canary`) plus admin canary processor path (`POST /api/admin/tenants/runtime/process-canary`) with no-op worker completion response.
- 2026-02-24: Added queue state-machine unit coverage (`src/lib/runtime/tenant-runtime-run-state.test.ts`) and re-ran validation (`npm run lint`, `npm test`, `npm run build`).
- 2026-02-24: Added DB-level tenant isolation denial integration test harness `src/lib/runtime/tenant-rls-db-denial.test.ts` and wired it into `npm test` (env-gated skip when Supabase credentials are placeholder values).
- 2026-02-24: Added fail-fast placeholder credential validation to tenant runtime backfill scripts to replace opaque `fetch failed` errors with actionable setup guidance.
- 2026-02-24: Re-ran validation after safety updates (`npm run lint`, `npm test`); test suite passed with DB RLS integration test skipped due placeholder credentials.
- 2026-02-24: Re-ran Phase 1 backfill verification commands and captured explicit blocker output in `docs/multitenant-backfill-verification-report-2026-02-24.md`.
- 2026-02-24: Advanced Phase 3 canary processor with runtime retry handling: added exponential backoff requeue scheduling for failed runs, terminal dead-letter tagging when attempts are exhausted, and processor response counters for `retried`/`dead_lettered`; added retry policy unit tests in `src/lib/runtime/tenant-runtime-retry.test.ts`.
- 2026-02-24: Implemented real Discord canary dispatch path behind feature flag `tenant.runtime.discord_dispatch`: added dispatch sender/runtime helpers (`src/lib/runtime/tenant-runtime-discord.ts`), dispatch worker factory + legacy-instance token resolution (`src/lib/runtime/tenant-runtime-worker.ts`), and per-customer flag-based worker selection in canary processor route (`src/app/api/admin/tenants/runtime/process-canary/route.ts`).
- 2026-02-24: Added migration `supabase/migrations/00038_tenant_runtime_discord_dispatch_flag.sql` to seed `tenant.runtime.discord_dispatch` (default disabled) and added dispatch helper unit tests (`src/lib/runtime/tenant-runtime-discord.test.ts`); validation passed (`npm run lint`, `npm test`).
- 2026-02-24: Completed Phase 2 API hardening slice: added central tenant API versioned envelope + idempotency standard in `src/lib/runtime/tenant-route.ts`, persisted idempotency records via `supabase/migrations/00039_tenant_api_idempotency.sql` + `src/lib/runtime/tenant-idempotency.ts`, and expanded launch-critical route parity coverage with `src/lib/runtime/tenant-route-contracts.test.ts` and `src/lib/runtime/instance-bridge-route-contracts.test.ts`.
- 2026-02-24: Implemented Phase 6 export MVP end-to-end: added tenant export routes (`/api/tenants/[tenantId]/export*`), export runtime service + signed manifest bundle flow (`src/lib/runtime/tenant-exports.ts`), and admin export processor route (`/api/admin/tenants/exports/process`); validation passed (`npm run lint`, `npm test`, `npm run build`).

### Audit corrections (2026-02-23)
- `src/lib/runtime/` now includes queue/state-machine/orchestrator/worker canary scaffolding; full tool-gateway/policy/approval engine implementation remains pending.
- `/api/tenants/[tenantId]/*` was scaffold-only (`GET /context`) at audit time; agent/knowledge/memory/mcp/composio plus settings write parity routes (`config`, `update-skills`) are now implemented, while broader channels/workflows tenantization remains outstanding.
- Feature flags and kill switches for tenant runtime are implemented in migration scaffold (`00036`) and connected in runtime gate helpers.
- Route inventory artifact is complete; rollback playbook artifact now includes phase-specific appendices for active pre-launch phases.

### Phase 2 agents parity implementation (2026-02-23)
- Added tenant agent runtime domain service with tenant<->legacy hydration/sync path:
  - `src/lib/runtime/tenant-agents.ts`
- Added tenant API parity routes:
  - `src/app/api/tenants/[tenantId]/agents/route.ts`
  - `src/app/api/tenants/[tenantId]/agents/[agentId]/route.ts`
- Added instance route bridges for agents behind runtime gate checks:
  - `src/app/api/instances/[id]/agents/route.ts`
  - `src/app/api/instances/[id]/agents/[agentId]/route.ts`

### Phase 2 knowledge parity implementation (2026-02-23)
- Added tenant knowledge runtime domain service with tenant<->legacy hydration/sync path:
  - `src/lib/runtime/tenant-knowledge.ts`
- Added tenant API parity routes:
  - `src/app/api/tenants/[tenantId]/knowledge/route.ts`
  - `src/app/api/tenants/[tenantId]/knowledge/[fileId]/route.ts`
- Added instance route bridges for knowledge behind runtime gate checks:
  - `src/app/api/instances/[id]/knowledge/route.ts`
  - `src/app/api/instances/[id]/knowledge/[fileId]/route.ts`
- Added bridge parity mapping helpers + tests:
  - `src/lib/runtime/bridge-parity.ts`
  - `src/lib/runtime/tenant-bridge-parity.test.ts`

### Phase 2 memory parity implementation (2026-02-23)
- Added tenant memory runtime compatibility service for memory settings/operations:
  - `src/lib/runtime/tenant-memory.ts`
- Added tenant API parity routes:
  - `src/app/api/tenants/[tenantId]/memory/settings/route.ts`
  - `src/app/api/tenants/[tenantId]/memory/checkpoint/route.ts`
  - `src/app/api/tenants/[tenantId]/memory/compress/route.ts`
- Added instance route bridges for memory behind runtime gate checks:
  - `src/app/api/instances/[id]/memory/settings/route.ts`
  - `src/app/api/instances/[id]/memory/checkpoint/route.ts`
  - `src/app/api/instances/[id]/memory/compress/route.ts`

### Phase 2 integration/tooling parity implementation (2026-02-23)
- Added tenant MCP + Composio runtime compatibility services:
  - `src/lib/runtime/tenant-mcp.ts`
  - `src/lib/runtime/tenant-composio.ts`
- Added tenant API parity routes:
  - `src/app/api/tenants/[tenantId]/mcp-servers/route.ts`
  - `src/app/api/tenants/[tenantId]/mcp-servers/[serverId]/route.ts`
  - `src/app/api/tenants/[tenantId]/composio/route.ts`
  - `src/app/api/tenants/[tenantId]/composio/connect/route.ts`
  - `src/app/api/tenants/[tenantId]/composio/callback/route.ts`
  - `src/app/api/tenants/[tenantId]/composio/connections/route.ts`
  - `src/app/api/tenants/[tenantId]/composio/toolkits/route.ts`

### Settings panel tenant API parity implementation (2026-02-23)
- Migrated integrations/MCP settings surfaces to tenant APIs:
  - `src/components/settings/composio/composio-integration-panel.tsx`
  - `src/components/settings/mcp-server-list.tsx`
  - `src/app/(dashboard)/settings/integrations/page.tsx`
  - `src/app/(dashboard)/settings/mcp-servers/page.tsx`
  - `src/lib/auth/dashboard-session.ts` (`getCustomerTenant`)
- Migrated remaining settings panels to tenant APIs:
  - `src/components/settings/knowledge-panel.tsx`
  - `src/components/settings/memory-settings-panel.tsx`
  - `src/components/settings/skill-toggle-card.tsx`
  - `src/components/settings/scale-ticket-fields-config.tsx`
  - `src/components/settings/farm-profile-form.tsx`
  - `src/app/(dashboard)/settings/knowledge/page.tsx`
  - `src/app/(dashboard)/settings/memory/page.tsx`
  - `src/app/(dashboard)/settings/skills/page.tsx`
  - `src/app/(dashboard)/settings/farm/page.tsx`
- Added tenant settings write routes needed by migrated panels:
  - `src/app/api/tenants/[tenantId]/update-skills/route.ts`
  - `src/app/api/tenants/[tenantId]/config/route.ts`

### Implemented artifacts from this execution slice
- Data model + security:
  - `supabase/migrations/00036_tenant_runtime_foundation.sql`
- API + auth scaffolding:
  - `src/app/api/tenants/[tenantId]/context/route.ts`
  - `src/lib/runtime/tenant-auth.ts`
  - `src/lib/runtime/tenant-runtime-gates.ts`
- Types/contracts:
  - `src/types/tenant-runtime.ts`
  - `src/types/database.ts`
- Migration docs and operations:
  - `docs/adr/2026-02-23-multitenant-runtime-strangler-architecture.md`
  - `plans/discord-multitenant-instance-route-inventory.md`
  - `docs/multitenant-runtime-rollout-rollback-playbook.md`

### Open blockers
- [x] Confirm infra choice for central worker queue/runtime (selected and signed off in blocker ADR).
- [x] Confirm vector backend selection and budget envelope (selected and signed off in blocker ADR).
- [x] Confirm export format priority (`jsonl` primary vs mixed `jsonl + parquet`) (selected and signed off in blocker ADR).
- [ ] Confirm Phase 7 activation trigger (paying-customer threshold and cutover readiness sign-off owner).

## 12) Source Appendix (Primary References)

- OpenClaw repository and docs:
- https://github.com/openclaw/openclaw
- https://docs.openclaw.ai/usage/channels
- https://docs.openclaw.ai/usage/tools
- https://docs.openclaw.ai/concepts/sessions
- https://docs.openclaw.ai/concepts/memory
- https://docs.openclaw.ai/gateway/security

- QMD:
- https://github.com/tobimori/qmd
- https://github.com/tobimori/qmd/blob/main/README.md
- https://github.com/tobimori/qmd/blob/main/CHANGELOG.md
- https://github.com/tobimori/qmd/blob/main/docs/SYNTAX.md

- Memory/search best-practice references:
- https://arxiv.org/abs/2005.11401 (RAG)
- https://arxiv.org/abs/2307.03172 (Lost in the Middle)
- https://arxiv.org/abs/2310.08560 (MemGPT)
- https://qdrant.tech/documentation/concepts/hybrid-queries/ (hybrid fusion/ranking patterns)
- https://docs.discord.com/developers/docs/topics/gateway
- https://docs.discord.com/developers/docs/interactions/message-components
