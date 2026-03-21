import type { Tool } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRole, TenantRuntimeRun } from "@/types/tenant-runtime";
import { NATIVE_TOOL_CATALOG } from "./tool-catalog.ts";
import { toMcpToolKey } from "./mcp-tool-keys.ts";
import { enqueueTenantApproval } from "./tenant-approvals.ts";
import {
  createGuardrailMonitor,
  type GuardrailConfig,
  type GuardrailMonitor,
  type GuardrailEvent,
} from "./guardrails.ts";
import type {
  GuardrailPipeline,
  GuardrailHookContext,
} from "./guardrail-middleware.ts";

// ---------------------------------------------------------------------------
// Config & Record types
// ---------------------------------------------------------------------------

/**
 * Result of a direct (operator-triggered) tool execution through the unified executor.
 * Used by the operator/runtime path for one-shot tool invocations.
 */
export interface DirectExecutionResult {
  outcome: "completed" | "failed" | "denied" | "requires_approval" | "guardrail_halt";
  result: Record<string, unknown>;
  errorMessage?: string;
  policyDecision: string;
  policyReason: string;
  toolId: string | null;
  requiredRole?: TenantRole;
}

export interface DirectExecutionOptions {
  /**
   * When false, approval-required direct executions return without flushing
   * invocation rows. The caller can create a single pending invocation tied
   * to its own continuation token, then flush telemetry separately.
   *
   * Default: true
   */
  persistApprovalInvocation?: boolean;
}

export interface UnifiedToolFlushOptions {
  /**
   * Skip writing `tenant_tool_invocations` while still flushing telemetry and
   * guardrail events. Useful when a caller needs to persist a customized
   * invocation row itself.
   */
  skipInvocationRecords?: boolean;
}

export interface UnifiedToolExecutorConfig {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agentId: string | null;
  run: TenantRuntimeRun | null;
  actorRole: TenantRole;
  actorId: string | null;
  workerKind: "discord_runtime" | "email_runtime";
  /**
   * When true, policy decisions are enforced: denied tools return an error
   * to the model instead of executing, and requires_approval tools return
   * a message explaining that approval is needed.
   *
   * When false (shadow mode), policy is evaluated and recorded but the
   * original execute always runs regardless of the decision.
   *
   * Default: true
   */
  enforcePolicy?: boolean;
  /**
   * The agent's autonomy level. When provided, high-impact tools may be
   * upgraded to "requires_approval" for assisted (L1) or copilot (L2) agents
   * even if tenant-level policy allows them.
   */
  agentAutonomyLevel?: "assisted" | "copilot" | "autopilot";
  /**
   * Optional guardrail configuration. When provided, loop detection and
   * run budgets are enforced. Pass `null` to disable guardrails entirely.
   * When omitted, sensible defaults are used.
   */
  guardrailConfig?: GuardrailConfig | null;
  /**
   * Phase 6: Optional middleware pipeline for advanced guardrail hooks
   * (injection scanning, rate limits, escalation). When omitted, no
   * middleware hooks run (core guardrails still apply).
   */
  middlewarePipeline?: GuardrailPipeline | null;
  /**
   * Timeout in milliseconds for individual tool executions.
   * When a tool exceeds this duration, it returns a soft error
   * so the AI model can recover gracefully.
   * Default: 30000 (30 seconds)
   */
  toolTimeoutMs?: number;
  /**
   * Tool keys that have been pre-approved via the tenant approval queue.
   * When a tool key is in this set, the executor skips the approval gate
   * (both policy-level and autonomy-level) so the tool executes immediately.
   * Used when resuming a run after an approval decision.
   */
  preApprovedToolKeys?: Set<string>;
}

/**
 * Per-invocation record accumulated in memory during a run.
 * Compatible with both the trace recorder and telemetry flush.
 */
export interface UnifiedInvocationRecord {
  /** Tool key as seen by the model */
  toolName: string;
  startedAt: number;
  durationMs: number;
  success: boolean;
  errorClass: string | null;
  /** Truncated JSON of tool args (max 500 chars) */
  inputSummary: string;
  /** Truncated JSON of tool result (max 500 chars) */
  outputSummary: string;
  /** Policy evaluation result — "skipped" for tools with their own governance */
  policyDecision: "allowed" | "denied" | "requires_approval" | "skipped";
  policyReason: string;
  /** tenant_tools.id if the tool was found in the policy system */
  toolId: string | null;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const SUMMARY_MAX_LEN = 500;

function truncateString(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return value.slice(0, Math.max(0, maxLen - 1)).trimEnd() + "…";
}

function summarizeJsonValue(
  value: unknown,
  options: { maxStringLen: number; maxArrayItems: number; maxObjectEntries: number; maxDepth: number }
): unknown {
  if (options.maxDepth <= 0) {
    if (typeof value === "string") return truncateString(value, options.maxStringLen);
    if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (value && typeof value === "object") return "[object]";
    return value ?? null;
  }

  if (typeof value === "string") {
    return truncateString(value, options.maxStringLen);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, options.maxArrayItems)
      .map((item) =>
        summarizeJsonValue(item, { ...options, maxDepth: options.maxDepth - 1 })
      );
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, options.maxObjectEntries)
        .map(([key, entryValue]) => [
          key,
          summarizeJsonValue(entryValue, { ...options, maxDepth: options.maxDepth - 1 }),
        ])
    );
  }

  return value ?? null;
}

function summarizeIntegrationApiCallResult(value: unknown, maxLen: number): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const result = value as Record<string, unknown>;
  if (typeof result.status !== "number") return null;

  const baseSummary: Record<string, unknown> = {
    status: result.status,
    status_text: result.status_text,
    integration: result.integration,
    rate_limit_warning: result.rate_limit_warning,
  };

  const body = result.body;
  const bodyVariants: unknown[] = [];

  if (typeof body === "string" && body.trim().length > 0) {
    try {
      const parsed = JSON.parse(body);
      bodyVariants.push(
        summarizeJsonValue(parsed, {
          maxStringLen: 120,
          maxArrayItems: 12,
          maxObjectEntries: 20,
          maxDepth: 4,
        })
      );
      bodyVariants.push(
        summarizeJsonValue(parsed, {
          maxStringLen: 60,
          maxArrayItems: 6,
          maxObjectEntries: 10,
          maxDepth: 3,
        })
      );
    } catch {
      bodyVariants.push(truncateString(body, 220));
      bodyVariants.push(truncateString(body, 120));
    }
  } else if (body !== undefined) {
    bodyVariants.push(
      summarizeJsonValue(body, {
        maxStringLen: 120,
        maxArrayItems: 12,
        maxObjectEntries: 20,
        maxDepth: 4,
      })
    );
    bodyVariants.push(
      summarizeJsonValue(body, {
        maxStringLen: 60,
        maxArrayItems: 6,
        maxObjectEntries: 10,
        maxDepth: 3,
      })
    );
  }

  for (const bodyVariant of [...bodyVariants, undefined]) {
    const candidate =
      bodyVariant === undefined
        ? baseSummary
        : { ...baseSummary, body: bodyVariant };
    const json = JSON.stringify(candidate);
    if (json.length <= maxLen) {
      return json;
    }
  }

  return JSON.stringify(baseSummary);
}

function truncateJson(value: unknown, maxLen: number): string {
  const specializedSummary = summarizeIntegrationApiCallResult(value, maxLen);
  if (specializedSummary) {
    return specializedSummary;
  }

  try {
    const json = JSON.stringify(value ?? {});
    return json.length > maxLen ? json.slice(0, maxLen) : json;
  } catch {
    return "{}";
  }
}

interface CachedPolicy {
  decision: "allowed" | "denied" | "requires_approval";
  reason: string;
  toolId: string | null;
  requiredRole?: TenantRole;
}

// ---------------------------------------------------------------------------
// User-facing denial & remediation messages
// ---------------------------------------------------------------------------

const DENIAL_REASONS: Record<string, { message: string; remediation: string }> = {
  tool_execution_paused: {
    message: "All tool execution is currently paused for this workspace.",
    remediation: "An admin needs to resume tool execution in workspace settings.",
  },
  memory_writes_paused: {
    message: "Memory write operations are currently paused for this workspace.",
    remediation: "An admin needs to resume memory writes in workspace settings.",
  },
  tool_not_registered: {
    message: "This tool is not registered for this workspace.",
    remediation: "An admin needs to enable this tool in the workspace tool catalog.",
  },
  tool_disabled: {
    message: "This tool is currently disabled.",
    remediation: "An admin needs to re-enable this tool in workspace settings.",
  },
  actor_role_not_allowed: {
    message: "Your current role does not have permission to use this tool.",
    remediation: "Ask a workspace admin to grant access for your role.",
  },
  trust_policy_blocked: {
    message: "This tool is blocked by the workspace trust policy.",
    remediation: "A workspace admin needs to update the trust policy to allow this tool's source.",
  },
};

function buildDenialResult(
  toolKey: string,
  reason: string
): Record<string, unknown> {
  const info = DENIAL_REASONS[reason] ?? {
    message: `Tool "${toolKey}" was denied by workspace policy.`,
    remediation: "Contact a workspace admin for help.",
  };
  return {
    error: "policy_denied",
    tool: toolKey,
    reason,
    message: info.message,
    remediation: info.remediation,
  };
}

function buildApprovalRequiredResult(
  toolKey: string,
  reason: string,
  requiredRole?: string
): Record<string, unknown> {
  const roleLabel = requiredRole ?? "an admin";
  return {
    error: "approval_required",
    tool: toolKey,
    reason,
    message: `This action requires approval from ${roleLabel} before it can proceed.`,
    remediation: `Ask ${roleLabel} to approve this action. The request has been recorded.`,
  };
}

async function enqueueAiPathApprovalIfNeeded(
  config: UnifiedToolExecutorConfig,
  toolKey: string,
  toolId: string | null,
  args: Record<string, unknown>,
  reason: string,
  requiredRole: TenantRole
): Promise<string | null> {
  if (!config.run) {
    return null;
  }

  try {
    const { approvalId } = await enqueueTenantApproval(config.admin, {
      tenantId: config.tenantId,
      customerId: config.customerId,
      approvalType: "tool",
      requiredRole,
      toolId,
      requestHashPayload: {
        kind: "ai_tool_approval",
        tenant_id: config.tenantId,
        run_id: config.run.id,
        tool_key: toolKey,
        args,
        policy_reason: reason,
        worker_kind: config.workerKind,
      },
      requestPayload: {
        kind: "ai_tool_approval",
        tenant_id: config.tenantId,
        customer_id: config.customerId,
        run_id: config.run.id,
        agent_id: config.agentId,
        actor_role: config.actorRole,
        actor_id: config.actorId,
        worker_kind: config.workerKind,
        tool_key: toolKey,
        args,
        policy_reason: reason,
      },
    });

    return approvalId;
  } catch (error) {
    console.error(
      "[unified-executor] Failed to enqueue AI-path approval:",
      error instanceof Error ? error.message : "unknown"
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Autonomy-level gating
// ---------------------------------------------------------------------------

/**
 * Tools that require approval when the agent's autonomy level is L1 (assisted)
 * or L2 (copilot). These are high-impact self-config and schedule mutations
 * that should not fire autonomously without human review.
 */
const AUTONOMY_GATED_TOOLS: Record<string, "assisted" | "copilot"> = {
  // High-impact self-config: require approval for L1 and L2
  config_create_agent: "copilot",
  config_archive_agent: "copilot",
  config_set_my_autonomy: "copilot",
  config_update_team_profile: "copilot",
  config_set_my_delegation: "copilot",
  config_undo_last_change: "copilot",
  // Schedule mutations: require approval for L1 only
  schedule_create: "assisted",
  schedule_delete: "assisted",
  // Delegation: require approval for L1 only (copilot/autopilot can delegate freely)
  delegate_task: "assisted",
  // Integrations: credential storage requires approval for L1+L2
  integration_store_credential: "copilot",
  integration_register: "assisted",
  // Browser: click/fill require approval for L1+L2, navigate for L1 only
  browser_click: "copilot",
  browser_fill: "copilot",
  browser_navigate: "assisted",
};

const AUTONOMY_PRECEDENCE: Record<string, number> = {
  assisted: 1,
  copilot: 2,
  autopilot: 3,
};

/**
 * Check if a tool should be gated by the agent's autonomy level.
 * Returns the gate reason if the tool should require approval, or null.
 */
function checkAutonomyGate(
  toolKey: string,
  autonomyLevel?: string
): string | null {
  if (!autonomyLevel) return null;
  const maxLevel = AUTONOMY_GATED_TOOLS[toolKey];
  if (!maxLevel) return null;
  const agentLevel = AUTONOMY_PRECEDENCE[autonomyLevel] ?? 3;
  const gateLevel = AUTONOMY_PRECEDENCE[maxLevel] ?? 0;
  if (agentLevel <= gateLevel) {
    return "autonomy_level_gate";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a unified tool executor that wraps AI SDK tools to:
 *
 * 1. Evaluate tenant tool policy (enforced by default; shadow mode opt-in)
 * 2. Capture per-invocation timing, success/failure, and input/output summaries
 * 3. Persist invocation records + telemetry in batch at end of run
 *
 * When `enforcePolicy` is true (default), denied tools return a structured
 * error to the model and tools requiring approval return a message explaining
 * the approval process. When false (shadow mode), policy is recorded but the
 * original execute always runs.
 *
 * Replaces the standalone `createToolTelemetryCollector()` from Phase 0.
 */
/**
 * Map from model-facing MCP tool names to their tenant_tools policy keys.
 * Model sees: `mcp_serverkey_toolname`
 * Policy uses: `mcp.serverkey.toolname`
 */
const mcpToolKeyMap = new Map<string, string>();

/**
 * Map from model-facing Composio tool names to their tenant_tools policy keys.
 * Model sees: `GITHUB_CREATE_ISSUE`
 * Policy uses: `composio.github_create_issue`
 */
const composioToolKeyMap = new Map<string, string>();

/**
 * Register MCP tool key mappings so the unified executor can resolve
 * model-facing names to policy keys. Called from the AI worker after
 * MCP tools are hydrated.
 */
export function registerMcpToolKeyMappings(mappings: Map<string, string>): void {
  for (const [modelName, policyKey] of mappings) {
    mcpToolKeyMap.set(modelName, policyKey);
  }
}

/**
 * Register Composio tool key mappings so the unified executor can resolve
 * model-facing names to policy keys. Called from the AI worker after
 * Composio tools are hydrated.
 */
export function registerComposioToolKeyMappings(mappings: Map<string, string>): void {
  for (const [modelName, policyKey] of mappings) {
    composioToolKeyMap.set(modelName, policyKey);
  }
}

/**
 * Resolve the policy tool key for a given model-facing tool name.
 * For MCP tools, maps `mcp_serverkey_toolname` → `mcp.serverkey.toolname`.
 * For Composio tools, maps `GITHUB_CREATE_ISSUE` → `composio.github_create_issue`.
 * For all other tools, returns the key unchanged.
 */
function resolvePolicyToolKey(toolKey: string): string {
  // Check explicit MCP mapping first
  const mcpMapped = mcpToolKeyMap.get(toolKey);
  if (mcpMapped) return mcpMapped;

  // Check explicit Composio mapping
  const composioMapped = composioToolKeyMap.get(toolKey);
  if (composioMapped) return composioMapped;

  // Heuristic: if the key starts with `mcp_`, try to derive the policy key
  if (toolKey.startsWith("mcp_")) {
    // mcp_serverkey_toolname → mcp.serverkey.toolname
    const rest = toolKey.slice(4); // remove "mcp_"
    const underscoreIndex = rest.indexOf("_");
    if (underscoreIndex > 0) {
      const serverKey = rest.slice(0, underscoreIndex);
      const toolName = rest.slice(underscoreIndex + 1);
      return toMcpToolKey(serverKey, toolName);
    }
  }

  return toolKey;
}

export function createUnifiedToolExecutor(config: UnifiedToolExecutorConfig) {
  const records: UnifiedInvocationRecord[] = [];
  const policyCache = new Map<string, CachedPolicy>();
  const enforce = config.enforcePolicy !== false;
  const guardrails: GuardrailMonitor | null =
    config.guardrailConfig === null
      ? null
      : createGuardrailMonitor(config.guardrailConfig);
  const middleware: GuardrailPipeline | null =
    config.middlewarePipeline ?? null;
  const flushRecords = createFlushFn(records, config, enforce, guardrails);

  // Phase 6: Middleware state tracking (shared across all invocations in a run)
  const middlewareToolCounts = new Map<string, number>();
  const middlewareToolTimestamps = new Map<string, number[]>();
  /** Tools disabled mid-run via downgrade_capability verdicts */
  const disabledTools = new Set<string>();

  function buildMiddlewareContext(
    toolName: string,
    args: unknown,
    result?: unknown
  ): GuardrailHookContext {
    return {
      toolName,
      args,
      result,
      totalInvocations: records.length,
      toolInvocationCounts: middlewareToolCounts,
      toolTimestamps: middlewareToolTimestamps,
    };
  }

  /**
   * Evaluate policy for a tool key. Caches within the run.
   * Evaluates for native tools and MCP tools. Composio tools still use their
   * own governance path (will be migrated in a future phase).
   */
  async function evaluatePolicy(toolKey: string): Promise<{
    decision: UnifiedInvocationRecord["policyDecision"];
    reason: string;
    toolId: string | null;
    requiredRole?: TenantRole;
  }> {
    // MCP tools use a model-facing name like `mcp_serverkey_toolname` but are
    // registered in tenant_tools as `mcp.serverkey.toolname`. Resolve the
    // policy key so they go through the standard policy pipeline.
    const policyToolKey = resolvePolicyToolKey(toolKey);

    // Skip policy for tools not in the native catalog and not MCP/Composio.
    if (!NATIVE_TOOL_CATALOG.has(policyToolKey) && !policyToolKey.startsWith("mcp.") && !policyToolKey.startsWith("composio.")) {
      return { decision: "skipped", reason: "external_governance", toolId: null };
    }

    // No run context → can't evaluate policy
    if (!config.run) {
      return { decision: "skipped", reason: "no_run_context", toolId: null };
    }

    // Return cached result
    const cached = policyCache.get(toolKey);
    if (cached) {
      return cached;
    }

    try {
      // Dynamic import to avoid pulling in transitive deps (path aliases) in test environments
      const { evaluateTenantToolPolicy } = await import("./tenant-runtime-policy.ts");
      const policy = await evaluateTenantToolPolicy(config.admin, {
        tenantId: config.tenantId,
        customerId: config.customerId,
        toolKey: policyToolKey,
        actorRole: config.actorRole,
      });

      const result: CachedPolicy = {
        decision: policy.decision,
        reason: policy.reason,
        toolId: policy.toolId,
        requiredRole: policy.requiredRole,
      };
      policyCache.set(toolKey, result);
      return result;
    } catch (err) {
      console.warn(
        `[unified-executor] Policy evaluation failed for "${toolKey}":`,
        err instanceof Error ? err.message : "unknown"
      );
      return { decision: "skipped", reason: "policy_evaluation_error", toolId: null };
    }
  }

  return {
    /** All captured invocation records (for trace enrichment). */
    get records(): ReadonlyArray<UnifiedInvocationRecord> {
      return records;
    },

    /** The guardrail monitor for this run (null if guardrails are disabled). */
    get guardrails(): GuardrailMonitor | null {
      return guardrails;
    },

    /**
     * Wrap a single AI SDK tool to route through the unified executor.
     *
     * In enforcement mode (default): denied tools return an error to the model
     * without executing, and tools requiring approval return a message explaining
     * the approval process. In shadow mode: policy is recorded but the original
     * execute always runs.
     */
    wrapTool(name: string, t: Tool): Tool {
      const original = t as Tool & { execute?: (...args: unknown[]) => Promise<unknown> };
      if (typeof original.execute !== "function") {
        return t;
      }

      const originalExecute = original.execute.bind(original);

      return {
        ...t,
        execute: async (...executeArgs: unknown[]) => {
          const start = Date.now();
          const args = (executeArgs[0] ?? {}) as Record<string, unknown>;

          // ----- Check if tool was disabled mid-run by downgrade_capability -----
          if (disabledTools.has(name)) {
            const disabledResult = {
              error: "tool_disabled_by_guardrail",
              tool: name,
              message: `Tool "${name}" has been disabled for the remainder of this run by a guardrail downgrade.`,
            };
            const durationMs = Date.now() - start;
            records.push({
              toolName: name,
              startedAt: start,
              durationMs,
              success: false,
              errorClass: "middleware_downgrade",
              inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
              outputSummary: truncateJson(disabledResult, SUMMARY_MAX_LEN),
              policyDecision: "denied",
              policyReason: "downgrade_capability",
              toolId: null,
            });
            return disabledResult;
          }

          const policy = await evaluatePolicy(name);

          // ----- Enforcement mode: block denied / approval-required tools -----
          if (enforce && policy.decision === "denied") {
            const denialResult = buildDenialResult(name, policy.reason);
            const durationMs = Date.now() - start;
            records.push({
              toolName: name,
              startedAt: start,
              durationMs,
              success: false,
              errorClass: "policy_denied",
              inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
              outputSummary: truncateJson(denialResult, SUMMARY_MAX_LEN),
              policyDecision: "denied",
              policyReason: policy.reason,
              toolId: policy.toolId,
            });
            return denialResult;
          }

          if (enforce && policy.decision === "requires_approval" && !config.preApprovedToolKeys?.has(name)) {
            const approvalId = await enqueueAiPathApprovalIfNeeded(
              config,
              name,
              policy.toolId,
              args,
              policy.reason,
              policy.requiredRole ?? "admin"
            );
            const approvalResult = {
              ...buildApprovalRequiredResult(
              name,
              policy.reason,
              policy.requiredRole
              ),
              ...(approvalId ? { approval_id: approvalId } : {}),
            };
            const durationMs = Date.now() - start;
            records.push({
              toolName: name,
              startedAt: start,
              durationMs,
              success: false,
              errorClass: "approval_required",
              inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
              outputSummary: truncateJson(approvalResult, SUMMARY_MAX_LEN),
              policyDecision: "requires_approval",
              policyReason: policy.reason,
              toolId: policy.toolId,
            });
            return approvalResult;
          }

          // ----- Autonomy-level gating (applies even when policy says "allowed") -----
          const autonomyGateReason = checkAutonomyGate(name, config.agentAutonomyLevel);
          if (enforce && autonomyGateReason && policy.decision !== "denied" && !config.preApprovedToolKeys?.has(name)) {
            const approvalId = await enqueueAiPathApprovalIfNeeded(
              config,
              name,
              policy.toolId,
              args,
              autonomyGateReason,
              "admin"
            );
            const approvalResult = {
              ...buildApprovalRequiredResult(
              name,
              autonomyGateReason,
              "an admin"
              ),
              ...(approvalId ? { approval_id: approvalId } : {}),
            };
            const durationMs = Date.now() - start;
            records.push({
              toolName: name,
              startedAt: start,
              durationMs,
              success: false,
              errorClass: "approval_required",
              inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
              outputSummary: truncateJson(approvalResult, SUMMARY_MAX_LEN),
              policyDecision: "requires_approval",
              policyReason: autonomyGateReason,
              toolId: policy.toolId,
            });
            return approvalResult;
          }

          // ----- Guardrail pre-check (loop detection + budgets) -----
          if (guardrails) {
            const guardCheck = guardrails.checkBeforeInvocation(name, args);
            if (!guardCheck.allowed) {
              const haltResult = {
                error: "guardrail_halt",
                tool: name,
                kind: guardCheck.event?.kind ?? "unknown",
                message: guardCheck.event?.message ?? "Run halted by guardrail.",
              };
              const durationMs = Date.now() - start;
              records.push({
                toolName: name,
                startedAt: start,
                durationMs,
                success: false,
                errorClass: "guardrail_halt",
                inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
                outputSummary: truncateJson(haltResult, SUMMARY_MAX_LEN),
                policyDecision: policy.decision,
                policyReason: guardCheck.event?.kind ?? "guardrail",
                toolId: policy.toolId,
              });
              return haltResult;
            }
          }

          // ----- Phase 6: Middleware pre-check (rate limits, etc.) -----
          if (middleware) {
            const mwCtx = buildMiddlewareContext(name, args);
            const mwResult = middleware.runBefore(mwCtx);
            if (!mwResult.allowed && mwResult.verdict) {
              if (
                mwResult.verdict.action === "downgrade_capability" &&
                mwResult.verdict.downgradeTools?.length
              ) {
                // Strip tools for future calls but allow this specific call to proceed
                for (const tool of mwResult.verdict.downgradeTools) {
                  disabledTools.add(tool);
                }
                // Record as a warning event for observability
                if (guardrails) {
                  guardrails.pushExternalEvent({
                    kind: "loop_warning",
                    toolName: name,
                    threshold: 0,
                    actual: 0,
                    action: "warn",
                    message: `[middleware:downgrade] ${mwResult.verdict.message}`,
                    timestamp: Date.now(),
                  });
                }
              } else {
                const haltResult = {
                  error: mwResult.verdict.action === "escalate_approval"
                    ? "approval_required"
                    : "guardrail_halt",
                  tool: name,
                  kind: mwResult.verdict.eventKind,
                  message: mwResult.verdict.message,
                };
                const durationMs = Date.now() - start;
                records.push({
                  toolName: name,
                  startedAt: start,
                  durationMs,
                  success: false,
                  errorClass: mwResult.verdict.action === "escalate_approval"
                    ? "middleware_escalation"
                    : "middleware_halt",
                  inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
                  outputSummary: truncateJson(haltResult, SUMMARY_MAX_LEN),
                  policyDecision: policy.decision,
                  policyReason: String(mwResult.verdict.eventKind),
                  toolId: policy.toolId,
                });
                return haltResult;
              }
            }
          }

          // Track tool invocation count for middleware rate limits
          middlewareToolCounts.set(
            name,
            (middlewareToolCounts.get(name) ?? 0) + 1
          );

          // ----- Shadow mode: log but don't enforce -----
          if (!enforce) {
            if (policy.decision === "denied") {
              console.warn(
                `[unified-executor] Shadow deny: "${name}" would be blocked (${policy.reason})`
              );
            } else if (policy.decision === "requires_approval") {
              console.warn(
                `[unified-executor] Shadow approval: "${name}" would require approval (${policy.reason})`
              );
            }
            if (autonomyGateReason) {
              console.warn(
                `[unified-executor] Shadow autonomy gate: "${name}" would require approval for ${config.agentAutonomyLevel} agent`
              );
            }
          }

          // ----- Execute the tool -----
          let result: unknown;
          let success = true;
          let errorClass: string | null = null;
          const toolTimeoutMs = config.toolTimeoutMs ?? 30_000;

          try {
            const timeoutPromise = new Promise<never>((_, reject) => {
              const timer = setTimeout(
                () => reject(new Error(`Tool "${name}" timed out after ${toolTimeoutMs / 1000}s`)),
                toolTimeoutMs
              );
              if (typeof timer === "object" && "unref" in timer) timer.unref();
            });
            result = await Promise.race([originalExecute(...executeArgs), timeoutPromise]);

            // Detect soft errors (tools returning { error: "..." })
            if (
              result &&
              typeof result === "object" &&
              "error" in result &&
              typeof (result as Record<string, unknown>).error === "string"
            ) {
              success = false;
              errorClass = String((result as Record<string, unknown>).error);
            }

            if (
              guardrails &&
              result &&
              typeof result === "object" &&
              typeof (result as Record<string, unknown>).action_cost_cents === "number"
            ) {
              const browserCostEvent = guardrails.recordTokenUsage(
                0,
                0,
                Number((result as Record<string, unknown>).action_cost_cents)
              );
              if (browserCostEvent?.action === "halt") {
                const durationMs = Date.now() - start;
                records.push({
                  toolName: name,
                  startedAt: start,
                  durationMs,
                  success: true,
                  errorClass: "guardrail_halt_after",
                  inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
                  outputSummary: truncateJson(result, SUMMARY_MAX_LEN),
                  policyDecision: policy.decision,
                  policyReason: browserCostEvent.kind,
                  toolId: policy.toolId,
                });
                return {
                  error: "guardrail_halt",
                  tool: name,
                  kind: browserCostEvent.kind,
                  message: browserCostEvent.message,
                  original_result: result,
                };
              }
            }

            // ----- Guardrail post-check (no-progress detection) -----
            if (guardrails) {
              const postCheck = guardrails.checkAfterInvocation(name, args, result);
              if (!postCheck.allowed) {
                // Record the successful execution but flag that the run should halt
                const durationMs = Date.now() - start;
                records.push({
                  toolName: name,
                  startedAt: start,
                  durationMs,
                  success: true,
                  errorClass: "guardrail_halt_after",
                  inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
                  outputSummary: truncateJson(result, SUMMARY_MAX_LEN),
                  policyDecision: policy.decision,
                  policyReason: postCheck.event?.kind ?? "guardrail",
                  toolId: policy.toolId,
                });
                // Return a halt message to the model instead of the real result
                return {
                  error: "guardrail_halt",
                  tool: name,
                  kind: postCheck.event?.kind ?? "unknown",
                  message: postCheck.event?.message ?? "Run halted by guardrail after execution.",
                  original_result: result,
                };
              }
            }

            // ----- Phase 6: Middleware post-check (injection scanning, etc.) -----
            if (middleware) {
              const mwCtx = buildMiddlewareContext(name, args, result);
              const mwResult = middleware.runAfter(mwCtx);
              // Post-execution middleware warnings are logged but don't halt
              // (the tool already executed; halting would lose the result).
              // They are recorded as guardrail events for observability.
              for (const warning of mwResult.warnings) {
                if (guardrails) {
                  guardrails.pushExternalEvent({
                    kind: "loop_warning",
                    toolName: name,
                    threshold: 0,
                    actual: 0,
                    action: "warn",
                    message: `[middleware:${warning.eventKind}] ${warning.message}`,
                    timestamp: Date.now(),
                  });
                }
              }
            }

            return result;
          } catch (err) {
            success = false;
            const isTimeout = err instanceof Error && err.message.includes("timed out after");
            errorClass = isTimeout ? "ToolTimeout" : (err instanceof Error ? err.constructor.name : "UnknownError");
            if (isTimeout) {
              // Return a soft error so the AI model can recover gracefully
              result = { error: "This took too long — I'll try a different approach." };
              return result;
            }
            throw err;
          } finally {
            const durationMs = Date.now() - start;
            records.push({
              toolName: name,
              startedAt: start,
              durationMs,
              success,
              errorClass,
              inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
              outputSummary: result === undefined ? "" : truncateJson(result, SUMMARY_MAX_LEN),
              policyDecision:
                errorClass === "approval_required" ? "requires_approval" : policy.decision,
              policyReason:
                errorClass === "approval_required"
                  ? "tool_reported_approval_required"
                  : policy.reason,
              toolId: policy.toolId,
            });
          }
        },
      } as Tool;
    },

    /**
     * Wrap all tools in a ToolMap.
     */
    wrapAll(tools: Record<string, Tool>): Record<string, Tool> {
      const wrapped: Record<string, Tool> = {};
      for (const [name, t] of Object.entries(tools)) {
        wrapped[name] = this.wrapTool(name, t);
      }
      return wrapped;
    },

    /**
     * Execute a tool directly (not through AI SDK wrapping). Used for
     * operator-triggered one-shot tool invocations (e.g. `/tool` commands).
     *
     * Runs the same policy evaluation, autonomy gating, and guardrail checks
     * as `wrapTool`. Returns a structured result — the caller is responsible
     * for handling approval enqueuing and audit logging.
     *
     * Automatically flushes records after execution.
     */
    async executeDirect(
      toolKey: string,
      args: Record<string, unknown>,
      execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>>,
      options?: DirectExecutionOptions
    ): Promise<DirectExecutionResult> {
      const start = Date.now();
      const policy = await evaluatePolicy(toolKey);

      // ----- Denied -----
      if (enforce && policy.decision === "denied") {
        const durationMs = Date.now() - start;
        records.push({
          toolName: toolKey,
          startedAt: start,
          durationMs,
          success: false,
          errorClass: "policy_denied",
          inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
          outputSummary: truncateJson({ reason: policy.reason }, SUMMARY_MAX_LEN),
          policyDecision: "denied",
          policyReason: policy.reason,
          toolId: policy.toolId,
        });
        await flushRecords();
        return {
          outcome: "denied",
          result: buildDenialResult(toolKey, policy.reason),
          policyDecision: "denied",
          policyReason: policy.reason,
          toolId: policy.toolId,
        };
      }

      // ----- Requires approval -----
      if (enforce && policy.decision === "requires_approval") {
        const durationMs = Date.now() - start;
        records.push({
          toolName: toolKey,
          startedAt: start,
          durationMs,
          success: false,
          errorClass: "approval_required",
          inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
          outputSummary: truncateJson({ reason: policy.reason }, SUMMARY_MAX_LEN),
          policyDecision: "requires_approval",
          policyReason: policy.reason,
          toolId: policy.toolId,
        });
        if (options?.persistApprovalInvocation !== false) {
          await flushRecords();
        }
        return {
          outcome: "requires_approval",
          result: buildApprovalRequiredResult(toolKey, policy.reason, policy.requiredRole),
          policyDecision: "requires_approval",
          policyReason: policy.reason,
          toolId: policy.toolId,
          requiredRole: policy.requiredRole,
        };
      }

      // ----- Autonomy-level gating -----
      const autonomyGateReason = checkAutonomyGate(toolKey, config.agentAutonomyLevel);
      if (enforce && autonomyGateReason) {
        const durationMs = Date.now() - start;
        records.push({
          toolName: toolKey,
          startedAt: start,
          durationMs,
          success: false,
          errorClass: "approval_required",
          inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
          outputSummary: truncateJson({ reason: autonomyGateReason }, SUMMARY_MAX_LEN),
          policyDecision: "requires_approval",
          policyReason: autonomyGateReason,
          toolId: policy.toolId,
        });
        if (options?.persistApprovalInvocation !== false) {
          await flushRecords();
        }
        return {
          outcome: "requires_approval",
          result: buildApprovalRequiredResult(toolKey, autonomyGateReason, "an admin"),
          policyDecision: "requires_approval",
          policyReason: autonomyGateReason,
          toolId: policy.toolId,
          requiredRole: "admin" as TenantRole,
        };
      }

      // ----- Guardrail pre-check -----
      if (guardrails) {
        const guardCheck = guardrails.checkBeforeInvocation(toolKey, args);
        if (!guardCheck.allowed) {
          const durationMs = Date.now() - start;
          records.push({
            toolName: toolKey,
            startedAt: start,
            durationMs,
            success: false,
            errorClass: "guardrail_halt",
            inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
            outputSummary: truncateJson({}, SUMMARY_MAX_LEN),
            policyDecision: policy.decision,
            policyReason: guardCheck.event?.kind ?? "guardrail",
            toolId: policy.toolId,
          });
          await flushRecords();
          return {
            outcome: "guardrail_halt",
            result: {
              error: "guardrail_halt",
              tool: toolKey,
              kind: guardCheck.event?.kind ?? "unknown",
              message: guardCheck.event?.message ?? "Run halted by guardrail.",
            },
            policyDecision: policy.decision,
            policyReason: guardCheck.event?.kind ?? "guardrail",
            toolId: policy.toolId,
          };
        }
      }

      // ----- Execute -----
      try {
        const output = await execute(args);

        // Guardrail post-check
        if (guardrails) {
          const postCheck = guardrails.checkAfterInvocation(toolKey, args, output);
          if (!postCheck.allowed) {
            const durationMs = Date.now() - start;
            records.push({
              toolName: toolKey,
              startedAt: start,
              durationMs,
              success: true,
              errorClass: "guardrail_halt_after",
              inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
              outputSummary: truncateJson(output, SUMMARY_MAX_LEN),
              policyDecision: policy.decision,
              policyReason: postCheck.event?.kind ?? "guardrail",
              toolId: policy.toolId,
            });
            await flushRecords();
            return {
              outcome: "guardrail_halt",
              result: {
                error: "guardrail_halt",
                tool: toolKey,
                kind: postCheck.event?.kind ?? "unknown",
                message: postCheck.event?.message ?? "Run halted by guardrail after execution.",
                tool_output: output,
              },
              policyDecision: policy.decision,
              policyReason: postCheck.event?.kind ?? "guardrail",
              toolId: policy.toolId,
            };
          }
        }

        const durationMs = Date.now() - start;
        records.push({
          toolName: toolKey,
          startedAt: start,
          durationMs,
          success: true,
          errorClass: null,
          inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
          outputSummary: truncateJson(output, SUMMARY_MAX_LEN),
          policyDecision: policy.decision,
          policyReason: policy.reason,
          toolId: policy.toolId,
        });
        await flushRecords();
        return {
          outcome: "completed",
          result: output,
          policyDecision: policy.decision,
          policyReason: policy.reason,
          toolId: policy.toolId,
        };
      } catch (err) {
        const durationMs = Date.now() - start;
        const errorMessage = err instanceof Error ? err.message : "Tool execution failed";
        records.push({
          toolName: toolKey,
          startedAt: start,
          durationMs,
          success: false,
          errorClass: err instanceof Error ? err.constructor.name : "UnknownError",
          inputSummary: truncateJson(args, SUMMARY_MAX_LEN),
          outputSummary: "",
          policyDecision: policy.decision,
          policyReason: policy.reason,
          toolId: policy.toolId,
        });
        await flushRecords();
        return {
          outcome: "failed",
          result: {},
          errorMessage,
          policyDecision: policy.decision,
          policyReason: policy.reason,
          toolId: policy.toolId,
        };
      }
    },

    /**
     * Persist all accumulated records to the database.
     * Writes to both `tenant_tool_invocations` (for native tools with run context)
     * and `telemetry_events` (for all tools, backward compat with Phase 0).
     *
     * Best-effort — errors are logged but not thrown.
     */
    flush: flushRecords,
  };
}

// ---------------------------------------------------------------------------
// Flush implementation (extracted so executeDirect can call it without `this`)
// ---------------------------------------------------------------------------

function createFlushFn(
  records: UnifiedInvocationRecord[],
  config: UnifiedToolExecutorConfig,
  enforce: boolean,
  guardrails: GuardrailMonitor | null
): (options?: UnifiedToolFlushOptions) => Promise<void> {
  return async (options) => {
    if (records.length === 0) return;

    // 1. Flush invocation records for native tools with run context
    if (config.run && options?.skipInvocationRecords !== true) {
      const nativeRecords = records.filter(
        (r) => r.policyDecision !== "skipped" && r.toolId !== null
      );

      if (nativeRecords.length > 0) {
        try {
          const rows = nativeRecords.map((r) => ({
            tenant_id: config.tenantId,
            customer_id: config.customerId,
            run_id: config.run!.id,
            tool_id: r.toolId,
            tool_key: r.toolName,
            policy_decision: r.policyDecision as "allowed" | "denied" | "requires_approval",
            status: resolveInvocationStatus(r),
            request_payload: {
              args: safeParseJson(r.inputSummary),
              actor_role: config.actorRole,
              actor_id: config.actorId,
              worker_kind: config.workerKind,
              ...(enforce ? {} : { shadow_mode: true }),
            },
            result_payload: r.policyDecision === "denied" || r.policyDecision === "requires_approval"
              ? safeParseJson(r.outputSummary)
              : r.success ? safeParseJson(r.outputSummary) : {},
            error_message: r.policyDecision === "denied"
              ? `Tool denied: ${r.policyReason}`
              : r.policyDecision === "requires_approval"
                ? `Tool requires approval: ${r.policyReason}`
                : r.success ? null : (r.errorClass ?? "Tool execution failed"),
            started_at: new Date(r.startedAt).toISOString(),
            completed_at: new Date(r.startedAt + r.durationMs).toISOString(),
          }));

          const { error } = await config.admin
            .from("tenant_tool_invocations")
            .insert(rows);

          if (error) {
            console.error("[unified-executor] Invocation flush failed:", error.message);
          }
        } catch (err) {
          console.error(
            "[unified-executor] Invocation flush error:",
            err instanceof Error ? err.message : "unknown"
          );
        }
      }
    }

    // 2. Flush guardrail events
    if (guardrails && guardrails.events.length > 0 && config.run) {
      try {
        const guardrailRows = guardrails.events.map((e: GuardrailEvent) => ({
          tenant_id: config.tenantId,
          customer_id: config.customerId,
          run_id: config.run!.id,
          agent_id: config.agentId,
          event_kind: e.kind,
          tool_name: e.toolName,
          threshold: e.threshold,
          actual: e.actual,
          action: e.action,
          message: e.message,
          created_at: new Date(e.timestamp).toISOString(),
        }));

        const { error } = await config.admin
          .from("tenant_guardrail_events")
          .insert(guardrailRows);

        if (error) {
          console.error("[unified-executor] Guardrail event flush failed:", error.message);
        }
      } catch (err) {
        console.error(
          "[unified-executor] Guardrail event flush error:",
          err instanceof Error ? err.message : "unknown"
        );
      }
    }

    // 3. Flush telemetry for ALL tools (backward compat with Phase 0 instrumentation)
    try {
      const telemetryRows = records.map((r) => ({
        customer_id: config.customerId,
        event_type: "tool_invocation",
        tool_name: r.toolName,
        latency_ms: r.durationMs,
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_cents: 0,
        error_class: r.errorClass,
        metadata: {
          tenant_id: config.tenantId,
          agent_id: config.agentId ?? null,
          run_id: config.run?.id ?? null,
          worker_kind: config.workerKind,
          success: r.success,
          started_at: new Date(r.startedAt).toISOString(),
          policy_decision: r.policyDecision,
          policy_reason: r.policyReason,
        },
      }));

      const { error } = await config.admin
        .from("telemetry_events")
        .insert(telemetryRows);

      if (error) {
        console.error("[unified-executor] Telemetry flush failed:", error.message);
      }
    } catch (err) {
      console.error(
        "[unified-executor] Telemetry flush error:",
        err instanceof Error ? err.message : "unknown"
      );
    }
  };
}

function resolveInvocationStatus(
  r: UnifiedInvocationRecord
): "completed" | "failed" | "rejected" | "pending" {
  if (r.policyDecision === "denied") return "rejected";
  if (r.policyDecision === "requires_approval") return "pending";
  return r.success ? "completed" : "failed";
}

function safeParseJson(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // noop
  }
  return {};
}
