# Discord Reply Tone Hardening Design

## Summary

Pantheon's Discord runtime already has system-prompt guidance that says replies should feel human, direct, and non-robotic. In practice, several hard-coded runtime layers override that guidance with canned progress messages, formal terminal wrappers, and API-centric fallback phrasing.

This change hardens the reply pipeline so user-visible messages stay conversational even when the model output is weak or a fallback path is used. The first pass keeps progress updates visible, trims their frequency slightly, and removes terminal wrapper language when the reply already stands on its own as a complete answer.

## Goals

- Keep progress messages visible, but make them sound more natural.
- Reduce low-value progress chatter slightly without hiding meaningful updates.
- Stop prepending `Task complete.` or similar wrappers to already-complete answers.
- Replace rigid fallback phrasing such as `Tried it again` and `The response says` with plain-language summaries.
- Keep the scope limited to hard-coded phrasing and terminal wrapper logic.

## Non-Goals

- Redesign the broader cron prompt system in this pass.
- Add new Discourse-specific result formatting in this pass.
- Rework the entire runtime reply architecture.
- Remove progress messaging entirely.

## Current State

The current runtime has three main tone problems:

- `discord-runtime-reply-policy.ts` emits canned milestone and keepalive messages such as `I'm making that API call now.` and wraps many successful outcomes with `Task complete.`
- `discord-runtime-reply-orchestrator.ts` uses that summary path whenever a reply is not classified as a strong final answer, even when the text is already acceptable user-facing prose.
- `fallback-formatter.ts` still generates stiff API summaries like `Tried it again. Discourse responded with 200 OK. The response says: ...`

These layers partially defeat the more natural communication rules in the main agent system prompt.

## Proposed Design

### Progress Message Policy

Keep milestone and keepalive replies enabled, but make them:

- shorter
- less repetitive
- less obviously machine-generated
- spaced slightly farther apart

The message set should acknowledge work in progress without narrating the tool mechanics more than necessary.

### Terminal Reply Policy

Treat the model's final reply as the preferred user-facing answer.

- If the final text already reads like a complete answer, send it unchanged.
- If the final text is weak, procedural, or obviously incomplete, synthesize a natural-language summary.
- Reserve explicit completion/failure wrappers for genuine fallback cases only, not as the default format.

### Fallback Formatter Policy

Keep fallback formatting available, but rewrite the phrasing so it:

- leads with the user-relevant outcome
- mentions status codes only when they matter
- avoids rigid operator/debug language
- avoids labels like `The response says`

For successful API checks, the fallback should sound like a concise teammate update, not a transport log.

## Files In Scope

- `src/lib/runtime/discord-runtime-reply-policy.ts`
- `src/lib/runtime/discord-runtime-reply-orchestrator.ts`
- `src/lib/ai/fallback-formatter.ts`
- targeted tests for those modules

## Risks

- If terminal-answer classification becomes too permissive, weak answers may slip through without summarization.
- If the fallback phrasing becomes too vague, users may lose useful operational detail.
- Slightly reducing cadence must not suppress meaningful updates during long-running tasks.

## Validation

- Update reply-policy tests so complete answers are not wrapped by default.
- Update orchestrator tests so strong answers are sent unchanged and weak outputs still summarize cleanly.
- Update fallback-formatter tests to assert plain-language outcomes instead of robotic API phrasing.
- Run focused tests for the touched modules and a targeted lint pass on edited files.
