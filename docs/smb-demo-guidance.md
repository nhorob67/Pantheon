# SMB Agent Demo Guidance

**Internal use only** — for sales calls, demos, and marketing messaging.

## The Story

Pantheon is the safest way for SMBs to deploy AI agent teams. Unlike general-purpose agent platforms, we're built for businesses that need AI to work reliably in Discord — with real safety controls, not just promises.

## What to Demo

### 1. Multi-Agent Team Setup (2 min)
- Show the 3-step onboarding: team → agent → Discord
- Create two agents with different roles (e.g., Support + Research)
- Highlight role/goal/backstory — these aren't just labels, they shape behavior

### 2. Agent Working in Discord (3 min)
- Send a message in Discord and show the agent responding
- Show it using memory to recall previous context
- Show it using a custom skill

### 3. Web Research (2 min)
- Ask the agent to research a topic
- Show citations appearing in the response
- Highlight: "This is real web search, not hallucinated URLs"

### 4. Delegation (2 min)
- Ask Agent A to delegate a subtask to Agent B
- Show the delegation tree in the admin run inspector
- Highlight: "Delegation has depth limits and recursion protection built in"

### 5. Safety Controls (3 min)
- Show the guardrail dashboard with real events
- Show a run that was halted by budget limits
- Show the analytics: false-positive rate, cost savings
- Highlight: "Every run has budget limits — agents can't run away"

### 6. Admin Observability (2 min)
- Show the run inspector with tool invocations
- Show operator controls: terminate, replay, resume
- Highlight: "You have full visibility and control"

## What NOT to Demo

- Browser automation (unless specifically asked — it's still early)
- MCP server configuration (too technical for most SMBs)
- Workflow builder (partially wired, could show incomplete state)

## What NOT to Claim

- "Our agents never make mistakes" — they don't, but our guardrails catch problems fast
- "Fully autonomous" — we support three autonomy levels, and most SMBs should start with Assisted
- "Unlimited capabilities" — we have real budgets and rate limits, which is a feature
- "Works with Slack" — Discord only for now

## Key Differentiators vs Competitors

| Feature | Pantheon | Competitors |
|---------|----------|-------------|
| Safety guardrails | Real-time loop/budget/recursion detection | Usually just prompt engineering |
| Cost control | Per-run budgets with hard halts | Usage monitoring after the fact |
| Multi-agent delegation | Actual execution with depth/recursion limits | Prompt-based "delegation" |
| Tool policy | Three-tier gating (kill switch + flag + tenant) | Binary on/off |
| Observability | Full trace with tool invocations + guardrail events | Chat logs only |
| Operator controls | Terminate/replay/resume from dashboard | Restart entire system |

## Pricing Talking Points

- $50/month base + metered API usage
- Guardrails actively reduce costs by preventing runaway runs
- Show the cost savings estimate in the guardrail analytics
- "You'll never get a surprise $500 API bill because an agent got stuck in a loop"
