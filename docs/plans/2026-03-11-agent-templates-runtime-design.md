# Pantheon Agent Templates And Runtime Design

Date: 2026-03-11
Status: In Progress
Owner: Codex

## Summary

Pantheon should keep optional agent templates, but only as one-time prefills during agent creation. Saved agents should never depend on a template or preset at runtime. Runtime behavior should come only from explicit saved fields such as role, goal, backstory, autonomy, delegation, tools, skills, schedules, and channel binding.

This matches the strongest UX pattern across tools like CrewAI, Relevance AI, Lindy, and Zapier Agents:

- templates reduce blank-page friction
- agent behavior remains explicit and inspectable
- autonomy and delegation are separate controls
- testing happens before activation

## Product Model

Saved agents should be defined by first-class fields only:

- `display_name`
- `role`
- `goal`
- `backstory`
- `autonomy_level`
- `can_delegate`
- `can_receive_delegation`
- `skills`
- `schedules`
- `discord_channel_id`
- `discord_channel_name`
- `tool_approval_overrides`
- `composio_toolkits`

Templates should not be stored as a behavioral field on the saved agent.

## Template Model

Templates should live in a separate catalog and return draft data only. A template payload can prefill:

- name suggestion
- role
- goal
- backstory
- autonomy defaults
- delegation defaults
- recommended skills
- recommended schedules

After the user edits and saves, the template is no longer part of the runtime model.

## Setup UX

The create-agent flow should be:

1. Choose `Start from scratch` or `Use template`
2. If a template is chosen, prefill the standard agent form
3. Let the user edit all fields before saving
4. Require explicit review of autonomy and delegation
5. Offer preview/test before activation

Rules:

- templates are shortcuts, not modes
- saved agents do not stay linked to templates
- template changes never mutate existing agents

## Runtime Rules

Runtime code should not branch on `personality_preset` or any preset identifier.

Runtime behavior should come only from:

- explicit agent fields
- enabled tools and skills
- schedules
- team context
- policy and approval settings

Compatibility fields may remain in storage temporarily, but runtime should ignore them.

## Migration Strategy

1. Normalize legacy agents into explicit fields where possible.
2. Stop reading preset values in runtime code.
3. Keep deprecated preset fields only as temporary compatibility storage.
4. Remove deprecated fields in a later cleanup migration once all reads are gone.

## Implementation Guidance

Short term:

- remove preset-driven behavior from self-configuration tools
- stop creating agents from preset defaults in runtime helpers
- stop surfacing presets in core runtime config views
- keep template logic in UI-only creation paths

Later:

- add an explicit template picker backed by a template catalog
- replace legacy preset compatibility shims in types and validators
- remove deprecated preset fields from database sync paths once safe

## Recommendation

Pantheon should use templates as onboarding accelerators only. The source of truth for runtime should be explicit agent configuration, not preset identity.

## Implementation Progress

Started: 2026-03-11

- [x] Reviewed current runtime, preview, and self-configuration paths against this design
- [x] Confirmed system prompt generation already uses explicit fields (`role`, `goal`, `backstory`, autonomy, delegation, skills, tool approvals)
- [x] Updated tenant agent hydration so legacy agents are normalized into explicit runtime fields during tenant sync
- [x] Stopped tenant runtime sync from preserving preset identity; compatibility storage now normalizes to `personality_preset = "custom"`
- [x] Mirrored explicit `backstory` into deprecated `custom_personality` only as temporary compatibility storage
- [x] Removed preset-driven styling/decorators from knowledge management UI in runtime admin surfaces
- [x] Stopped dashboard runtime management pages from surfacing stored preset identity for tenant-backed agents
- [x] Added targeted unit coverage for tenant agent config normalization
- [x] Added a UI-only template catalog to the dashboard create-agent flow that prefills explicit fields without persisting template identity
- [x] Removed the old dead preset picker/stub so the codebase no longer implies preset-driven runtime setup
- [x] Reused the shared template catalog in onboarding with a smaller curated starter set and the same explicit-field prefills

Files touched in this slice:

- `src/lib/runtime/tenant-agents.ts`
- `src/lib/runtime/tenant-agents.test.ts`
- `src/app/(dashboard)/agents/page.tsx`
- `src/app/(dashboard)/settings/channels/page.tsx`
- `src/app/(dashboard)/settings/knowledge/_components/knowledge-data.tsx`
- `src/hooks/use-knowledge-manager.ts`
- `src/lib/templates/agent-templates.ts`
- `src/components/dashboard/agent-form/agent-form.tsx`
- `src/components/onboarding/step2-agent.tsx`
- `src/app/(docs)/docs/page.tsx`

Remaining work:

- keep tracing and removing preset compatibility reads from non-runtime legacy/docs views
- replace remaining compatibility shims in shared types/validators once reads are fully gone
- plan a later storage cleanup migration after all preset-field reads are removed

Validation run for the current slices:

- `npx eslint src/components/dashboard/agent-form/agent-form.tsx src/lib/templates/agent-templates.ts src/app/(docs)/docs/page.tsx src/lib/runtime/tenant-agents.ts src/hooks/use-knowledge-manager.ts src/app/(dashboard)/agents/page.tsx src/app/(dashboard)/settings/channels/page.tsx src/app/(dashboard)/settings/knowledge/_components/knowledge-data.tsx`
- `npm run build`
