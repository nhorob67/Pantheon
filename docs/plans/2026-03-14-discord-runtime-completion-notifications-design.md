# Discord Runtime Completion Notifications Design

## Summary

Add shared completion notifications for `discord_runtime` runs so agents can proactively post a concise lifecycle update when a task finishes or fails. The behavior should support:

- a team-level default toggle stored in `team_profiles`
- a per-run override captured in runtime metadata
- deduping across retries, inline execution, and resumed runs

Default behavior is enabled.

## Goals

- Notify Discord users when a runtime task completes after work has been performed.
- Keep notification behavior consistent across inline ingress and queued processing.
- Avoid duplicate completion messages when runs retry or resume after approval.
- Preserve the resolved notification preference on each run.

## Non-Goals

- Add a full notification preference UI in this change.
- Notify non-Discord runtime kinds.
- Replace the agent's primary response with lifecycle updates.

## Current State

- Discord ingress stores channel and message context on `tenant_runtime_runs`.
- The AI worker can already send intermediate progress text and the primary final reply.
- Runtime status transitions are centralized, but there is no shared post-transition notification hook.
- Inline ingress and queued processing use different execution paths, so worker-local messaging is insufficient.

## Proposed Design

### Team Default

Add `discord_completion_notifications_enabled boolean not null default true` to `team_profiles`.

This acts as the default for new Discord runtime runs. Existing teams inherit `true` after migration.

### Per-Run Preference

When a `discord_runtime` run is enqueued, resolve the team default and stamp metadata:

- `notify_on_completion`
- `completion_notification_source`

This allows future callers to override the setting for a single run while keeping the resolved value stable for the life of that run.

### Shared Notifier

Add a shared helper that:

- runs only for `discord_runtime`
- checks `metadata.notify_on_completion`
- sends a concise Discord reply into the originating channel/thread
- dedupes by terminal event using run metadata

Supported events in this change:

- `completed`
- `failed`

### Dedupe

Persist notification state in run metadata so retries and repeated transition handling do not repost:

- `completion_notification_sent_at`
- `completion_notification_event`

If the same terminal event has already been notified, skip sending.

### Message Shape

Completion notifications should be concise lifecycle messages, not copies of the agent's full reply.

Priority for summary content:

1. structured `run.result` fields such as `change_summary`, `display_name`, `agent_name`, `ack`
2. `response_preview`
3. a generic fallback message

Examples:

- `Task complete. Created agent "Iris".`
- `Task complete. Response sent to Discord.`
- `Task failed. I couldn't finish this run: <safe error>.`

## Integration Points

### Inline Discord Ingress

After the inline route transitions the claimed run to `completed` or `failed`, call the notifier with the transitioned run.

### Queued Processor

After `executeTenantRuntimeRun()` transitions a run, call the notifier with the transitioned run before retry scheduling logic continues.

This ensures both runtime paths behave the same way.

## Risks

- Users may see both the agent's normal final reply and the explicit completion notification. This is intentional for now.
- Notification delivery failures should not fail the runtime run after the main response has already been delivered.
- Metadata patches used for dedupe must preserve existing run metadata.

## Validation

- Lint and build the app.
- Verify completed Discord runtime runs emit a single completion update.
- Verify failed runs emit a single failure update.
- Verify retries do not duplicate notifications.
- Verify `notify_on_completion: false` suppresses updates.
