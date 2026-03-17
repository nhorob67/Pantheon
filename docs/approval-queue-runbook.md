# Operator Runbook: Approval Queue Management

## Overview

When an agent attempts to use a tool that requires approval (based on policy, autonomy level, or guardrail escalation), the tool invocation is paused and an approval request is created. Operators review and approve or deny these requests.

## How Approvals Are Triggered

1. **Policy-based**: Tool's `tenant_tool_policies` entry has `decision = requires_approval`
2. **Autonomy-level**: Assisted (L1) or Copilot (L2) agents triggering high-impact tools
3. **Guardrail escalation**: Middleware hook returns `escalate_approval` verdict

## Reviewing Approval Requests

### Finding pending approvals
1. Navigate to **Admin → Observability → Runs**
2. Filter by status: `awaiting_approval`
3. Click into the run to see which tool invocation needs approval

### In the Run Inspector
- The **Tool Invocations** section shows which tool is pending
- Check the tool name, input summary, and policy reason
- Review the agent's context (what it was trying to accomplish)

## Decision Guidelines

### Approve when:
- The tool use matches the agent's configured role and goal
- The input data looks reasonable (not anomalous)
- The tenant has the capability enabled and budgets available
- The request aligns with what the end user asked

### Deny when:
- The tool use doesn't match the agent's purpose
- The input looks like a prompt injection artifact
- The tenant has paused the capability
- The request would access sensitive data inappropriately

## Common Scenarios

### High-impact tool from L1 agent
**Scenario:** Assisted agent wants to use `web_fetch` or `browser_navigate`
**Action:** Check if the end user's message requested this action. Approve if yes.

### Guardrail escalation
**Scenario:** Middleware flagged the action for approval (e.g., potential injection in result)
**Action:** Review the middleware warning message. Check if the fetched content is actually malicious. Approve if it's a false positive.

### Bulk approvals
**Scenario:** Multiple approval requests from the same agent/tenant
**Action:** Review the first few to establish a pattern. If they're all legitimate, approve the batch. Consider adjusting the policy to reduce future approval noise.

## Escalation

If you're unsure about an approval:
1. Check the agent's configuration (role, goal, backstory, autonomy level)
2. Check the tenant's tool policies
3. Check recent guardrail events for the tenant
4. When in doubt, deny — the agent will receive a clear message about needing approval
