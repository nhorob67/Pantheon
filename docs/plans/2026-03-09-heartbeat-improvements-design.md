# FarmClaw Heartbeat Improvements Design

**Date:** 2026-03-09
**Author:** Codex
**Status:** In Progress

## Summary

FarmClaw's heartbeat feature already has the correct economic shape: it runs deterministic, low-cost checks first and only invokes an LLM when something appears to need attention. That design should be preserved. The next iteration should focus on making heartbeats more correct, less noisy, more stateful, easier to operate, and safer to deliver.

This document proposes a phased heartbeat improvement plan based on:

1. The current FarmClaw implementation
2. OpenClaw's heartbeat and cron model
3. Scheduling, observability, testing, and guardrail patterns used by other agent platforms

The highest-priority work is not "more AI." It is:

1. Correctness and duplicate prevention
2. Notification suppression and pacing
3. Better operator controls and testing
4. Stateful follow-up behavior
5. Better safety and observability

## Implementation Update

Multiple implementation slices are now landed in the application:

- Correct active-hours handling now supports overnight windows.
- Scheduler and manual execution now keep tenant-default farm checks active while enabled agent overrides add agent-scoped email coverage.
- Manual run/preview now use the same effective-config rules as scheduled execution unless a specific config is targeted.
- Heartbeat run logging now distinguishes signal detection from actual delivery attempts.
- Minimal suppression is live with signal fingerprints, per-config cooldowns, and per-config daily alert caps.
- The settings UI now exposes cooldown/max-day controls, next-run visibility, preview, run-now actions, and effective-scope messaging.
- Heartbeat now persists issue state in `tenant_heartbeat_signals` and tracks new, acknowledged, snoozed, and resolved issues separately from run logs.
- Reminder pacing and worsening detection now use persisted issue state instead of raw repeat-run suppression alone.
- Operators can acknowledge, snooze, and resolve active heartbeat issues from the settings UI.
- Heartbeat configs now support `reminder_interval_minutes` and freeform `heartbeat_instructions`.
- The settings UI now supports explicit pause/resume, target selection for preview/run-now/test-send actions, and manual targeting of a specific config even when it is paused.
- Synthetic heartbeat delivery tests now exist and run through the same outbound delivery path without depending on live farm signals.
- Per-config pacing and quota explanations now surface deliveries, suppressions, active issues, and execution scope state.
- Per-agent override creation, editing, pausing, resuming, and removal now exist in the UI.
- Tenant-default heartbeat execution now continues for tenant-scoped checks even when enabled agent overrides exist, while agent overrides run agent-scoped unanswered-email checks instead of replacing farm-wide coverage.
- Heartbeat now records non-urgent busy-runtime and digest-window holds as explicit deferred outcomes, while urgent severe-weather alerts can still bypass deferment.
- Heartbeat configs now support `digest_enabled` and `digest_window_minutes` so non-urgent alerts can batch before delivery.
- Heartbeat runs now persist richer observability fields: `decision_trace`, `freshness_metadata`, and `dispatch_metadata`.
- Recent heartbeat activity now surfaces signal source, data freshness hints, model metadata, and a compact sent-message excerpt for dispatched runs.
- Heartbeat now scans risky source/output content before delivery and records guardrail outcomes in run metadata.
- Higher-risk live heartbeat alerts driven by `custom_checks` now enter tenant approval review instead of dispatching immediately, while previews/tests stay immediate and urgent severe weather still bypasses approval.
- Approval decisions can now resume or reject pending heartbeat alerts through the existing tenant approvals flow.
- Heartbeat activity now surfaces delivery outcome breakdowns, suppression reasons, issue age, guardrail counts, and run-performance diagnostics.
- Heartbeat now persists operator history in `tenant_heartbeat_events`, including pause/resume, manual preview/run/test actions, and issue triage actions.
- The settings UI now includes a first-class operator history view and a dedicated recent-test inspection panel.
- The tenant heartbeat settings surface now includes a tabbed reporting workspace for `Runs`, `Trends`, and `Audit`.
- Heartbeat reporting now supports deeper filtering, paginated run inspection, longer-window tenant trend views, and a unified audit feed for operator events, manual actions, and heartbeat approvals.
- The heartbeat activity endpoint now supports report modes for overview, runs, trends, and audit instead of only the earlier recent-summary payload.
- Agent-scoped cheap checks are still partially implemented: unanswered-email checks are agent-scoped today, while weather, grain bids, tickets, and custom checks remain tenant-scoped and intentionally stay on the tenant-default heartbeat.

This was intentionally narrower than the full design:

- agent-scoped cheap checks are only partially implemented so far

## Current State

### What FarmClaw does today

The current heartbeat pipeline is implemented across these files:

- `src/trigger/process-heartbeat.ts`
- `src/lib/heartbeat/cheap-checks.ts`
- `src/lib/heartbeat/checks/*.ts`
- `src/lib/heartbeat/observability.ts`
- `src/lib/heartbeat/events.ts`
- `src/lib/ai/heartbeat-ai-worker.ts`
- `src/lib/queries/heartbeat-activity.ts`
- `src/app/api/tenants/[tenantId]/heartbeat/route.ts`
- `src/app/api/tenants/[tenantId]/heartbeat/agents/[agentId]/route.ts`
- `supabase/migrations/00066_tenant_heartbeat.sql`
- `supabase/migrations/00070_tenant_heartbeat_runtime_semantics.sql`
- `supabase/migrations/00073_tenant_heartbeat_observability.sql`

At a high level:

1. A Trigger.dev task runs every minute.
2. It reads due rows from `tenant_heartbeat_configs`.
3. It checks the config's active-hour window.
4. It runs enabled cheap checks in parallel.
5. It logs the result to `tenant_heartbeat_runs`.
6. If a signal survives suppression and busy-runtime deferment rules, it enqueues a `discord_heartbeat` runtime run.
7. A dedicated AI worker writes a short alert and sends it to Discord.

### Cheap checks implemented today

The current cheap-check inventory is:

- Severe weather via National Weather Service alerts
- Grain bid movement over a configured threshold
- Unreviewed scale tickets older than a configured threshold
- Unanswered inbound emails older than a configured threshold
- Custom checklist items, which always force LLM escalation when present

### Current strengths

- Good cost discipline: cheap checks precede LLM use
- Clear configuration model in the database
- Activity logging already exists
- Separate AI worker keeps heartbeat logic isolated from general chat runtime
- Delivery channel is explicit instead of inferred at send time

### Current weaknesses

- Agent overrides now coexist correctly with tenant-default farm checks, but weather, grain bids, tickets, and custom checks are still not true per-agent checks yet
- Deferred heartbeats still rely on normal scheduler cadence after a busy-runtime hold instead of a faster post-busy drain path
- Delivery safety and content safety are stronger than the initial implementation, but approval policy remains intentionally narrow
- Reporting is now materially stronger inside the tenant settings surface, but the data model still relies on live query aggregation rather than purpose-built reporting tables or materialized summaries

## Research Synthesis

### OpenClaw

OpenClaw's heartbeat model is useful because it treats heartbeat as a first-class proactive behavior rather than a simple scheduler.

Important patterns from OpenClaw:

- Heartbeats use a response contract: if nothing needs attention, the agent replies `HEARTBEAT_OK`, and the platform suppresses delivery.
- OpenClaw can skip heartbeats when the main queue is busy rather than interrupting active work.
- `HEARTBEAT.md` gives the agent a small, explicit checklist for periodic review.
- Per-agent heartbeat configuration is explicit and scoped.
- Heartbeat visibility is configurable independently from execution.
- OpenClaw differentiates heartbeat from cron and uses heartbeat when multiple checks should be batched into one context-aware review.

Why this matters for FarmClaw:

- FarmClaw already has deterministic signal detection, but it does not yet have a strong "no-op suppression" contract.
- FarmClaw stores overrides, but the runtime behavior is not yet aligned with an explicit per-agent heartbeat model.
- FarmClaw could benefit from a lightweight heartbeat policy/checklist concept, even if it remains structured rather than file-based.

### OpenAI Tasks

OpenAI Tasks highlights the operator-experience side of proactive systems:

- Tasks can run when the user is offline.
- Users can edit, pause, and delete tasks.
- There is a dedicated management surface for scheduled work.
- There are explicit notification settings and delivery controls.
- There is an enforced limit on active tasks, which prevents uncontrolled schedule sprawl.

Why this matters for FarmClaw:

- FarmClaw needs better schedule operations UX.
- The heartbeat system should expose clear pause/resume and next-run behavior.
- FarmClaw should introduce pacing and quota controls so a misconfigured heartbeat cannot flood a farmer.

### Lindy

Lindy contributes two especially relevant patterns:

- A built-in test panel for running workflows before production use
- Rich task observability with task history, task status changes, and task detail inspection

Why this matters for FarmClaw:

- Heartbeat configuration should be testable without requiring a real outbound post.
- Operators need to see exactly why a heartbeat fired, what checks ran, and what was sent.

### Relevance AI

Relevance AI offers several schedule-control patterns directly relevant to heartbeat:

- Max daily scheduled trigger limits
- "Prevent scheduled messages from interrupting a task"
- Task queues and run-state visibility
- Trigger configuration patterns that emphasize overlap prevention and testing

Why this matters for FarmClaw:

- Heartbeats should not interrupt active runtime work unnecessarily.
- Heartbeats need built-in pacing controls.
- The system should have explicit overlap and duplicate prevention rules.

### Zapier and LangGraph

Zapier and LangGraph contribute safety and approval patterns:

- Zapier's AI Guardrails product scans AI outputs for PII, prompt injection, toxicity, and other issues before downstream use.
- LangGraph's human-in-the-loop patterns allow execution to pause for approval before sensitive actions and then resume safely later.

Why this matters for FarmClaw:

- A heartbeat alert is external communication, and some heartbeat sources come from untrusted text inputs like email or custom checklist items.
- FarmClaw should be able to scan or gate outbound alerts in riskier cases.
- Some heartbeat alerts should optionally require human review before being dispatched.

## Design Goals

### Primary goals

1. Prevent duplicate or misleading heartbeat behavior
2. Reduce alert fatigue without losing important signals
3. Let the system reason about ongoing issues across runs
4. Improve operator trust through better controls and observability
5. Add guardrails around outbound delivery

### Non-goals

- Replacing the cheap-check-first architecture
- Converting heartbeats into full autonomous workflows
- Introducing a large generic agent memory system solely for heartbeat
- Building a general-purpose multichannel notification router in this phase

## Proposed Improvements

## Workstream 1: Correctness and Runtime Semantics

### Problem

Most of the first-pass correctness issues are now fixed, but a few trust-sensitive semantics still need to stay explicit:

- Effective-config behavior must remain consistent across scheduler, preview, and manual run paths.
- Suppression and daily alert caps must be scoped to the executing config, not bleed across the whole tenant.
- Overlap protection is still minimal and should not rely solely on happy-path scheduler cadence.
- Per-agent overrides currently change schedule/delivery behavior, but they do not yet change the underlying cheap-check scope.

### Proposal

Introduce a stricter heartbeat execution model with explicit effective-config resolution.

Key changes:

1. Keep active-hours evaluation on normalized minutes-since-midnight logic that supports:
   - standard windows, such as `05:00 -> 21:00`
   - overnight windows, such as `21:00 -> 05:00`
   - exact-midnight edge cases

2. Keep run logging semantics strict:
   - `had_signal` should continue to reflect whether any cheap check alerted
   - `llm_invoked` should only be `true` when a runtime run is actually queued
   - add a field like `delivery_attempted` or `suppressed_reason` if needed for diagnosis

3. Keep effective scope rules explicit for tenant-default and agent override execution:
   - Option A: tenant-default heartbeat applies only when no agent-specific heartbeat exists
   - Option B: tenant-default is a separate farm-level heartbeat, and agent heartbeats must target separate scopes and separate signal sets

Recommended choice: Option A for the first pass, because it is simpler and avoids accidental duplicate alerts.

4. Apply the same effective-config resolution in scheduler and manual execution, with explicit config targeting available when needed.

5. Add overlap protection:
   - if a config is already processing or recently processed, avoid double-running it from concurrent scheduler ticks
   - prefer idempotent per-config run keys at the heartbeat-run level as well as at runtime enqueue time

### Acceptance criteria

- Overnight windows behave correctly in unit tests
- `llm_invoked` matches real enqueue behavior
- Scheduler and manual execution resolve the same effective config set by default
- Suppression history and daily pacing are scoped to the config that actually executed
- Repeat scheduler ticks cannot produce duplicate heartbeat runs for the same config and time bucket

## Workstream 2: Suppression, Dedupe, and Pacing

### Problem

FarmClaw now has minimal cooldown and daily-cap suppression, but the pacing model is still stateless. A repeated unresolved signal like "2 unanswered emails" is suppressed for a while, but once the cooldown expires the system still cannot distinguish "same ongoing issue" from "meaningfully new or worse issue."

This is where many proactive systems fail: they become background noise and get disabled.

### Proposal

Add a suppression layer between signal detection and LLM delivery.

Core concept:

Each heartbeat run should produce one or more normalized signal records. Those signals should then be evaluated against recent signal history before deciding whether to notify.

Recommended suppression primitives:

1. Signal fingerprint
   - derive a stable fingerprint from check type + scope + normalized payload
   - examples:
     - weather alert fingerprint by event + zone + expiry
     - grain movement fingerprint by elevator + crop + delivery period + movement bucket
     - email backlog fingerprint by count bucket and threshold bucket

2. Reminder policy
   - notify immediately on new signal
   - suppress identical signal for a configured cooldown period
   - optionally re-notify if unresolved after a reminder interval

3. Severity delta
   - re-notify if the issue worsens materially
   - examples:
     - 1 unanswered email becomes 6
     - 2 tickets older than 4h becomes 8 tickets older than 12h
     - grain movement magnitude crosses a higher severity band

4. Rate controls
   - `max_alerts_per_day`
   - `cooldown_minutes`
   - optional `digest_mode`

5. Digest mode
   - accumulate non-urgent signals during a defined window
   - deliver a single summary instead of multiple separate pings

### Data model changes

Possible additions:

- `tenant_heartbeat_signals`
  - one row per normalized signal event
  - includes fingerprint, status, severity, first_seen_at, last_seen_at, resolved_at, last_notified_at

Possible additions to `tenant_heartbeat_configs`:

- `cooldown_minutes`
- `max_alerts_per_day`
- `digest_enabled`
- `digest_window_minutes`
- `reminder_interval_minutes`

### Acceptance criteria

- Repeated identical signals are suppressed
- Worsening signals can break suppression
- Daily pacing limits are enforced
- Digest mode can aggregate multiple low-urgency alerts into one outbound message

## Workstream 3: Stateful Heartbeat Issue Tracking

### Problem

The system is currently run-based but not issue-based. It knows that an alert happened on a run, but it does not maintain an explicit lifecycle for the issue that caused the alert.

This prevents higher-quality follow-up behavior. The system cannot answer:

- Is this a new issue?
- Did we already tell the farmer?
- Was it acknowledged?
- Is it resolved?
- Should this be followed up tomorrow instead of right now?

### Proposal

Move heartbeat from a pure run-log model toward a run-log-plus-issue-state model.

Recommended issue lifecycle:

- `new`
- `acknowledged`
- `snoozed`
- `resolved`

Recommended operator actions:

- acknowledge issue
- snooze until time/date
- mute this issue type for N hours
- resolve manually

Recommended system behavior:

- new issue -> may notify immediately
- acknowledged issue -> suppress until worsening or reminder interval
- snoozed issue -> suppress until snooze expires
- resolved issue -> close lifecycle; next recurrence creates a new issue

### Why this matters

This is the feature that makes heartbeat feel like a reliable assistant instead of a polling bot.

It also creates space for better language generation:

- first alert: "This needs attention"
- follow-up reminder: "This is still unresolved from yesterday"
- worsening alert: "This has gotten worse"
- resolution note: optionally "This appears resolved"

### Optional policy/checklist layer

OpenClaw's `HEARTBEAT.md` is a useful pattern, but FarmClaw does not need to copy the file mechanism directly. The FarmClaw equivalent can be one of:

1. Structured config in the database
2. Per-tenant freeform heartbeat instructions
3. Per-agent override instructions

Recommended choice:

Add a short freeform `heartbeat_instructions` field at tenant default and agent override levels, with length limits and clear guidance. This provides some of the value of `HEARTBEAT.md` without introducing filesystem configuration into the product.

### Acceptance criteria

- The system can distinguish new vs ongoing issues
- Users can acknowledge or snooze issues
- Follow-up alerts use issue state, not only raw run state
- Custom checks no longer always create first-alert language if the issue is already known

## Workstream 4: Operator Controls and UX

### Problem

The current UI now supports preview, run-now, next-run visibility, effective-scope messaging, pause/resume, synthetic test sends, and override management. The remaining operations gap is narrower:

- there is still no first-class pause history or audit trail
- recent test sends and delivery outcomes are visible only through general run history rather than a dedicated inspection surface
- aggregate observability is still thin when operators need to answer "what has been noisy lately?" across many runs

### Proposal

Expand the heartbeat settings experience into a real operations surface.

Recommended controls:

1. Run now
   - execute cheap checks immediately
   - allow `test only` and `test + send`

2. Pause/resume
   - explicit scheduling control without deleting or rewriting the full config

3. Next-run preview
   - show the next scheduled time in the selected timezone
   - show whether current active-hours settings allow a run now

4. Delivery test
   - generate a synthetic heartbeat message using current config and send to a selected target
   - or preview the generated text without sending

5. Suppression visibility
   - show why a signal did not notify:
     - no signal
     - duplicate signal in cooldown
     - max alerts/day reached
     - outside active hours
     - missing delivery channel
     - issue snoozed

6. Per-agent scope explanation
   - make it explicit when an override replaces the tenant default and when it adds separate behavior

### Why this matters

Platforms like OpenAI Tasks, Lindy, and Relevance AI invest heavily in schedule management because proactive systems are only trusted when operators can understand and control them quickly.

### Acceptance criteria

- Users can run a heartbeat test without waiting for the scheduler
- Users can pause and resume heartbeat execution
- Users can see the next run and effective active-hours state
- Users can deliberately target a specific config/override for preview or send
- Users can understand why a notification was suppressed

## Workstream 5: Busy-State Coordination and Delivery Safety

### Problem

The runtime-coordination half of this problem is now partially addressed: non-urgent heartbeats defer while the tenant runtime is busy, and urgent severe-weather alerts can bypass that deferment. The remaining gap is that outbound AI-generated content is still too trusting and approval policies do not exist yet.

Risks include:

- interrupting a runtime that is already active
- sending noisy or redundant alerts during high-activity periods
- letting adversarial or malformed input from email/custom checks influence outbound Discord content

### Proposal

Add two protection layers:

1. Runtime coordination
2. Content and approval guardrails

### Runtime coordination

Borrowing from OpenClaw and Relevance AI:

- If the tenant runtime is already busy, do not eagerly dispatch a non-urgent heartbeat alert.
- Instead:
  - defer it
  - merge it into a pending digest
  - or mark it for delivery after the current active task completes

Suggested logic:

- urgent weather alerts can bypass busy-state suppression
- lower-severity signals should defer if:
  - a runtime run is `running`
  - a runtime run is `awaiting_approval`
  - a recent outbound heartbeat was just delivered

### Guardrails

Recommended pre-send checks:

- scan outbound content for obvious PII leakage
- scan for prompt-injection markers originating from untrusted content
- optionally classify severity and communication tone

Recommended approval workflow:

- optional manual approval for:
  - high-severity alerts
  - large customer-facing summaries
  - alerts based heavily on untrusted freeform text

This does not need to block all heartbeat alerts. It should be policy-based and reserved for riskier scenarios.

### Acceptance criteria

- Non-urgent heartbeats can defer while the runtime is busy
- Urgent alerts can still bypass deferment when configured
- Outbound heartbeat content can be scanned before dispatch
- Policy-based approval can be enabled for selected signal types

## Workstream 6: Observability and Diagnostics

### Problem

`tenant_heartbeat_runs` now captures per-run decision traces, freshness metadata, and compact dispatch metadata, but aggregate reporting is still too thin to answer every production question:

- Why did this fire?
- Why did this not fire?
- Which cheap check actually triggered it?
- How fresh was the underlying data?
- Was it suppressed, deferred, or delivered?
- How long did each step take?

### Proposal

Expand observability from run outcome to decision trace.

Recommended additions:

1. Per-check timing
   - weather duration
   - grain bid duration
   - ticket query duration
   - email query duration

2. Freshness metadata
   - last grain bid timestamp used
   - weather alert expiry
   - newest and oldest email/ticket timestamps involved

3. Decision trace
   - `signal_detected`
   - `suppressed_by_cooldown`
   - `suppressed_by_quota`
   - `suppressed_by_snooze`
   - `deferred_by_busy_runtime`
   - `dispatched`
   - `dispatch_failed`

4. Prompt and output references
   - store compact metadata about the generated heartbeat message and model used
   - keep enough detail for debugging without storing excessive prompt bodies

5. Better dashboard views
   - top signal types over time
   - suppression reasons over time
   - average check latency
   - delivery success/failure rates
   - token usage by signal type

### Acceptance criteria

- Operators can explain why any recent run did or did not notify
- The dashboard can break down alerts by source and suppression reason
- Data freshness issues are visible

## Prioritized Delivery Plan

## P0: Landed trust foundations

These items are implemented and should remain the baseline for subsequent phases.

- [x] Fix active-hours logic to support overnight windows
- [x] Make `llm_invoked` reflect actual runtime invocation, not only `hadSignal`
- [x] Define tenant-default vs agent-override scheduled execution semantics
- [x] Apply the same effective-config rules to manual run/preview by default
- [x] Add explicit missing-delivery handling and diagnostics
- [x] Add minimal duplicate prevention with per-slot run uniqueness and runtime idempotency
- [x] Scope cooldowns and daily alert caps to the executing config

## P1: Stateful follow-up and smarter pacing

These items are now implemented and form the second foundation layer of heartbeat behavior.

- [x] Add issue-state persistence separate from run logs
- [x] Add reminder intervals for unresolved issues
- [x] Add worsening-delta detection that can break suppression
- [x] Support acknowledge/snooze/resolve actions
- [x] Tailor follow-up copy based on issue lifecycle
- [x] Add optional tenant-level or agent-level heartbeat instructions

## P2: Better operator controls

These items are now implemented and form the operator-facing control layer for heartbeat.

- [x] Add `Pause/Resume`
- [x] Let the UI target a specific config/override for preview or send
- [x] Add synthetic delivery tests independent of live signals
- [x] Expand per-config suppression/quota explanations when overrides are active
- [x] Bring override creation/editing into the UI

## P3: Runtime coordination and safety

- [x] Add busy-runtime deferment logic
- [x] Allow urgent-signal bypass rules
- [x] Scan outbound content for PII and prompt-injection risk
- [x] Add optional manual approval for selected heartbeat alerts

## P4: Observability

- [x] Record suppression and deferment reasons in richer decision-trace form
- [x] Record data freshness metadata
- [x] Expand dashboard reporting for alert sources, suppression, and delivery outcomes
- [x] Store compact prompt/output references for dispatched alerts

## P5: Advanced batching

- [x] Add optional digest mode for non-urgent alerts
- [x] Add digest-window configuration and delivery rules

## Recommended Implementation Order

### Phase 1

Status: landed.

- P0 trust foundations
- minimal suppression foundation
- minimal UI explanation of effective scope and missing delivery state

### Phase 2

Status: landed.

- issue lifecycle
- reminders
- worsening detection
- acknowledgment/snooze flows
- heartbeat instructions

### Phase 3

Status: landed.

Focus on operations:

- pause/resume
- targeted manual run/preview
- delivery test mode
- richer suppression diagnostics
- override management UX

### Phase 4

Status: landed.

Focus on safety and runtime coordination:

- busy-state coordination
- severity bypass rules
- outbound guardrails
- approval flows

### Phase 5

Status: landed for tenant reporting and filtering, with some follow-on runtime/reporting work still open.

Focus on mature observability and batching:

- aggregate observability and dashboards
- digest mode
- delivery analytics

## Data Model Considerations

### Existing tables

- `tenant_heartbeat_configs`
- `tenant_heartbeat_runs`

### Proposed additions

Potential new table:

- `tenant_heartbeat_signals`
- `tenant_heartbeat_events`

Suggested columns:

- `id`
- `tenant_id`
- `config_id`
- `agent_id`
- `signal_type`
- `fingerprint`
- `severity`
- `state`
- `summary`
- `payload`
- `first_seen_at`
- `last_seen_at`
- `last_notified_at`
- `snoozed_until`
- `resolved_at`
- `created_at`
- `updated_at`

Potential additions to `tenant_heartbeat_runs`:

- `delivery_attempted`
- `delivery_status`
- `suppressed_reason`
- `decision_trace`
- `check_durations`
- `freshness_metadata`
- `dispatch_metadata`

Potential additions to `tenant_heartbeat_configs`:

- `cooldown_minutes`
- `max_alerts_per_day`
- `digest_enabled`
- `digest_window_minutes`
- `reminder_interval_minutes`
- `heartbeat_instructions`
- `priority_policy`

## API and UI Surface Changes

### API

Potential additions:

- `POST /api/tenants/[tenantId]/heartbeat/run-now`
- `POST /api/tenants/[tenantId]/heartbeat/test`
- `POST /api/tenants/[tenantId]/heartbeat/issues/[issueId]/acknowledge`
- `POST /api/tenants/[tenantId]/heartbeat/issues/[issueId]/snooze`
- `POST /api/tenants/[tenantId]/heartbeat/issues/[issueId]/resolve`

### UI

Recommended additions to the settings page:

- effective schedule summary
- next-run card
- run-now button
- test heartbeat button
- quotas/pacing section
- suppression state indicators
- active issues list
- recent notifications list
- operator history
- recent test inspection

## Testing Strategy

### Unit tests

- active-hours calculations, including overnight windows
- signal fingerprint generation
- suppression rules
- quota enforcement
- issue lifecycle transitions

### Integration tests

- due config -> cheap checks -> run log -> runtime enqueue
- suppression path -> no runtime enqueue
- busy runtime -> deferred notification
- missing delivery channel -> diagnostic logging without false `llm_invoked`

### UI tests

- next-run preview rendering
- pause/resume controls
- run-now and test mode interactions
- suppression reason display

### Operational validation

- run shadow mode for suppression logic before enforcing it
- compare old vs new notification counts
- verify no meaningful signal loss during rollout

## Rollout Plan

### Stage 1

Ship correctness fixes behind a small internal validation period.

### Stage 2

Ship suppression in shadow mode:

- compute suppression decisions
- log them
- do not yet block delivery

### Stage 3

Enable suppression for selected tenants or internal accounts.

### Stage 4

Roll out operator controls and richer observability.

### Stage 5

Roll out stateful issues and approval policies.

## Risks and Tradeoffs

### Risk: Too much complexity too early

Heartbeat can become overengineered if issue-state, suppression, approvals, and digesting all arrive at once.

Mitigation:

- ship in phases
- separate correctness work from behavior-changing work
- use shadow-mode logging before enforcement

### Risk: Over-suppression hides important signals

Mitigation:

- start with conservative cooldown defaults
- let worsening severity break suppression
- expose suppression reasons in UI
- track missed-signal support feedback explicitly

### Risk: New state model becomes hard to reason about

Mitigation:

- define simple state transitions
- log issue actions clearly
- keep run logs and issue state separate

### Risk: Approval flows slow urgent alerts

Mitigation:

- apply approvals only to configured signal classes
- allow urgent weather alerts to bypass approval

## Recommendation

The next recommended path after the currently landed work is:

1. Finish true agent-scoped parity for cheap checks beyond unanswered email
2. Consider faster post-busy drain behavior if minute/hour scheduler retry latency proves too slow in production
3. Revisit whether reporting should eventually move from live query aggregation to purpose-built reporting tables if tenant history volume grows meaningfully

This keeps the strongest part of the design intact, cheap-check-first escalation, while closing the remaining product-quality gaps: incomplete per-agent scope coverage, retry timing after runtime contention, and future reporting-scale concerns.

## Progress Tracker

### Discovery and design

- [x] Review current FarmClaw heartbeat implementation
- [x] Research OpenClaw heartbeat behavior
- [x] Research comparable scheduling and proactive-agent patterns
- [x] Produce heartbeat improvements design document

### Phase 1: Correctness

- [x] Finalize effective heartbeat scope rules
- [x] Implement active-hours fix
- [x] Implement accurate `llm_invoked` semantics
- [x] Add duplicate/overlap protection
- [x] Add tests for correctness fixes

### Phase 2: Suppression

- [x] Design signal fingerprint model
- [x] Add minimal signal fingerprint persistence in run logs
- [x] Implement cooldowns and quotas
- [x] Land the first agent-scoped cheap check slice for unanswered emails
- [x] Add digest behavior
- [ ] Validate suppression in shadow mode

### Phase 3: Operator UX

- [x] Add run-now API and UI
- [x] Add test/preview mode
- [x] Add pause/resume
- [x] Add next-run preview
- [x] Add suppression reason UI

### Phase 4: Stateful issues

- [x] Add issue lifecycle table and APIs
- [x] Add acknowledge/snooze/resolve controls
- [x] Add lifecycle-aware alert copy
- [x] Add optional heartbeat instructions

### Phase 5: Safety and observability

- [x] Add busy-runtime deferment
- [x] Add urgent-signal bypass rules
- [x] Add run-level decision trace
- [x] Add run-level freshness metadata
- [x] Add compact dispatch metadata for heartbeat worker output
- [x] Add outbound guardrail checks
- [x] Add optional approval workflow
- [x] Expand aggregate heartbeat analytics and diagnostics
- [x] Add operator event history and recent manual-test inspection
- [x] Add tenant heartbeat reporting and filtering workspace with `Runs`, `Trends`, and `Audit` tabs
- [x] Add filtered report queries and API modes for overview, runs, trends, and audit
- [x] Add paginated run inspection, longer-window trend reporting, and unified heartbeat audit history

### Follow-on work

- [ ] Finish true agent-scoped parity for cheap checks beyond unanswered email
- [ ] Evaluate faster post-busy drain behavior for deferred heartbeats
- [ ] Monitor reporting query performance as tenant run/event volume grows

## Related Design Docs

- `docs/plans/2026-03-09-heartbeat-reporting-filtering-design.md`

## Source Notes

### Internal FarmClaw sources

- `src/trigger/process-heartbeat.ts`
- `src/lib/heartbeat/cheap-checks.ts`
- `src/lib/heartbeat/checks/weather-check.ts`
- `src/lib/heartbeat/checks/grain-price-check.ts`
- `src/lib/heartbeat/checks/ticket-check.ts`
- `src/lib/heartbeat/checks/email-check.ts`
- `src/lib/heartbeat/checks/custom-check.ts`
- `src/lib/heartbeat/observability.ts`
- `src/lib/ai/heartbeat-ai-worker.ts`
- `src/lib/heartbeat/issues.ts`
- `src/lib/queries/heartbeat-activity.ts`
- `src/app/api/tenants/[tenantId]/heartbeat/route.ts`
- `src/app/api/tenants/[tenantId]/heartbeat/agents/[agentId]/route.ts`
- `src/app/api/tenants/[tenantId]/heartbeat/issues/[issueId]/acknowledge/route.ts`
- `src/app/api/tenants/[tenantId]/heartbeat/issues/[issueId]/snooze/route.ts`
- `src/app/api/tenants/[tenantId]/heartbeat/issues/[issueId]/resolve/route.ts`
- `supabase/migrations/00066_tenant_heartbeat.sql`
- `supabase/migrations/00070_tenant_heartbeat_runtime_semantics.sql`
- `supabase/migrations/00071_tenant_heartbeat_issue_state.sql`
- `supabase/migrations/00073_tenant_heartbeat_observability.sql`
- `supabase/migrations/00075_tenant_heartbeat_digest_and_events.sql`

### External sources

- OpenClaw Heartbeat: https://docs.openclaw.ai/gateway/heartbeat
- OpenClaw Cron Jobs: https://docs.openclaw.ai/cron/
- OpenClaw Cron vs Heartbeat: https://docs.openclaw.ai/cron-vs-heartbeat
- OpenClaw Agent Workspace: https://docs.openclaw.ai/agent-workspace
- OpenAI Tasks in ChatGPT: https://help.openai.com/en/articles/10291617
- Lindy Timer: https://docs.lindy.ai/skills/by-lindy/timer
- Lindy Test Panel: https://docs.lindy.ai/testing/test-panel
- Lindy Monitor Your Agents: https://docs.lindy.ai/testing/monitoring-your-agents
- Lindy Observability: https://docs.lindy.ai/skills/lindy-utilities/observability
- Relevance AI Triggers and Scheduled Messages: https://relevanceai.com/docs/build/agents/build-your-agent/triggers
- Relevance AI Recurring Schedule docs: https://relevanceai.com/docs/agent/give-your-agent-tasks/recurring-schedule
- Relevance AI Add Triggers: https://relevanceai.com/docs/build/workforces/build-an-ai-workforce/add-triggers
- Relevance AI Task Queue: https://relevanceai.com/docs/agent/give-your-agent-tasks/task-queue
- Zapier AI Guardrails: https://help.zapier.com/hc/en-us/articles/43960576956301-Screen-AI-output-for-safety-and-compliance-with-AI-Guardrails-by-Zapier
- LangChain Human-in-the-Loop: https://docs.langchain.com/oss/javascript/langchain/human-in-the-loop
- LangGraph Interrupts / Human-in-the-Loop: https://docs.langchain.com/oss/javascript/langgraph/human-in-the-loop

### How the sources informed this design

- OpenClaw informed suppression contracts, busy-state handling, lightweight heartbeat instructions, and the distinction between heartbeat and cron.
- OpenAI Tasks informed pause/edit/delete management expectations and task-surface UX.
- Lindy informed testability and detailed run observability.
- Relevance AI informed pacing controls, overlap handling, and schedule-management patterns.
- Zapier and LangChain informed output guardrails and human approval models for sensitive outbound actions.
