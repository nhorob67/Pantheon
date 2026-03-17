# Internal Canary Playbook

Last updated: March 17, 2026

## Overview

Before any new capability ships to customers, run through this checklist using an internal test tenant. This playbook is the gate between "code merged" and "flag enabled for canary ring."

## Prerequisites

- [ ] All unit tests pass (`npm run test`)
- [ ] Guardrail eval suite passes (`npx tsx --test src/lib/ai/evals/guardrail-evals.test.ts`)
- [ ] Feature is behind a feature flag (not enabled by default)
- [ ] Rollback procedure documented in rollout-matrix.md
- [ ] Migration applied to staging database

## Internal Test Tenant

- **Tenant:** Use the Pantheon internal test workspace
- **Agents:** At least 2 agents configured (for delegation testing)
- **Channel:** #pantheon-canary Discord channel

## Per-Capability Canary Checklist

### Web Research
- [ ] Agent can call `web_search` and return results with citations
- [ ] Agent can call `web_fetch` to extract content from a URL
- [ ] SSRF-blocked URL (e.g., localhost) returns a policy denial
- [ ] Rate limit fires after exceeding configured max per run
- [ ] Trace includes web_citations array after run completes
- [ ] Admin guardrail dashboard shows no unexpected halts

### MCP Runtime
- [ ] MCP server connection established within 5 seconds
- [ ] Agent can discover and call tools from connected MCP server
- [ ] Disconnecting MCP server returns graceful error to agent
- [ ] MCP tool timeout (>10s) triggers appropriate error handling
- [ ] MCP health endpoint returns healthy status

### Sync Delegation
- [ ] Agent A can delegate task to Agent B and receive result
- [ ] Delegation depth limit triggers at configured threshold
- [ ] Circular delegation (A→B→A) is detected and halted
- [ ] Delegation fan-out limit prevents excessive parallel children
- [ ] Child run failure propagates error to parent agent
- [ ] Delegation tree visible in run inspector

### Async Delegation
- [ ] Agent can queue an async task and continue its own work
- [ ] Async child run completes independently
- [ ] Parent can check status of async child via poll
- [ ] Async delegation respects same depth/recursion limits as sync

### Browser Automation
- [ ] Agent can navigate to a URL and take a snapshot
- [ ] Agent can click elements and fill forms
- [ ] Browser session budget halts after exceeding action limit
- [ ] SSRF URL blocking prevents navigation to internal hosts
- [ ] Sensitive field detection blocks auto-fill on password fields
- [ ] Browser session artifacts (screenshots) appear in run inspector

### Advanced Guardrails
- [ ] Ping-pong detection fires on A→B→A→B pattern
- [ ] Browser no-progress fires on repeated actions with no state change
- [ ] Delegation recursion fires on circular chains
- [ ] Prompt injection scanner warns on suspicious web content
- [ ] Per-capability rate limits enforce web_fetch and delegation limits
- [ ] Analytics dashboard shows accurate trigger frequency and cost savings
- [ ] Operator can terminate/replay/resume runs from run inspector

## Go/No-Go Criteria

**Go if ALL of the following:**
- All checklist items pass
- No unexpected guardrail halts during testing
- Run latency P95 < 30 seconds
- No errors in Trigger.dev run dashboard
- Cost per test run within expected range

**No-Go if ANY of the following:**
- Any checklist item fails
- Unexpected guardrail halt rate > 0 during controlled testing
- Run latency P95 > 60 seconds
- Trigger.dev retry rate > 10%
- Cost spike > 2x expected

## After Canary Passes

1. Enable feature flag for canary ring customers (1-3)
2. Monitor for 2-3 days
3. Check guardrail analytics daily
4. If no issues, proceed to standard ring
5. Document any threshold adjustments made during canary
