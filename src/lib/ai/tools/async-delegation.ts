import { z } from "zod";
import { tool, type Tool } from "ai";
import type { TenantRuntimeRunStatus } from "@/types/tenant-runtime";
import { resolveAgentById } from "../agent-resolver.ts";
import {
  type DelegationToolConfig,
  MAX_DELEGATION_DEPTH,
} from "./delegation.ts";
import { loadDelegationBudgetConfig } from "@/lib/runtime/guardrail-config-loader";
import {
  enqueueAsyncDelegationRun,
  listChildRunsByParent,
  getTenantRuntimeRunById,
  reserveAsyncDelegationBudget,
  releaseAsyncDelegationBudgetReservation,
  transitionTenantRuntimeRun,
} from "@/lib/runtime/tenant-runtime-queue";
import { processRuntimeRun } from "@/trigger/process-runtime-run";
import { isChildBudgetAccountedToParent } from "@/lib/runtime/async-delegation-utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_DEADLINE_MINUTES = 5;
const MAX_POLL_IDS = 10;

// ---------------------------------------------------------------------------
// Tool factories
// ---------------------------------------------------------------------------

export function createDelegateTaskAsyncTool(config: DelegationToolConfig): Record<string, Tool> {
  const canDelegate = config.parentAgent.config?.can_delegate === true;
  if (!canDelegate) return {};
  if (config.currentDepth >= MAX_DELEGATION_DEPTH) return {};

  return {
    delegate_task_async: tool({
      description:
        "Enqueue an asynchronous task for another agent. Returns immediately with a delegation_id " +
        "that you can poll with delegation_poll. Use this for tasks that can run in the background " +
        "or when you want to fan out work to multiple agents concurrently.",
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
        deadline_minutes: z.number().min(1).max(30).optional().describe(
          "Maximum time (in minutes) for the child to complete. Defaults to 5."
        ),
      }),
      execute: async (args) => {
        return executeAsyncDelegation(config, {
          agentId: args.agent_id,
          task: args.task,
          context: args.context,
          deadlineMinutes: args.deadline_minutes,
        });
      },
    }),
  };
}

export function createDelegationPollTool(config: DelegationToolConfig): Record<string, Tool> {
  const canDelegate = config.parentAgent.config?.can_delegate === true;
  if (!canDelegate) return {};

  return {
    delegation_poll: tool({
      description:
        "Check the status and collect results of one or more async delegations. " +
        "Pass the delegation_ids returned by delegate_task_async.",
      inputSchema: z.object({
        delegation_ids: z
          .array(z.string())
          .min(1)
          .max(MAX_POLL_IDS)
          .describe("Array of delegation run IDs to check (max 10)."),
      }),
      execute: async (args) => {
        return executeDelegationPoll(config, args.delegation_ids);
      },
    }),
  };
}

export function createDelegationCancelTool(config: DelegationToolConfig): Record<string, Tool> {
  const canDelegate = config.parentAgent.config?.can_delegate === true;
  if (!canDelegate) return {};

  return {
    delegation_cancel: tool({
      description:
        "Cancel an in-progress async delegation. The child run will be marked as canceled.",
      inputSchema: z.object({
        delegation_id: z
          .string()
          .describe("The delegation run ID to cancel."),
      }),
      execute: async (args) => {
        return executeDelegationCancel(config, args.delegation_id);
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

interface AsyncDelegationInput {
  agentId: string;
  task: string;
  context?: string;
  deadlineMinutes?: number;
}

async function executeAsyncDelegation(
  config: DelegationToolConfig,
  input: AsyncDelegationInput
) {
  const { admin, tenantId, customerId, parentAgent, currentDepth, parentRun } = config;

  // Validate depth
  if (currentDepth >= MAX_DELEGATION_DEPTH) {
    return {
      success: false,
      error: `Delegation depth limit reached (max ${MAX_DELEGATION_DEPTH} levels). Cannot delegate further.`,
    };
  }

  // Must have a parent run for async delegation
  if (!parentRun) {
    return {
      success: false,
      error: "Async delegation requires a parent run context.",
    };
  }

  // Resolve target agent
  const targetAgent = await resolveAgentById(admin, tenantId, input.agentId);
  if (!targetAgent) {
    return {
      success: false,
      error: `Agent "${input.agentId}" not found or not active. Use config_list_agents to see available agents.`,
    };
  }

  // Check can_receive_delegation
  if (targetAgent.config?.can_receive_delegation !== true) {
    return {
      success: false,
      error: `Agent "${targetAgent.display_name}" is not configured to receive delegated tasks.`,
    };
  }

  // Prevent self-delegation
  if (targetAgent.id === parentAgent.id) {
    return {
      success: false,
      error: "Cannot delegate to yourself. Choose a different agent.",
    };
  }

  // Check fan-out limit: count active children
  const [activeChildren, delegationBudget] = await Promise.all([
    listChildRunsByParent(admin, parentRun.id, ["queued", "running", "awaiting_approval"]),
    loadDelegationBudgetConfig(admin, tenantId, parentAgent.id),
  ]);
  const maxConcurrent = delegationBudget.maxConcurrentDelegations;

  if (activeChildren.length >= maxConcurrent) {
    return {
      success: false,
      error: `Fan-out limit reached (${maxConcurrent} concurrent delegations max). Wait for existing delegations to complete or cancel some.`,
    };
  }

  // Compute deadline
  const deadlineMinutes = input.deadlineMinutes ?? DEFAULT_DEADLINE_MINUTES;
  const deadlineAt = new Date(Date.now() + deadlineMinutes * 60 * 1000).toISOString();

  // Collect parent tool keys for permission narrowing
  const parentToolKeys = config.parentToolKeys
    ? Array.from(config.parentToolKeys)
    : undefined;

  // Enqueue
  const childRun = await enqueueAsyncDelegationRun(admin, {
    tenantId,
    customerId,
    parentRunId: parentRun.id,
    delegationDepth: currentDepth + 1,
    deadlineAt,
    requestTraceId: parentRun.request_trace_id,
    payload: {
      delegated_by: parentAgent.id,
      delegated_by_name: parentAgent.display_name,
      target_agent_id: targetAgent.id,
      target_agent_name: targetAgent.display_name,
      task: input.task,
      context: input.context ?? null,
      parent_tool_keys: parentToolKeys,
      actor_role: config.actorRole,
      actor_id: config.actorId ?? null,
      actor_discord_id: config.actorDiscordId ?? null,
      worker_kind: config.workerKind,
    },
    metadata: {
      parent_agent_id: parentAgent.id,
      child_agent_id: targetAgent.id,
      depth: currentDepth + 1,
      max_concurrent_delegations: maxConcurrent,
      max_delegation_spend_cents: delegationBudget.maxDelegationSpendCents,
      actor_role: config.actorRole,
      actor_id: config.actorId ?? null,
      actor_discord_id: config.actorDiscordId ?? null,
      worker_kind: config.workerKind,
    },
  });

  const reservationCents = Math.max(
    1,
    Math.ceil(delegationBudget.maxDelegationSpendCents / Math.max(1, maxConcurrent))
  );
  try {
    await reserveAsyncDelegationBudget(admin, {
      parentRunId: parentRun.id,
      childRunId: childRun.id,
      maxTotalCostCents: delegationBudget.maxDelegationSpendCents,
      reservedCostCents: reservationCents,
    });
  } catch (error) {
    await transitionTenantRuntimeRun(admin, childRun, "cancel").catch(() => {});
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Delegation budget reservation failed.",
    };
  }

  // Trigger processing via Trigger.dev
  try {
    await processRuntimeRun.trigger({ runId: childRun.id });
  } catch (err) {
    console.error("[async-delegation] Failed to trigger child run:", err instanceof Error ? err.message : "unknown");
    // Run is queued — it will be picked up by normal queue processing
  }

  return {
    success: true,
    delegation_id: childRun.id,
    target_agent: targetAgent.display_name,
    target_agent_id: targetAgent.id,
    status: "queued",
    deadline_at: deadlineAt,
    delegation_depth: currentDepth + 1,
  };
}

interface PollResult {
  delegation_id: string;
  status: string;
  target_agent?: string;
  result?: string;
  error?: string;
  tokens_used?: { input: number; output: number };
  tools_invoked?: string[];
  estimated_cost_cents?: number;
  budget_accounted?: boolean;
}

async function executeDelegationPoll(
  config: DelegationToolConfig,
  delegationIds: string[]
): Promise<{ delegations: PollResult[] }> {
  const { admin, parentRun } = config;
  const results: PollResult[] = [];

  for (const delegationId of delegationIds.slice(0, MAX_POLL_IDS)) {
    const childRun = await getTenantRuntimeRunById(admin, delegationId);

    if (!childRun) {
      results.push({ delegation_id: delegationId, status: "not_found", error: "Delegation not found." });
      continue;
    }

    // Security: only parent's own children
    if (parentRun && childRun.parent_run_id !== parentRun.id) {
      results.push({ delegation_id: delegationId, status: "not_found", error: "Delegation not found." });
      continue;
    }

    const targetAgentName = childRun.payload?.target_agent_name as string | undefined;

    switch (childRun.status) {
      case "completed": {
        const resultData = childRun.result || {};
        const responseText = (resultData.response_text ?? resultData.response_preview ?? "") as string;
        const inputTokens = (resultData.input_tokens ?? 0) as number;
        const outputTokens = (resultData.output_tokens ?? 0) as number;
        const toolsInvoked = resultData.tools_invoked as string[] | undefined;
        const estimatedCostCents = (resultData.estimated_cost_cents ?? 0) as number;
        const alreadyAccounted = isChildBudgetAccountedToParent(
          childRun.metadata,
          parentRun?.id ?? null
        );

        results.push({
          delegation_id: delegationId,
          status: "completed",
          target_agent: targetAgentName,
          result: responseText,
          tokens_used: { input: inputTokens, output: outputTokens },
          tools_invoked: toolsInvoked,
          estimated_cost_cents: estimatedCostCents,
          budget_accounted: alreadyAccounted,
        });
        break;
      }

      case "failed": {
        results.push({
          delegation_id: delegationId,
          status: "failed",
          target_agent: targetAgentName,
          error: childRun.error_message ?? "Delegation failed.",
        });
        break;
      }

      case "canceled": {
        results.push({
          delegation_id: delegationId,
          status: "canceled",
          target_agent: targetAgentName,
        });
        break;
      }

      case "queued":
      case "running":
      case "awaiting_approval": {
        // Check deadline
        if (childRun.deadline_at && new Date(childRun.deadline_at).getTime() < Date.now()) {
          // Timed out — cancel
          try {
            await transitionTenantRuntimeRun(admin, childRun, "cancel");
          } catch {
            // May have already transitioned
          }
          results.push({
            delegation_id: delegationId,
            status: "timed_out",
            target_agent: targetAgentName,
            error: "Delegation exceeded its deadline and was canceled.",
          });
        } else {
          results.push({
            delegation_id: delegationId,
            status: childRun.status === "awaiting_approval" ? "awaiting_approval" : "running",
            target_agent: targetAgentName,
          });
        }
        break;
      }

      default: {
        results.push({
          delegation_id: delegationId,
          status: childRun.status,
          target_agent: targetAgentName,
        });
      }
    }
  }

  return { delegations: results };
}

async function executeDelegationCancel(
  config: DelegationToolConfig,
  delegationId: string
) {
  const { admin, parentRun } = config;

  const childRun = await getTenantRuntimeRunById(admin, delegationId);
  if (!childRun) {
    return { success: false, error: "Delegation not found." };
  }

  // Security: only parent's own children
  if (parentRun && childRun.parent_run_id !== parentRun.id) {
    return { success: false, error: "Delegation not found." };
  }

  const terminalStatuses: TenantRuntimeRunStatus[] = ["completed", "failed", "canceled"];
  if (terminalStatuses.includes(childRun.status)) {
    return {
      success: false,
      error: `Cannot cancel delegation — already ${childRun.status}.`,
    };
  }

  try {
    await transitionTenantRuntimeRun(admin, childRun, "cancel");
    if (childRun.parent_run_id) {
      await releaseAsyncDelegationBudgetReservation(admin, {
        parentRunId: childRun.parent_run_id,
        childRunId: childRun.id,
      }).catch(() => {});
    }
    return {
      success: true,
      delegation_id: delegationId,
      status: "canceled",
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to cancel: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}
