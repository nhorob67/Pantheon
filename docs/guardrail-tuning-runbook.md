# Operator Runbook: Guardrail Tuning

## When to Adjust Guardrails

Adjust guardrail thresholds when:
- A tenant reports legitimate work being blocked (false positives)
- Analytics show a high false-positive rate for a specific tenant or agent
- A new use case requires higher limits (e.g., research-heavy agent)
- Cost savings are too low, suggesting thresholds are too loose

## Interpreting Analytics

### False-Positive Rate
- **< 5%**: Guardrails are well-tuned
- **5-15%**: Review the specific event kinds causing false positives
- **> 15%**: Thresholds are likely too aggressive — review and relax

### Trigger Frequency
- **Loop detection dominating**: Agents may need better prompting or the loop threshold is too low
- **Budget halts dominating**: Runs are genuinely too long — check if the task complexity warrants higher budgets
- **Ping-pong dominating**: Agents are bouncing between tools — review tool instructions in the agent's skill set

### Cost Savings
- **High savings + low false positives**: Guardrails working perfectly
- **High savings + high false positives**: Thresholds too aggressive — relaxing slightly will preserve most savings
- **Low savings**: Guardrails rarely fire — this is fine if there are no runaway incidents

## Common Adjustments

### Tenant needs more tool invocations
```
POST /api/admin/guardrail-configs
{
  "tenant_id": "...",
  "customer_id": "...",
  "max_tool_invocations": 100
}
```

### Agent doing legitimate retries
```
POST /api/admin/guardrail-configs
{
  "tenant_id": "...",
  "customer_id": "...",
  "retry_allowed_tools": ["http_request", "web_fetch"]
}
```

### Browser-heavy agent needs more actions
```
POST /api/admin/guardrail-configs
{
  "tenant_id": "...",
  "customer_id": "...",
  "agent_id": "...",
  "max_browser_actions": 50,
  "max_browser_session_ms": 300000,
  "browser_no_progress_threshold": 8
}
```

### Disable ping-pong detection for a specific tenant
```
POST /api/admin/guardrail-configs
{
  "tenant_id": "...",
  "customer_id": "...",
  "ping_pong_threshold": 0
}
```

## Viewing Current Config

```
GET /api/admin/guardrail-configs?tenant_id=...
```

Returns all overrides for a tenant (both tenant-wide and per-agent).

## Escalation

If guardrail tuning doesn't resolve the issue:
1. Check if the agent's system prompt or skills are causing the loop pattern
2. Review the conversation trace for the specific run that was halted
3. Consider whether the agent's task genuinely requires the resource level it's consuming
4. If the pattern is legitimate and common, consider raising the system defaults
