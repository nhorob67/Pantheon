# Operator Runbook: Delegation Debugging

## Reading Delegation Trees

1. Navigate to **Admin → Observability → Runs → [Run ID]**
2. Expand the **Delegation Tree** section
3. Each node shows: target agent name, delegation kind (sync/async), status, latency

### Status meanings
- **completed**: Child finished successfully
- **failed**: Child encountered an error (check error_message)
- **canceled**: Parent or operator canceled the delegation
- **queued/running**: Child is still executing (for async)

## Common Issues

### Delegation Recursion Halt
**Symptom:** Run halted with `delegation_recursion` guardrail event
**Cause:** Agent A delegated to Agent B who delegated back to A (or similar cycle)
**Fix:**
1. Review the delegation tree to identify the cycle
2. Update agent skills/prompts to avoid delegating back to the originator
3. If the use case is legitimate, restructure as two separate runs instead

### Depth Limit Exceeded
**Symptom:** Run halted with `delegation_recursion` event mentioning "depth limit"
**Cause:** Delegation chain exceeded max depth (default: 3)
**Fix:**
1. Review whether the deep chain is necessary
2. Flatten the delegation — have the top-level agent delegate directly to the deep target
3. If deeper chains are genuinely needed, increase `max_delegation_depth` via guardrail config

### Fan-Out Limit Exceeded
**Symptom:** Async delegation returns error about fan-out limit
**Cause:** Parent already has max concurrent children (default: 3)
**Fix:**
1. Wait for existing children to complete before starting new ones
2. If more parallelism is needed, increase fan-out via delegation budget config

### Child Run Failed
**Symptom:** Delegation result shows `success: false` with error message
**Steps:**
1. Find the child run ID in the delegation tree
2. Open the child run in the run inspector
3. Check the child's tool invocations and guardrail events
4. Common causes: child hit its own guardrail limit, tool execution error, model error

### Stuck Async Delegation
**Symptom:** Async delegation stays in "queued" or "running" for too long
**Steps:**
1. Check if the child run exists in the runs list
2. If the child run is stuck, terminate it via the run inspector
3. The parent can re-delegate or cancel the delegation

## Replaying Failed Delegations

1. Open the failed parent run in the run inspector
2. Click **Replay** to re-enqueue with the same payload
3. The new run will re-attempt all delegations from scratch
4. Monitor the new run's delegation tree for the same issues

## Checking Delegation Budget Impact

1. Open the parent run's conversation trace
2. Check `guardrail_summary.totalTokens` and `totalSpendCents`
3. Compare against the tenant's budget config
4. Child token usage is included in the parent's totals
