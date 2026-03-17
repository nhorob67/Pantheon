# Rollout Flag Matrix

Last updated: March 16, 2026
Status: Proposed
Scope: Feature flags and kill switches for each phase of the Runtime Excellence Plan

## Existing Infrastructure

Pantheon already has two gating mechanisms:

1. **Customer feature flags** — Per-customer boolean via `resolveCustomerFeatureFlag(admin, customerId, flagKey)`. Default behavior configurable. Stored in `feature_flags` table.

2. **Global kill switches** — Fleet-wide boolean via `isKillSwitchEnabled(admin, switchKey)`. Evaluated via RPC `is_kill_switch_enabled()`.

Existing flags in use:
- `tenant.runtime.reads` — Customer flag, default true
- `tenant.runtime.writes` — Customer flag, default true
- `tenant.runtime.ai_worker` — Customer flag
- `tenant.runtime.discord_dispatch` — Customer flag
- `tenant.runtime.discord_ingress_pause` — Kill switch
- `tenant.runtime.tool_execution_pause` — Kill switch
- `tenant.runtime.memory_writes_pause` — Kill switch
- `workflow.builder` — Customer flag with rollout canary list

New flags follow the same conventions and infrastructure.

## Flag Definitions by Phase

### Phase 1: Unified Tool Contract

| Flag Key | Type | Default | Granularity | Purpose |
|----------|------|---------|-------------|---------|
| `runtime.unified_tool_executor` | Customer flag | `false` | Per-customer | Route LLM-path tool calls through the unified executor instead of direct execution |
| `runtime.unified_tool_executor.shadow` | Customer flag | `false` | Per-customer | Shadow mode: run unified executor in parallel but use legacy result. Logs discrepancies. |
| `runtime.tool_policy_enforcement` | Customer flag | `false` | Per-customer | Apply policy evaluation to native tools (memory, schedules, self-config). When false, native tools bypass policy (current behavior). |
| `runtime.unified_tool_executor_pause` | Kill switch | `false` | Global | Emergency: revert ALL customers to legacy direct execution |

**Rollout strategy:**
1. Enable `shadow` for internal tenants first → verify no regressions via log comparison
2. Enable `unified_tool_executor` for internal tenants → verify invocation records are correct
3. Enable `tool_policy_enforcement` for internal tenants → verify no unexpected denials
4. Gradual customer rollout of all three flags together

**Rollback criteria:**
- Tool invocation failure rate increases >2% vs baseline
- Approval queue creates unexpected blocks for existing workflows
- Latency increase >500ms per tool call (policy + record overhead)

---

### Phase 1.5: Core Guardrails

| Flag Key | Type | Default | Granularity | Purpose |
|----------|------|---------|-------------|---------|
| `runtime.loop_detection` | Customer flag | `true` | Per-customer | Enable loop detection (repeated identical tool calls). Default ON because it's protective. |
| `runtime.run_budgets` | Customer flag | `true` | Per-customer | Enable per-run budgets (max tool calls, max tokens, max time). Default ON. |
| `runtime.guardrails_pause` | Kill switch | `false` | Global | Emergency: disable all guardrail enforcement (tools execute without limits) |

**Rollback criteria:**
- False positive rate >5% (legitimate tool patterns incorrectly flagged as loops)
- Run budgets terminate >1% of runs that would have succeeded

---

### Phase 2: Web Research

| Flag Key | Type | Default | Granularity | Purpose |
|----------|------|---------|-------------|---------|
| `tools.web_search` | Customer flag | `false` | Per-customer | Enable `web_search` tool for agents |
| `tools.web_fetch` | Customer flag | `false` | Per-customer | Enable `web_fetch` tool for agents |
| `tools.web_research_pause` | Kill switch | `false` | Global | Emergency: disable all web research tools fleet-wide |

**Rollout strategy:**
1. Enable for internal tenants with eval suite
2. Enable for opt-in beta customers
3. Broad enablement after eval quality targets met

**Rollback criteria:**
- Search provider downtime >5 minutes
- Hallucination rate in eval suite exceeds baseline
- Cost per search exceeds budget threshold

---

### Phase 3: MCP Bridge

| Flag Key | Type | Default | Granularity | Purpose |
|----------|------|---------|-------------|---------|
| `runtime.mcp_tool_hydration` | Customer flag | `false` | Per-customer | Enable runtime MCP tool discovery and execution |
| `runtime.mcp_tool_hydration_pause` | Kill switch | `false` | Global | Emergency: disable MCP tool hydration fleet-wide |

**Rollout strategy:**
1. Internal tenants with known-good MCP servers
2. Customers who already have MCP configs stored (they configured servers expecting them to work)
3. Broad enablement

**Rollback criteria:**
- MCP server connection failures >10% of attempts
- MCP tool execution timeout rate >5%
- Security incident from MCP server interaction

---

### Phase 4a: Synchronous Delegation

| Flag Key | Type | Default | Granularity | Purpose |
|----------|------|---------|-------------|---------|
| `runtime.sync_delegation` | Customer flag | `false` | Per-customer | Enable `delegate_task` tool for synchronous agent-to-agent delegation |
| `runtime.delegation_pause` | Kill switch | `false` | Global | Emergency: disable all delegation fleet-wide |

**Rollout strategy:**
1. Internal tenants with multi-agent teams
2. Customers with `can_delegate` agents configured
3. Broad enablement

**Rollback criteria:**
- Delegation depth limit hit >5% of delegation attempts
- Child execution failures >10%
- Cost amplification: delegated runs cost >3x non-delegated runs on average

---

### Phase 4b: Async Delegation

| Flag Key | Type | Default | Granularity | Purpose |
|----------|------|---------|-------------|---------|
| `runtime.async_delegation` | Customer flag | `false` | Per-customer | Enable async delegation with independent child runs |
| (reuses `runtime.delegation_pause` kill switch from 4a) | | | | |

**Rollout strategy:** Same as 4a but more conservative — async delegation is harder to debug.

**Rollback criteria:**
- Orphaned child runs (parent completed but child still running) >1%
- Fan-out exceeds limits >2% of attempts

---

### Phase 5: Browser Automation

| Flag Key | Type | Default | Granularity | Purpose |
|----------|------|---------|-------------|---------|
| `tools.browser_automation` | Customer flag | `false` | Per-customer | Enable browser automation tools |
| `tools.browser_automation_pause` | Kill switch | `false` | Global | Emergency: disable all browser tools fleet-wide |

**Rollout strategy:**
1. Internal tenants with approved workflow set only
2. Beta customers with explicit opt-in and cost acknowledgment
3. Broader enablement with per-tenant session limits

**Rollback criteria:**
- Browser session cost exceeds per-tenant budget
- Browser session reliability <90%
- Security incident from browser interaction

---

### Phase 6: Advanced Guardrails

| Flag Key | Type | Default | Granularity | Purpose |
|----------|------|---------|-------------|---------|
| `runtime.advanced_guardrails` | Customer flag | `true` | Per-customer | Enable advanced loop detection (ping-pong, delegation recursion, browser loops) |
| `runtime.prompt_injection_detection` | Customer flag | `false` | Per-customer | Enable prompt injection signal detection in fetched content |
| (reuses `runtime.guardrails_pause` kill switch from 1.5) | | | | |

**Rollout strategy:** Advanced guardrails default ON (protective). Prompt injection detection starts opt-in due to false positive risk.

---

## Summary Matrix

| Phase | Feature Flag | Kill Switch | Default |
|-------|-------------|-------------|---------|
| 1 | `runtime.unified_tool_executor` | `runtime.unified_tool_executor_pause` | off |
| 1 | `runtime.unified_tool_executor.shadow` | — | off |
| 1 | `runtime.tool_policy_enforcement` | — | off |
| 1.5 | `runtime.loop_detection` | `runtime.guardrails_pause` | **on** |
| 1.5 | `runtime.run_budgets` | `runtime.guardrails_pause` | **on** |
| 2 | `tools.web_search` | `tools.web_research_pause` | off |
| 2 | `tools.web_fetch` | `tools.web_research_pause` | off |
| 3 | `runtime.mcp_tool_hydration` | `runtime.mcp_tool_hydration_pause` | off |
| 4a | `runtime.sync_delegation` | `runtime.delegation_pause` | off |
| 4b | `runtime.async_delegation` | `runtime.delegation_pause` | off |
| 5 | `tools.browser_automation` | `tools.browser_automation_pause` | off |
| 6 | `runtime.advanced_guardrails` | `runtime.guardrails_pause` | **on** |
| 6 | `runtime.prompt_injection_detection` | `runtime.guardrails_pause` | off |

**Total: 13 feature flags + 6 kill switches**

## Implementation Notes

- All new flags use the existing `feature_flags` table and `resolveCustomerFeatureFlag()` RPC.
- All new kill switches use the existing `isKillSwitchEnabled()` RPC.
- Shadow mode (`*.shadow` flags) should log to a dedicated `tool_executor_shadow_log` table or structured console output for comparison analysis.
- Kill switches should be checked EARLY in the execution path (before any work is done) to minimize latency impact when triggered.
- Feature flags should be cached per-run (resolved once at run start, not per-tool-call) to avoid repeated DB queries.
