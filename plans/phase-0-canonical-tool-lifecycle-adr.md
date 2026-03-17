# ADR: Canonical Tool Lifecycle

Last updated: March 16, 2026
Status: Proposed
Scope: Defines the unified tool execution contract for Pantheon's runtime

## Context

Pantheon currently has two divergent tool execution paths:

1. **LLM-path** (25 tools via `ai/tools/registry.ts`): Tools execute directly inside `generateText()` with no policy evaluation, no approval gating, and no durable invocation records. Only Composio tools and `reveal_secret` bridge to the runtime layer.

2. **Runtime-path** (8 tools via `runtime/tenant-runtime-tools.ts`): Full policy evaluation, approval queueing, circuit breakers, and durable `tenant_tool_invocations` records.

This split means the same underlying operation (e.g., writing a memory record) has different governance depending on which path triggers it. The Phase 0 tool-path inventory (`plans/phase-0-tool-path-inventory.md`) documents the complete gap matrix.

## Decision

All tool executions — regardless of whether they originate from the LLM (via `generateText()`) or from the runtime (via operator commands) — MUST pass through a single canonical lifecycle.

## Canonical Tool Lifecycle

Every tool invocation follows this sequence:

```
1. DISCOVER  →  Tool is resolved and made available to the caller
2. VALIDATE  →  Input schema validated (Zod)
3. POLICY    →  evaluateTenantToolPolicy() determines allowed/denied/requires_approval
4. APPROVE   →  If requires_approval: pause, enqueue approval, return pending
5. EXECUTE   →  Run the tool's implementation within a circuit breaker
6. RECORD    →  Write durable invocation record to tenant_tool_invocations
7. TRACE     →  Include in conversation trace (tools_invoked with input/output summary)
8. TELEMETRY →  Record latency, success/failure, error class to telemetry_events
```

Steps 3-8 are non-negotiable for ALL tools. Steps 1-2 may vary by entry point.

## Canonical Tool Descriptor

Every tool registered in Pantheon — whether native, Composio, MCP, or browser — is described by a single interface:

```typescript
interface CanonicalToolDescriptor {
  /** Unique key within the tenant (e.g., "memory_write", "composio.gmail_send", "mcp.github.create_issue") */
  toolKey: string;

  /** Human-readable name */
  displayName: string;

  /** Tool description shown to the model and operators */
  description: string;

  /** Origin of the tool */
  source: ToolSource;

  /** Risk classification — drives default approval posture */
  riskLevel: "low" | "medium" | "high" | "critical";

  /** Capability flags */
  capabilities: {
    /** Tool makes network requests to external services */
    networkAccess: boolean;
    /** Tool writes or mutates persistent state */
    writesState: boolean;
    /** Tool requires human approval before execution (default from risk level, overridable) */
    requiresApproval: boolean;
    /** Tool can stream partial results */
    supportsStreaming: boolean;
  };

  /** Zod input schema */
  inputSchema: ZodType;

  /** Implementation function */
  execute: (args: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<ToolResult>;
}

type ToolSource =
  | { type: "native" }                                           // Built-in tools (memory, schedules, etc.)
  | { type: "composio"; composioToolName: string }               // Composio integration
  | { type: "mcp"; serverKey: string; serverToolName: string }   // MCP server tool
  | { type: "extension"; extensionId: string }                   // Extension marketplace
  | { type: "browser"; action: string }                          // Browser automation primitive

interface ToolExecutionContext {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agentId: string | null;
  runId: string | null;
  actorRole: TenantRole;
  actorId: string | null;
  /** Shared budget tracker for the current run */
  budget: RunBudgetTracker;
}
```

## Canonical Tool Result Envelope

Every tool execution returns a uniform result:

```typescript
interface ToolResult {
  /** Whether the tool executed successfully */
  success: boolean;

  /** Tool output data (passed back to the model) */
  output: Record<string, unknown>;

  /** Error information if success=false */
  error?: {
    class: string;       // Error constructor name or category
    message: string;     // Safe, user-visible error message
    retryable: boolean;  // Whether the caller should retry
  };

  /** Metadata for observability (not passed to model) */
  meta?: {
    durationMs: number;
    invocationId: string;
    policyDecision: "allowed" | "denied" | "requires_approval";
  };
}
```

## Policy and Approval Sequence

All tools go through a single policy evaluation path:

```
evaluateUnifiedToolPolicy(admin, {
  tenantId, customerId, toolKey, actorRole, source, riskLevel, capabilities
}) → "allowed" | "denied" | "requires_approval"
```

Policy evaluation checks, in order:

1. **Global kill switches** — `tool_execution_paused`, `memory_writes_paused`
2. **Tool registration** — Tool must exist in `tenant_tools` and be `enabled`
3. **Agent config overrides** — `tool_approval_overrides` (disabled/auto/confirm)
4. **Role-based access** — Actor role must be in `tenant_tool_policies.allow_roles`
5. **Trust policy** — Extension/Composio trust rules (source type + verification)
6. **Approval requirement** — Risk level + approval mode → requires_approval or allowed
7. **Rate limiting** — `max_calls_per_hour` from tool policy

Key change from current state: steps 3-4 currently happen in different places (registry vs runtime policy). They MUST converge into this single sequence.

### Approval posture defaults by risk level

| Risk Level | Default Approval | Override Allowed |
|------------|-----------------|------------------|
| low | auto (no approval) | Yes — can require approval |
| medium | auto (no approval) | Yes — can require approval |
| high | requires approval for L1/L2 autonomy | Yes — can auto-approve |
| critical | always requires approval | No override permitted |

### Tool risk level assignments

| Tool | Default Risk Level | Rationale |
|------|-------------------|-----------|
| `memory_read`, `memory_search` | low | Read-only |
| `schedule_list`, `config_view_my_config`, `config_list_agents` | low | Read-only |
| `memory_write` | medium | Writes state but bounded |
| `schedule_create`, `schedule_toggle` | medium | Creates automated behavior |
| `config_set_my_goal`, `config_set_my_role`, `config_set_my_backstory` | medium | Agent identity changes |
| `http_request`, `web_fetch` | medium | Network access |
| `use_credential` | medium | Accesses secrets (opaque handle) |
| `schedule_delete` | high | Destructive |
| `config_set_my_autonomy`, `config_set_my_delegation` | high | Changes agent capabilities |
| `config_create_agent`, `config_archive_agent` | high | Creates/destroys agents |
| `config_update_team_profile` | high | Team-wide impact |
| `reveal_secret` | critical | Exposes raw secret values |
| `config_undo_last_change` | high | Reverses prior changes |
| `web_search` | low | Read-only external |
| Browser actions (submit, purchase, delete) | critical | Irreversible external side effects |
| Browser actions (navigate, read) | high | External interaction |

## Invocation Record Schema

Every tool call produces a durable record in `tenant_tool_invocations`:

```typescript
interface UnifiedToolInvocationRecord {
  id: string;                    // UUID
  tenant_id: string;
  customer_id: string;
  run_id: string | null;         // Parent runtime run
  parent_invocation_id: string | null;  // For delegation: links child tool calls to parent
  tool_key: string;
  tool_source: ToolSource;       // native, composio, mcp, extension, browser
  agent_id: string | null;
  actor_role: TenantRole;
  actor_id: string | null;

  // Policy
  policy_decision: "allowed" | "denied" | "requires_approval";
  denial_reason: string | null;

  // Execution
  status: "pending" | "approved" | "rejected" | "completed" | "failed";
  request_payload: Record<string, unknown>;   // Truncated input args
  result_payload: Record<string, unknown>;    // Truncated output
  error_message: string | null;
  error_class: string | null;

  // Timing
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;

  // Approval
  approval_id: string | null;
  continuation_token: string | null;

  created_at: string;
}
```

This replaces the current fragmented audit trail across `tenant_tool_invocations`, `tenant_config_changelog`, `tenant_secret_audit_log`, and `telemetry_events`.

## Trace Model for Delegated Runs

When an agent delegates a task to another agent:

```
Parent Run (run_id: A)
├── Tool Call: delegate_task (invocation_id: X)
│   └── Child Run (run_id: B, parent_run_id: A, parent_invocation_id: X)
│       ├── Tool Call: memory_search (invocation_id: Y)
│       └── Tool Call: web_search (invocation_id: Z)
└── Tool Call: memory_write (invocation_id: W)
```

Key fields on `tenant_runtime_runs`:
- `parent_run_id: string | null` — Links child run to parent
- `parent_invocation_id: string | null` — Links child run to the specific `delegate_task` invocation
- `depth: number` — 0 for top-level, 1 for first delegation, etc. Hard max: 3.

Key fields on `tenant_tool_invocations`:
- `parent_invocation_id: string | null` — For tools called within a delegated run, links back to the delegation invocation

This enables:
- Querying all tool calls in a delegation tree
- Calculating total cost/tokens across parent + children
- Detecting delegation loops (same agent pair at increasing depth)

## Shared Executor Interface

The shared executor replaces both the current LLM-path direct execution and the runtime `executeTool()` dispatch:

```typescript
async function executeToolUnified(
  admin: SupabaseClient,
  input: {
    run: TenantRuntimeRun;
    toolKey: string;
    args: Record<string, unknown>;
    actorRole: TenantRole;
    actorId: string | null;
    agentId: string | null;
    /** For LLM-path tools: the actual implementation function */
    executeFn: (args: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<ToolResult>;
  }
): Promise<ToolResult>
```

This function:
1. Evaluates unified policy
2. If denied: records invocation as rejected, returns error result
3. If requires_approval: records invocation as pending, enqueues approval, returns pending result
4. If allowed: executes within circuit breaker, records invocation, returns result
5. Always: records telemetry

### Integration with AI SDK `generateText()`

The AI SDK's `tool()` function accepts an `execute` callback. The unified executor wraps this:

```typescript
// In registry.ts, after resolving all tools:
for (const [name, t] of Object.entries(tools)) {
  const originalExecute = t.execute;
  t.execute = async (args) => {
    const result = await executeToolUnified(admin, {
      run, toolKey: name, args, actorRole, actorId, agentId,
      executeFn: originalExecute,
    });
    if (!result.success) {
      return { error: result.error?.message ?? "Tool execution failed" };
    }
    return result.output;
  };
}
```

## Migration Path

### Phase 1 implementation order:

1. **Create `CanonicalToolDescriptor` type and `ToolResult` type** in a new shared module.
2. **Create `executeToolUnified()`** that implements the full lifecycle (policy → approve → execute → record → telemetry).
3. **Migrate Composio wrapper** to use `executeToolUnified()` instead of `executeTenantExternalToolInvocation()`.
4. **Register all native tools** (memory, schedules, self-config) in `tenant_tools` table with appropriate risk levels and policies.
5. **Wrap all tools** in the registry to route through `executeToolUnified()`.
6. **Verify** both Discord and email workers produce unified invocation records.
7. **Remove** legacy `executeTenantExternalToolInvocation()` and `executeTenantToolInvocation()` once all paths converge.

### Backward compatibility:

- The `tenant_config_changelog` continues to be written by self-config tools (it serves a different purpose: undo support). But the primary audit trail moves to `tenant_tool_invocations`.
- The `tenant_secret_audit_log` continues for credential-specific audit needs. But invocation records also land in `tenant_tool_invocations`.
- Existing `tenant_tool_policies` and `tenant_tools` tables are reused — the schema is already compatible.

## Consequences

### Positive
- Every tool call is auditable, policy-controlled, and observable through a single system.
- New tool types (MCP, browser, web research) automatically get governance by registering as `CanonicalToolDescriptor`.
- Operators see a unified tool history regardless of how the tool was triggered.
- Delegation trace trees are inspectable end-to-end.

### Negative
- Adds latency to every LLM-path tool call (policy evaluation + invocation record write). Mitigated by:
  - Batching invocation record writes (flush at end of run, not per-call)
  - Caching policy decisions within a run (policy unlikely to change mid-conversation)
- Migration risk: wrapping existing tool `execute` functions may surface hidden assumptions. Mitigated by Phase 0 telemetry providing baseline behavior data.

### Neutral
- The three legacy policy systems (prompt-based, config overrides, runtime policy) converge into one. The prompt-based system becomes informational only (tells the model what to expect), while the runtime system is authoritative.
