# Discord Runtime Reply Orchestrator Design

## Summary

Pantheon's `discord_runtime` conversational flow is fragile because user-visible replies are produced as scattered side effects across the AI worker, approval executor, obligation notifier, and completion notifier. This creates inconsistent progress updates, contradictory approval messaging, and missing terminal closure.

This design adds a dedicated `discord_runtime` reply orchestrator that owns all user-visible lifecycle messages for a run. It does not replace the runtime queue, worker, run state machine, or obligation system. It adds a single reply lifecycle owner that turns structured runtime events into reliable Discord-visible milestones, keepalives, approval notices, resume notices, and terminal outcomes.

The target behavior is conversational but controlled:

- milestone updates should feel human and specific
- keepalives should appear only after real silence
- approval and resume messaging must be authoritative
- every visible progress update must eventually resolve into a blocked state, a terminal answer, or a terminal failure

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

- `discord-runtime-reply-policy.ts`
  - message policy
  - silence thresholds
  - phase-to-template mapping
  - terminal answer qualification
  - terminal summary and failure synthesis

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

- `obligation-coordinator.ts`
  - durable obligation state
  - no longer the place where `discord_runtime` reply wording is composed

- `tenant-approval-executor.ts`
  - approval decision execution
  - emits approval lifecycle events instead of directly crafting resume prose

- `tenant-runtime-status-notifier.ts`
  - reduced to safety-net notification behavior where needed

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

## Message Policy

### Core policy

- milestones are event-driven, not timer-driven
- keepalives are silence-driven, not progress-driven
- intermediate raw model text is not trusted by default
- approval messaging is authoritative
- final completion uses hybrid behavior:
  - substantive answer when strong enough
  - short lifecycle summary otherwise

### Milestones

Milestones are sent only when the run enters a meaningfully different work phase.

Examples:

- `I'm querying Discourse's admin dashboard now.`
- `I'm checking the API docs to confirm the right endpoint.`
- `I'm retrying the integration after approval.`

Milestones are deduped by phase family and should not repeat for the same phase unless the run actually changed course.

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
- `approval_block_sent_at`
- `approval_resume_sent_at`
- `approval_last_resolution`

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

### End-to-end execution path

1. ingress creates and claims `discord_runtime` run
2. worker instantiates reply orchestrator
3. worker emits structured lifecycle events
4. orchestrator decides what is user-visible
5. orchestrator records visible lifecycle state and sent keys
6. orchestrator emits exactly one terminal visible outcome
7. reapers and approval paths reuse the same terminal rules

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

### Behavioral regression scenarios

Must explicitly test the failure patterns from the Discourse example:

- `I'm making that API call now.` followed by no real result
- approval received followed by another duplicate approval request
- `Done! I web search.` style weak final candidate
- successful query with clean substantive answer

## Rollout Plan

Roll out in three phases.

### Phase 1: Shadow metadata, current transport

- add orchestrator and metadata model
- let orchestrator decide lifecycle state and sent keys
- keep most current transport logic in place
- compare orchestrator decisions vs current behavior in logs

### Phase 2: Orchestrator-owned lifecycle messages

- move milestone, keepalive, approval-blocked, resumed, and terminal summary/failure messaging to orchestrator
- keep substantive answer path working through worker integration

### Phase 3: Cleanup and hardening

- reduce duplicate logic in `tenant-ai-worker.ts`
- demote `tenant-runtime-status-notifier.ts` for `discord_runtime`
- unify reaper/sweeper terminal behavior under shared policy

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
