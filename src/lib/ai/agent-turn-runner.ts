import { generateText, type Tool } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_CONFIG } from "./client";
import { resolveWorkerModels } from "./model-resolver";
import { estimateTokenUsageCostCents, recordTokenUsage } from "./usage-tracker";
import type { AssembledContext } from "./context-assembler";
import { maybeGenerateSummary } from "./session-summarizer";
import { extractBehavioralPatterns } from "./procedural-memory";
import {
  recordConversationTrace,
  extractWebCitations,
  extractDelegationEvents,
} from "./trace-recorder";
import { flushBrowserSessionsForRun } from "./tools/browser";
import {
  createUnifiedToolExecutor,
  registerComposioToolKeyMappings,
  registerMcpToolKeyMappings,
  type UnifiedInvocationRecord,
} from "@/lib/runtime/unified-tool-executor";
import {
  loadGuardrailConfig,
  loadMiddlewareRateLimits,
} from "@/lib/runtime/guardrail-config-loader";
import { createDefaultGuardrailPipeline } from "@/lib/runtime/guardrail-middleware";
import { safeErrorMessage } from "@/lib/security/safe-error";
import type {
  TenantRuntimeWorkerContext,
} from "@/lib/runtime/tenant-runtime-worker";
import type { TenantRole } from "@/types/tenant-runtime";
import type { DelegationToolConfig } from "./tools/delegation";

export interface RunAgentTurnOptions {
  admin: SupabaseClient;
  context: TenantRuntimeWorkerContext;
  actorRole: TenantRole;
  actorId: string | null;
  actorDiscordId: string | null;
  workerKind: "discord_runtime" | "email_runtime";
  assemble: (input: {
    delegationConfig: Omit<
      DelegationToolConfig,
      "admin" | "tenantId" | "customerId" | "parentAgent"
    > &
      Record<string, unknown>;
    fastModel: ReturnType<typeof resolveWorkerModels>["fastModel"];
  }) => Promise<AssembledContext>;
  systemPromptAddendum?: string | null;
  transformTools?: (input: {
    tools: Record<string, Tool>;
    assembled: AssembledContext;
  }) => Record<string, Tool>;
  beforeGenerate?: (input: {
    assembled: AssembledContext;
    resolvedTools: Record<string, Tool>;
    executor: ReturnType<typeof createUnifiedToolExecutor>;
  }) => Promise<void>;
  onStepFinish?: NonNullable<Parameters<typeof generateText>[0]["onStepFinish"]>;
  extraDelegationContext?: Record<string, unknown>;
  maxSteps?: number;
}

export interface RunAgentTurnResult {
  assembled: AssembledContext;
  executor: ReturnType<typeof createUnifiedToolExecutor>;
  resolvedTools: Record<string, Tool>;
  result: Awaited<ReturnType<typeof generateText>>;
  inputTokens: number;
  outputTokens: number;
  estimatedCostCents: number;
  primaryModelId: string;
  primaryModel: ReturnType<typeof resolveWorkerModels>["model"];
  primaryInputCost: number | undefined;
  primaryOutputCost: number | undefined;
  fastModel: ReturnType<typeof resolveWorkerModels>["fastModel"];
  contextWindowTokens: ReturnType<typeof resolveWorkerModels>["contextWindowTokens"];
  startTime: number;
}

export async function runAgentTurn(
  options: RunAgentTurnOptions
): Promise<RunAgentTurnResult> {
  const {
    admin,
    context,
    actorRole,
    actorId,
    actorDiscordId,
  workerKind,
  } = options;
  const {
    model: primaryModel,
    modelId: primaryModelId,
    inputCost: primaryInputCost,
    outputCost: primaryOutputCost,
    contextWindowTokens,
    fastModel,
  } = resolveWorkerModels(context.resolvedModels);
  const startTime = Date.now();

  const delegationConfig: Omit<
    DelegationToolConfig,
    "admin" | "tenantId" | "customerId" | "parentAgent"
  > &
    Record<string, unknown> = {
    currentDepth: 0,
    parentRun: context.run,
    actorRole,
    actorId,
    actorDiscordId,
    workerKind,
    resolvedModels: context.resolvedModels,
    ...(options.extraDelegationContext ?? {}),
  };

  const assembled = await options.assemble({
    delegationConfig,
    fastModel,
  });

  if (options.systemPromptAddendum) {
    assembled.systemPrompt += `\n\n${options.systemPromptAddendum}`;
  }

  let resolvedTools = options.transformTools
    ? options.transformTools({
        tools: assembled.tools,
        assembled,
      })
    : assembled.tools;

  const agentAutonomy = assembled.agent?.config?.autonomy_level;
  const [guardrailConfig, middlewareRateLimits] = await Promise.all([
    loadGuardrailConfig(admin, context.run.tenant_id, assembled.agentId),
    loadMiddlewareRateLimits(admin, context.run.tenant_id, assembled.agentId),
  ]);
  const middlewarePipeline = createDefaultGuardrailPipeline(middlewareRateLimits);

  const executor = createUnifiedToolExecutor({
    admin,
    tenantId: context.run.tenant_id,
    customerId: context.run.customer_id,
    agentId: assembled.agentId,
    run: context.run,
    actorRole,
    actorId,
    workerKind,
    enforcePolicy: true,
    agentAutonomyLevel:
      agentAutonomy === "assisted" ||
      agentAutonomy === "copilot" ||
      agentAutonomy === "autopilot"
        ? agentAutonomy
        : undefined,
    guardrailConfig,
    middlewarePipeline,
  });

  if (assembled.composioKeyMap && assembled.composioKeyMap.size > 0) {
    registerComposioToolKeyMappings(assembled.composioKeyMap);
  }
  if (assembled.mcpKeyMap && assembled.mcpKeyMap.size > 0) {
    registerMcpToolKeyMappings(assembled.mcpKeyMap);
  }

  resolvedTools = executor.wrapAll(resolvedTools);

  delegationConfig.parentGuardrails = executor.guardrails;
  delegationConfig.parentRecords = executor.records as UnifiedInvocationRecord[];
  delegationConfig.parentToolKeys = new Set(Object.keys(resolvedTools));

  if (options.beforeGenerate) {
    await options.beforeGenerate({
      assembled,
      resolvedTools,
      executor,
    });
  }

  const hasTools = Object.keys(resolvedTools).length > 0;
  const result = await generateText({
    model: primaryModel,
    maxOutputTokens: AI_CONFIG.maxOutputTokens,
    temperature: AI_CONFIG.temperature,
    system: assembled.systemPrompt,
    messages: assembled.messages,
    ...(hasTools ? { tools: resolvedTools, maxSteps: options.maxSteps ?? 5 } : {}),
    ...(options.onStepFinish ? { onStepFinish: options.onStepFinish } : {}),
  });

  const inputTokens =
    result.totalUsage?.inputTokens ?? result.usage?.inputTokens ?? 0;
  const outputTokens =
    result.totalUsage?.outputTokens ?? result.usage?.outputTokens ?? 0;
  const estimatedCostCents = estimateTokenUsageCostCents({
    model: primaryModelId,
    inputTokens,
    outputTokens,
    inputCostPerMillion: primaryInputCost,
    outputCostPerMillion: primaryOutputCost,
  });
  const usageGuardrailEvent = executor.guardrails?.recordTokenUsage(
    inputTokens,
    outputTokens,
    estimatedCostCents
  );
  if (usageGuardrailEvent?.action === "halt") {
    console.warn(
      `[${workerKind}] Guardrail halt after model usage: ${usageGuardrailEvent.message}`
    );
  }

  await executor.flush({ requireSuccess: true });

  return {
    assembled,
    executor,
    resolvedTools,
    result,
    inputTokens,
    outputTokens,
    estimatedCostCents,
    primaryModelId,
    primaryModel,
    primaryInputCost,
    primaryOutputCost,
    fastModel,
    contextWindowTokens,
    startTime,
  };
}

export async function recordAgentTurnArtifacts(input: {
  admin: SupabaseClient;
  run: TenantRuntimeWorkerContext["run"];
  assembled: AssembledContext;
  resolvedTools: Record<string, Tool>;
  executor: {
    records: ReadonlyArray<UnifiedInvocationRecord>;
    guardrails: ReturnType<typeof createUnifiedToolExecutor>["guardrails"];
  };
  sessionId: string;
  modelId: string;
  fastModel: RunAgentTurnResult["fastModel"];
  contextWindowTokens?: number;
  startTime: number;
  inputTokens: number;
  outputTokens: number;
  inputCostPerMillion?: number;
  outputCostPerMillion?: number;
  loggerPrefix: string;
  mapInputSummary?: (summary: string) => string;
}): Promise<void> {
  if (input.assembled.memorySettings.autoCompress) {
    maybeGenerateSummary({
      admin: input.admin,
      tenantId: input.run.tenant_id,
      customerId: input.run.customer_id,
      sessionId: input.sessionId,
      agentId: input.assembled.agentId ?? undefined,
      captureLevel: input.assembled.memorySettings.captureLevel,
      excludeCategories: input.assembled.memorySettings.excludeCategories,
      model: input.fastModel,
      contextWindowTokens: input.contextWindowTokens,
    }).catch((err) => {
      console.error(
        `[${input.loggerPrefix}] Session summarization failed:`,
        safeErrorMessage(err)
      );
    });
  }

  extractBehavioralPatterns(input.admin, {
    tenantId: input.run.tenant_id,
    customerId: input.run.customer_id,
    sessionId: input.sessionId,
    recentMessages: input.assembled.messages
      .filter((message) => "role" in message && (message.role === "user" || message.role === "assistant"))
      .map((message) => ({
        role: "role" in message ? String(message.role) : "user",
        content:
          "content" in message && typeof message.content === "string"
            ? message.content
            : "",
      })),
    existingPatterns: [],
    model: input.fastModel,
  }).catch((err) => {
    console.error(
      `[${input.loggerPrefix}] Pattern extraction failed:`,
      safeErrorMessage(err)
    );
  });

  const totalLatencyMs = Date.now() - input.startTime;
  const browserSessions = await flushBrowserSessionsForRun(input.run.id);
  recordConversationTrace(input.admin, {
    tenantId: input.run.tenant_id,
    customerId: input.run.customer_id,
    sessionId: input.sessionId,
    runId: input.run.id,
    agentId: input.assembled.agentId,
    agentName: input.assembled.agentDisplayName,
    toolsAvailable: Object.keys(input.resolvedTools),
    toolsInvoked: input.executor.records.map((record) => ({
      name: record.toolName,
      input_summary: input.mapInputSummary
        ? input.mapInputSummary(record.inputSummary)
        : record.inputSummary,
      output_summary: record.success
        ? record.outputSummary
        : `error: ${record.errorClass}`,
    })),
    memoriesReferenced:
      input.assembled.memoryIds?.map((id) => ({
        id,
        content_preview: "",
        score: 0,
      })) || [],
    knowledgeReferenced:
      input.assembled.knowledgeIds?.map((id) => ({
        id,
        source: "",
        chunk_preview: "",
      })) || [],
    webCitations: extractWebCitations(input.executor.records),
    delegationEvents: extractDelegationEvents(
      input.executor.records,
      input.assembled.agentId ?? "unknown",
      input.assembled.agentDisplayName
    ),
    browserSessions: browserSessions.map((session) => ({
      session_id: session.sessionId,
      action_count: session.actionCount,
      duration_ms: session.durationMs,
      status: session.status,
      urls_visited: session.urlsVisited,
      artifact_count: session.artifactCount,
    })),
    modelId: input.modelId,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    totalLatencyMs,
    guardrailSummary: input.executor.guardrails?.getSummary() ?? null,
  }).catch((err) => {
    console.error(
      `[${input.loggerPrefix}] Trace recording failed:`,
      safeErrorMessage(err)
    );
  });

  await recordTokenUsage(input.admin, {
    tenantId: input.run.tenant_id,
    customerId: input.run.customer_id,
    model: input.modelId,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    inputCostPerMillion: input.inputCostPerMillion,
    outputCostPerMillion: input.outputCostPerMillion,
  }).catch((err) => {
    console.error(
      `[${input.loggerPrefix}] Failed to record usage:`,
      safeErrorMessage(err)
    );
  });
}
