# Discord Runtime Reply Orchestrator Design

## Summary

Pantheon's `discord_runtime` conversational flow is fragile because user-visible replies are produced as scattered side effects across the AI worker, approval executor, obligation notifier, and completion notifier. This creates inconsistent progress updates, contradictory approval messaging, and missing terminal closure.

This design adds a dedicated `discord_runtime` reply orchestrator that owns all user-visible lifecycle messages for a run. It does not replace the runtime queue, worker, run state machine, or obligation system. It adds a single reply lifecycle owner that turns structured runtime events into reliable Discord-visible milestones, keepalives, approval notices, resume notices, and terminal outcomes.

The target behavior is conversational but controlled:

- milestone updates should feel human and specific
- keepalives should appear only after real silence
- reply content should be normalized before any Discord delivery
- typing indicators should follow the same lifecycle owner as visible replies
- approval and resume messaging must be authoritative
- every visible progress update must eventually resolve into a blocked state, a terminal answer, or a terminal failure

## Implementation Status

Status as of 2026-03-22:

- implemented:
  - `src/lib/runtime/discord-runtime-reply-orchestrator.ts`
  - `src/lib/runtime/discord-runtime-reply-policy.ts`
  - `src/lib/runtime/discord-runtime-reply-types.ts`
- integrated into:
  - `src/lib/ai/tenant-ai-worker.ts`
  - `src/lib/ai/tools/file-create.ts`
  - `src/app/api/admin/tenants/runtime/process/route.ts`
  - `src/app/api/admin/tenants/runtime/discord/approval-decision/route.ts`
  - `src/app/api/admin/tenants/runtime/discord/ingress/route.ts`
  - `src/lib/runtime/tenant-approval-executor.ts`
  - `src/lib/runtime/tenant-runtime-discord.ts`
  - `src/lib/runtime/tenant-runtime-status-notifier.ts`
  - `src/lib/runtime/tenant-runtime-status-notifier-utils.ts`
  - `src/trigger/reap-stale-runs.ts`
  - `src/trigger/sweep-stale-obligations.ts`
- tests added:
  - `src/lib/runtime/discord-runtime-reply-policy.test.ts`
  - `src/lib/runtime/discord-runtime-reply-orchestrator.test.ts`
  - expanded `src/lib/runtime/tenant-runtime-discord.test.ts`
  - expanded `src/lib/runtime/tenant-runtime-status-notifier.test.ts`

Latest progress in this pass:

- reconciled this design doc against the current in-flight orchestrator implementation in the working tree
- hardened approval-path Discord transport resolution so approval button sends, button updates, and approval resume/reject lifecycle replies now use the shared per-tenant bot-token resolver instead of an env-only assumption
- removed shadow/disabled rollout branching from the reply orchestrator path so deployment is now always-on active for all tenants
- wired the early trial-expired and spending-cap-paused worker reply path into the shared terminal-failure dispatcher so it now participates in reply lifecycle ownership and terminal visibility persistence
- reduced the remaining worker reply duplication further by collapsing `tenant-ai-worker.ts` onto a single orchestrator-owned visible-send path and shared chunking helper
- removed `shouldSendStatusUpdate()` from the active `discord_runtime` worker visibility path so obligation cadence no longer gates progress sends
- demoted legacy obligation-side non-terminal Discord replies for `discord_runtime` so approval-granted and stalled chatter no longer bypasses the reply orchestrator lifecycle
- demoted `tenant-runtime-status-notifier.ts` further into a shared terminal safety-net helper used by process, ingress, approval-rejection, and stale-run paths instead of open-coded completion/failure fallback branching
- unified stale-run, stale-obligation, inline-ingress, approval-rejection, and process-route terminal fallback call sites further under shared terminal dispatch/safety-net policy
- finalized the remaining chunking cleanup so worker/orchestrator reply paths reuse shared chunking helpers instead of ad hoc terminal/progress slicing

Progress completed across this thread:

- plan doc reconciled repeatedly against the live working tree rather than an older `HEAD` snapshot
- approval-path Discord transport now resolves via the same shared tenant bot-token helper used by the orchestrator/safety-net stack
- reply orchestrator deployment posture is now always-on active rather than metadata/env-controlled shadow rollout
- early trial/spending-block terminal replies moved under shared terminal-failure policy
- obligation-side cadence gating removed from the `discord_runtime` worker visibility path
- obligation-side non-terminal Discord replies demoted for `discord_runtime`
- completion notifier demoted further so it behaves as a pure terminal safety net, including suppression for `runtime_dispatched` success runs
- shared terminal safety-net helper adopted by process route, inline ingress, stale-run reaper, stale-obligation sweeper, and approval rejection flows
- targeted tests added/expanded for terminal-success fallback behavior, obligation notifier demotion behavior, and completion-notifier suppression behavior

Implemented behavior in this slice:

- always-on active reply orchestrator behavior for deployed `discord_runtime` runs
- reply lifecycle metadata persisted on the run
- reply normalization before orchestrator-owned delivery
- milestone, keepalive, approval-blocked, resumed, and terminal reply handling
- terminal answer vs synthesized terminal summary/failure selection
- attachment-aware terminal delivery
- text-only terminal fallback when attachment upload fails, with attachment-fallback metadata recorded on the run
- delivery circuit-breaker wrapping for orchestrator-owned sends
- duplicate completion-notification suppression when terminal visibility was already emitted
- approval grant/reject flow routed through orchestrator first for `discord_runtime`
- approval button send/update paths and approval lifecycle replies now share tenant-scoped Discord token resolution instead of relying on `DISCORD_BOT_TOKEN` alone
- stale-run reaper terminal failures routed through orchestrator first for `discord_runtime`
- terminal stale-obligation and overdue-obligation failure replies routed through orchestrator first for linked `discord_runtime` runs
- shared terminal-success and terminal-failure dispatch now flow directly through the orchestrator-owned terminal path
- orchestrator-owned typing refresh cadence and terminal typing seal behavior in the active worker path
- stronger in-memory channel visibility arbitration with priority and lease expiry
- fence-aware Discord reply chunking for long terminal sends
- completion notifier demoted further to safety-net behavior by checking `final_reply_sent`
- completion notifier now also suppresses direct `runtime_dispatched` completions so it does not duplicate the dispatch worker's own Discord reply
- generic completion-notifier fallback removed from several `discord_runtime` failure paths in favor of the shared terminal-failure dispatcher
- dead-letter/process-route and inline-ingress failure paths now try the shared terminal-failure dispatcher before falling back to the generic completion notifier
- early trial-expired and spending-cap-paused Discord replies now use the shared terminal-failure dispatcher instead of a raw worker-owned send
- explicit `delegation_started` lifecycle emission from worker tool results
- explicit `file_ready` lifecycle emission and pending filename tracking beyond terminal attachment send
- pending Discord attachments kept in memory until an actual terminal send succeeds instead of being cleared prematurely
- worker lifecycle send paths refactored further so progress, typing, and approval-blocked sends all flow through one orchestrator-owned path
- obligation-side cadence gating no longer decides `discord_runtime` progress visibility in the worker path
- legacy obligation notifier fallback for `discord_runtime` is now limited to terminal-style fallbacks instead of non-terminal progress/resume chatter
- process/ingress/reaper/approval/sweeper terminal fallback paths now use a shared terminal safety-net helper instead of repeating ad hoc dispatcher/notifier branching
- worker and terminal attachment sends now derive outbound text from shared chunking helpers instead of ad hoc per-call slicing

Validated:

- `npx eslint` on touched runtime and AI worker files
- `npx eslint src/lib/ai/tenant-ai-worker.ts src/lib/runtime/discord-runtime-reply-orchestrator.ts src/lib/runtime/tenant-runtime-status-notifier-utils.ts`
- `npx eslint src/lib/ai/tenant-ai-worker.ts src/lib/runtime/discord-runtime-reply-orchestrator.ts src/lib/runtime/discord-runtime-reply-orchestrator.test.ts`
- `npx eslint src/lib/ai/tenant-ai-worker.ts src/lib/runtime/obligation-discord-notifier.ts src/lib/runtime/obligation-discord-notifier.test.ts src/lib/runtime/obligation-coordinator.ts`
- `npx eslint src/lib/ai/tenant-ai-worker.ts src/lib/runtime/tenant-runtime-status-notifier.ts src/lib/runtime/tenant-runtime-status-notifier-utils.ts src/lib/runtime/tenant-runtime-status-notifier.test.ts src/lib/runtime/obligation-discord-notifier.ts src/trigger/reap-stale-runs.ts src/trigger/sweep-stale-obligations.ts src/app/api/admin/tenants/runtime/process/route.ts src/app/api/admin/tenants/runtime/discord/ingress/route.ts src/lib/runtime/tenant-approval-executor.ts`
- `npm run test:discord-reply-orchestrator`
- `node --import tsx --test src/lib/ai/tenant-ai-worker.test.ts`
- `node --import tsx --test src/lib/runtime/discord-runtime-reply-orchestrator.test.ts src/lib/runtime/tenant-runtime-status-notifier.test.ts`
- `node --import tsx --test src/lib/ai/tenant-ai-worker.test.ts src/lib/runtime/discord-runtime-reply-orchestrator.test.ts src/lib/runtime/tenant-runtime-status-notifier.test.ts`
- `node --import tsx --test --test-force-exit src/lib/runtime/discord-runtime-reply-orchestrator.test.ts src/lib/runtime/tenant-runtime-status-notifier.test.ts`
- `node --import tsx --test src/lib/ai/tenant-ai-worker.test.ts src/lib/runtime/obligation-coordinator.test.ts src/lib/runtime/obligation-discord-notifier.test.ts`
- `node --import tsx --test src/lib/ai/tenant-ai-worker.test.ts src/lib/runtime/tenant-runtime-status-notifier.test.ts src/lib/runtime/obligation-discord-notifier.test.ts src/lib/runtime/obligation-coordinator.test.ts`
- `node --import tsx --test --test-force-exit src/lib/runtime/tenant-runtime-discord.test.ts`
- `node --import tsx --test src/lib/runtime/tenant-runtime-discord-lifecycle.test.ts`
- `node --import tsx --test src/lib/runtime/discord-runtime-reply-policy.test.ts src/lib/runtime/discord-runtime-reply-orchestrator.test.ts`
- `npm run build`

## Goals

- Scope changes to `discord_runtime` only
- Make one component own all user-visible Discord lifecycle replies
- Guarantee terminal closure for any run that emitted visible progress
- Eliminate contradictory approval and resume messaging
- Make retry, re-entry, and stale-run recovery safe for visible replies
- Prefer substantive final answers, with lifecycle summaries as fallback
- Improve conversational quality without flooding Discord with low-value chatter

## Non-Goals

- Generalize this system to email, heartbeat, or delegation in this pass
- Replace the tenant runtime queue or existing run state machine
- Redesign the model prompting stack
- Add broad new UI for reply lifecycle inspection in this pass
- Change non-Discord completion notification behavior beyond dedupe/safety adjustments

## Current State

Today, `discord_runtime` reply behavior is split across:

- `src/lib/ai/tenant-ai-worker.ts`
- `src/lib/runtime/tenant-runtime-orchestrator.ts`
- `src/lib/runtime/obligation-coordinator.ts`
- `src/lib/runtime/obligation-discord-notifier.ts`
- `src/lib/runtime/tenant-approval-executor.ts`
- `src/lib/runtime/tenant-runtime-status-notifier.ts`

This produces several failure modes:

- timer-driven generic progress text instead of meaningful milestones
- raw model step text leaking directly into Discord
- approval-required, approval-granted, and completion messages generated in different layers
- runs that send progress but never send a reliable terminal answer
- duplicate or contradictory replies after approval, retry, or re-entry

OpenClaw's stronger behavior comes from its reply dispatcher architecture, which has explicit reply kinds, normalization, ordered delivery, typing lifecycle cleanup, and reliable idle/completion handoff.

Relevant reference files from OpenClaw:

- `/tmp/openclaw-upstream/src/auto-reply/reply/reply-dispatcher.ts`
- `/tmp/openclaw-upstream/src/auto-reply/reply/dispatch-from-config.ts`
- `/tmp/openclaw-upstream/src/auto-reply/reply/typing.ts`
- `/tmp/openclaw-upstream/src/auto-reply/reply/normalize-reply.ts`

Pantheon should adopt the same architectural shape for `discord_runtime`, adapted to its queue-backed runtime model.

## Proposed Architecture

Add a dedicated reply orchestrator between the `discord_runtime` worker loop and Discord delivery.

New modules:

- `src/lib/runtime/discord-runtime-reply-orchestrator.ts`
- `src/lib/runtime/discord-runtime-reply-policy.ts`
- `src/lib/runtime/discord-runtime-reply-types.ts`

Responsibilities:

- `discord-runtime-reply-orchestrator.ts`
  - single owner of user-visible lifecycle replies for `discord_runtime`
  - serializes outbound lifecycle messages
  - applies dedupe and terminal closure rules
  - persists reply lifecycle metadata to the run
  - owns delivery timing, typing lifecycle signals, and delivery confirmation bookkeeping
  - arbitrates visible reply ownership at the channel level when multiple runs overlap

- `discord-runtime-reply-policy.ts`
  - message policy
  - reply normalization
  - silence thresholds
  - cadence spacing
  - phase-to-template mapping
  - `phaseKey` normalization
  - terminal answer qualification
  - terminal summary and failure synthesis
  - file and attachment terminal delivery policy
  - chunking interface

- `discord-runtime-reply-types.ts`
  - lifecycle state
  - event types
  - metadata schema
  - helper enums

Existing layers keep their current domain responsibilities:

- `tenant-ai-worker.ts`
  - model execution and tool execution
  - emits structured reply events
  - no longer owns ad hoc lifecycle text decisions

- `tenant-runtime-orchestrator.ts`
  - runtime run transition ownership

- `tenant-runtime-discord.ts`
  - Discord transport only
  - chunked text send and attachment send primitives

- `obligation-coordinator.ts`
  - durable obligation state
  - no longer the place where `discord_runtime` visibility decisions are composed

- `tenant-approval-executor.ts`
  - approval decision execution
  - emits approval lifecycle events instead of directly crafting resume prose

- `tenant-runtime-status-notifier.ts`
  - reduced to safety-net notification behavior where needed
  - suppressed whenever the orchestrator already emitted terminal visibility for the run

### New reply pipeline

For `discord_runtime`, visible delivery should follow this order:

1. structured event received
2. event classified into candidate reply kind
3. candidate content normalized
4. cadence and suppression rules applied
5. channel visibility arbitration applied
6. content chunked if needed
7. Discord delivery attempted through orchestrator-owned circuit breaker
8. sent keys and lifecycle metadata recorded only after confirmed delivery

## User-Facing Contract

Every `discord_runtime` run must obey a strict conversational contract.

Allowed visible reply kinds:

- `milestone`
- `keepalive`
- `approval_blocked`
- `resumed`
- `terminal_answer`
- `terminal_summary`
- `terminal_failure`

Rules:

- the system may send conversational milestone updates
- the system may send conversational keepalives after genuine silence
- if approval is required, it must send an explicit blocked-state message
- if approval is granted, it must send one resume message
- every run must end with one terminal visible outcome:
  - substantive answer when strong enough
  - synthesized lifecycle summary otherwise
- after any visible progress update, silence is not allowed indefinitely

Examples:

- milestone: `I'm querying Discourse's admin dashboard now.`
- keepalive: `Still working through the API response. I'll post the result here.`
- approval_blocked: `I need owner approval before I can store that credential. Once it's approved, I'll continue here.`
- resumed: `Approval received. I'm retrying that now.`
- terminal_answer: `There were 128 visitors in the last 24 hours.`
- terminal_summary: `Task complete. I checked Discourse and found the daily visitor count.`
- terminal_failure: `Task failed. The Discourse API returned 403 after approval.`

## Reply Lifecycle State Machine

The reply orchestrator owns a user-visible lifecycle state machine separate from the runtime run state.

States:

- `idle`
- `active`
- `blocked_on_approval`
- `resumed_after_approval`
- `terminal`

Allowed transitions:

- `idle -> active`
- `idle -> blocked_on_approval`
- `active -> active`
- `active -> blocked_on_approval`
- `blocked_on_approval -> resumed_after_approval`
- `resumed_after_approval -> active`
- `active -> terminal`
- `blocked_on_approval -> terminal`
- `resumed_after_approval -> terminal`

Hard invariants:

- only one open approval-blocked cycle can be visible at a time
- only one resume acknowledgment per approval cycle
- only one terminal visible outcome per run
- no non-terminal messages after `terminal`
- any run that emitted visible progress must be closed by:
  - terminal resolution
  - explicit blocked-on-approval state
  - or sweeper-driven failure/stall resolution

## Event Model

The worker and approval pipeline should emit structured reply events instead of raw lifecycle prose.

Proposed input events:

- `run_started`
- `tool_phase`
- `intermediate_text`
- `approval_requested`
- `approval_granted`
- `approval_rejected`
- `keepalive_tick`
- `final_candidate`
- `worker_failed`
- `run_reaped`

Suggested shapes:

```ts
type DiscordRuntimeReplyEvent =
  | { type: "run_started" }
  | {
      type: "tool_phase";
      phaseKey: string;
      toolName?: string;
      label?: string;
      source?: string;
      isSilentTool?: boolean;
    }
  | {
      type: "intermediate_text";
      text: string;
      stepIndex: number;
      finishReason?: string;
      suppressedPreamble?: boolean;
    }
  | {
      type: "approval_requested";
      approvalId: string;
      toolKey?: string;
      reason?: string;
      requiredRole?: string;
    }
  | { type: "approval_granted"; approvalId: string; resumeRunId: string }
  | { type: "approval_rejected"; approvalId: string; reason?: string }
  | { type: "keepalive_tick" }
  | {
      type: "final_candidate";
      responseText: string;
      skipFinalSend: boolean;
      terminalState: "completed" | "continuing";
      toolSummary: string;
      progressUpdatesSentCount: number;
    }
  | { type: "worker_failed"; errorMessage?: string | null }
  | { type: "run_reaped"; errorMessage?: string | null };
```

Suggested normalized `phaseKey` values:

- `api_call`
- `web_research`
- `web_read`
- `memory_lookup`
- `delegation_wait`
- `browser_check`
- `config_update`
- `integration_setup`
- `mcp_tool`
- `skill_execution`
- `generic_tool`

### Phase key normalization

The orchestrator should not assume the current tool catalog is exhaustive. Add:

```ts
function resolvePhaseKey(toolName: string, toolSource?: string): string;
```

Rules:

- known built-in tools map to predefined keys
- MCP tool calls map to `mcp_tool` unless server/category-specific mapping upgrades them to a more specific phase
- custom skill execution maps to `skill_execution`
- known integration setup/configuration flows may map to `integration_setup`
- unknown tools fall back to `generic_tool`

The phase system must never silently drop visibility decisions because a tool name is unfamiliar.

Event producers:

- `tenant-ai-worker.ts`
  - `tool_phase`
  - `intermediate_text`
  - `keepalive_tick`
  - `final_candidate`
  - `worker_failed`

- `tenant-approval-executor.ts`
  - `approval_granted`
  - `approval_rejected`

- runtime and reaper paths
  - `run_reaped`

Additional events:

- `file_ready`
- `delegation_started`

Suggested shapes:

```ts
| { type: "file_ready"; fileId: string; filename: string; mimeType: string }
| { type: "delegation_started"; targetAgentId: string; targetAgentName?: string }
```

`file_ready` lets the orchestrator hold attachments until terminal delivery.

`delegation_started` allows a specific milestone template such as:

- `I've asked another agent to help with that part.`

## Message Policy

### Core policy

- milestones are event-driven, not timer-driven
- keepalives are silence-driven, not progress-driven
- intermediate raw model text is not trusted by default
- approval messaging is authoritative
- final completion uses hybrid behavior:
  - substantive answer when strong enough
  - short lifecycle summary otherwise
- all visible content is normalized before delivery
- visible reply cadence is controlled to avoid robotic bursts

### Milestones

Milestones are sent only when the run enters a meaningfully different work phase.

Examples:

- `I'm querying Discourse's admin dashboard now.`
- `I'm checking the API docs to confirm the right endpoint.`
- `I'm retrying the integration after approval.`

Milestones are deduped by phase family and should not repeat for the same phase unless the run actually changed course.

### Intermediate text classification

`intermediate_text` should be classified explicitly before it is allowed to become a visible milestone.

Promote to milestone candidate only if one of the following is true:

- contains a concrete action statement tied to a recognized tool or phase
- contains substantive findings that are safe to show before terminal resolution
- materially differs from previously sent milestone text for the run

Suppress when one or more of the following is true:

- starts with hedging or filler phrasing such as:
  - `Let me...`
  - `I'll try...`
  - `I'm going to...`
- shorter than a configured minimum length and contains no substantive content
- primarily announces future work rather than present action or findings
- substantially overlaps with an already-sent milestone for the same phase family

Suggested helpers in `discord-runtime-reply-policy.ts`:

- `classifyIntermediateText()`
- `isWeakProcessText()`

> **Note (2026-03-22):** The originally suggested `isMilestoneCandidate()` and `overlapsExistingMilestone()` helpers were not implemented as separate functions. Their logic is folded into `classifyIntermediateText()`, which uses `similarEnough()` internally for overlap detection.

### Keepalives

Conversational keepalives fire only after genuine silence and only while the run is still active.

Default thresholds for `discord_runtime`:

- no keepalive before 20 seconds of silence
- no more than 1 keepalive every 30 seconds
- maximum 3 keepalives per run unless a new phase resets the cadence

Examples:

- `Still waiting on the API response. I'll post the result here.`
- `I'm still comparing the docs so I can give you the right answer.`
- `I'm still checking it directly.`

### Human-like cadence

Suppression alone is not enough. The orchestrator should also control when visible messages are sent.

Default cadence rules:

- minimum 1 second between visible messages for the same run
- do not send a milestone immediately on `run_started`; wait for the first meaningful phase
- after `approval_blocked`, wait briefly before any resumed active milestone unless the resumed message itself is the only visible update
- keepalives use silence thresholds and never bunch immediately after a milestone

The goal is natural rhythm, not artificial delay everywhere. This is lighter than OpenClaw's block-reply human delay, but it brings the same principle into `discord_runtime`.

### Approval Blocked

Blocked messaging must include:

- what action is blocked
- what role is needed when known
- that work resumes after approval

Examples:

- `I need owner approval before I can store that credential. Once it's approved, I'll continue here.`
- `I need admin approval before I can modify that integration. Once it's approved, I'll continue here.`

### Resumed

Short and authoritative:

- `Approval received. I'm retrying that now.`

### Reply normalization

Before any candidate reply reaches Discord, normalize it.

Add:

```ts
function normalizeReplyContent(input: {
  text?: string;
  kind: string;
  responsePrefix?: string;
}): { text?: string; skip: boolean; skipReason?: "empty" | "silent" | "heartbeat" };
```

Normalization responsibilities:

- strip silent tokens and heartbeat tokens
- sanitize user-facing text
- collapse empty payloads with explicit skip reasons
- apply response prefixes when configured
- prevent raw model control tokens or malformed cleanup artifacts from leaking into Discord

This should be modeled directly on the role OpenClaw's `normalize-reply.ts` plays in its dispatcher pipeline.

### Message chunking

The orchestrator should delegate long-message splitting through a dedicated interface rather than hard-coding per-call character slicing.

Add:

```ts
function chunkReplyContent(text: string): string[];
```

Current state as of 2026-03-22:

- Discord length constraints are preserved
- part numbering is supported
- chunking is centralized through `buildDiscordRuntimeResponseParts()`
- long replies are already code-fence-aware across chunk boundaries
- worker visible-progress sends and terminal attachment captions now also derive from the shared chunking path

### Suppression rules

- suppress repeated phase announcements within the same phase family
- suppress raw intermediate text that is only a promise of future work
- suppress non-terminal chatter while blocked on approval
- suppress any non-terminal reply after terminal emission
- suppress duplicates by durable sent keys

## Terminal Resolution Logic

The orchestrator guarantees one terminal visible outcome for every run that became user-visible.

### Inputs

Terminal resolution should consider:

- `responseText`
- `skipFinalSend`
- `progressUpdatesSentCount`
- `toolSummary`
- executor records
- approval state
- run result
- `response_preview`
- `error_message`
- current reply lifecycle state

### Strong terminal answer criteria

A final candidate qualifies as `terminal_answer` only if it is:

- non-empty after reconciliation
- not generic completion filler
- not primarily meta-process text
- not just a repeat of earlier milestones
- clearly resolving the user's request or clearly stating what was completed and found

Examples that qualify:

- `There were 128 visitors in the last 24 hours.`
- `I recreated the Discourse integration and confirmed the API returned 200 OK.`
- `The credential save still failed because the tool was re-gated for owner approval.`

Examples that do not qualify:

- `I'm checking a few sources now.`
- `Done! I web search.`
- `I checked that, but I couldn't find a cleaner answer.`
- `I'll keep working on this.`

### Synthesis path

If the final candidate is weak, synthesize terminal summary text in this priority order:

1. approval-aware failure
2. strong tool-result synthesis
3. run-result synthesis
4. safe failure summary
5. generic fallback terminal

Examples:

- `Task complete. I checked Discourse and found 128 visitors in the last 24 hours.`
- `Task failed. Approval was granted, but the credential storage step still did not complete.`
- `Task failed. The approval request was rejected, so I couldn't complete it.`

### Terminal closure rules

- exactly one terminal visible message per run
- terminal emission is persisted durably
- later retry/re-entry paths must suppress additional terminal replies
- if earlier progress exists but no terminal emission exists, the next execution must reconcile and emit one

### Files and attachments

Attachments are part of terminal delivery, not an afterthought.

Rules:

- files collected during the run should be held by the orchestrator until terminal delivery
- if the terminal outcome is a substantive `terminal_answer`, attach files to that message when possible
- if the terminal outcome is a synthesized `terminal_summary`, attach files to the summary if those files are the real work product of the run
- if attachment send fails, fall back to text-only terminal delivery and record the attachment failure in run metadata

## Approval and Resume Semantics

Approval flow becomes a first-class reply lifecycle path.

### Contract

When approval is first required:

- visible state becomes `blocked_on_approval`
- send exactly one blocked message for that approval cycle
- record approval cycle id durably

While blocked:

- suppress normal keepalives and progress chatter
- do not imply continued execution

When approval is granted:

- emit exactly one resumed message
- transition visible state to `resumed_after_approval`
- increment approval cycle version

When approval is rejected:

- emit terminal failure immediately

If a tool is re-gated after approval:

- treat as a new cycle only if the `approval_id` is genuinely new
- otherwise suppress as a duplicate signal

Suggested metadata fields inside `reply_lifecycle`:

- `approval_cycle_sequence`
- `current_approval_id`

> **Note (2026-03-22):** The originally suggested `approval_block_sent_at`, `approval_resume_sent_at`, and `approval_last_resolution` fields were superseded by `approval_cycle_sequence` + `current_approval_id` in the implementation. The cycle sequence increments on each new approval block, and `current_approval_id` gates resume deduplication.

## Typing Lifecycle

Typing indicators should be governed by the same lifecycle owner as visible replies.

The orchestrator should define a typing contract:

- emit `typing_start` or `typing_refresh` when visible conversational work is active
- emit `typing_stop` when:
  - the run reaches terminal state
  - the run becomes sealed after failure or reap
  - delivery is fully idle

Key behavior requirements:

- terminal state seals typing so late callbacks cannot restart it
- typing should have a TTL safety net
- dispatch idle should participate in typing shutdown

This can initially integrate with the existing worker typing hooks, but the lifecycle contract belongs to the orchestrator.

## Circuit Breaker and Delivery Ownership

Because the orchestrator owns visible Discord delivery, it should also own the delivery circuit breaker behavior for lifecycle messages and terminal replies.

Rules:

- lifecycle and terminal delivery should go through orchestrator-owned or orchestrator-wrapped circuit breaker logic
- the circuit breaker should remain compatible with the current Discord send failure threshold and cooldown model
- delivery failures should be recorded in reply lifecycle metadata
- failed sends must not mark dedupe keys as sent

## Obligation Integration

Obligations remain the durable state machine for long-lived user-facing commitments, but visibility decisions should move out of the obligation coordinator and into the reply orchestrator.

Explicit event mapping:

- obligation heartbeat -> `keepalive_tick`
- obligation tool phase -> `tool_phase`
- obligation stall -> failure-classified event with stall reason

Design consequence:

- `recordUserUpdate()` remains durable bookkeeping
- `shouldSendStatusUpdate()` should be removed or demoted from the obligation coordinator for `discord_runtime`
- the orchestrator becomes the sole owner of "should this be visible now?"

## Durability and Recovery

The orchestrator must be retry-safe and restart-safe.

Persist a compact reply ledger in `tenant_runtime_runs.metadata.reply_lifecycle`.

Suggested shape:

```ts
type DiscordReplyLifecycleMetadata = {
  state: "idle" | "active" | "blocked_on_approval" | "resumed_after_approval" | "terminal";
  phase_key: string | null;
  last_visible_kind:
    | "milestone"
    | "keepalive"
    | "approval_blocked"
    | "resumed"
    | "terminal_answer"
    | "terminal_summary"
    | "terminal_failure"
    | null;
  last_visible_event_at: string | null;
  progress_count: number;
  keepalive_count: number;
  approval_cycle_sequence: number;
  current_approval_id: string | null;
  terminal_kind: "answer" | "summary" | "failure" | null;
  terminal_sent_at: string | null;
  sent_keys: string[];
  last_message_preview: string | null;
};
```

Important delivery rule:

- `sent_keys` must only be recorded after Discord confirms delivery
- failed send attempts must not poison dedupe state

Suggested supporting metadata:

- `pending_send_key`
- `last_send_attempt_at`
- `last_send_error`

### Recovery rules

- duplicate ingress for same run
  - suppress already-sent lifecycle messages via `sent_keys`

- worker re-entry after partial progress
  - continue if non-terminal
  - synthesize terminal closure if final answer is still weak

- approval grant after restart
  - emit exactly one resumed message if the approval cycle is still unresolved

- stale worker / stale obligation
  - if no terminal visible message was ever emitted, synthesize one on reaper/sweeper paths

- conflicting terminal paths
  - once terminal is emitted, later failure paths must not send another visible terminal reply

### Channel visibility arbitration

Multiple runs can target the same Discord channel. The design should not assume single-run exclusivity forever, but it must avoid overlapping conversational lifecycles that confuse the user.

Add channel-level visibility arbitration:

- at most one run may own non-terminal conversational visibility in a channel at a time
- user-initiated runs take priority over scheduled follow-up runs
- lower-priority overlapping runs suppress milestones and keepalives until visibility ownership is released
- blocked and terminal messages may still be allowed through under controlled rules

This is intentionally lighter than a hard channel lock. It prevents cross-talk without deadlocking all visible delivery.

## Integration Plan

### New files

- `src/lib/runtime/discord-runtime-reply-orchestrator.ts`
- `src/lib/runtime/discord-runtime-reply-policy.ts`
- `src/lib/runtime/discord-runtime-reply-types.ts`

### Files to modify

- `src/lib/ai/tenant-ai-worker.ts`
  - instantiate orchestrator for `discord_runtime`
  - emit structured lifecycle events
  - remove direct ownership of most progress/approval/final Discord sends
  - integrate existing typing hooks with orchestrator typing contract

- `src/lib/runtime/tenant-approval-executor.ts`
  - replace direct resume reply send with orchestrator event emission
  - use orchestrator terminal rules on rejection

- `src/lib/runtime/tenant-runtime-status-notifier.ts`
  - demote to safety-net role for `discord_runtime`
  - skip duplicate success notifications when terminal reply already emitted

- `src/lib/runtime/obligation-discord-notifier.ts`
  - reduce to transport helper or re-home its logic into orchestrator

- `src/trigger/reap-stale-runs.ts`
  - use shared terminal emission rules

- `src/trigger/sweep-stale-obligations.ts`
  - use shared terminal emission rules and dedupe checks

- `src/lib/runtime/tenant-runtime-discord.ts`
  - expose transport helpers the orchestrator can call for:
    - single-message send
    - chunked send
    - attachment send
    - typing signal integration

### End-to-end execution path

1. ingress creates and claims `discord_runtime` run
2. worker instantiates reply orchestrator
3. worker emits structured lifecycle events
4. orchestrator classifies and normalizes candidate replies
5. orchestrator applies cadence, arbitration, and chunking
6. orchestrator attempts delivery through its circuit breaker
7. orchestrator records visible lifecycle state and sent keys only after confirmed delivery
8. orchestrator emits exactly one terminal visible outcome
9. reapers and approval paths reuse the same terminal rules

## Testing Strategy

This refactor needs stronger tests than Pantheon has today, closer to OpenClaw's dispatcher coverage.

### Unit tests

New test files:

- `src/lib/runtime/discord-runtime-reply-policy.test.ts`
- `src/lib/runtime/discord-runtime-reply-orchestrator.test.ts`

Cover:

- milestone dedupe by phase family
- keepalive silence threshold behavior
- max keepalive count
- normalization skip reasons and token stripping
- typing seal behavior after terminal state
- channel visibility arbitration for overlapping runs
- sent key persistence only after confirmed delivery
- file-ready accumulation and terminal attachment policy
- approval block dedupe
- single resume per approval cycle
- strong terminal answer classification
- weak final candidate synthesis
- terminal dedupe after retries/re-entry
- post-terminal suppression

### Integration tests

Expand or add tests around:

- `src/lib/ai/tenant-ai-worker.test.ts`
- `src/lib/runtime/tenant-runtime-status-notifier.test.ts`
- `src/lib/runtime/obligation-coordinator.test.ts`
- `src/lib/runtime/tenant-approval-executor` coverage

Scenarios:

- query-only run with substantive terminal answer
- progress emitted, weak final candidate, synthesized terminal summary
- approval requested, approval granted, resumed, final success
- approval requested, approval rejected, terminal failure
- duplicate approval signal for same approval id
- stale run reaped after progress but before final answer
- worker retry after partial visible progress
- attachment present on terminal answer
- attachment fallback to text-only when file send fails
- overlapping follow-up run suppressed while user-initiated run owns channel visibility

### Behavioral regression scenarios

Must explicitly test the failure patterns from the Discourse example:

- `I'm making that API call now.` followed by no real result
- approval received followed by another duplicate approval request
- `Done! I web search.` style weak final candidate
- successful query with clean substantive answer

## Rollout Plan

The historical phased rollout notes above are now complete enough to retire.

Current deployment posture:

- the reply orchestrator is live for all `discord_runtime` tenants when deployed
- worker progress, approval lifecycle, and terminal dispatch paths now route through the orchestrator-owned reply lifecycle
- the remaining work is ordinary hardening/regression coverage, not a staged rollout

## Risks

- over-chatty Discord updates if milestone classification is too loose
- under-chatty behavior if phase normalization is too conservative
- migration complexity because progress messaging is currently embedded in worker control flow
- hidden duplicate paths from reaper/sweeper/safety-net notifiers if terminal dedupe is incomplete
- overly aggressive synthesis could produce terminal summaries that are technically correct but too generic

## Recommendation

Implement the `discord_runtime` reply orchestrator as a dedicated lifecycle owner now, instead of continuing to patch `tenant-ai-worker.ts` in place.

This is the smallest change that fixes the real architectural problem:

- Pantheon currently has no single owner of user-visible reply lifecycle
- OpenClaw is stronger because it does
- `discord_runtime` is the correct narrow scope for the first implementation

## Validation Commands

Minimum validation for the eventual implementation:

- `npm run lint`
- `npm run build`

Additional targeted tests should be added for the new orchestrator modules and the approval/resume scenarios above.
