# Industry-Agnostic Cleanup Plan

Date: 2026-03-11
Status: Complete (all phases done; Phases 1 and 5 each have one manual verification/smoke-test item remaining)
Owner: TBD
Scope: Convert the current industry-agnostic audit into an execution plan with phased checklists.

## Goal

Finish the transition from a farm-specific product to an industry-agnostic multi-agent platform by removing farm assumptions from:

- build-critical code
- runtime prompts and product behavior
- scheduling and heartbeat contracts
- schema and compatibility layers
- dashboard copy, docs, and lifecycle messaging
- dormant templates and dead farm-era artifacts

## Success Criteria

- `npm run lint` passes.
- `npm run build` passes.
- Runtime prompts no longer describe the workspace as a farm or the user as a farmer.
- Briefings, schedules, and heartbeat checks use generic concepts instead of weather, grain, or ticket assumptions.
- `team_profiles` is the clear long-term source of truth.
- User-facing product copy, docs, search index, and billing messages are industry-agnostic.
- Farm-era templates, tools, and examples are either deleted, archived, or explicitly quarantined.

## Working Principles

- Prefer shipping generic primitives over renaming farm-specific concepts.
- Remove behavioral drift before polishing copy.
- Keep backward compatibility only where it protects production data or active tenants.
- Delete dead domain-specific code once the replacement path is verified.
- Rebuild generated artifacts after source cleanup.

## Phase 0: Stabilize The Baseline

Objective: fix the known build blocker and establish a clean baseline before broader cleanup.

Checklist:

- [x] Fix the `SkillTemplateCategory` mismatch between `src/lib/custom-skills/templates.ts` and `src/types/custom-skill.ts`.
- [x] Run `npm run lint` and `npm run build`.
- [x] Capture any additional compile or type errors that were hidden behind the first failing build error.
- [x] Create a short “remaining blockers” list if more build issues appear after the first fix.
- [x] Confirm the new cleanup work is being done in a standalone planning track and not folded into older farm-era planning docs.

Exit criteria:

- Build and lint both pass, or all remaining blockers are explicitly documented with owners.

## Phase 1: Remove Farm Framing From Runtime Behavior

Objective: stop the app from acting farm-specific even when the UI looks generic.

Checklist:

- [x] Replace farm wording in memory prompt wrappers in `src/lib/ai/context-packer.ts`.
- [x] Replace farm wording in legacy memory prompt formatting in `src/lib/ai/memory-retrieval.ts`.
- [x] Replace farm wording in knowledge prompt formatting in `src/lib/ai/knowledge-retrieval.ts`.
- [x] Remove the “farm assistant” preview persona from `src/app/api/custom-skills/[id]/test/route.ts`.
- [x] Rename `farm_context` to a generic concept such as `team_context` across request validation, client calls, and API handling.
- [x] Audit prompt-adjacent helper text for hidden farm assumptions in custom skill generation flows.
- [ ] Spot-test a generic tenant with non-agency prompts to confirm outputs stay domain-neutral.

Exit criteria:

- No active prompt builder or skill-preview path refers to farms, farmers, crops, or elevators unless the user explicitly configured that domain.

## Phase 2: Genericize Briefings, Schedules, And Heartbeat

Objective: remove farm-era product modeling from proactive automation.

Checklist:

- [x] Replace farm-shaped cron prompt keys such as `daily_grain_bids` — removed. Legacy keys (`morning_weather`, `daily_market_summary`, `evening_ticket_summary`) kept in CRON_PROMPTS for existing DB rows; new generic keys (`morning_briefing_fallback`, `daily_digest`, `evening_recap`) added.
- [x] Redesign briefing sections in `src/lib/validators/briefing.ts` — renamed to `conditions`, `external_updates`, `activity_recap`.
- [x] Update the tenant briefing API defaults in `src/app/api/tenants/[tenantId]/briefings/route.ts` — added `migrateBriefingSections()` to transparently convert legacy keys on read.
- [x] Align `src/lib/ai/tenant-ai-worker.ts` with the new generic briefing section model — `buildCronPrompt()` accepts both new and legacy section keys via fallback (`??`).
- [x] Remove “farm-wide” and “farm coverage” wording from heartbeat operator UI.
- [x] Replace farm-specific synthetic heartbeat/test copy in API responses.
- [x] Reconcile heartbeat schema defaults with the actual supported runtime checks.
- [x] Decide whether deprecated checks are being removed, migrated, or reintroduced as generic custom checks. **Decision: removed.** Farm-era checks (`grain-price-check`, `ticket-check`, `weather-check`) are deleted. The generic `custom_checks` system replaces them — users define their own check descriptions.
- [x] Verify schedule cards and schedule management UI no longer surface farm-era keys or labels. Cleaned up legacy icon mappings in `schedule-card.tsx`.

Exit criteria:

- Proactive behaviors are described in generic operational terms and the database, validators, runtime, and UI all model the same set of checks.

## Phase 3: Converge The Data Model

Objective: finish the shift from `farm_profiles` compatibility to `team_profiles` as the clear long-term source of truth.

Checklist:

- [x] Audit all active reads and writes that still depend on `farm_profiles`. **Result: no active source code in `src/` reads or writes `farm_profiles`.** Only the backfill script did — updated to use `team_profiles`.
- [x] Decide whether `farm_profiles` remains temporary compatibility storage or is fully retired. **Decision: retired.** `team_profiles` is canonical. `farm_profiles` retained read-only for legacy data access with a DEPRECATED comment.
- [x] Create a follow-up migration plan — migration `00080_schema_convergence.sql` written: drops `grain_bid_cache`, adds DEPRECATED comments on `farm_profiles` and legacy `agents` columns, documents `team_profiles` as canonical, removes stale tool seeds.
- [x] Review `00079_industry_agnostic_refactor.sql` — correct: creates `team_profiles`, migrates data, relaxes constraints. No issues.
- [x] Document compatibility expectations for older tenants — migration comments and code JSDoc annotations added. Legacy sync layer in `tenant-agents.ts` preserved for existing tenants with `agents` table rows.
- [x] Review agent persistence compatibility fields such as `personality_preset` and `cron_jobs`. **Decisions:**
  - `personality_preset`: stays in internal compat layer (always `"custom"`), removed from public API. JSDoc `@deprecated` added.
  - `cron_jobs`: made optional in validator and `Agent` type, removed from UI forms/templates/provisioning, dead `CronToggles` props cleaned up. Kept in internal compat layer for legacy DB sync. JSDoc `@deprecated` added.
- [x] Decide which legacy fields remain temporarily mirrored and which should be removed from runtime contracts. `personality_preset`, `custom_personality`, and `cron_jobs` remain in internal `TenantAgentConfig` for legacy sync only. Not exposed in public types.
- [x] Review farm-specific tables such as grain bid and scale-ticket storage. **Decision: dropped.** `grain_bid_cache` dropped in migration `00080`. Stale tool seeds (`tenant_grain_bid_query`, `tenant_scale_ticket_create`, `tenant_scale_ticket_list`) removed.

Exit criteria:

- There is one documented source of truth for team identity and a clear retirement path for farm-era schema baggage.

## Phase 4: Clean User-Facing Product Surfaces

Objective: remove farm framing from the dashboard and product copy users actually see.

Checklist:

- [x] Replace “Complete your farm setup” copy in dashboard settings pages.
- [x] Replace “farm assistant” copy in model settings and other settings intros.
- [x] Remove farm wording from alert pages and alert preferences.
- [x] Update memory settings descriptions that still mention crop plans, elevator preferences, or “most farms”.
- [x] Update knowledge upload helper text so examples are industry-neutral.
- [x] Remove “built-in farm tools” wording from MCP settings.
- [x] Update the email identity placeholder that still assumes `your-farm-name`.
- [x] Audit onboarding, agent creation, and settings empty states for leftover farm nouns.
- [x] Review heartbeat diagnostics and override descriptions for residual domain-specific guidance.

Exit criteria:

- A new user can navigate the product without seeing farm-specific language unless they add it themselves.

## Phase 5: Rework Skill Creation And Template Guidance

Objective: make the “build your own agent” flow feel native to any industry.

Checklist:

- [x] Replace agriculture-specific skill template categories such as crop management and livestock.
- [x] Update `src/components/settings/skill-template-picker.tsx` to match the generic template taxonomy.
- [x] Replace agriculture-specific example prompts in `src/components/settings/skill-ai-generator.tsx`.
- [x] Review `src/lib/custom-skills/templates.ts` for template naming, descriptions, and sample outputs.
- [x] Review `src/types/custom-skill.ts` so categories align with the new template library.
- [x] Audit skill icon choices and remove ag-only defaults where they imply product scope.
- [ ] Verify generated skills and test previews remain generic across at least three non-farm scenarios.

Exit criteria:

- Skill creation no longer nudges users toward agriculture unless they explicitly choose that domain.

## Phase 6: Docs, Lifecycle Messaging, And Generated Assets

Objective: finish the repositioning in all shipped and near-shipped content.

Checklist:

- [x] Update billing and trial reminder copy that still says “your farm data”.
- [x] Audit docs for contradictions around built-in skills versus generic extensibility.
- [x] Remove agriculture-specific examples from docs that are meant to describe core product capabilities.
- [x] Decide whether farm storytelling assets such as `docs/the-quiet-morning.md` remain as archived marketing history or should be removed. **Decision: removed.**
- [x] Review `docs/pantheon-landing.html` and similar collateral for active or accidental reuse risk. **Decision: removed.**
- [x] Rebuild `public/search-index.json` after source doc cleanup.
- [x] Review screenshots and image assets for farm-era UI if they are still referenced anywhere. (All farm-era screenshots deleted.)
- [x] Re-run docs search locally and confirm farm results only appear in intentionally preserved historical content.

Exit criteria:

- Public-facing docs, billing flows, and generated search assets all reflect the industry-agnostic positioning.

## Phase 7: Delete Or Quarantine Farm-Era Footguns

Objective: reduce the risk of accidentally reintroducing old domain assumptions.

Checklist:

- [x] Review `templates/SOUL.md` — already generic, no action needed.
- [x] Review `templates/openclaw.json` — already generic, no action needed.
- [x] Review the dormant weather tool in `src/lib/ai/tools/weather.ts`. **Decision: removed ag-specific tools.** `get_spray_windows` and `get_gdd_accumulation` deleted. `get_weather_forecast` and `get_weather_alerts` retained as industry-neutral.
- [x] Remove any dead imports, registry hooks, or comments that imply farm-specific tools are still part of the active platform.
- [x] Review old tests and fixtures with farm-only names — generalized to `test-memories.ts`.
- [x] Genericize Composio toolkit descriptions in `src/lib/composio/toolkits.ts` (removed farm-specific examples: "planting windows", "seed lots", "field maps", "fieldwork").
- [x] Add a short legacy-inventory note if any farm-specific artifacts must remain for compatibility. **Done:** `docs/legacy-farm-era-inventory.md` documents all retained farm-era artifacts.

Exit criteria:

- Remaining farm-era files are either gone or intentionally isolated with explicit legacy labeling.

## Validation Matrix

Run after each major phase:

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Manual dashboard smoke test
- [ ] Custom skill generation smoke test
- [ ] Custom skill preview smoke test
- [ ] Schedule creation and briefing configuration smoke test
- [ ] Heartbeat preview and test-send smoke test
- [ ] Docs search verification after search index rebuild

## Recommended Execution Order

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 4
5. Phase 5
6. Phase 3
7. Phase 6
8. Phase 7

Rationale:

- The product should stop behaving farm-specific before deeper schema cleanup.
- Build health and runtime prompt neutrality are prerequisites for trustworthy validation.
- Schema convergence should happen after the new generic runtime and UI contracts are clear.

## Open Decisions

- [x] Should farm-era docs be preserved as historical case-study content or removed entirely? **Decision: removed.** All farm-era docs, screenshots, and marketing collateral deleted.
- [x] Should farm-specific database tables be dropped soon, or archived for export compatibility first? **Decision:** `grain_bid_cache` dropped (migration 00080). `farm_profiles` retained read-only with DEPRECATED comment — no active code references it.
- [x] How long should agent compatibility fields such as `personality_preset` remain mirrored? **Decision:** kept in internal compat layer indefinitely (low cost, protects legacy DB rows). Removed from all public types and UI. Will be dropped when legacy `agents` table is retired.
- [x] Do briefings stay as a special first-class concept, or become a generic schedule preset? **Decision: briefings stay first-class** with renamed generic sections (`conditions`, `external_updates`, `activity_recap`). They are stored as a `morning_briefing` schedule with special section metadata.
- [x] Is weather retained only as a user-built skill, or reintroduced later as an industry-neutral extension pattern? **Decision: weather kept as built-in tool with industry-neutral tools only.** `get_weather_forecast` and `get_weather_alerts` retained. Ag-specific tools (`get_spray_windows`, `get_gdd_accumulation`) removed.

## Completion Definition

This cleanup is complete when:

- [ ] the codebase builds cleanly
- [ ] active runtime behavior is generic
- [ ] live UI and lifecycle copy are generic
- [ ] docs and search artifacts are generic
- [ ] schema ownership is unambiguous
- [ ] farm-era artifacts are either retired or explicitly quarantined
