# Pantheon Competitive Feature Opportunities Design

**Date:** 2026-03-14
**Author:** Codex
**Status:** Draft

## Summary

Pantheon already has a wider product surface than many early-stage agent products. It is not just an agent chat shell. The codebase already includes:

- multi-tenant runtime controls
- agent and channel management
- Discord and email delivery
- knowledge and memory settings
- approvals and guardrails
- workflow builder control-plane features
- schedules and heartbeat operations
- MCP, Composio, custom skills, and extensions
- admin observability, usage, and governance

The strongest strategic question is not whether Pantheon should add "more AI features." It is where the next product investments create the biggest advantage relative to the current market.

After comparing Pantheon against CrewAI, Relay.app, Relevance AI, Zapier Agents, Gumloop, LangGraph, and Microsoft AutoGen, the three highest-impact next steps are:

1. Build a durable workflow execution engine on top of the existing workflow control plane.
2. Expand human-in-the-loop from simple approval gates into full collaborative review and routing.
3. Add live knowledge sources plus durable operational state tables so agents can work from current business context, not only uploaded files and conversation memory.

These three moves best close the gaps versus the strongest competitors while reinforcing Pantheon's existing advantages in governance, approvals, observability, and operational channels.

## Current Product Position

The current codebase already proves a substantial product foundation.

### Areas that are already strong

- Agent team setup with channel bindings and autonomy controls
- Discord-first delivery and per-agent channel ownership
- Email ingestion and agent email identity support
- Knowledge upload and tenant-scoped document handling
- Memory controls for mode, capture level, retention, checkpointing, and compression
- High-risk approval flows for tool execution and heartbeat delivery
- MCP server management, Composio integrations, custom skills, and extension marketplace controls
- Heartbeat and schedule operations
- Admin analytics and runtime observability

### Areas that are strategically promising but still incomplete

- Workflow builder depth is real, but appears stronger as a control plane than as a proven execution plane
- Workflow features already include versioning, simulation, experiments, promotions, rollback, playbooks, import/export, and approvals
- The run processor currently validates, gates, and dispatches queued runs; the execution engine does not appear as mature as the workflow management surface

### Codebase anchors

- Workflow settings surface: `src/app/(dashboard)/settings/workflows/page.tsx`
- Workflow model: `src/types/workflow.ts`
- Workflow run processor: `src/lib/workflows/run-processor.ts`
- Workflow compiler: `src/lib/workflows/compiler.ts`
- Memory settings: `src/components/settings/memory-settings-panel.tsx`
- Tenant approvals: `src/components/settings/tenant-approvals-panel.tsx`
- Extensions: `src/components/settings/extension-marketplace-panel.tsx`
- MCP/tools settings: `src/app/(dashboard)/settings/mcp-servers/page.tsx`

## Competitive Findings

## CrewAI

### What CrewAI is strongest at

- Role-based multi-agent teams
- Delegation patterns between specialists
- Developer-friendly orchestration primitives
- Open-source momentum and ecosystem mindshare

### What users appear to love

- Clear mental model for specialist agents with explicit goals and responsibilities
- Flexibility to combine autonomous agents with more controlled flows
- Strong community and open-source credibility

### Implication for Pantheon

Pantheon already has agent identities, delegation flags, skills, approvals, and channels. The gap is not basic agent creation. The gap is making multi-agent teamwork feel first-class and observable in the product.

## Relay.app

### What Relay is strongest at

- Natural-language-first workflow authoring
- Highly polished human-in-the-loop workflow steps
- Visual inspectability and low-friction automation design
- Reusable operational workflow building blocks

### What users appear to love

- Ease of use
- Fast time to first workflow
- Clear visual understanding of what runs and why
- Human review built directly into the workflow model instead of bolted on later

### Implication for Pantheon

Pantheon overlaps with Relay on workflows, approvals, and MCP. Relay's advantage is product polish around human review, manual inputs, structured approvals, and operational collaboration inside workflows.

## Relevance AI

### What Relevance AI is strongest at

- No-code agent creation
- "AI workforce" framing
- Tool-rich business automation
- Fast creation of task-specific agents

### What users appear to love

- Ability to stand up useful agents quickly
- Breadth of actions and business-tool connections
- Strong template-driven creation flow

### Implication for Pantheon

Pantheon already has the technical primitives for extensibility, but it should make agent bundles, team templates, and reusable playbooks much easier to discover and deploy.

## Zapier Agents

### What Zapier is strongest at

- Integration breadth
- Reliability and user trust
- Strong template ecosystem
- Live business data connectivity

### What users appear to love

- Huge app catalog
- Familiar automation model
- Fast setup
- Less need for custom engineering

### Implication for Pantheon

Pantheon is stronger on governance, approvals, and tenant-level controls. Zapier is stronger on live app connectivity, current-state business data, and no-surprises automation UX.

## Gumloop

### What Gumloop is strongest at

- Visual workflow builder for AI-heavy automation
- Reusable subflows
- Checkpoints and run logs
- Modular no-code composition

### What users appear to love

- Fast workflow assembly
- Visibility into runs and failure points
- Ability to reuse logic instead of rebuilding from scratch

### Implication for Pantheon

Pantheon already has strong governance and workflow metadata, but should improve reusable workflow composition and runtime debugging depth.

## LangGraph

### What LangGraph is strongest at

- Durable execution
- Interrupts and resumability
- Explicit state handling
- Deep runtime control for advanced agent systems

### What users appear to love

- Reliability for long-running agents
- Fine-grained control
- Persistence and recoverability
- Debugging visibility

### Implication for Pantheon

Pantheon is more productized for operators and business users. LangGraph is stronger on runtime guarantees. Pantheon should borrow the durable execution mindset without adopting a developer-only UX.

## Microsoft AutoGen

### What AutoGen is strongest at

- Flexible multi-agent architectures
- Event-driven orchestration
- Code execution and tool-rich agent teams
- Studio-based prototyping

### What users appear to love

- Ability to model complex agent collaboration
- Research and developer flexibility
- Rich team topologies

### Implication for Pantheon

Pantheon does not need to become a research framework. It should selectively bring forward the most product-relevant parts: explicit collaboration flows, orchestration visibility, and richer team composition.

## Cross-Platform Themes

Across these tools, the most consistently loved features cluster into a few themes:

1. Fast setup and low-friction first success
2. Clear visual understanding of what the automation or agent is doing
3. Human review and correction inside the flow
4. Live access to business context and external systems
5. Reusable templates, subflows, and prebuilt patterns
6. Durable execution, resumability, and good debugging
7. Multi-agent specialization without excessive setup burden

Pantheon already has meaningful foundations for items 2, 3, 6, and 7, but the user-facing experience is uneven. That is why the next steps should focus on turning latent platform strength into product strength.

## Recommended Next Step 1: Durable Workflow Execution Engine

## Why this is the top priority

Pantheon already has unusually advanced workflow management features:

- typed graph model
- validation
- simulation
- experiments
- approvals
- versioning
- promotion environments
- rollback
- playbooks
- import/export
- launch-readiness checks

That is expensive groundwork. The main missing leverage is turning this into a clearly durable execution runtime that users can trust for real production automations.

Without that, Pantheon risks having a workflow builder that demos well but competes poorly against Relay, Gumloop, and LangGraph when customers try to operationalize it.

## Product goal

Make workflow runs reliably execute node-by-node, pause safely, resume safely, retry safely, and expose state clearly enough that operators can trust the system with important work.

## User benefits

- Teams can move from "drafting workflows" to running business-critical automation
- Operators can resume work instead of restarting from the beginning
- Long-running workflows become practical
- Failures become diagnosable instead of mysterious
- Approvals become part of a durable process, not a fragile pause point

## Suggested scope

### Phase 1: Core executor

- Introduce a workflow execution engine that consumes compiled workflow IR
- Execute supported node types deterministically
- Persist step-level state after each node transition
- Support resumable runs after approval, delay, or transient failures
- Add idempotent retry semantics per node

### Phase 2: Runtime visibility

- Show current node, last successful node, and next actionable state
- Surface per-step inputs, outputs, timing, and errors
- Add operator-facing repair actions for retry, skip, or resume where safe

### Phase 3: Platform confidence

- Add SLA-oriented alerts for stuck runs
- Add execution metrics for success rate, step latency, and resumption health
- Add regression tests for workflow runtime semantics

## Detailed thoughts

Pantheon should not copy LangGraph's developer ergonomics directly. The better move is:

- keep the business-user workflow builder
- keep Pantheon's approvals and governance model
- add LangGraph-like durability under the hood

This lets Pantheon compete with visual automation tools on usability while competing with agent runtimes on reliability.

There is also a strategic sequencing advantage here: once the executor exists, every later workflow feature becomes more valuable. Richer HITL, better templates, subflows, live data connectors, and multi-agent orchestration all become easier to ship on top of a trustworthy runtime.

### Execution substrate: Trigger.dev v4

The codebase already uses Trigger.dev (v4.4.3) for 13 background tasks including workflow schedule polling and runtime run dispatch. Critically, Trigger.dev v4 provides durable execution primitives via CRIU (Checkpoint/Restore In Userspace) that map directly to workflow node types:

| Trigger.dev primitive | Workflow node type | Behavior |
|---|---|---|
| `wait.for({ minutes: N })` | **delay** | Durable sleep — task state is checkpointed to disk, no compute charged while waiting |
| `wait.forToken(tokenId)` | **approval** | Pause until a human completes a waitpoint token via callback URL; supports timeout |
| `triggerAndWait()` | **action** | Trigger a subtask (tool call, AI generation) and checkpoint until it completes |
| `wait.until(date)` | **delay** (absolute) | Wait until a specific timestamp |

The workflow executor should compile the existing workflow IR (already stored in `workflow_versions.compiled_ir`) into a Trigger.dev task that walks the graph node-by-node. This avoids building a custom durable execution engine — the durability, checkpointing, and resumability come from Trigger.dev's CRIU layer. What we build is the graph traversal logic.

**State ownership:** Trigger.dev should own execution state (durability, checkpointing, resumption). The existing `workflow_run_steps` table should be updated as a side effect of each node transition for observability and audit, but should not be the primary execution state machine. This avoids the complexity of a Postgres-driven state machine with Trigger.dev as a task runner on the side.

**Current gap:** Today a workflow "run" is a single AI worker invocation — not node-by-node graph traversal. The run processor (`run-processor.ts`) validates, evaluates approval gates, and dispatches, but it doesn't walk the compiled IR. The compiled IR exists in the database but isn't consumed by an executor.

**Configuration change:** The current `maxDuration: 120` in `trigger.config.ts` will need to increase for long-running workflows. Trigger.dev supports tasks that run for hours or days via checkpoint/restore — compute is only billed when the task is actively executing, not while waiting.

### Discord integration: no architectural conflict

The Fly.io Discord bot is an inbound relay only — it listens for Discord messages and POSTs them to the Vercel ingress API. Outbound messages go directly from the Vercel app to the Discord REST API using the bot token via `sendDiscordChannelMessage()` in `tenant-runtime-discord.ts`, which already includes circuit breaker protection and rate limit handling.

This means workflow-triggered Discord messages bypass the bot entirely and use the same outbound path as the existing runtime. No changes to the bot architecture are required for durable workflows.

### MCP servers: config-only today

MCP server configs are stored and managed via the UI, but there is no code path that actually hydrates or invokes MCP servers during agent execution. The tool registry (`src/lib/ai/tools/registry.ts`) does not reference MCP servers. This is relevant context: MCP cannot yet serve as a connector substrate for live knowledge sources until the runtime integration is built (following the existing Composio pattern as a reference).

## Risks

- Overengineering the executor before the supported node set is clear
- Shipping too much developer-only complexity into a business-facing product
- Weak execution semantics around retries causing duplicate actions
- Increasing `maxDuration` without per-workflow timeout guards could allow runaway tasks

## Success criteria

- Users can run workflows that survive approval pauses and transient failures without manual recreation
- Support and engineering can inspect exactly where a run stopped
- A workflow run feels operationally trustworthy, not experimental

## Recommended Next Step 2: Rich Human-in-the-Loop Workflows

## Why this is the second priority

Pantheon already has approval infrastructure and policy-driven gating. That is valuable, but many competitors that users love go beyond simple approve/reject.

Relay.app especially appears to win because human review is a collaborative operating model, not just a safety stop.

## Product goal

Expand HITL from binary approval into structured human collaboration inside workflows, agents, and operational channels.

## User benefits

- Teams can correct automation without breaking momentum
- Sensitive work can be reviewed safely
- Operators can supply missing context at the right moment
- Agents become more usable in real operational environments where ambiguity is normal

## Suggested scope

### Phase 1: Better review actions

- Add review states beyond `approve` and `reject`
- Support `edit and continue`
- Support `choose branch`
- Support `request more information`
- Support `send back to agent with instruction`

### Phase 2: Structured human input

- Allow workflows to collect named fields during a review step
- Support operator comments that become part of workflow state
- Allow channel-native review from Discord and email, not only dashboard pages

### Phase 3: Collaborative audit trail

- Persist decision rationale
- Show which human changed what and why
- Make review steps visible in run timelines and analytics

## Detailed thoughts

Pantheon has a real chance to differentiate here because it already has:

- approvals
- Discord delivery
- email ingestion
- runtime queues
- governance and role controls

Most competitors either have strong workflow UX but weaker governance, or strong runtime frameworks but weaker business-user collaboration. Pantheon can combine both.

The most important design principle is that human review should be productive, not just restrictive. The user should feel that the workflow asked for help at the right time and then kept moving.

This opportunity also aligns with Pantheon's likely best customer profile: teams that want autonomy, but only under explicit operational control.

## Risks

- Turning review into too many manual interruptions
- Confusing operators with too many possible review actions
- Inconsistent channel behavior between dashboard, Discord, and email

## Success criteria

- Operators can intervene without restarting or abandoning a run
- Review steps reduce risk without creating excessive friction
- Teams prefer Pantheon for sensitive or semi-automated processes because review feels natural and auditable

## Recommended Next Step 3: Live Knowledge Sources and Operational State Tables

## Why this is the third priority

Several competitors win because they connect to live business systems, not just static prompts and uploaded documents. Zapier Agents and Relay benefit from live operational context. Gumloop also benefits from explicit workflow state and reusable structured data.

Pantheon already has:

- knowledge upload
- memory
- MCP server config management (UI and storage, but not yet invoked at runtime)
- Composio integration (fully wired end-to-end with 8 of ~1,000 available apps exposed)
- extensions

The Composio integration is more mature than this section originally acknowledged. It includes OAuth flows, per-agent toolkit selection, approval gates, and runtime tool wrapping — all production-ready. The 8 currently exposed apps are: Google Sheets, Google Calendar, Gmail, Notion, Airtable, Slack, Google Drive, and Todoist.

What is missing is:

- expanding the exposed connector catalog to cover high-value B2B use cases
- a freshness layer that gives agents ambient context from live systems (not just on-demand tool calls)
- structured operational state inside Pantheon

## Product goal

Give Pantheon agents and workflows access to current business context through a combination of live connectors and durable internal state tables.

## User benefits

- Agents answer from current systems, not stale snapshots
- Workflows can track progress across long-running processes
- Teams can inspect and correct shared state
- Knowledge becomes operational, not just archival

## Suggested scope

### Phase 1a: Expand Composio connector catalog

Add high-value B2B connectors to `src/lib/composio/toolkits.ts`. These are already available in Composio's ~1,000 app catalog and require only new toolkit definitions + OAuth testing, not new infrastructure.

**Tier 1 connectors (add immediately):**

| Connector | Category | Why | Agent use cases |
|---|---|---|---|
| **HubSpot** | CRM | #1 B2B CRM for SMBs — Pantheon's likely customer base | Check deal stage, log activity, pull contact context before replying |
| **Linear** | Project management | Strong in the exact ICP that builds on platforms like Pantheon | Check ticket status, create issue from conversation, sprint blockers |
| **GitHub** | Dev tools | Dev workflows, issue tracking, PR context | Check PR status, create issues, recent deploy changes |
| **Stripe** | Payments | Pantheon already uses it; customers likely do too | Check subscription status, pull invoices, customer MRR |

**Tier 2 connectors (add when demand signals appear):**

| Connector | Category | Why |
|---|---|---|
| Zendesk / Freshdesk | Support | Support agents pulling ticket context |
| Asana / ClickUp | Project management | Broader PM market coverage |
| Confluence | Documents | Enterprise knowledge bases |
| Calendly | Scheduling | Scheduling-heavy agent workflows |
| Intercom | Communication | Customer communication context |
| Salesforce | CRM | Enterprise CRM standard (add when enterprise customers request it) |
| Jira | Project management | Enterprise PM (add when enterprise customers request it) |

### Phase 1b: Freshness-aware knowledge sources

This is the harder, more differentiated work. Tool invocation (agent calls `hubspot.get_deal` during a conversation) already works via Composio. What's missing is **ambient context** — where data from connected systems is continuously synced into a queryable layer that agents can reference without explicit tool calls.

- Build a sync framework: periodic polling or webhook-driven updates that populate a tenant-scoped queryable store
- Expose freshness metadata (last synced, sync status, staleness warnings)
- Make synced data available to both chat context assembly and workflow execution
- Start with 1-2 connectors that have strong webhook support (e.g., Linear webhooks, GitHub webhooks)

### Phase 2: Operational state tables

- Introduce user-visible structured tables for workflow state
- Support records for tasks, cases, approvals, extracted fields, and workflow artifacts
- Let workflows read and write these records safely

### Phase 3: Retrieval and reasoning UX

- Distinguish uploaded documents, memory, and live data in retrieval results
- Show when an answer used stale or fresh data
- Let operators inspect the exact record set used by an agent or workflow

## Detailed thoughts

Pantheon should avoid trying to match Zapier's full app catalog (8,000+ apps) or even Relevance AI's breadth (2,000+ integrations). The better move is:

- expand the Composio toolkit catalog to cover the highest-value B2B connectors (small effort per connector)
- build a freshness-aware sync layer that separates "agent can look things up" from "agent already knows"
- combine that with internal state tables that become part of Pantheon's operating model

The distinction between tool invocation and ambient context matters. Tool invocation is reactive (the agent decides to call a tool mid-conversation). Ambient context is proactive (the agent's context is always enriched with current business state). Competitors like Zapier Agents win on the latter — their agents operate with live business context by default.

This also pairs well with workflows and approvals:

- a workflow can fetch live state
- request human input
- update structured records
- resume later using the same durable context

That is closer to how real business operations work than a one-shot chatbot or a one-off automation zap.

### Codebase anchors for this work

- Composio toolkit catalog: `src/lib/composio/toolkits.ts` (8 toolkits, add more here)
- Composio SDK client: `src/lib/composio/sdk-client.ts`
- Composio tool wrapping: `src/lib/ai/tools/composio.ts`
- Tool registry: `src/lib/ai/tools/registry.ts` (where MCP runtime integration would also go)
- MCP server configs: `src/lib/runtime/tenant-mcp.ts` (config CRUD exists, runtime invocation does not)
- Context assembly: `src/lib/ai/context-assembler.ts`

## Risks

- Connector breadth becoming a distraction from connector quality
- Poor freshness semantics leading to false trust
- State tables becoming an internal-only primitive instead of a user-facing operating surface
- MCP runtime integration is a prerequisite for some advanced connector patterns but is not yet built

## Success criteria

- Users can point Pantheon at current systems and trust the freshness story
- Workflows and agents can persist and reuse shared structured state
- Operators can explain where a decision came from using both documents and current records

## Recommended Implementation Order

1. Durable workflow execution engine
2. Rich human-in-the-loop workflows
3. Live knowledge sources and operational state tables

This order matters.

The workflow executor is the foundation. Rich HITL becomes much more powerful when runs can pause and resume safely. Live sources and state tables become much more useful when workflows can reliably consume, persist, and operate on them over time.

## What Pantheon Should Not Prioritize First

- Broad app-catalog expansion before runtime semantics are stronger
- Research-framework features aimed primarily at developers
- Novel multi-agent topologies before the workflow runtime is dependable
- More surface-level workflow builder polish without deeper execution confidence

## Strategic Positioning

Pantheon should not try to beat each competitor at its own specialty:

- not a pure open-source developer framework like LangGraph or AutoGen
- not only a no-code workflow builder like Relay or Gumloop
- not only an integration marketplace like Zapier
- not only an AI workforce creation studio like Relevance AI

The stronger path is:

**Pantheon as the governed operational agent platform**

Meaning:

- durable automation
- explicit human control
- strong approvals and trust policy
- channel-native execution in Discord and email
- observable tenant operations

That is a sharper and more defensible product identity than "another agent builder."

## Research Notes

Research for this document combined:

1. A codebase audit of Pantheon
2. Official product and documentation pages for CrewAI, Relay.app, Relevance AI, Zapier Agents, Gumloop, LangGraph, and Microsoft AutoGen
3. Public user-sentiment sources including review pages, open-source traction, and community discussion where available

### Sources

- CrewAI docs: `https://docs.crewai.com/en/concepts/crews`
- CrewAI flows and human-in-the-loop: `https://docs.crewai.com/en/concepts/flows`, `https://docs.crewai.com/en/learn/human-in-the-loop`
- CrewAI GitHub: `https://github.com/crewAIInc/crewAI`
- Relay features: `https://www.relay.app/features`, `https://www.relay.app/features/human-in-the-loop`
- Relay reviews: `https://www.g2.com/products/relay-app/reviews`
- Relevance AI agents and docs: `https://relevanceai.com/agents`, `https://relevanceai.com/docs/get-started/core-concepts/agents`
- Relevance AI reviews: `https://www.g2.com/products/relevance-ai/reviews`
- Zapier Agents: `https://zapier.com/agents`
- Zapier agent launch and orchestration posts: `https://zapier.com/blog/introducing-zapier-ai-agents/`, `https://zapier.com/blog/orchestrate-zapier-agents`
- Gumloop docs: `https://docs.gumloop.com/core-concepts/subflows`, `https://docs.gumloop.com/core-concepts/run_log`, `https://docs.gumloop.com/core-concepts/checkpoint_history`, `https://docs.gumloop.com/nodes/mcp/ask_ai_mcp_support`
- Gumloop reviews: `https://www.producthunt.com/products/gumloop/reviews`
- LangGraph overview: `https://docs.langchain.com/oss/python/langgraph/overview`
- LangGraph GitHub: `https://github.com/langchain-ai/langgraph`
- AutoGen docs: `https://microsoft.github.io/autogen/stable/`
- AutoGen GitHub: `https://github.com/microsoft/autogen`

## Final Recommendation

If Pantheon only invests heavily in one area next, it should be durable workflow execution.

If Pantheon invests in three coordinated areas next, they should be:

1. durable workflow execution
2. richer human-in-the-loop collaboration
3. live knowledge plus operational state tables

That combination gives Pantheon the best chance to become more than a configurable agent shell. It becomes an operational platform teams can trust to run important work.

---

## Implementation Checklist

### Step 1: Durable Workflow Execution Engine

#### Phase 1: Core executor

- [ ] Increase `maxDuration` in `trigger.config.ts` for workflow tasks (with per-workflow timeout guards)
- [ ] Build graph traversal function that walks compiled IR from `workflow_versions.compiled_ir`
- [ ] Map `trigger` nodes to task entry points
- [ ] Map `action` nodes to `triggerAndWait()` subtask calls
- [ ] Map `delay` nodes to `wait.for()` / `wait.until()` calls
- [ ] Map `approval` nodes to `wait.forToken()` with callback URL generation
- [ ] Map `condition` nodes to branch evaluation logic
- [ ] Map `handoff` nodes to agent delegation dispatch
- [ ] Map `end` nodes to task completion
- [ ] Write step-level state to `workflow_run_steps` after each node transition
- [ ] Update approval decision API endpoint to complete waitpoint tokens via `runs.completeWaitpoint()`
- [ ] Add idempotent retry semantics per node (prevent duplicate side effects on retry)
- [ ] Integration tests for each node type execution path

#### Phase 2: Runtime visibility

- [ ] Surface current node, last successful node, and next actionable state in workflow run detail view
- [ ] Display per-step inputs, outputs, timing, and errors in run timeline
- [ ] Add operator-facing repair actions (retry node, skip node, resume run)
- [ ] Add run detail API endpoint for step-level introspection

#### Phase 3: Platform confidence

- [ ] Add SLA-oriented alerts for stuck runs (no node transition within configurable threshold)
- [ ] Add execution metrics: success rate, step latency, resumption health
- [ ] Add regression test suite for workflow runtime semantics
- [ ] Add dead-letter handling for workflows that exceed max retries

### Step 2: Rich Human-in-the-Loop Workflows

#### Phase 1: Better review actions

- [ ] Extend approval model beyond `approve` / `reject` to support `edit_and_continue`, `choose_branch`, `request_info`, `send_back_with_instruction`
- [ ] Update approval decision API to handle new action types
- [ ] Update approval UI to present available actions contextually
- [ ] Wire new review actions to Trigger.dev waitpoint token completion with structured output

#### Phase 2: Structured human input

- [ ] Allow workflow approval nodes to define named input fields (schema-driven)
- [ ] Support operator comments that persist as part of workflow run state
- [ ] Enable channel-native review from Discord (react-to-approve, reply-to-provide-input)
- [ ] Enable channel-native review from email (reply-to-approve pattern)

#### Phase 3: Collaborative audit trail

- [ ] Persist decision rationale alongside approval records
- [ ] Show reviewer identity and reasoning in run timelines
- [ ] Include review steps in workflow analytics and reporting

### Step 3: Live Knowledge Sources and Operational State Tables

#### Phase 1a: Expand Composio connector catalog

- [ ] Add HubSpot toolkit definition to `src/lib/composio/toolkits.ts`
- [ ] Add Linear toolkit definition
- [ ] Add GitHub toolkit definition
- [ ] Add Stripe toolkit definition
- [ ] OAuth testing for each new connector
- [ ] Update toolkit icon components for new connectors

#### Phase 1b: Freshness-aware knowledge sources

- [ ] Design sync framework schema (sync configs, sync runs, synced records, freshness metadata)
- [ ] Build periodic polling mechanism for connectors without webhook support
- [ ] Build webhook receiver for connectors with webhook support (Linear, GitHub)
- [ ] Expose freshness metadata (last synced, sync status, staleness) in UI
- [ ] Integrate synced data into context assembly pipeline (`context-assembler.ts`)
- [ ] Add freshness indicators to agent responses when live data is used

#### Phase 2: Operational state tables

- [ ] Design schema for user-visible structured tables (tenant-scoped)
- [ ] Build CRUD API for operational state records
- [ ] Add workflow node type or tool for reading/writing state table records
- [ ] Build settings UI for inspecting and editing state tables
- [ ] Add state table access to agent tool registry

#### Phase 3: Retrieval and reasoning UX

- [ ] Distinguish source type (uploaded doc, memory, live data) in retrieval results
- [ ] Show freshness indicators (stale/fresh/unknown) alongside retrieved context
- [ ] Add operator-facing view of exact records used by an agent or workflow run

### Cross-cutting

- [ ] Build MCP server runtime integration (follow Composio pattern in `tools/registry.ts`) — prerequisite for MCP-based connectors
- [ ] Update workflow builder UI to support new node behaviors (waitpoint-backed approvals, structured inputs)
- [ ] Add Trigger.dev `onWait` / `onResume` middleware hooks for DB connection management during checkpoints
- [ ] Documentation for workflow execution model, connector setup, and HITL patterns
