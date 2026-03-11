# Pantheon Visual Builder Implementation Master Plan

Last updated: February 17, 2026  
Status: In Progress (Code-Audited)

## 1) Objective

Deliver a production-grade visual workflow builder for Pantheon that:
1. Preserves Pantheon's established visual language.
2. Runs on the existing Hetzner + OpenClaw per-instance runtime model.
3. Enables non-technical operators to design, publish, run, and debug workflows safely.
4. Adds governance, observability, and rollback controls required for safe production use.

## 2) Source of Truth

This plan is based on a full repository audit of implemented code paths, not prior checkbox state.

Primary evidence sources:
- Database migrations in `supabase/migrations`.
- API routes in `src/app/api`.
- Builder and run explorer UI in `src/app/(dashboard)/settings/workflows` and `src/components/workflows`.
- Runtime compile/deploy and dispatch integration in `src/lib/templates/rebuild-config.ts` and `src/app/api/admin/workflows/process-runs/route.ts`.

## 3) Non-Negotiables

- Keep runtime isolation model: workflows execute in tenant OpenClaw containers.
- Keep control-plane compile model: graph -> validated IR -> runtime payload.
- Keep Pantheon visual system (`bg-bg-card`, `text-text-primary`, `border-border`, amber accent hierarchy).
- Accessibility and performance gates are launch blockers.

## 4) Current Product Scope Status

Legend: `[x]` complete, `[ ]` not complete.

### V1 (Must Ship)

- [x] Visual builder canvas (drag/drop node creation, edge connect/delete, node duplicate/delete).
- [x] Node set: trigger, action, condition, delay, handoff, end.
- [x] Inspector panel for per-node configuration.
- [x] Validation panel + graph validation pipeline.
- [x] Publish workflow to tenant runtime end-to-end after each publish.
- [x] Run history + run timeline with step I/O and artifacts visibility.
- [x] Retry from failed step in UI.
- [x] Undo/redo + autosave + immutable version snapshots.
- [x] Workflow rollback to prior published version.
- [x] Create workflow flow in UI (currently API-first).

### V2 (High-Value Expansion)

- [x] Human approval nodes and approval inbox.
- [x] Templates + clone + import/export JSON.
- [x] Branch testing / simulation mode.
- [x] Multi-workflow metadata for tags and owners.

### V3 (Differentiation)

- [x] Natural language workflow draft generation.
- [x] Environment promotion flow (dev/stage/prod).
- [x] Experiment mode with A/B branch evaluation.
- [x] Marketplace-grade reusable playbooks.

## 5) Code-Audited Workstream Status

### 5.1 Schema and Data Model

- [x] `00024_workflow_builder_core.sql` (`workflow_definitions`, `workflow_versions`, RLS, immutable versions).
- [x] `00025_workflow_builder_phase1b.sql` (atomic create/update snapshot RPCs).
- [x] `00026_workflow_runs.sql` (`workflow_runs`, `workflow_run_steps`, `workflow_run_artifacts`, RLS).
- [x] `00027_workflow_approvals.sql`.
- [x] `00031_workflow_templates.sql`.
- [x] `00032_workflow_metadata_and_simulation_foundation.sql` (workflow tags/owner metadata + snapshot RPC extension).
- [x] Optional denormalized `workflow_nodes` and `workflow_edges` tables.
- [x] `00034_workflow_launch_readiness_snapshots.sql` (persisted launch-readiness evidence snapshots + RLS).

### 5.2 Types and Validation

- [x] `src/types/workflow.ts` with node/run/version/error contracts.
- [x] `src/lib/validators/workflow.ts` with deterministic structural checks.
- [x] `src/types/database.ts` exports workflow types.
- [x] Workflow-specific table row interfaces in `database.ts`.

### 5.3 Workflow Authoring APIs

- [x] `GET /api/instances/:id/workflows`
- [x] `POST /api/instances/:id/workflows`
- [x] `GET /api/instances/:id/workflows/:workflowId`
- [x] `PUT /api/instances/:id/workflows/:workflowId`
- [x] `PATCH /api/instances/:id/workflows/:workflowId/status` (archive/unarchive lifecycle mutation).
- [x] `POST /api/instances/:id/workflows/:workflowId/validate`
- [x] `POST /api/instances/:id/workflows/:workflowId/publish`
- [x] `POST /api/instances/:id/workflows/:workflowId/clone`
- [x] `GET /api/instances/:id/workflows/:workflowId/export`
- [x] `POST /api/instances/:id/workflows/import`
- [x] `POST /api/instances/:id/workflows/:workflowId/simulate`
- [x] `GET /api/instances/:id/workflows/launch-readiness/snapshots`
- [x] `POST /api/instances/:id/workflows/launch-readiness/snapshots`
- [x] `GET /api/instances/:id/workflow-templates`
- [x] `POST /api/instances/:id/workflow-templates`
- [x] `POST /api/instances/:id/workflow-templates/:templateId/use`

### 5.4 Runtime and Operations APIs

- [x] `POST /api/instances/:id/workflows/:workflowId/run`
- [x] `GET /api/instances/:id/workflow-runs`
- [x] `GET /api/instances/:id/workflow-runs/:runId`
- [x] `GET /api/instances/:id/workflow-runs/:runId/artifacts/:artifactId/download`
- [x] `POST /api/instances/:id/workflow-runs/:runId/cancel`
- [x] `POST /api/instances/:id/workflow-runs/:runId/retry-step`
- [x] `POST /api/webhooks/openclaw` (run/step/artifact ingestion + idempotency)
- [x] `GET /api/admin/workflows/capture-launch-readiness` (cron-safe persisted evidence capture).

### 5.5 Human Approval APIs

- [x] `GET /api/instances/:id/workflow-approvals`
- [x] `POST /api/instances/:id/workflow-approvals/:approvalId/approve`
- [x] `POST /api/instances/:id/workflow-approvals/:approvalId/reject`

### 5.6 Builder and Explorer UI

- [x] Sidebar entry: Workflows.
- [x] Workflow list route.
- [x] Builder route.
- [x] Runs explorer route.
- [x] Three-panel builder shell (left library, center canvas, right inspector/validation).
- [x] Autosave (2s debounce) + manual save.
- [x] Undo/redo with history labels.
- [x] Publish and run CTAs.
- [x] Create-workflow UI path.
- [x] Command palette with visible keyboard map.
- [x] Guided starter templates in empty states.
- [x] Import/export JSON actions in builder shell.
- [x] Safe simulation preview in builder shell.
- [x] Workflow list owner/tag filters.
- [x] Workflow list archive/unarchive controls.
- [x] Builder version history panel with targeted rollback-to-version actions.
- [x] Run action controls in UI (retry-step, rerun).
- [x] Artifact download UI.

### 5.7 Runtime Integration

- [x] Compiler (`graph -> IR`) and runtime validator wrapper.
- [x] IR embedding into rebuild payload (`PANTHEON_WORKFLOW_IR`).
- [x] Queued run dispatch processor route.
- [x] Scheduled cron invocation of processor (`vercel.json`).
- [x] Gateway worker invocation and signed lifecycle event emission.
- [x] Publish-triggered deploy/rebuild to guarantee runtime IR freshness.
- [x] Native scheduled trigger dispatcher that enqueues runs by cron.

### 5.8 Docs and Rollout

- [x] Docs landing route exists (`src/app/(docs)/docs/page.tsx`).
- [x] Visual builder user guide (`docs/visual-builder-user-guide.md`).
- [x] Builder-specific feature flags.
- [x] Ringed rollout strategy.
- [x] Builder support runbooks and incident SOP.
- [x] Launch-readiness KPI dashboard route and cadence surfacing.
- [x] Persisted launch-readiness snapshot history surfaced in launch dashboard.

## 6) File-by-File Build Plan (Corrected)

### A) Schema + Types
- [x] `supabase/migrations/00024_workflow_builder_core.sql`
- [x] `supabase/migrations/00025_workflow_builder_phase1b.sql`
- [x] `supabase/migrations/00026_workflow_runs.sql`
- [x] `supabase/migrations/00027_workflow_approvals.sql`
- [x] `supabase/migrations/00031_workflow_templates.sql`
- [x] `supabase/migrations/00032_workflow_metadata_and_simulation_foundation.sql`
- [x] `supabase/migrations/00033_workflow_graph_denormalized_tables.sql`
- [x] `supabase/migrations/00034_workflow_launch_readiness_snapshots.sql`
- [x] `src/types/workflow.ts`
- [x] `src/types/database.ts`
- [x] `src/lib/validators/workflow.ts`

### B) Queries + Compiler
- [x] `src/lib/queries/workflows.ts`
- [x] `src/lib/queries/workflow-runs.ts`
- [x] `src/lib/queries/workflow-graph.ts`
- [x] `src/lib/workflows/compiler.ts`
- [x] `src/lib/workflows/validation.ts`
- [x] `src/lib/workflows/templates.ts`
- [x] `src/lib/workflows/import-export.ts`
- [x] `src/lib/workflows/simulation.ts`

### C) API Routes
- [x] `src/app/api/instances/[id]/workflows/route.ts`
- [x] `src/app/api/instances/[id]/workflows/[workflowId]/route.ts`
- [x] `src/app/api/instances/[id]/workflows/[workflowId]/status/route.ts`
- [x] `src/app/api/instances/[id]/workflows/[workflowId]/validate/route.ts`
- [x] `src/app/api/instances/[id]/workflows/[workflowId]/publish/route.ts`
- [x] `src/app/api/instances/[id]/workflows/[workflowId]/rollback/route.ts`
- [x] `src/app/api/instances/[id]/workflows/[workflowId]/clone/route.ts`
- [x] `src/app/api/instances/[id]/workflows/[workflowId]/export/route.ts`
- [x] `src/app/api/instances/[id]/workflows/import/route.ts`
- [x] `src/app/api/instances/[id]/workflows/[workflowId]/simulate/route.ts`
- [x] `src/app/api/instances/[id]/workflows/[workflowId]/run/route.ts`
- [x] `src/app/api/instances/[id]/workflows/launch-readiness/route.ts`
- [x] `src/app/api/instances/[id]/workflows/launch-readiness/snapshots/route.ts`
- [x] `src/app/api/instances/[id]/workflow-runs/route.ts`
- [x] `src/app/api/instances/[id]/workflow-runs/[runId]/route.ts`
- [x] `src/app/api/instances/[id]/workflow-runs/[runId]/artifacts/[artifactId]/download/route.ts`
- [x] `src/app/api/instances/[id]/workflow-runs/[runId]/cancel/route.ts`
- [x] `src/app/api/instances/[id]/workflow-runs/[runId]/retry-step/route.ts`
- [x] `src/app/api/webhooks/openclaw/route.ts`
- [x] `src/app/api/instances/[id]/workflow-approvals/route.ts`
- [x] `src/app/api/instances/[id]/workflow-templates/route.ts`
- [x] `src/app/api/instances/[id]/workflow-templates/[templateId]/use/route.ts`

### D) Builder UI
- [x] `src/app/(dashboard)/settings/workflows/page.tsx`
- [x] `src/app/(dashboard)/settings/workflows/[workflowId]/page.tsx`
- [x] `src/app/(dashboard)/settings/workflows/runs/page.tsx`
- [x] `src/app/(dashboard)/settings/workflows/launch/page.tsx`
- [x] `src/components/workflows/workflow-builder-shell.tsx`
- [x] `src/components/workflows/node-library.tsx`
- [x] `src/components/workflows/workflow-canvas.tsx`
- [x] `src/components/workflows/node-inspector.tsx`
- [x] `src/components/workflows/validation-panel.tsx`
- [x] `src/components/workflows/run-timeline.tsx`
- [x] `src/components/workflows/workflow-create-form.tsx`
- [x] `src/components/workflows/approval-inbox.tsx`
- [x] `src/components/workflows/workflow-status-toggle.tsx`

### E) Deployment + Runtime Integration
- [x] `src/lib/templates/rebuild-config.ts`
- [x] `src/lib/templates/openclaw-config.ts`
- [x] `src/app/api/admin/workflows/process-runs/route.ts`
- [x] `src/app/api/admin/workflows/capture-launch-readiness/route.ts`

### F) Navigation + Docs
- [x] `src/components/dashboard/sidebar.tsx`
- [x] `src/app/(docs)/docs/page.tsx`
- [x] `docs/visual-builder-user-guide.md`

## 7) Critical Gaps to Close for True V1 Completion

1. Resolved: publish now forces instance rebuild/deploy (with automatic rollback if deploy fails).
- Impact addressed: successful publish responses now imply runtime IR refresh for that instance.
- Implemented fix: `POST /api/instances/:id/workflows/:workflowId/publish` invokes `rebuildAndDeploy(instanceId)` and returns an error if deploy fails.

2. Resolved: scheduled trigger enqueuer now scans published workflows and queues due runs.
- Impact addressed: schedule-configured workflows can be enqueued automatically by cron.
- Implemented fix: `GET /api/admin/workflows/process-schedules` evaluates schedule triggers and creates idempotent queued runs.

3. Resolved: operator retry/rerun controls are now available in run explorer UI.
- Impact addressed: incident recovery no longer requires direct API usage.
- Implemented fix: `src/components/workflows/run-timeline.tsx` now wires full rerun and retry-from-step actions to existing run APIs.

4. Resolved: workflow creation and starter template onboarding now exist in UI.
- Impact addressed: new users can complete the core authoring loop from UI alone.
- Implemented fix: added `/settings/workflows/new` with `src/components/workflows/workflow-create-form.tsx` and workflow list entry-point CTA.

5. Resolved: rollback to prior published version now exists with deploy safety checks.
- Impact addressed: release safety and operator confidence are improved.
- Implemented fix: added rollback endpoint + builder affordance with guardrails and deploy-failure recovery.

## 8) Updated Implementation Phases

## Phase 0: Plan Hygiene and Scope Lock (Complete)

### Checklist
- [x] Audit implemented features against code.
- [x] Correct plan checkboxes to match implementation reality.
- [x] Define critical-path V1 closure items.

### Exit Criteria
- [x] Plan is code-audited and actionable.

## Phase 1: Control Plane Foundation (Complete)

### Checklist
- [x] Core schema + RLS.
- [x] Workflow types + validators.
- [x] CRUD + validation APIs.
- [x] Snapshot RPC create/update with optimistic concurrency.
- [x] Audit logging for workflow authoring actions.

### Exit Criteria
- [x] CRUD and snapshots stable.
- [x] Validation is deterministic.

## Phase 2: Builder MVP UI (Mostly Complete)

### Checklist
- [x] Workflow list route with status filtering.
- [x] Builder shell and three-panel layout.
- [x] Drag/drop node creation and edge composition.
- [x] Node inspector per type.
- [x] Autosave + save indicators.
- [x] Undo/redo and duplicate/delete.
- [x] Validation panel with node focus.
- [x] Publish/run CTA wiring.
- [x] Create workflow from UI.
- [x] Command palette with visible keyboard map.
- [x] Guided starter templates.

### Exit Criteria
- [x] New user can create first workflow entirely in UI.
- [x] Keyboard interaction map discoverable in command palette.

## Phase 3: Runtime Compiler + Execution (In Progress)

### Checklist
- [x] Compiler (`graph -> IR`) in control plane.
- [x] IR embedding in rebuild payload.
- [x] Run create/list/detail/cancel/retry-step APIs.
- [x] Webhook ingestion for run/step/artifact lifecycle.
- [x] Dispatch processor route + cron trigger.
- [x] Gateway runtime worker invocation + signed lifecycle emission.
- [x] Publish-triggered rebuild/deploy.
- [x] Scheduled run enqueuer for cron triggers.

### Exit Criteria
- [x] Fresh publish always reflected in runtime IR before next run.
- [x] Schedule-trigger workflows execute without manual API calls.

## Phase 4: Run Explorer + Debugger (In Progress)

### Checklist
- [x] Run list and timeline views.
- [x] Step input/output/error previews.
- [x] Date/duration filter support.
- [x] Rerun-from-step and full rerun controls.
- [x] Error taxonomy labels and guided remediation hints.
- [x] Artifact download/export.

### Exit Criteria
- [x] Operator can recover failed runs without direct API usage.

## Phase 5: Approvals + Governance (Complete)

### Checklist
- [x] Approval schema migration and policy model.
- [x] Approval node type in workflow model/compiler.
- [x] Approval inbox UI and action details.
- [x] Approve/reject/comment/SLA flows.
- [x] Server-side enforcement that cannot be bypassed by client.

### Exit Criteria
- [x] High-risk branches can be paused and approved safely.

## Phase 6: Templates + Sharing + Collaboration (Complete)

### Checklist
- [x] Starter template library from JTBDs.
- [x] Template schema/API (`workflow_templates`, versions).
- [x] Import/export JSON.
- [x] Tagging and owner metadata.
- [x] Conflict UX for concurrent edits (draft version conflict + refresh flow).

### Exit Criteria
- [x] Teams can reuse and adapt workflows quickly.

## Phase 7: Performance + Accessibility Hardening (In Progress)

### Checklist
- [x] Canvas/perf optimization pass (memoization and subscriptions).
- [x] Large-graph rendering strategy.
- [x] Keyboard-only, screen-reader, and contrast audits.
- [x] Touch-target and visible focus conformance checks.
- [x] Motion/reduced-motion pass.

### Exit Criteria
- [ ] Meets launch performance and accessibility gates.

## Phase 8: Launch Readiness + Controlled Rollout (In Progress)

### Checklist
- [x] Builder module feature flags.
- [x] Ringed rollout strategy (canary -> standard -> delayed).
- [x] User docs + guided walkthroughs.
- [x] Support and incident runbooks.
- [x] Baseline KPI dashboard and weekly review cadence.

### Exit Criteria
- [ ] Controlled production rollout complete.
- [ ] Post-launch KPI reviews active.

## 9) Launch Quality Gates (Updated)

## Functional
- [x] Validation catches cycles, unreachable nodes, missing trigger/end, invalid condition branching.
- [x] Create/edit/publish/run works fully end-to-end from UI for all V1 flows.
- [x] Rollback restores prior published workflow version safely.

## UX
- [x] Undo/redo covers core editing actions.
- [x] Validation errors map to node-level focus where applicable.
- [ ] New user can publish first workflow in <= 10 minutes without API usage.
- [x] Retry/rerun controls available in run explorer UI.

## Accessibility
- [x] Keyboard-only editing and inspector operation validated end-to-end.
- [x] Focus indicators consistently visible on all interactive controls.
- [x] Contrast audited to WCAG minimums.

## Performance
- [ ] p75 INP <= 200ms on builder interactions.
- [ ] LCP <= 2.5s on builder entry.
- [ ] CLS <= 0.1 on list and builder routes.

## Reliability
- [x] Run event ingestion idempotent (`openclaw_webhook_events` uniqueness guard).
- [x] Failed runs replayable via UI flows.
- [x] Approval gating bypass prevention.

## 10) KPI Dashboard (Post-Launch)

- [x] Time-to-first-publish (median)
- [x] Draft-to-publish completion rate
- [x] Workflow run success rate
- [x] Retry rate and recovery success
- [x] Approval cycle time
- [x] Weekly active workflow builders
- [x] Estimated operator hours saved

## 11) Progress Tracker

| Workstream | Status | Notes |
|---|---|---|
| Product spec + UX | in_progress | Core V1/V2 UX is shipped (templates, import/export, metadata, simulation); remaining UX proof is first-publish usability validation and launch-gate telemetry closure. |
| Schema + types | in_progress | Core + runs + approvals + templates + metadata migration (`00032`) + denormalized graph tables (`00033`) + launch-readiness snapshot evidence table (`00034`) and workflow-specific DB row interfaces are complete. Remaining schema work is V3/environment promotion scope. |
| APIs + compiler | in_progress | Core + approvals + template + import/export + simulation APIs are complete for V2 scope; archive/unarchive lifecycle + launch-readiness snapshot capture/list APIs are now implemented. V3 API work is deferred. |
| Builder UI | in_progress | Core editor + run controls + approvals inbox + template flow + import/export + metadata filters + simulation preview are implemented; archive/unarchive controls and targeted version-history rollback UI are now shipped. Remaining work is launch UX validation evidence. |
| Runtime execution | in_progress | Dispatch + ingestion + scheduled trigger enqueuer live. |
| Approvals + governance | done | Approval schema/API/UI and server-side approval gating are implemented. |
| Performance + accessibility | in_progress | UI hardening is complete and verified; web-vitals telemetry + gate evaluator API are now implemented for INP/LCP/CLS launch gate tracking. Remaining work is collecting sufficient route traffic to satisfy p75 thresholds. |
| Rollout + docs | in_progress | Ring strategy, guided walkthrough docs, support runbook, launch-readiness KPI dashboard, and persisted snapshot history are implemented; live ring promotion ops still pending production execution. |

Status values: `not_started`, `in_progress`, `blocked`, `done`

## 12) Remaining Work Split (Engineering vs Operational Launch)

### Engineering Tasks

- [x] Add template schema migration (`workflow_templates` + versioning model) in `supabase/migrations` (`00031_workflow_templates.sql`).
- [x] Implement workflow templates library module (`src/lib/workflows/templates.ts`) and associated query helpers.
- [x] Add template APIs (list/create/use) and wire template flows into builder creation UX.
- [x] Implement workflow JSON import/export APIs and UI actions.
- [x] Add multi-workflow tags/owner metadata in schema, validators, types, APIs, and dashboard filters.
- [x] Add workflow-specific table row interfaces in `src/types/database.ts`.
- [x] Decide and implement optional denormalized `workflow_nodes` and `workflow_edges` tables (if required by query/perf needs).
- [x] Implement branch testing / simulation mode.
- [x] Persist launch-readiness evidence snapshots with cron capture automation and launch dashboard history.
- [x] Add workflow archive/unarchive lifecycle API and list-level controls.
- [x] Add builder version history panel with targeted rollback-to-version actions.
- [x] Add workflow TODO/FIXME hygiene regression test.
- [x] Implement V3 backlog: natural language draft generation, environment promotion flow, A/B experiment mode, reusable playbooks.

### Operational Launch Tasks

- [ ] Collect sufficient production telemetry sample volume to evaluate p75 INP/LCP/CLS gates.
- [ ] Verify launch thresholds pass (`INP <= 200ms`, `LCP <= 2.5s`, `CLS <= 0.1`) on workflow list and builder routes.
- [ ] Run and document first-workflow usability checks proving first publish in <= 10 minutes without API usage.
- [ ] Execute controlled ring promotions (`canary -> standard -> delayed`) with rollback checkpoints.
- [ ] Run weekly launch KPI review cadence and document decisions/actions in ongoing operations.
- [ ] Mark Phase 7 and Phase 8 exit criteria complete once evidence is captured.

## 13) Next 2-Week Execution Plan (Recommended)

## Week 1: Templates Foundation (Schema -> API -> UX)

- [x] Add `supabase/migrations/00031_workflow_templates.sql` with template/versioning model and RLS.
- [x] Implement `src/lib/workflows/templates.ts` and associated query helpers.
- [x] Add template APIs (list/create/use) under instance scope.
- [x] Wire template selection into workflow creation UX with starter JTBD templates.
- [x] Add regression tests for template create/use flow and tenant-isolation behavior.

## Week 2: Sharing + Metadata + Simulation

- [x] Implement workflow JSON export/import APIs and builder UI actions.
- [x] Add tags and owner metadata in schema, validators, types, APIs, and workflow list filters.
- [x] Add workflow-specific table row interfaces in `src/types/database.ts`.
- [x] Implement branch testing/simulation mode with safe, non-production side effects.
- [x] Add validation coverage for import/export compatibility and simulation graph constraints.

## Previously Deferred V3 Scope (Now Complete)

- [x] Natural language workflow draft generation.
- [x] Environment promotion flow (`dev/stage/prod`).
- [x] A/B experiment mode and marketplace-grade reusable playbooks.

## 14) Append-Only Change Log

| Date | Author | Area | Change summary | Status | Links |
|---|---|---|---|---|---|
| 2026-02-17 | Codex | V3 Feature Completion | Implemented natural-language draft generation, environment promotions (`dev/stage/prod`), A/B experiment evaluation, and marketplace-grade reusable playbooks across migrations, APIs, builder/create UX, and regression tests. | done | `supabase/migrations/00035_workflow_v3_promotion_and_playbooks.sql`, `src/lib/workflows/nl-draft.ts`, `src/lib/workflows/experiments.ts`, `src/lib/workflows/promotions.ts`, `src/lib/workflows/playbooks.ts`, `src/components/workflows/workflow-builder-shell.tsx`, `src/components/workflows/workflow-create-form.tsx`, `src/app/api/instances/[id]/workflows/generate-draft/route.ts`, `src/app/api/instances/[id]/workflows/[workflowId]/promotions/route.ts`, `src/app/api/instances/[id]/workflows/[workflowId]/experiment/route.ts`, `src/app/api/instances/[id]/workflow-playbooks/route.ts` |
| 2026-02-17 | Codex | Launch Evidence Automation | Added persisted workflow launch-readiness snapshots (`00034`), instance/admin snapshot capture APIs, hourly cron capture route wiring, launch dashboard history trend surfacing, and launch-readiness library persistence/list helpers. | done | `supabase/migrations/00034_workflow_launch_readiness_snapshots.sql`, `src/lib/workflows/launch-readiness.ts`, `src/app/api/instances/[id]/workflows/launch-readiness/snapshots/route.ts`, `src/app/api/admin/workflows/capture-launch-readiness/route.ts`, `src/app/(dashboard)/settings/workflows/launch/page.tsx`, `vercel.json` |
| 2026-02-17 | Codex | Workflow Lifecycle UX | Implemented archive/unarchive lifecycle mutation endpoint and workflow-list archive controls for full archived-tab usability. | done | `src/app/api/instances/[id]/workflows/[workflowId]/status/route.ts`, `src/components/workflows/workflow-status-toggle.tsx`, `src/app/(dashboard)/settings/workflows/page.tsx`, `src/lib/validators/workflow.ts` |
| 2026-02-17 | Codex | Builder Version Controls | Added builder version-history panel with refresh + targeted rollback actions, and wired builder page to hydrate initial version history payloads from workflow detail queries. | done | `src/components/workflows/workflow-builder-shell.tsx`, `src/app/(dashboard)/settings/workflows/[workflowId]/page.tsx` |
| 2026-02-17 | Codex | Hygiene Guardrail | Added automated workflow hygiene regression test that fails on TODO/FIXME markers in workflow UI/API/lib paths, and wired it into `npm test`. | done | `src/lib/workflows/workflow-hygiene.test.ts`, `package.json` |
| 2026-02-17 | Codex | Graph Query Helper | Added denormalized workflow graph query helper for scoped node/edge filtering, draft-version snapshots, and lightweight graph analytics summaries over `workflow_nodes`/`workflow_edges`. | done | `src/lib/queries/workflow-graph.ts`, `plans/visual-builder-implementation-master-plan.md` |
| 2026-02-17 | Codex | Optional Data Model Enhancement | Implemented denormalized workflow graph tables (`workflow_nodes`, `workflow_edges`) with backfill + sync triggers from `workflow_definitions.draft_graph`, RLS policies, and supporting row interfaces for typed access. | done | `supabase/migrations/00033_workflow_graph_denormalized_tables.sql`, `src/types/database.ts`, `plans/visual-builder-implementation-master-plan.md` |
| 2026-02-16 | Codex | Week 2 Execution | Implemented sharing + metadata + simulation scope: metadata migration (`00032`), workflow tags/owner end-to-end wiring, import/export and simulation APIs, builder JSON import/export + simulation UI actions, workflow list owner/tag filters, workflow DB row interfaces, and Week 2 validation tests. | done | `supabase/migrations/00032_workflow_metadata_and_simulation_foundation.sql`, `src/app/api/instances/[id]/workflows/[workflowId]/export/route.ts`, `src/app/api/instances/[id]/workflows/import/route.ts`, `src/app/api/instances/[id]/workflows/[workflowId]/simulate/route.ts`, `src/components/workflows/workflow-builder-shell.tsx`, `src/app/(dashboard)/settings/workflows/page.tsx`, `src/lib/workflows/import-export.ts`, `src/lib/workflows/simulation.ts`, `src/lib/workflows/import-export.test.ts`, `src/lib/workflows/simulation.test.ts`, `src/types/database.ts`, `src/lib/validators/workflow.ts` |
| 2026-02-16 | Codex | Week 1 Execution | Implemented template foundation end-to-end: templates migration (`00031`), template library module + query helpers, template list/create/use APIs, template-driven create-workflow UX, and regression tests for template cloning/use tenant scope. | done | `supabase/migrations/00031_workflow_templates.sql`, `src/lib/workflows/templates.ts`, `src/lib/queries/workflow-templates.ts`, `src/app/api/instances/[id]/workflow-templates/route.ts`, `src/app/api/instances/[id]/workflow-templates/[templateId]/use/route.ts`, `src/components/workflows/workflow-create-form.tsx`, `src/lib/workflows/templates-core.test.ts` |
| 2026-02-16 | Codex | Planning Refresh | Rewrote Section 13 into a fresh 2-week plan aligned to templates first, then import/export + metadata, then branch simulation; explicitly deferred V3 items. | done | `plans/visual-builder-implementation-master-plan.md` |
| 2026-02-16 | Codex | Planning Audit | Corrected drifted checkboxes (approvals + concurrent edit conflict UX) and split remaining work into engineering tasks vs operational launch tasks. | done | `plans/visual-builder-implementation-master-plan.md` |
| 2026-02-16 | Codex | Planning | Created initial master implementation plan. | done | `plans/visual-builder-implementation-master-plan.md` |
| 2026-02-16 | Codex | Planning Audit | Replaced plan with code-audited statuses, corrected file checklist, added critical gap analysis, updated phases, and added 2-week execution plan. | done | `plans/visual-builder-implementation-master-plan.md` |
| 2026-02-16 | Codex | Runtime Integration | Wired workflow publish endpoint to trigger `rebuildAndDeploy(instanceId)` and added rollback-on-deploy-failure behavior. | done | `src/app/api/instances/[id]/workflows/[workflowId]/publish/route.ts` |
| 2026-02-16 | Codex | Runtime Integration | Added scheduled trigger enqueuer API + cron wiring for automatic schedule-based run queueing. | done | `src/app/api/admin/workflows/process-schedules/route.ts`, `vercel.json` |
| 2026-02-16 | Codex | Runtime Regression Testing | Added regression tests for publish runtime freshness handling and scheduler enqueue semantics. | done | `src/lib/workflows/publish-runtime-freshness.test.ts`, `src/lib/workflows/scheduler.test.ts` |
| 2026-02-16 | Codex | Run Explorer UX | Added rerun and retry-from-step controls to run timeline UI, including run redirect and operator feedback states. | done | `src/components/workflows/run-timeline.tsx` |
| 2026-02-16 | Codex | Builder UX | Added create-workflow path with starter templates and list-page CTA (`/settings/workflows/new`). | done | `src/app/(dashboard)/settings/workflows/page.tsx`, `src/app/(dashboard)/settings/workflows/new/page.tsx`, `src/components/workflows/workflow-create-form.tsx` |
| 2026-02-16 | Codex | Rollback Controls | Added workflow rollback endpoint with target version resolution, validation guardrails, and deploy-failure recovery; wired rollback control in builder UI. | done | `src/app/api/instances/[id]/workflows/[workflowId]/rollback/route.ts`, `src/components/workflows/workflow-builder-shell.tsx`, `src/lib/validators/workflow.ts` |
| 2026-02-16 | Codex | Artifact Operations | Added artifact download endpoint (signed URL redirect) and run timeline download/export actions. | done | `src/app/api/instances/[id]/workflow-runs/[runId]/artifacts/[artifactId]/download/route.ts`, `src/components/workflows/run-timeline.tsx` |
| 2026-02-16 | Codex | Documentation | Added operator-facing visual builder user guide. | done | `docs/visual-builder-user-guide.md` |
| 2026-02-16 | Codex | Rollout Controls | Added workflow builder feature flag guard (`workflow.builder`) across dashboard navigation, settings tabs, workflow pages, and workflow instance APIs. | done | `src/lib/workflows/feature-gate.ts`, `src/app/(dashboard)/layout.tsx`, `src/app/(dashboard)/settings/layout.tsx`, `src/components/dashboard/sidebar.tsx`, `src/components/dashboard/settings-tabs.tsx`, `src/app/api/instances/[id]/workflows/*`, `src/app/api/instances/[id]/workflow-runs/*` |
| 2026-02-16 | Codex | Builder UX | Added command palette with discoverable keyboard map, completed shortcut contract (`Cmd/Ctrl+K`, `Cmd/Ctrl+D`, `F`, `+/-`, `Esc`), and wired canvas fit/zoom controls with keyboard support. | done | `src/components/workflows/workflow-builder-shell.tsx`, `src/components/workflows/workflow-canvas.tsx` |
| 2026-02-16 | Codex | Run Explorer UX | Added run date/duration filters and error taxonomy + remediation hints in run timeline. | done | `src/app/(dashboard)/settings/workflows/runs/page.tsx`, `src/lib/validators/workflow.ts`, `src/lib/queries/workflow-runs.ts`, `src/components/workflows/run-timeline.tsx`, `src/app/api/instances/[id]/workflow-runs/route.ts` |
| 2026-02-16 | Codex | Phase 7 Hardening | Implemented builder performance and accessibility hardening: stable graph callbacks, memoized inspector/validation/library layers, large-graph canvas virtualization, keyboard node nudging, improved labels/live regions/focus visibility, 44px touch targets, and reduced-motion-safe loading affordances. | done | `src/components/workflows/workflow-builder-shell.tsx`, `src/components/workflows/workflow-canvas.tsx`, `src/components/workflows/node-library.tsx`, `src/components/workflows/node-inspector.tsx`, `src/components/workflows/validation-panel.tsx` |
| 2026-02-16 | Codex | Phase 7 Gate Instrumentation | Added workflow web-vitals telemetry beacon + API ingestion/summarization for INP/LCP/CLS gates, plus percentile-based gate evaluator tests and Phase 7 verification runbook. | done | `src/components/workflows/workflow-performance-beacon.tsx`, `src/app/api/instances/[id]/workflows/performance/route.ts`, `src/lib/workflows/performance-gates.ts`, `src/lib/workflows/performance-gates.test.ts`, `docs/visual-builder-phase7-verification.md`, `src/lib/validators/workflow.ts`, `src/app/(dashboard)/settings/workflows/page.tsx`, `src/components/workflows/workflow-builder-shell.tsx` |
| 2026-02-16 | Codex | Phase 8 Launch Readiness | Implemented rollout-ring gating (`canary -> standard -> delayed`), launch-readiness API + dashboard, guided walkthrough checklist, and workflow support/runbook docs with KPI review cadence assets. | done | `src/lib/workflows/feature-gate.ts`, `src/lib/workflows/launch-readiness.ts`, `src/app/api/instances/[id]/workflows/launch-readiness/route.ts`, `src/app/(dashboard)/settings/workflows/launch/page.tsx`, `src/app/(dashboard)/settings/workflows/page.tsx`, `docs/visual-builder-rollout-strategy.md`, `docs/visual-builder-support-incident-sop.md`, `docs/visual-builder-kpi-review-cadence.md`, `content/docs/tools/workflow-builder*.mdx`, `content/docs/troubleshooting/workflow-builder-support-runbook.mdx` |

## 15) References

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- WAI-ARIA APG keyboard practices: https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- web.dev INP: https://web.dev/articles/inp
- web.dev Web Vitals: https://web.dev/articles/vitals
- React Flow performance guidance: https://reactflow.dev/learn/advanced-use/performance
