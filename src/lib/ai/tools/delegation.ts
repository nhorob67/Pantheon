import { z } from "zod";
import { tool, generateText, type Tool } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantAgent, TenantRole, TenantRuntimeRun } from "@/types/tenant-runtime";
import { resolveAgentById } from "../agent-resolver.ts";
import { buildSystemPrompt } from "../system-prompt.ts";
import { resolveToolsForAgent } from "./registry.ts";
import { AI_CONFIG } from "../client.ts";
import { resolveWorkerModels, type ResolvedModels } from "../model-resolver.ts";
import { estimateTokenUsageCostCents } from "../usage-tracker.ts";
import {
  createUnifiedToolExecutor,
  registerComposioToolKeyMappings,
  registerMcpToolKeyMappings,
} from "@/lib/runtime/unified-tool-executor";
import { loadGuardrailConfig } from "@/lib/runtime/guardrail-config-loader";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { toAutonomyLevel } from "@/types/agent";
import { flushBrowserSessionsForRun } from "./browser";
import {
  adjustChildBudget,
  canExposeDelegationTool,
  injectDelegationContext,
  MAX_DELEGATION_DEPTH,
  narrowChildTools,
} from "./delegation-helpers.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of child tool steps within a delegated run */
const CHILD_MAX_STEPS = 3;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface DelegationToolConfig {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  /** The agent that is delegating (parent) */
  parentAgent: TenantAgent;
  /** Current depth of the delegation chain (0 = top-level) */
  currentDepth: number;
  /** Parent run for budget inheritance and trace linkage */
  parentRun: TenantRuntimeRun | null;
  /** Actor context inherited from parent */
  actorRole: TenantRole;
  actorId: string | null;
  actorDiscordId: string | null;
  /** Worker kind for telemetry */
  workerKind: "discord_runtime" | "email_runtime";
  /** Resolved models from parent run */
  resolvedModels?: ResolvedModels;
  /** Parent's guardrail monitor for budget deduction */
  parentGuardrails?: {
    recordTokenUsage: (input: number, output: number, cost?: number) => unknown;
    recordDelegatedInvocations: (count: number) => unknown;
    getSummary: () => {
      totalInvocations: number;
      totalTokens: number;
      totalSpendCents: number;
      elapsedMs: number;
    };
  } | null;
  /** Parent executor records — child records get appended here for trace visibility */
  parentRecords?: Array<{
    toolName: string;
    startedAt: number;
    durationMs: number;
    success: boolean;
    errorClass: string | null;
    inputSummary: string;
    outputSummary: string;
    policyDecision: "allowed" | "denied" | "requires_approval" | "skipped";
    policyReason: string;
    toolId: string | null;
  }>;
  /** Set of tool keys the parent agent has access to (for permission narrowing) */
  parentToolKeys?: Set<string>;
  /** Secret values to redact */
  revealedSecretValues?: string[];
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export function createDelegateTaskTool(config: DelegationToolConfig): Record<string, Tool> {
  // Don't provide the tool if agent can't delegate
  const canDelegate = config.parentAgent.config?.can_delegate === true;
  if (!canExposeDelegationTool(canDelegate, config.currentDepth)) return {};

  return {
    delegate_task: tool({
      description:
        "Delegate a task to another agent on your team. " +
        "Use this when a request falls outside your expertise or when another agent " +
        "is better suited for the task. The target agent will execute the task " +
        "inline and return the result. You can then use the result to continue " +
        "your conversation.",
      inputSchema: z.object({
        agent_id: z.string().describe(
          "The ID of the agent to delegate to. Use config_list_agents to find available agents."
        ),
        task: z.string().describe(
          "A clear description of the task to delegate. Include all relevant context the target agent needs."
        ),
        context: z.string().optional().describe(
          "Additional context or background information to pass to the target agent."
        ),
      }),
      execute: async (args) => {
        return executeDelegation(config, {
          agentId: args.agent_id,
          task: args.task,
          context: args.context,
        });
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

export interface DelegationInput {
  agentId: string;
  task: string;
  context?: string;
}

export interface DelegationResult {
  success: boolean;
  agent_name: string;
  agent_role: string;
  result?: string;
  error?: string;
  tokens_used?: { input: number; output: number };
  tools_invoked?: string[];
  child_run_id?: string | null;
  delegation_depth?: number;
}

export async function executeDelegation(
  config: DelegationToolConfig,
  input: DelegationInput
): Promise<DelegationResult> {
  const { admin, tenantId, customerId, parentAgent, currentDepth, parentRun } = config;

  // 1. Validate depth limit
  if (currentDepth >= MAX_DELEGATION_DEPTH) {
    return {
      success: false,
      agent_name: "unknown",
      agent_role: "unknown",
      error: `Delegation depth limit reached (max ${MAX_DELEGATION_DEPTH} levels). Cannot delegate further.`,
    };
  }

  // 2. Resolve target agent
  const targetAgent = await resolveAgentById(admin, tenantId, input.agentId);
  if (!targetAgent) {
    return {
      success: false,
      agent_name: "unknown",
      agent_role: "unknown",
      error: `Agent "${input.agentId}" not found or not active. Use config_list_agents to see available agents.`,
    };
  }

  // 3. Check can_receive_delegation flag
  const canReceive = targetAgent.config?.can_receive_delegation === true;
  if (!canReceive) {
    return {
      success: false,
      agent_name: targetAgent.display_name,
      agent_role: typeof targetAgent.config?.role === "string" ? targetAgent.config.role : targetAgent.display_name,
      error: `Agent "${targetAgent.display_name}" is not configured to receive delegated tasks. An admin can enable this in agent settings.`,
    };
  }

  // 4. Prevent self-delegation
  if (targetAgent.id === parentAgent.id) {
    return {
      success: false,
      agent_name: targetAgent.display_name,
      agent_role: typeof targetAgent.config?.role === "string" ? targetAgent.config.role : targetAgent.display_name,
      error: "Cannot delegate to yourself. Choose a different agent.",
    };
  }

  // 5. Build child system prompt
  let childSystemPrompt: string;
  try {
    childSystemPrompt = await buildSystemPrompt(admin, targetAgent);
  } catch (err) {
    return {
      success: false,
      agent_name: targetAgent.display_name,
      agent_role: typeof targetAgent.config?.role === "string" ? targetAgent.config.role : targetAgent.display_name,
      error: `Failed to build system prompt for target agent: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }

  // Inject delegation context into system prompt
  childSystemPrompt = injectDelegationContext(childSystemPrompt, parentAgent.display_name, input.task, input.context);

  // 6. Create child run record (if we have a parent run) before resolving child
  // tools so run-scoped tools like browser automation bind to the child run.
  let childRunId: string | null = null;
  let childRun: TenantRuntimeRun | null = null;
  if (parentRun) {
    try {
      const { data } = await admin
        .from("tenant_runtime_runs")
        .insert({
          tenant_id: tenantId,
          customer_id: customerId,
          run_kind: parentRun.run_kind,
          source: "system",
          status: "running",
          request_trace_id: parentRun.request_trace_id,
          parent_run_id: parentRun.id,
          delegation_depth: currentDepth + 1,
          delegation_kind: "sync",
          payload: {
            delegated_by: parentAgent.id,
            delegated_by_name: parentAgent.display_name,
            target_agent_id: targetAgent.id,
            target_agent_name: targetAgent.display_name,
            task: input.task,
            context: input.context ?? null,
          },
          metadata: {
            delegation: true,
            parent_agent_id: parentAgent.id,
            child_agent_id: targetAgent.id,
            depth: currentDepth + 1,
          },
        })
        .select("*")
        .single();
      childRun = data as TenantRuntimeRun | null;
      childRunId = childRun?.id ?? null;
    } catch (err) {
      console.warn("[delegation] Failed to create child run record:", err instanceof Error ? err.message : "unknown");
    }
  }

  // 7. Resolve child tools (with permission narrowing)
  let childTools: Record<string, Tool>;
  try {
    let legacyInstanceId: string | null = null;
    let mcpEnabled = false;
    let secretsEnabled = false;

    const [legacyResult, mcpResult, secretsResult] = await Promise.all([
      resolveCanonicalLegacyInstanceForTenant(admin, tenantId).catch(() => ({ instanceId: null })),
      admin.from("mcp_server_configs").select("id", { count: "exact", head: true }).eq("customer_id", customerId).eq("enabled", true),
      admin.from("tenant_secrets").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    ]);

    legacyInstanceId = legacyResult?.instanceId ?? null;
    mcpEnabled = (mcpResult.count ?? 0) > 0;
    secretsEnabled = (secretsResult.count ?? 0) > 0;

    const childToolResult = await resolveToolsForAgent({
      admin,
      tenantId,
      customerId,
      agent: targetAgent,
      channelId: "",
      runtimeRun: childRun ?? parentRun ?? undefined,
      actorRole: config.actorRole,
      actorId: config.actorId,
      actorDiscordId: config.actorDiscordId,
      legacyInstanceId,
      secretsEnabled,
      revealedSecretValues: config.revealedSecretValues,
      mcpEnabled,
    });
    childTools = childToolResult.tools;
    if (childToolResult.composioKeyMap.size > 0) {
      registerComposioToolKeyMappings(childToolResult.composioKeyMap);
    }
    if (childToolResult.mcpKeyMap.size > 0) {
      registerMcpToolKeyMappings(childToolResult.mcpKeyMap);
    }
  } catch (err) {
    return {
      success: false,
      agent_name: targetAgent.display_name,
      agent_role: typeof targetAgent.config?.role === "string" ? targetAgent.config.role : targetAgent.display_name,
      error: `Failed to resolve tools for target agent: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }

  // Permission narrowing: child tools = intersection of parent and child permissions
  childTools = narrowChildTools(childTools, config.parentToolKeys);

  // Remove delegate_task from child if we'd exceed depth limit
  // (also recursively adds delegate_task for child if depth allows)
  delete childTools.delegate_task;
  if (currentDepth + 1 < MAX_DELEGATION_DEPTH && targetAgent.config?.can_delegate === true) {
    const childDelegationTools = createDelegateTaskTool({
      ...config,
      parentAgent: targetAgent,
      currentDepth: currentDepth + 1,
      parentRun: childRun ?? parentRun,
    });
    Object.assign(childTools, childDelegationTools);
  }

  // 8. Create child unified executor with budget inheritance
  const childAutonomy = toAutonomyLevel(targetAgent.config?.autonomy_level);
  const childGuardrailConfig = await loadGuardrailConfig(admin, tenantId, targetAgent.id);

  // Adjust child budget based on parent's remaining budget
  if (config.parentGuardrails && childGuardrailConfig) {
    const parentSummary = config.parentGuardrails.getSummary();
    Object.assign(childGuardrailConfig, adjustChildBudget(childGuardrailConfig, parentSummary));
  }

  const childExecutor = createUnifiedToolExecutor({
    admin,
    tenantId,
    customerId,
    agentId: targetAgent.id,
    run: childRun ?? parentRun,
    actorRole: config.actorRole,
    actorId: config.actorId,
    workerKind: config.workerKind,
    enforcePolicy: true,
    agentAutonomyLevel:
      childAutonomy === "assisted" || childAutonomy === "copilot" || childAutonomy === "autopilot"
        ? childAutonomy
        : undefined,
    guardrailConfig: childGuardrailConfig,
  });

  childTools = childExecutor.wrapAll(childTools);

  // 9. Execute child run via generateText
  const {
    model: childModel,
    modelId: childModelId,
    inputCost: childInputCost,
    outputCost: childOutputCost,
  } = resolveWorkerModels(config.resolvedModels);
  const hasTools = Object.keys(childTools).length > 0;

  try {
    const result = await generateText({
      model: childModel,
      maxOutputTokens: AI_CONFIG.maxOutputTokens,
      temperature: AI_CONFIG.temperature,
      system: childSystemPrompt,
      messages: [
        { role: "user", content: input.task },
      ],
      ...(hasTools ? { tools: childTools, maxSteps: CHILD_MAX_STEPS } : {}),
    });

    const responseText = result.text?.trim() || "Task completed but no response text was generated.";
    const toolsInvoked = result.steps
      .flatMap((s) => s.toolCalls.map((tc) => tc.toolName))
      .filter((v, i, a) => a.indexOf(v) === i);

    const inputTokens = result.totalUsage?.inputTokens ?? 0;
    const outputTokens = result.totalUsage?.outputTokens ?? 0;
    const estimatedCostCents = estimateTokenUsageCostCents({
      model: childModelId,
      inputTokens,
      outputTokens,
      inputCostPerMillion: childInputCost,
      outputCostPerMillion: childOutputCost,
    });
    await flushBrowserSessionsForRun(childRunId ?? parentRun?.id ?? "");

    // Deduct child tokens from parent budget
    if (config.parentGuardrails) {
      config.parentGuardrails.recordTokenUsage(
        inputTokens,
        outputTokens,
        estimatedCostCents
      );
      config.parentGuardrails.recordDelegatedInvocations(childExecutor.records.length);
    }

    // Append child records to parent for trace visibility
    if (config.parentRecords) {
      for (const r of childExecutor.records) {
        config.parentRecords.push({
          ...r,
          toolName: `[${targetAgent.display_name}] ${r.toolName}`,
        });
      }
    }

    // Flush child executor
    await childExecutor.flush().catch((err: unknown) => {
      console.error("[delegation] Child executor flush failed:", err instanceof Error ? err.message : "unknown");
    });

    // Update child run status
    if (childRunId) {
      try {
        await admin
          .from("tenant_runtime_runs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            result: {
              response_preview: responseText.slice(0, 500),
              tools_invoked: toolsInvoked,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
            },
          })
          .eq("id", childRunId);
      } catch {
        // best-effort
      }
    }

    return {
      success: true,
      agent_name: targetAgent.display_name,
      agent_role: typeof targetAgent.config?.role === "string" ? targetAgent.config.role : targetAgent.display_name,
      result: responseText,
      tokens_used: { input: inputTokens, output: outputTokens },
      tools_invoked: toolsInvoked.length > 0 ? toolsInvoked : undefined,
      child_run_id: childRunId,
      delegation_depth: currentDepth + 1,
    };
  } catch (err) {
    // Flush child executor even on failure
    await childExecutor.flush().catch(() => {});

    // Update child run status
    if (childRunId) {
      try {
        await admin
          .from("tenant_runtime_runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: err instanceof Error ? err.message : "Delegation execution failed",
          })
          .eq("id", childRunId);
      } catch {
        // best-effort
      }
    }

    return {
      success: false,
      agent_name: targetAgent.display_name,
      agent_role: typeof targetAgent.config?.role === "string" ? targetAgent.config.role : targetAgent.display_name,
      error: `Delegation execution failed: ${err instanceof Error ? err.message : "unknown error"}`,
      child_run_id: childRunId,
      delegation_depth: currentDepth + 1,
    };
  }
}

export {
  adjustChildBudget,
  injectDelegationContext,
  MAX_DELEGATION_DEPTH,
  narrowChildTools,
} from "./delegation-helpers.ts";
