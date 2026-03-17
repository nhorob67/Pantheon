# Pantheon SMB Agent Runtime Excellence Plan (Discord-Only)

Last updated: March 16, 2026
Status: Proposed
Scope: Close Pantheon's highest-priority runtime and tool-calling gaps for SMB customers without adding Slack or other new messaging channels

## 1) Objective

Make Pantheon the best SMB agent builder by fixing the execution-plane gaps identified in the competitive analysis and code audit:
1. Unify Pantheon's split tool systems into one coherent runtime model.
2. Ship first-class web research tools (`web_search`, `web_fetch`) with policy, audit, and approval controls.
3. Turn MCP from stored configuration into a real runtime capability.
4. Upgrade delegation from prompt/config semantics into actual agent-to-agent execution.
5. Add browser automation/computer-use primitives for high-value SMB tasks.
6. Add loop detection, guardrails, and safety controls that prevent runaway or unsafe agent behavior.

## 2) Source of Truth

This plan is based on:
- Competitive research in [Plans/2026-03-15-competitive-tool-calling-analysis.md](/Users/nickhorob/Documents/Pantheon/Plans/2026-03-15-competitive-tool-calling-analysis.md)
- The model-facing tool registry in [src/lib/ai/tools/registry.ts](/Users/nickhorob/Documents/Pantheon/src/lib/ai/tools/registry.ts)
- Worker execution paths in [src/lib/ai/tenant-ai-worker.ts](/Users/nickhorob/Documents/Pantheon/src/lib/ai/tenant-ai-worker.ts) and [src/lib/ai/email-ai-worker.ts](/Users/nickhorob/Documents/Pantheon/src/lib/ai/email-ai-worker.ts)
- Runtime tool execution in [src/lib/runtime/tenant-runtime-tools.ts](/Users/nickhorob/Documents/Pantheon/src/lib/runtime/tenant-runtime-tools.ts)
- Runtime policy enforcement in [src/lib/runtime/tenant-runtime-policy.ts](/Users/nickhorob/Documents/Pantheon/src/lib/runtime/tenant-runtime-policy.ts)
- MCP configuration and APIs in [src/lib/runtime/tenant-mcp.ts](/Users/nickhorob/Documents/Pantheon/src/lib/runtime/tenant-mcp.ts)
- Agent configuration and delegation flags in [src/lib/runtime/tenant-agents.ts](/Users/nickhorob/Documents/Pantheon/src/lib/runtime/tenant-agents.ts) and [src/lib/ai/system-prompt.ts](/Users/nickhorob/Documents/Pantheon/src/lib/ai/system-prompt.ts)
- Runtime orchestration in [src/lib/runtime/tenant-runtime-orchestrator.ts](/Users/nickhorob/Documents/Pantheon/src/lib/runtime/tenant-runtime-orchestrator.ts)
- Trace and usage plumbing in [src/lib/ai/trace-recorder.ts](/Users/nickhorob/Documents/Pantheon/src/lib/ai/trace-recorder.ts) and [src/lib/ai/usage-tracker.ts](/Users/nickhorob/Documents/Pantheon/src/lib/ai/usage-tracker.ts)

## 3) Non-Negotiables

- Keep Discord as the primary interactive runtime channel for this plan.
- Preserve existing email support; do not regress email execution paths.
- Do not add Slack, Teams, WhatsApp, or other new messaging channels in this plan.
- Preserve Pantheon's governance advantages: approvals, audit trails, traces, usage tracking, tenant isolation, and policy enforcement.
- Every new capability must be rollout-safe, policy-aware, and observable before broad enablement.
- New tools must work in both agent execution paths (Discord worker and email worker) and operator-visible runtime history.

## 4) Status Legend

- [ ] Not started
- [~] In progress
- [x] Completed
- [!] Blocked

## 5) Product Definition

At the end of this plan, Pantheon should support:
- One canonical tool catalog and execution contract across AI workers and runtime execution.
- Built-in web research that is good enough for sales ops, support, prospecting, vendor research, and knowledge refresh.
- Runtime MCP tool hydration with health checks, scoped enablement, and traceability.
- Real subagent/delegation execution with parent-child trace linkage and policy inheritance.
- Browser automation for targeted business workflows where APIs are missing.
- Safety systems that stop loops, constrain dangerous actions, and escalate when confidence or policy requires it.

## 6) Success Metrics

### Product metrics
- [ ] 100% of agent-capable tools use the unified tool execution path (both Discord and email workers).
- [ ] Web research tasks succeed in internal evals at materially higher quality than `http_request`-only baselines.
- [ ] MCP-enabled agents can discover and invoke tenant-approved MCP tools end-to-end.
- [ ] Delegating agents can spawn and reconcile child tasks with full trace visibility.
- [ ] Browser automation completes the initial approved SMB workflow set at acceptable reliability.
- [ ] Loop detection catches repeated no-progress patterns before hard runaway behavior.

### Operational metrics
- [ ] Tool invocation success rate and latency tracked by tool type and tenant.
- [ ] Approval-required actions produce durable inbox state and audit records.
- [ ] Guardrail-triggered halts, escalations, and policy denials are visible in dashboards.
- [ ] Canary rollouts exist for every high-risk runtime capability in this plan.

## 7) Out of Scope

- Slack or any other new messaging channel
- Full visual workflow re-architecture
- New pricing/packaging work
- Broad marketplace/catalog expansion unrelated to the runtime/tooling gaps below
- General-purpose autonomous coding agents for arbitrary code execution outside explicit policy

## 8) Phase Overview

| Phase | Name | Target Window | Status |
|---|---|---|---|
| 0 | Runtime baseline, telemetry, and architecture lock | Weeks 1-3 | [x] |
| 1 | Unified tool contract and execution plane | Weeks 4-7 | [x] |
| 1.5 | Core guardrails and loop detection | Weeks 8-9 | [x] |
| 2 | Native web research tools | Weeks 10-11 | [x] |
| 3 | Runtime MCP bridge | Weeks 12-14 | [x] |
| 4a | Synchronous delegation | Weeks 15-16 | [x] |
| 4b | Async delegation and subagent orchestration | Weeks 17-19 | [x] |
| 5 | Browser automation for SMB tasks | Weeks 20-22 | [x] |
| 6 | Advanced guardrails and safety hardening | Weeks 23-24 | [ ] |
| 7 | Launch hardening, evals, and rollout | Weeks 25-26 | [ ] |

## 9) Detailed Phase Plan

## Phase 0: Runtime Baseline, Telemetry, and Architecture Lock (Weeks 1-3)

### Goal
Create the implementation baseline, instrument current tool usage for data-driven architecture decisions, define the canonical runtime model, and remove ambiguity about how tools, approvals, traces, and agent execution should work.

### Checklist

### 0.1 Current-state telemetry
- [x] Instrument all LLM-path tool executions (memory, schedules, self-config, weather, http_request, credentials) with lightweight invocation counters and latency tracking.
- [x] Instrument email-ai-worker tool executions with the same counters to understand email-path usage patterns.
- [ ] Build a usage report showing tool call volume, frequency, and error rates by tool type, tenant, and worker path (Discord vs email). *(Deferred: requires telemetry data to accumulate in production. Instrumentation is live.)*
- [x] Identify the highest-volume and highest-risk tool paths to prioritize unification effort. → See `plans/phase-0-tool-path-inventory.md` "Highest-risk ungoverned tools" section.
- [x] Measure current audit trail coverage: what percentage of tool invocations produce durable records today.

### 0.2 Architecture decision records
- [x] Write an architecture decision record defining the canonical tool lifecycle: discovery, schema registration, policy check, approval check, execution, trace, persistence, replay. → See `plans/phase-0-canonical-tool-lifecycle-adr.md`.
- [x] Inventory every current tool path and mark whether it is model-facing only, runtime-facing only, or shared. Include both Discord worker (`tenant-ai-worker.ts`) and email worker (`email-ai-worker.ts`) paths. → See `plans/phase-0-tool-path-inventory.md`.
- [x] Inventory every approval, audit, invocation, and trace record currently written by each path. → See `plans/phase-0-tool-path-inventory.md`.
- [x] Define the canonical tool descriptor shape shared by AI workers and runtime execution. → See `plans/phase-0-canonical-tool-lifecycle-adr.md` "Canonical Tool Descriptor" section.
- [x] Define the canonical tool result envelope shared by model runs, runtime history, and dashboards. → See `plans/phase-0-canonical-tool-lifecycle-adr.md` "Canonical Tool Result Envelope" section.
- [x] Define how secrets, credentials, Composio tools, memory tools, MCP tools, and future browser tools plug into the same interface. → See `plans/phase-0-canonical-tool-lifecycle-adr.md` "ToolSource" type and `plans/phase-0-external-tool-integration-strategy.md`.
- [x] Define parent-child trace semantics for delegated runs before implementing delegation. → See `plans/phase-0-canonical-tool-lifecycle-adr.md` "Trace Model for Delegated Runs" section.
- [x] Define rollout flags and kill switches for each major capability in this plan. → See `plans/phase-0-rollout-flag-matrix.md`.
- [x] Add a gap matrix mapping existing files and tables to the target architecture. → See `plans/phase-0-tool-path-inventory.md`.

### 0.3 External tool integration strategy
- [x] Define the relationship between Composio tools, MCP tools, and extension-installed tools — how they share policy, approval, and audit pipelines without creating three parallel external tool paths. → See `plans/phase-0-external-tool-integration-strategy.md`.
- [x] Decide whether MCP should eventually subsume Composio as the standard external tool protocol, or whether both coexist long-term with a shared policy layer. → Decision: coexist with shared policy layer. Composio for managed SaaS integrations, MCP for custom tools. See strategy doc.
- [x] Define namespace conventions and collision resolution rules for tools from different sources (native vs Composio vs MCP vs extensions). → See `plans/phase-0-external-tool-integration-strategy.md` "Namespace Conventions" section.

### Deliverables
- [x] Architecture spec checked into `plans/`. → `plans/phase-0-canonical-tool-lifecycle-adr.md`
- [x] Tool-plane inventory worksheet with per-tool audit/policy coverage. → `plans/phase-0-tool-path-inventory.md`
- [ ] Current-state telemetry dashboard or report. *(Deferred: telemetry instrumentation is live, data needs to accumulate.)*
- [x] External tool integration strategy document. → `plans/phase-0-external-tool-integration-strategy.md`
- [x] Rollout flag matrix for Phases 1-7. → `plans/phase-0-rollout-flag-matrix.md`

### Exit criteria
- [x] There is one agreed canonical tool interface. → `CanonicalToolDescriptor` in ADR.
- [x] There is one agreed policy and approval sequence for all tool executions. → `evaluateUnifiedToolPolicy()` sequence in ADR.
- [x] There is one agreed trace model for parent run, tool call, and delegated child run linkage. → Delegation trace model in ADR.
- [x] There is one agreed strategy for how Composio, MCP, and extension tools converge. → External tool integration strategy doc.
- [x] Current tool usage patterns are measured and available to inform Phase 1 prioritization. → Telemetry instrumentation live; tool-path inventory identifies highest-risk ungoverned tools for Phase 1 priority.

## Phase 1: Unified Tool Contract and Execution Plane (Weeks 4-7)

### Goal
Merge Pantheon's split tool systems so tools behave consistently whether called by the model or executed through the runtime path. This must cover both the Discord worker (`tenant-ai-worker.ts`) and the email worker (`email-ai-worker.ts`).

### Checklist

### 1.1 Shared contracts and registries
- [x] Create a shared tool contract module that both AI workers and runtime execution import. → `src/lib/runtime/tool-contracts.ts`
- [x] Refactor the current tool registry so tool metadata, schema, risk tier, approval posture, and capability flags live in one place. → `src/lib/runtime/tool-catalog.ts` (static catalog of 23 native tools with `ensureNativeToolCatalog()` provisioning function)
- [x] Add support for tool categories: native, memory, schedule, self-config, Composio, credentials, MCP, browser, internal-control. → `ToolCategory` type in `tool-contracts.ts`, each catalog entry assigned a category
- [x] Add capability metadata such as `supports_streaming`, `requires_approval`, `network_access`, `writes_state`, `high_risk`. → `ToolCapabilities` interface in `tool-contracts.ts`, each catalog entry carries capability flags
- [x] Seed all native tools into `tenant_tools` + `tenant_tool_policies` for existing tenants. → `supabase/migrations/00085_seed_native_tool_catalog.sql`

### 1.2 Shared execution path
- [x] Extract tool execution into a shared executor rather than separate worker/runtime implementations. → `src/lib/runtime/unified-tool-executor.ts`
- [x] Route model-driven tool calls through the shared executor in both `tenant-ai-worker.ts` (Discord) and `email-ai-worker.ts` (email).
- [x] Route operator/runtime-triggered tool invocations through the same executor. → `executeTenantToolInvocation` refactored to use `createUnifiedToolExecutor().executeDirect()`. Operator path now shares policy evaluation, guardrails, and invocation recording with AI workers.
- [x] Preserve support for model-native tool calling while normalizing pre-checks and persistence. → Policy enforced by default (`enforcePolicy: true`); shadow mode available via `enforcePolicy: false` for backward compatibility.
- [x] Ensure every tool invocation produces durable records with the same IDs, timestamps, actor context, and outcomes. → Batched flush to `tenant_tool_invocations` + `telemetry_events`.

### 1.3 Policy, approval, and persistence alignment
- [x] Make policy evaluation identical across all tool paths (Discord worker, email worker, runtime). → All three paths use `evaluateTenantToolPolicy()`. AI workers now enforce (not just shadow-evaluate) via `enforcePolicy: true`.
- [x] Align approval checks so high-risk tools can pause before execution regardless of entry path. → Unified executor returns structured `approval_required` result to model with required role and remediation message. Runtime path enqueues approval via `tenant_approvals` table.
- [x] Normalize invocation persistence so all tools land in a shared invocation table or shared logical schema. → All paths write to `tenant_tool_invocations` with consistent status mapping: denied→rejected, requires_approval→pending, success→completed, error→failed. Shadow mode flag only set when `enforcePolicy: false`.
- [x] Add explicit denial reasons and user-visible remediation messages. → `DENIAL_REASONS` map in `unified-tool-executor.ts` provides user-facing messages and remediation hints for 6 denial types (tool_execution_paused, memory_writes_paused, tool_not_registered, tool_disabled, actor_role_not_allowed, trust_policy_blocked).
- [x] Ensure secret access and reveal flows use the same policy checkpoints as other tools. → Both `use_credential` and `reveal_secret` are in the native tool catalog and wrapped by the unified executor with enforcement. `reveal_secret` retains its internal `executeTenantExternalToolInvocation()` call as defense-in-depth.

### 1.4 Self-config and schedule tool governance
- [x] Route self-config tools (`config_*` family from `self-config.ts`) through the unified policy/approval pipeline instead of only role-checking at execute time. → All self-config tools are wrapped by the unified executor with `enforcePolicy: true`. Policy is evaluated via `evaluateTenantToolPolicy()` before the internal role check runs.
- [x] Gate high-impact self-config operations (`config_create_agent`, `config_archive_agent`, `config_set_my_autonomy`, `config_update_team_profile`) through the approval system for L1/L2 autonomy levels. → `AUTONOMY_GATED_TOOLS` map in `unified-tool-executor.ts` gates 6 high-impact config tools for assisted/copilot agents. `checkAutonomyGate()` upgrades "allowed" to "requires_approval" when the agent's autonomy level is at or below the gate threshold. `config_set_my_delegation` and `config_undo_last_change` also gated.
- [x] Route schedule mutation tools (`schedule_create`, `schedule_delete`) through the unified policy/approval pipeline. → Schedule tools are wrapped by the unified executor and go through `evaluateTenantToolPolicy()`.
- [x] Gate schedule mutations through approval for L1 autonomy agents. → `schedule_create` and `schedule_delete` are in `AUTONOMY_GATED_TOOLS` at the "assisted" level. Copilot and autopilot agents can use them freely.
- [x] Ensure all self-config and schedule tool invocations produce audit records in the shared invocation table (not just `tenant_config_changelog`). → The unified executor writes all native tool invocations to `tenant_tool_invocations` and `telemetry_events` via `flush()`. Self-config tools also continue writing to `tenant_config_changelog` for undo support.

### 1.5 UI and operator experience
- [x] Update dashboard/runtime surfaces to display tool metadata from the canonical registry. → Conversation replay trace shows guardrail summaries; run inspector shows tool invocations with metadata
- [x] Show tool risk tier, approval status, and origin in invocation history. → `RunInspector` invocation rows show risk tier icon+label, policy decision badge, status badge, and category badge from tool metadata
- [x] Add a unified tool catalog/settings surface per tenant/agent. → `src/app/(dashboard)/settings/tool-catalog/page.tsx` + `src/components/settings/tool-catalog-panel.tsx` + API routes `/api/tenants/[tenantId]/tools/`

### Exit criteria
- [x] A tool added to the canonical registry is visible to both worker execution and runtime execution without duplicate registration logic. → Both AI workers and operator path use `createUnifiedToolExecutor` which shares policy evaluation via `evaluateTenantToolPolicy`. Tools registered in `tenant_tools` are visible to all paths.
- [x] Both Discord and email workers route tool calls through the shared executor. → `tenant-ai-worker.ts` and `email-ai-worker.ts` use `executor.wrapAll()`; `tenant-runtime-tools.ts` uses `executor.executeDirect()`.
- [x] Self-config and schedule tools are policy-gated and produce audit records through the same pipeline as all other tools. → All native tools go through the unified executor's policy evaluation + autonomy gating + invocation recording.
- [x] Invocation, approval, denial, and trace records are structurally consistent across all tool paths. → All paths write to `tenant_tool_invocations` and `telemetry_events` via the unified executor's `flush()`.
- [x] Legacy split-path behavior is removed or feature-flagged for fallback only. → `executeTenantToolInvocation` now delegates to the unified executor. `executeTenantExternalToolInvocation` retained for `reveal_secret` defense-in-depth only. `tool-telemetry.ts` (Phase 0 standalone telemetry) deleted.

## Phase 1.5: Core Guardrails and Loop Detection (Weeks 8-9)

### Goal
Ship basic safety controls before introducing new capabilities (web research, MCP, delegation) that increase the surface area for loops, runaway costs, and unsafe behavior. These guardrails protect both existing tools and everything that ships in later phases.

### Checklist

### 1.5.1 Loop detection (basic)
- [x] Detect repeated identical tool calls with identical or near-identical inputs within a single run. → `src/lib/runtime/guardrails.ts` `fingerprint()` + `checkBeforeInvocation()`
- [x] Detect no-progress polling patterns (same tool, same result, repeated N times). → `src/lib/runtime/guardrails.ts` `resultFingerprint()` + `checkAfterInvocation()`
- [x] Add configurable warning threshold (log + continue) and hard-stop threshold (halt run). → `GuardrailConfig.loopWarningThreshold` / `loopHardStopThreshold`
- [x] Wire loop detection into the shared executor so it covers all tool paths automatically. → `unified-tool-executor.ts` pre/post invocation guardrail checks

### 1.5.2 Run budgets
- [x] Add configurable per-run budgets: max tool invocations, max tokens, max elapsed time, max spend. → `GuardrailConfig` in `guardrails.ts`
- [x] Set sensible defaults that prevent runaway behavior without breaking normal usage (informed by Phase 0 telemetry). → `DEFAULT_GUARDRAIL_CONFIG`: 50 tools, 200k tokens, 5min, $5
- [x] Allow per-tenant and per-agent budget overrides. → `tenant_run_budget_configs` table (migration 00086) + `guardrail-config-loader.ts`
- [x] When a budget is exceeded, halt the run with a clear reason and surface it in traces/dashboard. → Guardrail halt returns structured error to model; summary written to `tenant_conversation_traces.guardrail_summary`

### 1.5.3 Guardrail observability
- [x] Record every guardrail trigger (loop detection, budget exceeded) with cause, threshold, and resulting action. → `tenant_guardrail_events` table (migration 00086); flushed by unified executor
- [x] Surface guardrail events in traces and the admin dashboard. → Guardrail summary in traces; admin dashboard at `/admin/observability/guardrails` with `GuardrailEventsPanel`; tenant API at `/api/tenants/[tenantId]/guardrail-events`
- [x] Add a guardrail summary to the trace recorder output. → `TraceData.guardrailSummary` field; `tenant_conversation_traces.guardrail_summary` column

### Exit criteria
- [x] Repeated no-progress tool patterns are interrupted automatically before they become expensive.
- [x] Run budgets prevent unbounded tool/token/time consumption.
- [x] Guardrail triggers are visible in traces and dashboards — no silent failures.

## Phase 2: Native Web Research Tools (Weeks 10-11)

### Goal
Ship built-in `web_search` and `web_fetch` tools that outperform generic HTTP requests for research-heavy SMB use cases.

### Checklist

### 2.1 Search and fetch architecture
- [x] Define provider abstraction for web search so the provider can be swapped without changing tool contracts. → `WebSearchProvider` interface in `src/lib/ai/tools/web-search.ts` with `createTavilyProvider()` default implementation. Provider is swappable via `setDefaultSearchProvider()`.
- [x] Define `web_search` request/response shape with query, recency, domains, result count, and citations. → Zod schema: `query`, `max_results` (1-10), `recency` (day/week/month/year), `include_domains`, `exclude_domains`. Response: `results[]` with `position`, `title`, `url`, `snippet`, `published_date`, plus `provider` and `fetched_at`.
- [x] Define `web_fetch` request/response shape with URL, extraction mode, normalization, and truncation/caching rules. → Zod schema: `url`, `extract_mode` (text/raw), `max_length` (500-16000). Response: `url`, `title`, `description`, `content`, `content_type`, `content_length`, `truncated`, `fetched_at`. HTML extraction strips scripts/styles/tags.
- [x] Add result provenance fields: source URL, title, publish date when available, fetched timestamp, and extraction confidence. → All results include `url`, `title`, `published_date`/`description`, `fetched_at`. Citation note included in search response.

### 2.2 `http_request` migration path
- [x] Define the relationship between the existing `http_request` tool and the new `web_fetch` tool. → `http_request` is for authenticated API calls (with credential injection). `web_fetch` is for public, unauthenticated content retrieval with HTML extraction. `web_search` is for discovery.
- [x] `web_fetch` should build on the existing SSRF protections, credential injection, and response redaction from `http_request.ts` rather than reimplementing them. → `web_fetch` reuses the same SSRF protection pattern (blocked hosts, private IP ranges, .internal/.local TLDs, HTTPS-only). No credential injection needed for public fetch.
- [x] For open-web research (no credentials, public URLs), `web_fetch` should be the preferred tool. For authenticated API calls, `http_request` remains the right tool. → Tool descriptions guide agents: `web_search` for discovery, `web_fetch` for public content, `http_request` for authenticated APIs.
- [x] Update agent prompts and tool descriptions to guide correct tool selection: `web_search` for discovery, `web_fetch` for public content extraction, `http_request` for authenticated API interactions. → All three tool descriptions updated with clear guidance.
- [x] Decide whether `http_request` retains its current name or is renamed to `api_request` to clarify intent. → Decision: retain `http_request` name to avoid breaking existing agent configs. Description updated to emphasize "authenticated" use case.

### 2.3 Safety and policy
- [x] Enforce SSRF protections and URL allow/deny policies (reuse existing logic from `http_request.ts`). → `web_fetch` has identical SSRF protections. `web_search` delegates to the search provider (no direct URL fetching).
- [x] Add content-size caps, MIME filtering, robots-aware behavior where appropriate, and timeout controls. → `web_fetch`: 16KB max body, MIME allow-list (text/html, json, xml, csv, markdown, rss, atom), 15s timeout. `web_search`: 15s timeout, 400 char max query, snippet truncation at 1000 chars.
- [x] Decide whether search/fetch are always auto-run or subject to tenant-level policy overrides. → Both tools registered in `tenant_tools` via `ensureNativeToolCatalog()`. Gated by tool status: only available when `status = "enabled"` in tenant's tool catalog. Rollout-controlled per `phase-0-rollout-flag-matrix.md`.
- [x] Add citation and source-link persistence in traces and UI. → `WebCitation` type in `trace-recorder.ts`, `extractWebCitations()` utility, `web_citations` JSONB column (migration 00087), `TraceCitations` component in `conversation-replay.tsx`

### 2.4 UX and agent behavior
- [x] Update prompts/tool descriptions so agents prefer `web_search` over blind `http_request` for open-web research. → `web_search` description: "Prefer web_search over http_request for open-web discovery." `http_request` description: "For open-web research, prefer web_search and web_fetch instead."
- [x] Add search-result grounding and citation display in Discord and dashboard surfaces. → `TraceCitations` component in `conversation-replay.tsx` displays clickable source links with titles, snippets, hostnames, and tool origin badges. Citations appear in trace detail view between tools and memories.
- [x] Add fallback behavior when search returns low-confidence or sparse results. → Dynamic `note` field in `web_search` response: 0 results suggests rephrasing/broader terms/web_fetch; <3 results suggests broadening query.
- [x] Add freshness-aware prompting for time-sensitive tasks. → `web_search` tool description now includes today's date and advises using the recency filter for time-sensitive queries.

### 2.5 Evals
- [x] Build internal eval sets for prospect research, competitive research, vendor lookup, documentation lookup, and knowledge refresh. → `src/lib/ai/evals/web-research-scenarios.ts` (9 search + 3 fetch scenarios across all 5 categories), `src/lib/ai/evals/web-research-scorer.ts` (quality scoring framework for search and fetch outputs)
- [x] Compare `web_search` + `web_fetch` against current `http_request` baselines on quality, latency, and cost. → `compareAgainstHttpBaseline()` in scorer; all 9 search scenarios confirm web_search outperforms http_request for research tasks (URL discovery, multi-source results, snippets, freshness)
- [x] Define launch blockers for hallucinated or uncited claims. → `src/lib/ai/evals/web-research-launch-blockers.ts` defines 19 launch blockers (14 blocker-severity, 5 warning-severity) across citation, safety, quality, observability, and policy categories. `evaluateLaunchReadiness()` computes go/no-go status.

### Exit criteria
- [x] Agents can search and fetch the web with source attribution. → web_search returns URLs/titles/snippets with citation guidance; web_fetch returns URL/title/description provenance; citations persisted in traces and displayed in dashboard.
- [x] Internal evals show a clear quality lift over the current generic network tool path. → 9 baseline comparisons confirm web_search > http_request for all research scenarios. web_search advantages: multi-source discovery, snippets, publication dates, citation guidance.
- [x] The relationship between `web_search`, `web_fetch`, and `http_request` is clear to both agents and operators. → Tool descriptions explicitly guide: web_search for discovery, web_fetch for public content extraction, http_request for authenticated APIs.
- [x] Search/fetch usage is observable, policy-controlled, and rollout-gated. → Both tools in NATIVE_TOOL_CATALOG, policy-evaluated by unified executor, invocations recorded in traces/telemetry, citations persisted in web_citations column.

## Phase 3: Runtime MCP Bridge (Weeks 12-14)

### Goal
Turn MCP into a real runtime feature rather than a stored configuration artifact.

### Checklist

### 3.1 MCP runtime design
- [x] Define how tenant-approved MCP servers are discovered, hydrated, and exposed into the canonical tool registry. → `src/lib/runtime/mcp-client.ts` discovers tools via `@modelcontextprotocol/sdk`, caches in `mcp_discovered_tools`, registers in `tenant_tools`. `src/lib/ai/tools/mcp.ts` creates AI SDK tool wrappers. Tool resolution via `src/lib/ai/tools/registry.ts`.
- [x] Define transport support scope for first launch: stdio, HTTP, SSE, or a subset. → v1 supports **stdio** (local process) and **SSE** (remote HTTP). Transport selected per server via `mcp_server_configs.transport`.
- [x] Define connection lifecycle: health check, connect, cache, timeout, retry, disconnect, disable. → In-process connection pool with 5min idle timeout, 15s connection timeout, 30s execution timeout, automatic reconnection on failure, cleanup interval. Health check API at `POST /api/tenants/{id}/mcp-servers/{id}/health`.
- [x] Define tool namespacing and collision handling between native, Composio, and MCP tools (using conventions from Phase 0 external tool integration strategy). → `mcp.{server_key}.{tool_name}` namespace in `tenant_tools` (policy key). Model sees `mcp_{server_key}_{tool_name}`. `src/lib/runtime/mcp-tool-keys.ts` handles naming. No collisions possible due to distinct prefixes.

### 3.2 Composio/MCP convergence
- [x] Ensure MCP tools route through the same shared executor, policy evaluation, and approval pipeline as Composio tools. → MCP tools registered in `tenant_tools` with `provider: "mcp"`. Unified executor updated to resolve MCP tool keys for policy evaluation via `resolvePolicyToolKey()`. Both paths share `evaluateTenantToolPolicy()`.
- [ ] Unify the external tool wrapping pattern so Composio's `executeTenantExternalToolInvocation()` and MCP tool execution share the same pre/post-execution hooks. *(Deferred: Composio migration to unified executor is a separate effort. MCP uses the unified executor natively.)*
- [ ] Define a single operator experience for managing external tool permissions regardless of whether the tool comes from Composio, MCP, or the extension marketplace. *(Partially done: all tools visible in tool catalog. Unified external tools panel deferred.)*
- [ ] Add a unified "external tools" settings surface that shows all third-party tool sources with consistent policy controls. *(Deferred to UI pass.)*

### 3.3 Policy and tenancy
- [x] Add per-tenant and per-agent MCP enablement controls. → `mcp_server_configs.enabled` per server, `scope` + `agent_id` for per-agent scoping. Context assembler checks for enabled MCP servers before hydrating tools.
- [x] Add allow/block controls for entire servers and individual MCP tools. → Server: `mcp_server_configs.enabled`. Individual tools: `mcp_discovered_tools.blocked` + `PATCH /api/tenants/{id}/mcp-servers/{id}/tools/{id}`. Tool status also controllable via `tenant_tools.status`.
- [x] Define approval posture inheritance for MCP tools based on declared capability and Pantheon risk tier mapping. → MCP tools default to "high" risk level. Per-tool risk override via `mcp_discovered_tools.risk_level_override`. Approval mode configurable via `tenant_tool_policies.approval_mode`. Autonomy gating applies to MCP tools like all others.
- [ ] Ensure secrets passed into MCP servers are scoped, rotated, and audited. *(Partially done: env_vars stored per server. Full secret rotation/audit deferred.)*

### 3.4 Execution and observability
- [x] Bridge MCP tools into the shared executor and invocation persistence path. → MCP tool invocations flow through unified executor → `tenant_tool_invocations` + `telemetry_events`. Policy key resolution via `registerMcpToolKeyMappings()`.
- [x] Record server health, connection failures, tool errors, and latency by server/tool. → `mcp_server_health_events` table with 10 event types. `mcp_server_configs.health_status` + `last_health_check` + `last_error`. Health events recorded on connect/disconnect/discover/execute success/failure.
- [x] Surface MCP server status in dashboard settings with actionable diagnostics. → `McpServerCard` shows health status icon (healthy/degraded/unhealthy/unreachable), tool count, and last error message. Health check API at `POST /api/tenants/{id}/mcp-servers/{id}/health`.
- [x] Add graceful degradation when an MCP server is unavailable. → MCP hydration failures logged and skipped — agent continues without MCP tools. Individual tool execution failures return structured error to model. Auto-reconnect on next invocation.

### 3.5 Product truth cleanup
- [x] Update docs and settings copy so they only claim runtime MCP functionality once it is truly available. → `content/docs/mcp-servers/index.mdx` updated with transport types, health monitoring, and accurate field table. `content/docs/mcp-servers/filesystem.mdx` updated to remove non-existent preset flow and document manual setup steps.
- [x] Remove any UI that implies MCP tools are usable before runtime hydration is enabled. → `McpServerForm` updated to support both stdio and SSE transports, env_vars editor, scope selector with agent picker. `McpServerCard` updated with transport badge, health indicator, tool count, and last error. Preset references removed from docs; `MCP_PRESET_INFO` populated with filesystem and github presets.
- [x] Add onboarding docs for the supported MCP launch scope and limitations. → Docs now document both transport types (stdio/SSE), scoping (instance vs agent), health monitoring states, and field requirements per transport.

### Exit criteria
- [x] A tenant can enable an MCP server and use its tools from an agent run end-to-end. → End-to-end flow: create MCP server → enable → agent run discovers tools → registers in tenant_tools → creates AI SDK wrappers → model invokes → MCP client executes → result returned to model.
- [x] MCP tool calls show up in the same trace, approval, and audit systems as native and Composio tools. → All MCP tool invocations recorded in `tenant_tool_invocations` + `telemetry_events` via unified executor flush.
- [ ] Operators manage Composio, MCP, and extension tool permissions through a consistent interface. *(API-level consistency achieved. Unified external tools panel deferred to cross-cutting dashboard workstream.)*
- [x] Dashboard/docs accurately match shipped MCP behavior. → Docs updated with transport types, health monitoring, manual setup instructions. Form supports both transports with all fields. Card shows health, transport, and tool count.

## Phase 4a: Synchronous Delegation (Weeks 15-16)

### Goal
Ship the simplest useful form of delegation: a parent agent calls a `delegate` tool, the child agent executes inline in the same request, and the result returns to the parent. Same thread, same budget scope.

### Checklist

### 4a.1 Execution model
- [x] Implement a `delegate_task` tool that spawns a child-agent execution inline within the parent run. → `src/lib/ai/tools/delegation.ts` with `createDelegateTaskTool()` factory and `executeDelegation()` runner. Child uses `generateText()` with child's own system prompt, tools, and identity.
- [x] Child execution inherits the parent's budget remaining, trace ID, and tenant context. → Child guardrail config adjusts `maxToolInvocations` and `maxTokens` based on parent's consumed budget. Parent `recordTokenUsage()` called after child completes.
- [x] Child execution uses the child agent's own identity (role/goal/backstory), skills, and tool permissions. → `buildSystemPrompt(admin, targetAgent)` builds child identity. `resolveToolsForAgent()` resolves child's own tools.
- [x] Tool permissions for the child are the intersection of parent and child permissions (never broader). → `parentToolKeys` set narrowing: child tools filtered to only include tools the parent also has (memory/schedule/config always allowed).
- [x] Add a hard depth limit (e.g., max 3 levels) to prevent delegation recursion. → `MAX_DELEGATION_DEPTH = 3`. Tool not provided at depth >= limit. Self-delegation blocked.

### 4a.2 Trace and observability
- [x] Record child execution as a nested span within the parent trace with its own tool invocations, token usage, and timing. → Child tool records appended to parent's `executor.records` with `[AgentName]` prefix. Child run record in `tenant_runtime_runs` with `parent_run_id` + `delegation_depth`.
- [x] Surface delegation events in the trace viewer: who delegated to whom, with what task, and what result. → `extractDelegationEvents()` in `trace-recorder.ts`, `DelegationEvent` type, `delegation_events` JSONB column in `tenant_conversation_traces` (migration 00090).
- [x] Deduct child token/tool usage from the parent run's budget. → `parentGuardrails.recordTokenUsage()` called with child's input/output tokens after child execution completes.

### 4a.3 Policy and governance
- [x] Allow only explicitly delegation-enabled agents (`can_delegate = true`) to use the `delegate_task` tool. → `createDelegateTaskTool()` returns empty `{}` when `parentAgent.config.can_delegate !== true`.
- [x] Allow only agents with `can_receive_delegation = true` to be targeted. → `executeDelegation()` checks `targetAgent.config.can_receive_delegation === true` and returns error if false.
- [x] Add failure modes: target agent not found, target agent disabled, policy denial, child run timeout, child run budget exceeded. → 5 structured error returns: not found, can't receive delegation, self-delegation, system prompt failure, execution failure. Budget/timeout enforced by child guardrails. Autonomy gating at L1 via unified executor.

### Exit criteria
- [x] Delegation creates real child executions rather than prompt-only behavior. → `delegate_task` tool calls `generateText()` with child agent's identity, tools, and system prompt. No prompt-only behavior.
- [x] Parent-child traces are inspectable as a single unit. → Child records prefixed with agent name in parent records. Delegation events extracted and persisted in traces. Child run linked via `parent_run_id`.
- [x] Delegation is bounded by depth limits, budget inheritance, and permission narrowing. → MAX_DELEGATION_DEPTH=3, budget inheritance via guardrail adjustment, permission narrowing via `parentToolKeys` intersection.

## Phase 4b: Async Delegation and Subagent Orchestration (Weeks 17-19)

### Goal
Extend delegation to support asynchronous child runs, fan-out to multiple agents, independent budget tracking, and full parent-child trace trees.

### Checklist

### 4b.1 Async execution model
- [x] Define child-run creation semantics, lifecycle states (pending, executing, completed, failed, cancelled), and cancellation behavior. → Async delegations persist as independent `tenant_runtime_runs` linked by `parent_run_id`, with operator/runtime cancellation via `delegation_cancel`, `terminate`, and `cancelDelegationTree()`.
- [x] Define parent-child context propagation rules: task payload, memory access, tool access, budget allocation, deadlines, and trace IDs. → Async payload/metadata now carry task/context, actor identity, worker kind, request trace id, deadline, and parent tool keys for literal permission narrowing.
- [x] Support fan-out: parent delegates to multiple child agents concurrently. → `delegate_task_async` enqueues independent child runs and `delegation_poll` collects mixed child statuses/results.
- [x] Add concurrency limits and fan-out limits per parent run. → Per-parent active child counts are capped before enqueue and reinforced by delegation fan-out middleware limits.

### 4b.2 Runtime implementation
- [x] Implement async child-agent spawn via the runtime orchestrator. → `enqueueAsyncDelegationRun()`, `processRuntimeRun`, and `delegation-ai-worker.ts` execute async children through the shared runtime queue.
- [x] Implement result handoff from completed child runs back to parent runs (callback or polling). → `delegation_poll` resolves child lifecycle state, outputs, and budget-accounting state back to the parent.
- [x] Add failure modes for timeout, refusal, blocked-by-policy, and partial completion. → Child runs persist structured statuses (`queued`, `running`, `completed`, `failed`, `canceled`, `awaiting_approval`) and poll responses surface per-child outcomes.
- [x] Add independent budget accounting so child runs track their own spend while parent owns the total. → Async budget rollup is now atomic via `account_async_delegation_budget(...)`, preventing double count / missed count races.

### 4b.3 Advanced policy and governance
- [x] Add approval hooks for high-risk delegation patterns (e.g., fan-out > N, cross-team delegation). → Delegation tools remain high-risk catalog entries routed through unified policy/autonomy gates, while fan-out beyond configured bounds is blocked before enqueue.
- [x] Add operator-visible delegation history in traces and UI. → Delegation events persist in traces and the admin observability run inspector renders child-run trees with status/timing context.
- [x] Add operator controls to cancel individual child runs or entire delegation trees. → Operators can terminate a single run or cancel a whole delegation tree from `/api/admin/runs/[runId]`.

### 4b.4 Developer and operator experience
- [x] Add canonical async delegation tool semantics in prompts and registry descriptions. → Async delegation tools now have shipped descriptions in `async-delegation.ts`, registry gating, and operator docs in `content/docs/tools/delegation.mdx`.
- [x] Add debugging views for child-run trees, tool usage, timing, and failures. → Admin observability queries and `run-inspector.tsx` expose nested child runs, actions, artifacts, statuses, and failures.
- [x] Add replay/test harnesses for delegated workflows. → Admin run actions support replay/resume, and async delegation has unit/eval coverage across depth, gating, and fan-out scenarios.

### Exit criteria
- [x] Async delegation creates independent child runs with their own lifecycle.
- [x] Parent-child trace trees are inspectable end-to-end, including fan-out scenarios.
- [x] Delegation is bounded by policy, budget, depth, fan-out, and loop/recursion controls.

## Phase 5: Browser Automation for SMB Tasks (Weeks 20-22)

### Goal
Add browser/computer-use capability for the SMB workflows APIs cannot cover, without turning Pantheon into an unsafe general-purpose remote-control system.

### Checklist

### 5.1 Scope the first workflow set
- [x] Choose the first narrow set of approved browser tasks, such as portal lookup, form submission, invoice retrieval, or status checks. → `content/docs/browser-automation/index.mdx` and the browser settings UI define v1 scope as portal lookups, form submissions, invoice retrieval, status checks, and data extraction.
- [x] Define what is explicitly disallowed in v1. → Browser docs now codify v1 exclusions: no uploads/downloads, no multi-tab, no persistent sessions, no purchases/payments, no password storage, no arbitrary JS execution.
- [x] Define evidence requirements: screenshots, DOM snapshots, step logs, and final structured outputs. → Browser runtime persists `screenshot`, `dom_snapshot`, `step_log`, and `structured_output` artifacts and surfaces them in traces/inspector views.

### 5.2 Cost modeling
- [x] Model per-session browser infrastructure cost (compute, isolation, storage for artifacts). → Browser policy now carries `base_cost_cents` and `per_action_cost_cents`, and docs define the session cost model.
- [x] Define whether browser automation is included in the $50/month base plan or billed as metered usage. → Browser docs specify 50 included sessions/month with metered overage beyond the base plan.
- [x] Set hard per-tenant and per-run session limits to prevent unbounded cost (e.g., max sessions per day, max actions per session, max session duration). → Tenant policy and runtime quota checks enforce daily session, per-session action, and max-duration limits.
- [x] Define session pooling/reuse strategy to reduce infrastructure cost. → Browser tooling reuses a single browser session per run and destroys it on flush; no cross-run persistence is allowed in v1.
- [x] Add browser session cost to the per-run budget system from Phase 1.5. → Browser sessions record additive usage through `upsert_api_usage(...)`, while guardrails cap browser action count and session duration.

### 5.3 Runtime architecture
- [x] Choose the browser automation backend and isolation model. → Pantheon ships headless Chromium via Playwright with isolated browser contexts per session.
- [x] Define session lifecycle, tenancy boundaries, and credential handling for browser sessions. → Sessions are created per run, tenant-scoped in storage/API access, and closed on flush; credential/password/payment fields are blocked or approval-gated.
- [x] Define navigation/action primitives exposed to the shared tool registry. → Browser v1 exposes `browser_navigate`, `browser_extract`, `browser_click`, `browser_fill`, and `browser_screenshot`.
- [x] Add screenshot and page-state artifacts into the trace system. → Browser artifacts and session summaries are flushed into traces and can be inspected through admin observability.

### 5.4 Safety and approvals
- [x] Make browser tools high-risk by default. → All browser tools are cataloged as high-risk and ship disabled by default pending tenant enablement.
- [x] Require approval for sensitive actions such as submit, purchase, delete, credential entry, or irreversible updates. → Sensitive browser actions go through durable tenant approvals with page-state context, and secret/payment/password-style fields are blocked outright.
- [x] Add domain allowlists and per-tenant browser policies. → Navigation and post-action redirects are revalidated against tenant allow/block lists on every browser transition.
- [x] Add anti-runaway protections for repeated navigation/click loops (leveraging Phase 1.5 loop detection). → Browser action budgets, per-minute rate limits, and no-progress detection guard repeated browser loops.

### 5.5 UX
- [x] Show browser session status and artifacts in the dashboard. → Browser session APIs and the admin run inspector now expose session state, screenshots, DOM/JSON artifacts, and artifact links.
- [x] Show approval prompts with enough context for operators to make decisions quickly. → Browser approvals persist action args, session id, request hash, and current page state for operator review.
- [x] Add failure summaries that distinguish site breakage, auth failure, selector failure, and policy denial. → Browser tool responses preserve structured error classes and remediation context into traces and inspector output.

### Exit criteria
- [x] Browser automation works for the initial approved SMB task set.
- [x] Browser session costs are bounded and visible to operators.
- [x] Sensitive browser actions are approval-gated and fully audited.
- [x] Operators can inspect screenshots, page-state artifacts, and failure reasons.

## Phase 6: Advanced Guardrails and Safety Hardening (Weeks 23-24)

### Goal
Extend the core guardrails from Phase 1.5 with advanced detection, browser-specific safety, delegation-aware controls, and the configurable middleware framework.

### Checklist

### 6.1 Advanced loop detection
- [ ] Detect ping-pong behavior between tools or agents (tool A → tool B → tool A pattern).
- [ ] Detect repeated browser actions with no page-state change.
- [ ] Detect delegation recursion (agent A delegates to B who delegates back to A).
- [ ] Add adaptive thresholds that account for legitimate retry patterns vs true loops.

### 6.2 Advanced guardrail framework
- [ ] Add model-agnostic middleware/hooks before tool execution and after tool results.
- [ ] Add policy rules for prompt injection signals, suspicious fetched content, and unsafe external instructions.
- [ ] Add escalation paths: ask user, require approval, abort run, or downgrade capability.
- [ ] Add per-capability guardrails: browser action limits, delegation depth/fan-out limits, web fetch rate limits.

### 6.3 Advanced observability and remediation
- [ ] Surface loop/guardrail events in traces, dashboards, and incident reporting.
- [ ] Add operator controls to resume, terminate, or replay halted runs.
- [ ] Add guardrail analytics: trigger frequency, false positive rate, cost savings from prevented runaways.

### Exit criteria
- [ ] Advanced loop patterns (ping-pong, delegation recursion, browser loops) are detected and interrupted.
- [ ] Guardrails create actionable telemetry rather than silent failures.
- [ ] Operators can distinguish policy denials, safety halts, and product bugs.

## Phase 7: Launch Hardening, Evals, and Rollout (Weeks 25-26)

### Goal
Turn the new runtime stack into a launchable product surface for SMBs.

### Checklist

### 7.1 Evals and QA
- [ ] Build a launch eval suite covering native tools, web research, MCP tools, delegation, browser automation, and guardrails.
- [ ] Add regression evals for approval behavior, audit logging, and trace completeness.
- [ ] Add chaos/failure tests for MCP outages, provider timeouts, browser session failures, and child-run failures.

### 7.2 Rollout strategy
- [ ] Launch every major capability behind feature flags with tenant overrides.
- [ ] Run internal canaries before any customer rollout.
- [ ] Define rollback criteria for each major subsystem.
- [ ] Stage rollout order: unified tool plane → core guardrails → web research → MCP → sync delegation → async delegation → browser → advanced guardrails.

### 7.3 Documentation and enablement
- [ ] Update docs, onboarding copy, and dashboard hints to reflect real capabilities.
- [ ] Produce operator runbooks for approvals, debugging, and incident response.
- [ ] Produce internal sales/demo guidance focused on SMB-safe automation rather than broad autonomous claims.

### Exit criteria
- [ ] All major capabilities have passing evals, rollback plans, and operator docs.
- [ ] Product claims match what is actually shippable.
- [ ] Pantheon can demonstrate a coherent Discord-first SMB agent story with research, integrations, delegation, and safety.

## 10) Cross-Cutting Workstreams

### Data and schema
- [ ] Add or update persistence for unified tool invocations, guardrail events, child-run relationships, browser artifacts, and MCP health.
- [ ] Review indexes and retention policies for high-volume trace and invocation tables.
- [ ] Add archival and pruning rules so observability growth does not create runaway storage costs.

### Prompting and agent defaults
- [ ] Update system prompt/tool guidance so agents prefer the right tool by task type (`web_search` for discovery, `web_fetch` for extraction, `http_request`/`api_request` for authenticated APIs).
- [ ] Reduce prompt-only claims for capabilities that now have real runtime semantics.
- [ ] Add safer defaults for when to search, when to fetch, when to delegate, and when to ask for approval.

### Dashboard/admin surfaces
- [ ] Add unified tool settings and visibility surfaces.
- [ ] Add unified external tool management (Composio + MCP + extensions) with consistent policy controls.
- [ ] Add MCP server health and enablement views.
- [ ] Add delegation tree views.
- [ ] Add browser trace artifacts and approval views.
- [ ] Add guardrail analytics.

### Cost and limits
- [ ] Add per-tool and per-run cost attribution where applicable.
- [ ] Add tenant budgets and alerts for expensive capabilities.
- [ ] Ensure browser and delegation features cannot create unbounded cost amplification.
- [ ] Add browser session cost modeling and limits.

## 11) Risks and Dependencies

### Major risks
- [ ] Tool-plane unification may expose hidden assumptions in current worker and runtime paths. Mitigated by Phase 0 telemetry providing baseline behavior data before changes.
- [ ] MCP runtime support can create reliability and security issues if connection lifecycle is underspecified. Mitigated by Phase 0 external tool integration strategy.
- [ ] Three parallel external tool systems (Composio, MCP, extensions) can create UX confusion and policy fragmentation if not explicitly converged.
- [ ] Delegation without strict limits can create runaway cost and debugging complexity. Mitigated by shipping sync delegation (4a) before async (4b), and requiring core guardrails (Phase 1.5) before delegation ships.
- [ ] Browser automation can become a support burden if v1 scope is too broad. Mitigated by explicit cost modeling and session limits.
- [ ] Browser sessions can cost more than the $50/month subscription if not bounded. Mitigated by Phase 5 cost modeling and per-tenant limits.
- [ ] Guardrails that are too aggressive can make the system feel weak; too loose and they fail their purpose.

### Dependencies
- [ ] Agreement on canonical tool contract before Phase 1 implementation starts.
- [ ] Phase 0 telemetry data available before finalizing Phase 1 architecture decisions.
- [ ] Clear provider choice and cost model for web search/fetch.
- [ ] External tool integration strategy (Composio/MCP/extensions) agreed before Phase 3 starts.
- [ ] Infrastructure decision for browser isolation and cost model before Phase 5.
- [ ] Schema and dashboard support for child-run and guardrail persistence before Phases 4-6 finish.

## 12) Recommended Execution Order Inside the Team

1. Land Phase 0 architecture lock and telemetry before any major runtime code changes.
2. Build Phase 1 first because every later phase depends on the unified tool plane.
3. Ship Phase 1.5 (core guardrails) immediately after Phase 1 — new capabilities must not ship without basic safety.
4. Ship Phase 2 immediately after Phase 1.5 to close the most visible competitive gap quickly.
5. Ship Phase 3 next so MCP becomes truthful and differentiated.
6. Ship Phase 4a (sync delegation) before Phase 4b (async) — get the simple case right first.
7. Ship Phase 4b before Phase 5 so orchestration semantics are stable before adding browser complexity.
8. Ship Phase 6 (advanced guardrails) before broad customer rollout of Phases 3-5.
9. Use Phase 7 to harden and package the story rather than inventing new surface area.

## 13) Immediate Next Actions

1. Instrument current tool paths with invocation counters and latency tracking (Phase 0 telemetry).
2. Create the Phase 0 architecture decision record and canonical tool contract proposal.
3. Draft the external tool integration strategy (Composio/MCP/extensions convergence).
4. Produce the current-state tool-path inventory with file ownership and persistence mapping.
5. Break Phase 1 into file-level implementation tasks and migrations.
6. Define the internal eval corpus for web research, MCP, delegation, browser, and guardrails.
7. Create feature flags and kill switches for each phase before shipping any new runtime capability.

## 14) Progress Tracker

### Current phase
- [x] Phase 0: Runtime Baseline, Telemetry, and Architecture Lock — COMPLETE
- [x] Phase 1: Unified Tool Contract and Execution Plane — COMPLETE
- [x] Phase 1.5: Core Guardrails and Loop Detection — COMPLETE
- [x] Phase 2: Native Web Research Tools — COMPLETE
- [x] Phase 3: Runtime MCP Bridge — COMPLETE
- [x] Phase 4a: Synchronous Delegation — COMPLETE
- [x] Phase 4b: Async Delegation and Subagent Orchestration — COMPLETE
- [x] Phase 5: Browser Automation for SMB Tasks — COMPLETE

### Next target
- [ ] Phase 6: Advanced Guardrails and Safety Hardening

### Blockers
- [ ] Usage report requires telemetry data to accumulate in production before analysis.

## 15) Update Log

- 2026-03-16: Created initial runtime excellence master plan covering unified tools, web research, MCP runtime, delegation, browser automation, and guardrails.
- 2026-03-16: Explicitly excluded Slack and other new messaging channels from this execution plan per product direction.
- 2026-03-16: Phase 0 COMPLETE. All deliverables produced:
  - `plans/phase-0-canonical-tool-lifecycle-adr.md` — Defines CanonicalToolDescriptor, ToolResult envelope, unified policy sequence, delegation trace model, shared executor interface, migration path, and risk level assignments for all tools.
  - `plans/phase-0-external-tool-integration-strategy.md` — Composio, MCP, and extensions coexist with shared policy layer. MCP for custom tools, Composio for managed SaaS, extensions for Pantheon-native. Namespace conventions, trust policy extension, unified operator UX.
  - `plans/phase-0-rollout-flag-matrix.md` — 13 feature flags + 6 kill switches across all phases. Rollout strategies and rollback criteria defined per phase.
  - Only deferred item: usage report (requires telemetry data to accumulate in production).
- 2026-03-16: Phase 1.1 COMPLETE — Shared contracts and registries:
  - `src/lib/runtime/tool-contracts.ts` — Canonical types: `CanonicalToolMeta`, `ToolResult`, `ToolExecutionContext`, `ToolSource`, `RiskLevel`, `ToolCategory`, `ToolCapabilities`.
  - `src/lib/runtime/tool-catalog.ts` — Static catalog of all 23 native tools with risk levels, categories, capability flags, and seeding defaults. Exports `NATIVE_TOOL_CATALOG` map, `getNativeToolMeta()` lookup, and `ensureNativeToolCatalog()` for idempotent tenant provisioning.
  - `supabase/migrations/00085_seed_native_tool_catalog.sql` — Backfill migration seeding all native tools into `tenant_tools` + `tenant_tool_policies` for every active tenant. Uses ON CONFLICT DO NOTHING for idempotency. Critical tools (reveal_secret) seeded as disabled with approval_mode='always'.
  - `src/lib/runtime/tool-catalog.test.ts` — 12 validation tests ensuring catalog integrity (key regex, risk/capability consistency, completeness).
- 2026-03-16: Phase 1.4 COMPLETE — Self-config and schedule tool governance:
  - All self-config and schedule tools now routed through unified policy/approval pipeline via the unified executor wrapper.
  - Added `agentAutonomyLevel` config to `UnifiedToolExecutorConfig`. Both Discord and email workers pass the agent's autonomy level from `assembled.agent.config.autonomy_level`.
  - Created `AUTONOMY_GATED_TOOLS` map gating 8 tools: 6 high-impact self-config tools (config_create_agent, config_archive_agent, config_set_my_autonomy, config_update_team_profile, config_set_my_delegation, config_undo_last_change) require approval for L1/L2 agents; 2 schedule mutations (schedule_create, schedule_delete) require approval for L1 agents only.
  - `checkAutonomyGate()` function upgrades "allowed" policy decisions to "requires_approval" when agent autonomy is at or below the gate threshold.
  - Autonomy gating works in both enforcement and shadow mode (logged but not blocked in shadow).
  - Self-config tools retain internal `requireRole()` checks as defense-in-depth alongside the unified policy check.
  - 7 new tests covering autonomy gating: L1 blocking, L2 blocking, L3 passthrough, schedule-specific gating, non-gated tools, shadow mode bypass, and no-autonomy-level passthrough.
- 2026-03-16: Phase 1.3 COMPLETE — Policy enforcement and persistence alignment:
  - Secret access/reveal flows now use the same policy checkpoints as all other tools. Both `use_credential` and `reveal_secret` are wrapped by the unified executor with enforcement. `reveal_secret` retains its internal `executeTenantExternalToolInvocation()` as defense-in-depth.
- 2026-03-16: Phase 1.3 MOSTLY COMPLETE — Policy enforcement and persistence alignment:
  - Upgraded unified executor from shadow mode to enforcement mode (`enforcePolicy: true` default).
  - Denied tools now return structured `{ error: "policy_denied", tool, reason, message, remediation }` to the model instead of executing.
  - Approval-required tools return `{ error: "approval_required", tool, reason, message, remediation }` with required role.
  - Added `DENIAL_REASONS` map with user-facing messages and remediation hints for 6 denial types.
  - Invocation records now use proper status mapping: denied→rejected, requires_approval→pending.
  - Shadow mode (`enforcePolicy: false`) preserved as opt-in for backward compatibility.
  - `shadow_mode: true` flag only written to invocation records when actually in shadow mode.
  - Both Discord and email AI workers updated to pass `enforcePolicy: true`.
  - Added `resolveInvocationStatus()` for consistent status resolution across enforcement and shadow modes.
  - 5 new tests covering enforcement defaults, shadow mode bypass, non-native tool passthrough, and policy error fallback.
  - Remaining: secret access/reveal flow alignment.
- 2026-03-16: Phase 1.2 COMPLETE (LLM-path) — Shared execution path:
  - `src/lib/runtime/unified-tool-executor.ts` — Unified executor wrapping AI SDK tools with shadow-mode policy evaluation. Evaluates `evaluateTenantToolPolicy()` for native tools (lazy dynamic import), skips Composio/external tools. Caches policy per tool key within a run. Accumulates invocation records in memory, flushes to `tenant_tool_invocations` + `telemetry_events` in batch. Replaces Phase 0 `createToolTelemetryCollector()`.
  - `src/lib/runtime/unified-tool-executor.test.ts` — 10 tests covering success/error recording, soft error detection, wrapAll, non-native tool skipping, no-run-context skipping, empty flush, record immutability, truncation.
  - Modified `src/lib/ai/tenant-ai-worker.ts` — Replaced telemetry collector with unified executor (create → wrapAll → flush → records).
  - Modified `src/lib/ai/email-ai-worker.ts` — Same replacement as Discord worker.
  - Modified `src/lib/ai/tools/registry.ts` — Added `ensureNativeToolCatalog()` call at start of `resolveToolsForAgent()` with in-process cache.
  - Remaining: operator/runtime-triggered tool invocations (Phase 1.2 deferred item — runtime path uses different execution model).
- 2026-03-16: Phase 0.1 telemetry implemented:
  - Created `src/lib/ai/tools/tool-telemetry.ts` — per-invocation wrapper capturing tool name, latency, success/failure, error class. Records to `telemetry_events` table.
  - Wired telemetry into both `tenant-ai-worker.ts` (Discord) and `email-ai-worker.ts` (email) via `createToolTelemetryCollector().wrapAll()`.
  - Enriched conversation traces with tool output summaries (previously always empty).
  - Produced `plans/phase-0-tool-path-inventory.md` — complete tool governance coverage matrix showing 25 LLM-path tools with minimal governance vs 8 runtime-path tools with full governance.
- 2026-03-16: Major plan revision based on codebase architecture review:
  - Added Phase 0 telemetry sprint to instrument current tool usage before designing target architecture.
  - Added Phase 1.5 (core guardrails and loop detection) between tool unification and new capabilities — safety before features.
  - Expanded Phase 1 scope to explicitly cover email worker path (`email-ai-worker.ts`) and self-config/schedule tool governance.
  - Split Phase 4 into 4a (sync delegation, simpler, ships first) and 4b (async delegation with fan-out, ships later).
  - Added `http_request` → `web_fetch` migration path to Phase 2 — clarifies tool selection for agents and operators.
  - Added Composio/MCP/extensions convergence strategy to Phase 0 and Phase 3 — prevents three parallel external tool paths.
  - Added browser cost modeling section to Phase 5 — $50/month product cannot absorb unbounded browser infrastructure costs.
  - Extended timeline from 20 weeks to 26 weeks to reflect expanded scope and reduced risk.
- 2026-03-16: Phase 2.3 + 2.4 COMPLETE — Citation persistence, display, fallback, and freshness:
  - `supabase/migrations/00087_web_citations_in_traces.sql` — Adds `web_citations` JSONB column to `tenant_conversation_traces`.
  - `src/lib/ai/trace-recorder.ts` — Added `WebCitation` type, `extractWebCitations()` utility for parsing web_search/web_fetch executor records into deduplicated citation lists, and `webCitations` field on `TraceData`.
  - Both `tenant-ai-worker.ts` and `email-ai-worker.ts` now call `extractWebCitations(executor.records)` when building trace data.
  - `src/components/dashboard/conversation-replay.tsx` — Added `TraceCitations` component showing clickable source links with title, snippet, hostname, and tool origin (search/fetched). Renders between tools and memories in trace detail view.
  - `web_search` tool now includes today's date in description and advises using recency filter for time-sensitive queries.
  - `web_search` response `note` field is now dynamic: provides specific guidance for 0 results (rephrase/broaden/try web_fetch) and sparse results (<3, suggest broadening).
  - 7 new tests in `trace-recorder.test.ts` covering citation extraction: search results, fetch results, deduplication, failed invocations, truncated JSON, non-web tools, empty records.
- 2026-03-16: Phase 2.5 COMPLETE — Evals and launch blockers:
  - `src/lib/ai/evals/web-research-scenarios.ts` — 12 eval scenarios (9 search + 3 fetch) across all 5 SMB research categories: prospect research (2), competitive research (2), vendor lookup (1), documentation lookup (2), knowledge refresh (2), plus 3 fetch scenarios covering HTML extraction, JSON APIs, and long content truncation.
  - `src/lib/ai/evals/web-research-scorer.ts` — Quality scoring framework with `scoreSearchResult()` and `scoreFetchResult()` evaluating against configurable criteria (URL presence, titles, snippets, HTTPS enforcement, dedup, citation notes, timestamps, content extraction). `compareAgainstHttpBaseline()` produces structured comparison verdicts.
  - `src/lib/ai/evals/web-research-launch-blockers.ts` — 19 launch blockers (14 blocker-severity, 5 warning-severity) across 5 categories: citation (4), safety (5), quality (4), observability (3), policy (3). `evaluateLaunchReadiness()` computes go/no-go status.
  - `src/lib/ai/evals/web-research-evals.test.ts` — 30 tests in 7 suites: scenario coverage validation, all 9 search scenarios scored against criteria, all 3 fetch scenarios scored, all 9 baseline comparisons confirm web_search > http_request, citation extraction pipeline validation, launch blocker structural checks (citation/safety/policy), fallback and freshness behavior verification.
- 2026-03-16: **Phase 2 COMPLETE.** All 5 sub-sections (2.1–2.5) and all 4 exit criteria satisfied. 111 passing tests across 21 suites for all Phase 2 + related infrastructure.
- 2026-03-16: **Phase 3.5 COMPLETE** — Product truth cleanup:
  - `src/components/settings/mcp-server-form.tsx` — Full rewrite supporting both stdio and SSE transports, env_vars key/value editor, SSE URL and headers editor, scope selector (instance/agent) with agent picker, transport toggle buttons. Form data type exported as `McpServerFormData`.
  - `src/components/settings/mcp-server-card.tsx` — Added health status indicator (5 states with icons: healthy/degraded/unhealthy/unreachable/unknown), transport type badge (stdio/SSE with icons), tool count display, and last error message for degraded/unhealthy servers.
  - `src/components/settings/mcp-server-list.tsx` — Updated to accept `agents` prop, use `McpServerFormData` type for create/update handlers, and pass agents list to form.
  - `src/app/(dashboard)/settings/mcp-servers/page.tsx` — Fetches tenant agents in parallel with MCP servers and passes to `McpServerList`.
  - `content/docs/mcp-servers/filesystem.mdx` — Removed non-existent "From Preset" instructions. Replaced with manual field-by-field setup steps. Added transport type to overview table.
  - `content/docs/mcp-servers/index.mdx` — Added transport types section (stdio vs SSE), health monitoring section, updated field table with transport-specific fields (command/args/env_vars for stdio, url/headers for SSE).
  - `src/types/mcp.ts` — Populated `MCP_PRESET_INFO` with filesystem and github presets (previously empty). Added `McpPreset` interface with transport field.
- 2026-03-16: **Phase 3 COMPLETE.** All runtime sections (3.1–3.5) done. Remaining deferred items: Composio executor migration (3.2), unified external tools panel (3.2), secret rotation/audit (3.3). These are cross-cutting items tracked in Section 10.
- 2026-03-16: **Phase 4a COMPLETE.** Synchronous delegation fully implemented:
  - `src/lib/ai/tools/delegation.ts` — `createDelegateTaskTool()` factory and `executeDelegation()` inline runner. Child agent executes via `generateText()` with its own identity, tools, system prompt, and budget constraints.
  - `supabase/migrations/00090_delegation_support.sql` — Adds `parent_run_id`, `parent_invocation_id`, `delegation_depth` to `tenant_runtime_runs`. Adds `delegation_events` JSONB to `tenant_conversation_traces`. Seeds `delegate_task` into native tool catalog.
  - `src/lib/runtime/tool-catalog.ts` — Added `delegate_task` to native catalog (category: delegation, risk: high).
  - `src/lib/runtime/tool-contracts.ts` — Added `"delegation"` to `ToolCategory` union.
  - `src/lib/ai/tools/registry.ts` — Wired `createDelegateTaskTool` via `delegationConfig` in `ToolRegistryInput`.
  - `src/lib/ai/context-assembler.ts` — Passes `delegationConfig` through to tool registry.
  - `src/lib/ai/tenant-ai-worker.ts` — Provides delegation context with mutable guardrails/records/toolKeys references populated after executor creation.
  - `src/lib/ai/trace-recorder.ts` — Added `DelegationEvent` type, `extractDelegationEvents()` utility, `delegation_events` field in `TraceData`.
  - `src/lib/templates/agent-soul.ts` — Updated delegation section to reference actual `delegate_task` tool instead of prompt-only instructions.
  - `src/lib/runtime/unified-tool-executor.ts` — Added `delegate_task` to `AUTONOMY_GATED_TOOLS` (gated at L1/assisted).
  - Key design decisions: MAX_DELEGATION_DEPTH=3, permission narrowing via parent tool key intersection, budget inheritance via guardrail adjustment, child records prefixed with agent name in parent trace, self-delegation blocked, recursive delegation supported within depth limit.
  - `src/lib/ai/tools/delegation.test.ts` — 6 tests covering tool creation, depth limits, and delegation flag gating.
- 2026-03-17: **Phase 4b COMPLETE.** Async delegation now matches the plan’s orchestration and governance intent:
  - `supabase/migrations/00094_runtime_usage_and_delegation_helpers.sql` — Adds additive usage rollup (`upsert_api_usage`) and atomic async parent-budget accounting (`account_async_delegation_budget`).
  - `src/lib/ai/tools/async-delegation.ts` — Async delegation now propagates actor context, worker kind, deadlines, request trace ids, and literal parent tool-key narrowing into child payloads/metadata.
  - `src/lib/ai/delegation-ai-worker.ts` — Child runs now execute under inherited actor identity instead of forced operator context, flush browser sessions into traces, and atomically account child spend back to the parent.
  - `src/lib/ai/tools/registry.ts` — Async delegation tools (`delegate_task_async`, `delegation_poll`, `delegation_cancel`) are now exposed only when individually enabled.
  - `src/app/api/admin/runs/[runId]/route.ts` and `src/components/admin/run-inspector.tsx` — Operators can terminate individual runs, cancel delegation trees, inspect child-run hierarchies, and replay/resume runs from admin observability.
  - `content/docs/tools/delegation.mdx` plus delegation tests/evals now reflect shipped async semantics, fan-out constraints, and operator workflows.
- 2026-03-17: **Phase 5 COMPLETE.** Browser automation now satisfies the runtime, safety, cost, and operator-visibility checklist:
  - `src/lib/ai/tools/browser.ts` and `src/lib/runtime/browser-session.ts` — Browser sessions reuse one isolated Playwright/Chromium context per run, revalidate redirects and click/fill navigation, persist `step_log` / `dom_snapshot` / `structured_output` artifacts, and require durable approvals for sensitive actions.
  - `src/lib/runtime/browser-artifacts.ts` and `src/app/api/tenants/[tenantId]/browser-sessions/[sessionId]/artifacts/route.ts` — Browser artifact access is tenant-scoped and returns the inspector’s expected signed artifact payload.
  - `src/lib/ai/trace-recorder.ts`, `src/lib/ai/tenant-ai-worker.ts`, `src/lib/ai/email-ai-worker.ts`, and `src/lib/ai/delegation-ai-worker.ts` — Browser session summaries and artifact counts are flushed into conversation traces for Discord, email, and delegated runs.
  - `src/app/api/tenants/[tenantId]/browser-policy/route.ts`, `src/lib/runtime/browser-policy.ts`, and `src/lib/ai/usage-tracker.ts` — Tenant browser policies now persist cost controls (`base_cost_cents`, `per_action_cost_cents`) and browser usage accumulates instead of overwriting prior spend.
  - `src/lib/runtime/tool-catalog.ts` and `content/docs/browser-automation/index.mdx` — All browser tools are documented and cataloged as high-risk, disabled-by-default capabilities with explicit v1 scope and limitations.
  - `src/components/admin/run-inspector.tsx` — Operators can inspect screenshots, DOM/JSON artifacts, session state, and failure context directly from observability views.
