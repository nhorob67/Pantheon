import { generateText, type Tool } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRole, TenantRuntimeRun } from "@/types/tenant-runtime";
import { resolveAgentById } from "./agent-resolver";
import { buildSystemPrompt } from "./system-prompt";
import { resolveToolsForAgent } from "./tools/registry";
import {
  injectDelegationContext,
  narrowChildTools,
  createDelegateTaskTool,
  MAX_DELEGATION_DEPTH,
} from "./tools/delegation";
import { AI_CONFIG } from "./client";
import { resolveWorkerModels, type ResolvedModels } from "./model-resolver";
import { estimateTokenUsageCostCents, recordTokenUsage } from "./usage-tracker";
import {
  createUnifiedToolExecutor,
  registerComposioToolKeyMappings,
  registerMcpToolKeyMappings,
} from "@/lib/runtime/unified-tool-executor";
import {
  loadDelegationBudgetConfig,
  loadGuardrailConfig,
  loadMiddlewareRateLimits,
} from "@/lib/runtime/guardrail-config-loader";
import { createDefaultGuardrailPipeline } from "@/lib/runtime/guardrail-middleware";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { toAutonomyLevel } from "@/types/agent";
import { recordConversationTrace, extractDelegationEvents, extractWebCitations } from "./trace-recorder";
import { flushBrowserSessionsForRun } from "./tools/browser";
import {
  accountAsyncDelegationBudget,
  getTenantRuntimeRunById,
} from "@/lib/runtime/tenant-runtime-queue";
import { readMetadataNumber } from "@/lib/runtime/async-delegation-utils";

/** Maximum tool steps for async delegation (slightly more than sync) */
const ASYNC_CHILD_MAX_STEPS = 5;

function isTenantRole(value: unknown): value is TenantRole {
  return value === "owner" || value === "admin" || value === "operator" || value === "viewer";
}

export interface TenantRuntimeWorker {
  kind: string;
  execute(context: TenantRuntimeWorkerContext): Promise<TenantRuntimeWorkerResult>;
}

export interface TenantRuntimeWorkerContext {
  run: TenantRuntimeRun;
  requestTraceId: string | null;
  resolvedModels: ResolvedModels;
}

export interface TenantRuntimeWorkerResult {
  outcome: "completed" | "failed";
  result?: Record<string, unknown>;
  errorMessage?: string;
}

/**
 * Creates a worker for delegation_runtime runs.
 * Extracts task/agent from payload, resolves tools with permission narrowing,
 * executes generateText, and stores result — does NOT send to Discord.
 */
export function createDelegationAiWorker(admin: SupabaseClient): TenantRuntimeWorker {
  return {
    kind: "delegation_runtime",
    async execute(context: TenantRuntimeWorkerContext): Promise<TenantRuntimeWorkerResult> {
      const { run } = context;
      const payload = run.payload;
      const startTime = Date.now();

      const targetAgentId = payload.target_agent_id as string | undefined;
      const task = payload.task as string | undefined;
      const taskContext = payload.context as string | null | undefined;
      const parentAgentId =
        typeof payload.delegated_by === "string"
          ? payload.delegated_by
          : typeof run.metadata.parent_agent_id === "string"
            ? run.metadata.parent_agent_id
            : null;
      const parentAgentName = payload.delegated_by_name as string | undefined;
      const parentToolKeysArr = payload.parent_tool_keys as string[] | undefined;
      const actorRole = isTenantRole(payload.actor_role) ? payload.actor_role : "operator";
      const actorId = typeof payload.actor_id === "string" ? payload.actor_id : null;
      const actorDiscordId =
        typeof payload.actor_discord_id === "string" ? payload.actor_discord_id : null;
      const workerKind =
        payload.worker_kind === "email_runtime" ? "email_runtime" : "discord_runtime";

      if (!targetAgentId || !task) {
        return {
          outcome: "failed",
          errorMessage: "Missing target_agent_id or task in delegation payload",
          result: { failed: true, reason: "invalid_payload" },
        };
      }

      // Resolve target agent
      const targetAgent = await resolveAgentById(admin, run.tenant_id, targetAgentId);
      if (!targetAgent) {
        return {
          outcome: "failed",
          errorMessage: `Delegation target agent "${targetAgentId}" not found`,
          result: { failed: true, reason: "agent_not_found" },
        };
      }

      // Build system prompt with delegation context
      let systemPrompt: string;
      try {
        systemPrompt = await buildSystemPrompt(admin, targetAgent);
      } catch (err) {
        return {
          outcome: "failed",
          errorMessage: `Failed to build system prompt: ${err instanceof Error ? err.message : "unknown"}`,
          result: { failed: true, reason: "prompt_build_failed" },
        };
      }

      systemPrompt = injectDelegationContext(
        systemPrompt,
        parentAgentName ?? "Parent Agent",
        task,
        taskContext ?? undefined
      );

      // Resolve tools
      let childTools: Record<string, Tool>;
      try {
        let legacyInstanceId: string | null = null;
        let mcpEnabled = false;
        let secretsEnabled = false;

        const [legacyResult, mcpResult, secretsResult] = await Promise.all([
          resolveCanonicalLegacyInstanceForTenant(admin, run.tenant_id).catch(() => ({ instanceId: null })),
          admin.from("mcp_server_configs").select("id", { count: "exact", head: true }).eq("customer_id", run.customer_id).eq("enabled", true),
          admin.from("tenant_secrets").select("id", { count: "exact", head: true }).eq("tenant_id", run.tenant_id),
        ]);

        legacyInstanceId = legacyResult?.instanceId ?? null;
        mcpEnabled = (mcpResult.count ?? 0) > 0;
        secretsEnabled = (secretsResult.count ?? 0) > 0;

        const childToolResult = await resolveToolsForAgent({
          admin,
          tenantId: run.tenant_id,
          customerId: run.customer_id,
          agent: targetAgent,
          channelId: "",
          runtimeRun: run,
          actorRole,
          actorId,
          actorDiscordId,
          legacyInstanceId,
          secretsEnabled,
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
          outcome: "failed",
          errorMessage: `Failed to resolve tools: ${err instanceof Error ? err.message : "unknown"}`,
          result: { failed: true, reason: "tool_resolution_failed" },
        };
      }

      // Permission narrowing
      const parentToolKeys = parentToolKeysArr ? new Set(parentToolKeysArr) : undefined;
      childTools = narrowChildTools(childTools, parentToolKeys);

      // Handle nested delegation
      delete childTools.delegate_task;
      delete childTools.delegate_task_async;
      delete childTools.delegation_poll;
      delete childTools.delegation_cancel;

      if (
        run.delegation_depth < MAX_DELEGATION_DEPTH &&
        targetAgent.config?.can_delegate === true
      ) {
        const nestedDelegationTools = createDelegateTaskTool({
          admin,
          tenantId: run.tenant_id,
          customerId: run.customer_id,
          parentAgent: targetAgent,
          currentDepth: run.delegation_depth,
          parentRun: run,
          actorRole,
          actorId,
          actorDiscordId,
          workerKind,
          resolvedModels: context.resolvedModels,
        });
        Object.assign(childTools, nestedDelegationTools);
      }

      // Create executor with guardrails
      const childAutonomy = toAutonomyLevel(targetAgent.config?.autonomy_level);
      const guardrailConfig = await loadGuardrailConfig(admin, run.tenant_id, targetAgent.id);
      if (run.parent_run_id && parentAgentId) {
        const [parentRun, delegationBudget] = await Promise.all([
          getTenantRuntimeRunById(admin, run.parent_run_id),
          loadDelegationBudgetConfig(admin, run.tenant_id, parentAgentId),
        ]);
        const reservedDelegationSpend = readMetadataNumber(
          run.metadata,
          "reserved_delegation_spend_cents"
        );
        const accountedDelegationSpend = readMetadataNumber(
          parentRun?.metadata,
          "async_delegation_spend_cents"
        );
        const remainingDelegationSpend = Math.max(
          0,
          delegationBudget.maxDelegationSpendCents - accountedDelegationSpend
        );

        if (remainingDelegationSpend <= 0) {
          return {
            outcome: "failed",
            errorMessage: "Parent delegation spend budget has been exhausted.",
            result: { failed: true, reason: "delegation_budget_exhausted" },
          };
        }

        guardrailConfig.maxSpendCents = Math.min(
          guardrailConfig.maxSpendCents,
          reservedDelegationSpend > 0 ? reservedDelegationSpend : remainingDelegationSpend
        );
      }

      const middlewareRateLimits = await loadMiddlewareRateLimits(admin, run.tenant_id, targetAgent.id);
      const middlewarePipeline = createDefaultGuardrailPipeline(middlewareRateLimits);
      const executor = createUnifiedToolExecutor({
        admin,
        tenantId: run.tenant_id,
        customerId: run.customer_id,
        agentId: targetAgent.id,
        run,
        actorRole,
        actorId,
        workerKind,
        enforcePolicy: true,
        agentAutonomyLevel:
          childAutonomy === "assisted" || childAutonomy === "copilot" || childAutonomy === "autopilot"
            ? childAutonomy
            : undefined,
        guardrailConfig,
        middlewarePipeline,
      });

      childTools = executor.wrapAll(childTools);

      // Execute
      const {
        model: childModel,
        modelId: childModelId,
        inputCost: childInputCost,
        outputCost: childOutputCost,
      } = resolveWorkerModels(context.resolvedModels);
      const hasTools = Object.keys(childTools).length > 0;

      try {
        const result = await generateText({
          model: childModel,
          maxOutputTokens: AI_CONFIG.maxOutputTokens,
          temperature: AI_CONFIG.temperature,
          system: systemPrompt,
          messages: [{ role: "user", content: task }],
          ...(hasTools ? { tools: childTools, maxSteps: ASYNC_CHILD_MAX_STEPS } : {}),
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
        const usageGuardrailEvent = executor.guardrails?.recordTokenUsage(
          inputTokens,
          outputTokens,
          estimatedCostCents
        );
        if (usageGuardrailEvent?.action === "halt") {
          console.warn(
            `[delegation-worker] Guardrail halt after model usage: ${usageGuardrailEvent.message}`
          );
        }

        // Flush executor
        await executor.flush().catch((err: unknown) => {
          console.error("[delegation-worker] Executor flush failed:", err instanceof Error ? err.message : "unknown");
        });

        // Record usage to api_usage for billing
        await recordTokenUsage(admin, {
          tenantId: run.tenant_id,
          customerId: run.customer_id,
          model: childModelId,
          inputTokens,
          outputTokens,
          inputCostPerMillion: childInputCost,
          outputCostPerMillion: childOutputCost,
        }).catch((err: unknown) => {
          console.error("[delegation-worker] Failed to record usage:", err instanceof Error ? err.message : "unknown");
        });

        if (run.parent_run_id) {
          await accountAsyncDelegationBudget(admin, {
            parentRunId: run.parent_run_id,
            childRunId: run.id,
            inputTokens,
            outputTokens,
            estimatedCostCents,
          });
        }

        // Record trace
        try {
          const webCitations = extractWebCitations(executor.records);
          const delegationEvents = extractDelegationEvents(
            executor.records,
            targetAgent.id,
            targetAgent.display_name
          );
          const browserSessions = await flushBrowserSessionsForRun(run.id);

          await recordConversationTrace(admin, {
            tenantId: run.tenant_id,
            customerId: run.customer_id,
            sessionId: `delegation-${run.id}`,
            runId: run.id,
            agentId: targetAgent.id,
            agentName: targetAgent.display_name,
            toolsAvailable: Object.keys(childTools),
            toolsInvoked: executor.records.map((r) => ({
              name: r.toolName,
              input_summary: r.inputSummary,
              output_summary: r.outputSummary,
            })),
            memoriesReferenced: [],
            knowledgeReferenced: [],
            webCitations,
            delegationEvents: delegationEvents.length > 0 ? delegationEvents : undefined,
            browserSessions: browserSessions.map((session) => ({
              session_id: session.sessionId,
              action_count: session.actionCount,
              duration_ms: session.durationMs,
              status: session.status,
              urls_visited: session.urlsVisited,
              artifact_count: session.artifactCount,
            })),
            modelId: childModelId,
            inputTokens,
            outputTokens,
            totalLatencyMs: Date.now() - startTime,
            guardrailSummary: executor.guardrails?.getSummary() ?? null,
          });
        } catch (err) {
          console.warn("[delegation-worker] Trace recording failed:", err instanceof Error ? err.message : "unknown");
        }

        return {
          outcome: "completed",
          result: {
            response_text: responseText,
            response_preview: responseText.slice(0, 500),
            tools_invoked: toolsInvoked,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            estimated_cost_cents: estimatedCostCents,
            target_agent_name: targetAgent.display_name,
            target_agent_id: targetAgent.id,
          },
        };
      } catch (err) {
        await flushBrowserSessionsForRun(run.id).catch(() => []);
        await executor.flush().catch(() => {});

        return {
          outcome: "failed",
          errorMessage: `Delegation execution failed: ${err instanceof Error ? err.message : "unknown error"}`,
          result: {
            failed: true,
            reason: "execution_error",
            target_agent_name: targetAgent.display_name,
          },
        };
      }
    },
  };
}
