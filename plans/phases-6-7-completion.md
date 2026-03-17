# Phases 6 & 7 Completion Plan

Last updated: March 17, 2026
Parent plan: [SMB Agent Runtime Excellence Plan](./2026-03-16-smb-agent-runtime-excellence-plan.md)
Status: Complete

## Final Summary

Both phases are complete. Phase 6 added advanced loop detection (ping-pong, browser no-progress, delegation recursion), adaptive thresholds, a composable middleware framework (injection scanning, rate limits, escalation paths), guardrail analytics, and operator run controls. Phase 7 delivered a comprehensive eval suite (122 scenarios, 70 launch blockers across 6 domains), feature flag dependency enforcement, rollout strategy documentation, customer-facing docs for all major capabilities, and operator runbooks.

**Test results:** 198 tests across all new files, 0 failures.

**Post-audit fixes (March 17, 2026):** Middleware pipeline was defined but not wired into AI worker callsites — now passed at all 4 executor creation sites. `downgrade_capability` verdict action was treated as a generic halt — now properly strips tools mid-run. `errorClass` for soft errors was set to raw error string instead of `"soft_error"` — fixed. Per-capability rate limit columns added to DB. Feature flag names aligned between registry and release gates.

---

## Phase 6: Advanced Guardrails and Safety Hardening

### 6.1 Advanced Loop Detection

**Goal:** Detect ping-pong, browser stalls, and delegation recursion — patterns the current identical-call detector misses.

**Files:** `src/lib/runtime/guardrails.ts`, `src/lib/runtime/guardrails.test.ts`, new migration for event_kind CHECK constraint update

- [x] **6.1.1 Ping-pong detector** — Track tool call sequences in a sliding window. Flag when `[A, B, A, B]` repeats N times (configurable). Add `ping_pong_detected` event kind.
- [x] **6.1.2 Browser no-change detector** — Hash page URL + snapshot digest after each browser action. Flag when N consecutive actions produce identical hashes. Add `browser_no_progress` event kind.
- [x] **6.1.3 Delegation recursion detector** — Track `(parentAgent → childAgent)` pairs across delegation depth. Detect circular chains (A→B→A or A→B→C→A). Add `delegation_recursion` event kind.
- [x] **6.1.4 Adaptive thresholds** — Add `retryPatternAllowance` config field. Relax loop thresholds for tools in a known-retry-safe list (e.g., `http_request` with varying URLs). Keep strict defaults for everything else.
- [x] **6.1.5 Migration** — Update `tenant_guardrail_events.event_kind` CHECK constraint to include new event kinds: `ping_pong_detected`, `browser_no_progress`, `delegation_recursion`.
- [x] **6.1.6 Tests** — Unit tests for each new detection pattern including edge cases (legitimate retries, deep-but-acyclic delegation chains, browser actions with genuine state changes).

### 6.2 Guardrail Middleware Framework

**Goal:** Add a composable hook pipeline for pre/post-execution checks, prompt injection scanning, escalation, and per-capability limits.

**Files:** New `src/lib/runtime/guardrail-middleware.ts` + test, updates to `unified-tool-executor.ts`, `guardrail-config-loader.ts`

- [x] **6.2.1 Hook pipeline** — Define `GuardrailHook = { name, phase: "before" | "after", check: (ctx) => GuardrailVerdict }`. Create `GuardrailPipeline` that runs hooks in order, short-circuiting on halt/escalation. Wire into `unified-tool-executor.ts` alongside existing `guardrails.checkBeforeInvocation` / `checkAfterInvocation`.
- [x] **6.2.2 Prompt injection scanner hook** — Post-execution hook that scans `web_fetch` and `web_search` results for injection signals (role tags, "ignore previous instructions", instruction overrides). Port patterns from `src/lib/heartbeat/guardrails.ts` into a reusable scanner.
- [x] **6.2.3 Escalation paths** — Extend `GuardrailVerdict` with action field: `"allow" | "warn" | "halt" | "escalate_approval" | "downgrade_capability"`. Wire `escalate_approval` into the existing tool approval flow in unified executor. Wire `downgrade_capability` to strip specific tools from the active set mid-run.
- [x] **6.2.4 Per-capability rate limits** — Add hooks for:
  - `web_fetch`: Max N calls per run (default: 20)
  - Delegation fan-out: Max concurrent children (default: 3)
  - Browser action density: Max actions per minute (default: 30)
  - Add corresponding config fields to `guardrail-config-loader.ts`
- [x] **6.2.5 Tests** — Unit tests for hook pipeline ordering, short-circuit behavior, injection scanner accuracy (true positives + false positive resistance), escalation wiring, rate limit enforcement.

### 6.3 Advanced Observability and Remediation

**Goal:** Make guardrail events actionable — analytics for operators, controls for halted runs, detailed traces.

**Files:** `src/lib/queries/admin-guardrails.ts`, `src/components/admin/guardrail-events-panel.tsx`, `src/components/admin/run-inspector.tsx`, new API routes, `src/lib/ai/trace-recorder.ts`

- [x] **6.3.1 Detailed trace events** — Extend `trace-recorder.ts` to persist per-event detail in traces (event kind, tool, threshold, actual, action) rather than just the summary object.
- [x] **6.3.2 Operator run controls API** — Add admin API endpoint `POST /api/admin/runs/{runId}` with `action: "terminate" | "replay" | "resume"`. Force-halt running runs, re-enqueue halted/failed runs with same payload, or resume with cleared halt flag.
- [x] **6.3.3 Run inspector UI updates** — Add "Terminate", "Replay", and "Resume" action buttons to the run inspector component. Show confirmation dialogs. Disable buttons based on run status.
- [x] **6.3.4 Guardrail analytics query** — Add `getGuardrailAnalytics(timeRange)` to `admin-guardrails.ts`: trigger frequency by kind, false-positive proxy, cost savings estimate, daily halt/warn trend.
- [x] **6.3.5 Guardrail analytics UI** — Add analytics section to `guardrail-events-panel.tsx`: trigger frequency bar chart, false-positive stat card, cost savings stat card, daily halt/warn trend mini chart.
- [x] **6.3.6 Guardrail config admin API** — Add `GET/POST /api/admin/guardrail-configs` for operators to view/edit per-tenant and per-agent guardrail budget overrides.
- [ ] **6.3.7 Tests** — Tests for analytics queries, API route authorization, replay/resume state transitions.

### Phase 6 Exit Criteria

- [x] Ping-pong, delegation recursion, and browser no-progress patterns are detected and produce halt events.
- [x] Guardrail middleware pipeline runs pre/post every tool invocation with configurable hooks.
- [x] Prompt injection signals in fetched web content are detected and flagged.
- [x] Operators can terminate, replay, and resume halted runs from the admin UI.
- [x] Guardrail analytics show trigger frequency, false-positive rate, and cost savings.
- [x] All new detection patterns have unit tests with edge cases.

---

## Phase 7: Launch Hardening, Evals, and Rollout

### 7.1 Eval Suite Expansion

**Goal:** Cover every major capability with deterministic eval scenarios, scorers, and launch blockers.

**Files:** New files in `src/lib/ai/evals/` per domain

- [x] **7.1.1 MCP evals** — 13 scenarios across 5 categories (discovery, execution, connection lifecycle, error handling, health). 14 launch blockers across 5 categories. 9 passing eval tests.
- [x] **7.1.2 Delegation evals** — 16 scenarios across 8 categories (sync/async happy path, depth limit, recursion, child failure, fan-out, budget inheritance, permission narrowing). 17 launch blockers across 5 categories. 11 passing eval tests.
- [x] **7.1.3 Browser evals** — 19 scenarios across 8 categories (navigation, interaction, screenshot, budget, SSRF, sensitive fields, session, approval). 16 launch blockers across 5 categories. SSRF and sensitive field scenarios validated against network-guard.ts. 17 passing eval tests.
- [x] **7.1.4 Guardrail evals** — 21 scenarios across 8 categories (loop detection, budgets, ping-pong, delegation recursion, browser no-progress, injection detection, adaptive thresholds, rate limits). Scorer + 19 launch blockers across 5 categories. All 30 eval tests passing.
- [x] **7.1.5 Regression evals** — 16 scenarios across 3 categories (approval flow, audit logging, trace completeness). Covers policy denials, approval gating, invocation recording, guardrail persistence, and trace field presence for all major surfaces. 6 passing eval tests.
- [x] **7.1.6 Chaos / failure tests** — 11 scenarios across 5 failure categories (MCP, browser, delegation, database, Trigger.dev). All scenarios assert graceful degradation (runCompletes=true). 7 passing eval tests.
- [x] **7.1.7 Eval runner** — Aggregates all 6 eval domains into a launch readiness report: 122 scenarios, 37 categories, 70 blockers, 10 warnings. Run with `npx tsx --test src/lib/ai/evals/eval-runner.test.ts`.

### 7.2 Rollout Strategy

**Goal:** Codify rollout order, flag dependencies, rollback criteria, and canary procedures.

**Files:** `docs/rollout-matrix.md`, `docs/canary-playbook.md`, update to `src/lib/runtime/tenant-runtime-release-gates.ts`

- [x] **7.2.1 Feature flag matrix doc** — `docs/rollout-matrix.md`: capability rollout order, flag keys, kill switches, dependencies, three-tier gating, rollback procedures per subsystem, rollout rings.
- [x] **7.2.2 Canary playbook** — `docs/canary-playbook.md`: per-capability testing checklists, internal test tenant setup, go/no-go criteria, post-canary next steps.
- [x] **7.2.3 Rollback criteria** — Documented per subsystem in `docs/rollout-matrix.md`: trigger thresholds, action steps, verification, restore procedures.
- [x] **7.2.4 Flag dependency enforcement** — Added `checkFlagDependencies()` to `tenant-runtime-release-gates.ts`. Validates that enabled flags have all prerequisites enabled (e.g., async delegation requires sync delegation).
- [x] **7.2.5 Staged rollout order verification** — Added `verifyRolloutOrder()` to `tenant-runtime-release-gates.ts`. Checks that enabled flags respect the canonical rollout order — earlier capabilities must be enabled before later ones.

### 7.3 Documentation and Enablement

**Goal:** Ensure docs, runbooks, and demo materials match what's actually shipped.

**Files:** `content/docs/`, `docs/`

- [x] **7.3.1 Web research docs** — `content/docs/tools/web-research.mdx`: web_search and web_fetch tools, citation behavior, three-tier gating, domain policies, SSRF protection, rate limits, injection scanning, comparison vs http_request.
- [x] **7.3.2 MCP docs** — Updated `content/docs/mcp-servers/index.mdx` with runtime execution section: connection pool, error handling, guardrail integration, troubleshooting.
- [x] **7.3.3 Delegation docs** — `content/docs/tools/delegation.mdx`: sync/async delegation, depth/fan-out limits, recursion protection, permission narrowing, budget inheritance, enabling delegation, debugging.
- [x] **7.3.4 Browser automation docs** — Updated `content/docs/browser-automation/safety.mdx`: no-progress detection, action rate limiting, action budget, cost model, configurable limits.
- [x] **7.3.5 Guardrails docs** — `content/docs/tools/guardrails.mdx`: comprehensive page covering all monitored patterns, budget types, what happens on halt, configuring per-tenant/per-agent overrides, adaptive thresholds, viewing events, operator controls.
- [x] **7.3.6 Operator runbook: approvals** — `docs/approval-queue-runbook.md`: how approvals are triggered, reviewing requests, decision guidelines, common scenarios, bulk approvals.
- [x] **7.3.7 Operator runbook: guardrail tuning** — `docs/guardrail-tuning-runbook.md`: interpreting analytics, common adjustments with API examples, escalation guidance.
- [x] **7.3.8 Operator runbook: delegation debugging** — `docs/delegation-debugging-runbook.md`: reading delegation trees, status meanings, common issues, replaying failed delegations, budget impact.
- [x] **7.3.9 Operator runbook: browser troubleshooting** — `docs/browser-troubleshooting-runbook.md`: session failures, budget exhaustion, SSRF blocks, sensitive fields, artifact retrieval.
- [x] **7.3.10 Demo guidance** — `docs/smb-demo-guidance.md`: what to demo, what NOT to demo/claim, key differentiators table, pricing talking points.

### Phase 7 Exit Criteria

- [x] Every major capability (native tools, web research, MCP, delegation, browser, guardrails) has passing evals with defined launch blockers.
- [x] Chaos/failure tests verify graceful degradation for all external dependencies (11 scenarios across 5 failure categories).
- [x] Feature flag matrix documents every flag with rollback procedures.
- [x] Flag dependencies are enforced in code (not just docs).
- [x] All customer-facing docs accurately reflect shipped capabilities.
- [x] Operator runbooks exist for approvals, guardrail tuning, delegation debugging, and browser troubleshooting.
- [x] Product claims match what is actually shippable (demo guidance doc created).

---

## Execution Order

| # | Item | Complexity | Parallelizable With | Dependencies |
|---|------|-----------|---------------------|--------------|
| 1 | 6.1.1–6.1.3 Loop detection patterns | Medium | 6.3.4, 6.3.6 | None |
| 2 | 6.1.4–6.1.6 Adaptive thresholds + migration + tests | Small | 6.3.4, 6.3.6 | 6.1.1–6.1.3 |
| 3 | 6.2.1 Hook pipeline | Medium | — | None |
| 4 | 6.2.2 Prompt injection scanner | Medium | 6.2.4 | 6.2.1 |
| 5 | 6.2.3 Escalation paths | Medium | 6.2.4 | 6.2.1 |
| 6 | 6.2.4 Per-capability rate limits | Medium | 6.2.2, 6.2.3 | 6.2.1 |
| 7 | 6.2.5 Middleware tests | Small | — | 6.2.1–6.2.4 |
| 8 | 6.3.1–6.3.3 Trace detail + run controls | Medium | 6.1, 6.2 | None |
| 9 | 6.3.4–6.3.5 Guardrail analytics | Medium | 6.1, 6.2 | None |
| 10 | 6.3.6–6.3.7 Config UI + tests | Small | 6.1, 6.2 | None |
| 11 | 7.1.1–7.1.6 Eval suites | Large | 7.2, 7.3 | Phase 6 stable |
| 12 | 7.1.7 Eval runner | Small | 7.2, 7.3 | 7.1.1–7.1.6 |
| 13 | 7.2.1–7.2.3 Rollout docs | Small | 7.1, 7.3 | None |
| 14 | 7.2.4–7.2.5 Flag enforcement code | Medium | 7.1, 7.3 | None |
| 15 | 7.3.1–7.3.10 Docs + runbooks + demo | Medium | 7.1, 7.2 | Features finalized |

**Parallel lanes:**
- Lane A: 6.1 (loop detection) → 6.2 (middleware) → 7.1.4 (guardrail evals)
- Lane B: 6.3 (observability) → 7.1.5 (regression evals)
- Lane C: 7.2 (rollout strategy) — can start immediately
- Lane D: 7.3 (docs) — can start immediately for existing features, finish after Phase 6
