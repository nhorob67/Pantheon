# Feature Flag & Rollout Matrix

Last updated: March 17, 2026

## Capability Rollout Order

Capabilities must be rolled out in this order due to dependencies. A capability cannot be enabled unless all its prerequisites are enabled.

| # | Capability | Feature Flag Key | Kill Switch Key | Prerequisites | Default State |
|---|-----------|-----------------|-----------------|---------------|---------------|
| 1 | Unified Tool Plane | `tenant_runtime_reads`, `tenant_runtime_writes` | `tenant_tool_execution_kill_switch` | None | Enabled |
| 2 | Core Guardrails | (always on when tool plane is on) | — | Unified Tool Plane | Enabled |
| 3 | Web Research | `tools.web_search`, `tools.web_fetch` | `tools.web_research_pause` | Core Guardrails | Disabled |
| 4 | MCP Runtime | `tools.mcp_runtime` | — | Core Guardrails | Disabled |
| 5a | Sync Delegation | `tools.delegation_sync` | — | Core Guardrails | Disabled |
| 5b | Async Delegation | `tools.delegation_async` | — | Sync Delegation | Disabled |
| 6 | Browser Automation | `tools.browser_automation` | `tools.browser_automation_pause` | Core Guardrails | Disabled |
| 7 | Advanced Guardrails | (always on when core guardrails are on) | — | Core Guardrails | Enabled |

## Flag Dependencies

```
Unified Tool Plane
└── Core Guardrails (always on)
    ├── Advanced Guardrails (always on)
    ├── Web Research (tools.web_search, tools.web_fetch)
    ├── MCP Runtime (tools.mcp_runtime)
    ├── Sync Delegation (tools.delegation_sync)
    │   └── Async Delegation (tools.delegation_async)
    └── Browser Automation (tools.browser_automation)
```

## Three-Tier Gating

Every tool-level capability uses three independent gates. All three must pass for the tool to be available:

1. **Global kill switch** — Emergency off switch. Affects all tenants instantly. Use for incidents.
2. **Customer feature flag** — Per-customer enablement. Resolved via `resolve_customer_feature_flag` RPC.
3. **Tenant tool status** — Per-tenant enablement in `tenant_tools` table. Set to "enabled"/"disabled".

## Rollback Procedures

### Web Research
- **Trigger:** Error rate > 5% over 15 minutes, or cost spike > 3x baseline
- **Action:** Enable kill switch `tools.web_research_pause`
- **Verify:** Check `tenant_guardrail_events` for rate_limit events decreasing
- **Restore:** Disable kill switch after root cause resolved

### MCP Runtime
- **Trigger:** MCP connection failure rate > 10%, or P95 tool latency > 10s
- **Action:** Disable `tools.mcp_runtime` flag for affected customers
- **Verify:** Check MCP health endpoint returns healthy
- **Restore:** Re-enable flag after MCP server issues resolved

### Delegation (Sync/Async)
- **Trigger:** Delegation recursion halt rate > 1%, or child-run failure rate > 20%
- **Action:** Disable `tools.delegation_sync` (cascades to async)
- **Verify:** Check `tenant_guardrail_events` for delegation_recursion events at zero
- **Restore:** Re-enable after fixing delegation depth/recursion issues

### Browser Automation
- **Trigger:** Browser session cost > 2x estimate, or session failure rate > 15%
- **Action:** Enable kill switch `tools.browser_automation_pause`
- **Verify:** Check active browser session count drops to zero
- **Restore:** Disable kill switch after cost model adjusted

### Advanced Guardrails
- **Trigger:** False positive rate > 30% (from analytics), causing legitimate work to be blocked
- **Action:** Increase thresholds via `tenant_run_budget_configs` for affected tenants
- **Verify:** Check halt rate decreases without increase in runaway runs
- **Restore:** Fine-tune thresholds based on analytics data

## Rollout Rings

| Ring | Tenant Count | Purpose | Duration |
|------|-------------|---------|----------|
| Canary | 1-3 internal | Smoke testing, metrics baseline | 2-3 days |
| Standard | 10-20% of customers | Broader validation, cost modeling | 5-7 days |
| Delayed | Remaining customers | Full rollout | Ongoing |

## Monitoring During Rollout

For each capability rollout, monitor:
- **Error rate** — `/admin/observability/runs` filtered by kind
- **Guardrail halt rate** — `/admin/observability/guardrails` analytics section
- **Cost per run** — Usage analytics dashboard
- **Customer complaints** — Support channel
- **Latency P95** — Trigger.dev run dashboard
