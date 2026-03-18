import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_CONFIG } from "./client";
import { estimateTokenUsageCostCents, recordTokenUsage } from "./usage-tracker";
import { assembleContext } from "./context-assembler";
import { storeOutboundMessage } from "./message-store";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { maybeGenerateSummary } from "./session-summarizer";
import { parseAttachmentsFromPayload, isImageAttachment } from "./attachment-handler";
import { extractBehavioralPatterns } from "./procedural-memory";
import { recordConversationTrace, extractWebCitations, extractDelegationEvents } from "./trace-recorder";
import { flushBrowserSessionsForRun } from "./tools/browser";
import { resolveWorkerModels } from "./model-resolver";
import {
  createUnifiedToolExecutor,
  registerComposioToolKeyMappings,
  registerMcpToolKeyMappings,
} from "@/lib/runtime/unified-tool-executor";
import { loadGuardrailConfig, loadMiddlewareRateLimits } from "@/lib/runtime/guardrail-config-loader";
import { createDefaultGuardrailPipeline } from "@/lib/runtime/guardrail-middleware";
import {
  sendDiscordChannelMessage,
  sendDiscordChannelMessageSequence,
  sendDiscordChannelMessageWithFiles,
  sendDiscordTypingIndicator,
  buildDiscordRuntimeResponseParts,
  DiscordApiError,
} from "@/lib/runtime/tenant-runtime-discord";
import { collectPendingFiles } from "./tools/file-create";
import {
  CircuitBreakerOpenError,
  runWithCircuitBreaker,
} from "@/lib/runtime/tenant-runtime-circuit-breaker";
import { checkTrialAndSpendingBlock } from "./trial-guard";
import { buildRedactor } from "@/lib/secrets/redaction";
import { resolveTenantRuntimeGovernancePolicy } from "@/lib/runtime/tenant-runtime-governance";
import type {
  TenantRuntimeWorker,
  TenantRuntimeWorkerContext,
  TenantRuntimeWorkerResult,
} from "@/lib/runtime/tenant-runtime-worker";
import type { TenantRole } from "@/types/tenant-runtime";

const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 30_000;
const DISCORD_BOT_TOKEN_ENV = "DISCORD_BOT_TOKEN";

function getDiscordBotToken(): string {
  const token = process.env[DISCORD_BOT_TOKEN_ENV];
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is not set");
  }
  return token;
}

function resolveActorRole(payload: Record<string, unknown>): TenantRole {
  const value = payload.actor_role;
  if (value === "owner" || value === "admin" || value === "operator" || value === "viewer") {
    return value;
  }
  return "viewer";
}

const CRON_PROMPTS: Record<string, string> = {
  morning_briefing_fallback:
    "Generate a morning operations briefing for the team. Include today's priorities, timing-sensitive items, and any conditions or blockers that could affect execution. Be concise.",
  daily_digest:
    "Generate a daily digest for the team. Highlight important external signals, notable changes since yesterday, and what needs attention today. Be concise.",
  evening_recap:
    "Generate an evening summary of today's activity. Show what was completed, what changed, and any notable details that should carry into tomorrow. If nothing happened, say so briefly.",
  // Legacy keys — kept for existing DB rows until schedule migration completes
  morning_weather:
    "Generate a morning operations briefing for the team. Include today's priorities, timing-sensitive items, and any conditions or blockers that could affect execution. Be concise.",
  daily_market_summary:
    "Generate a daily digest for the team. Highlight important external signals, notable changes since yesterday, and what needs attention today. Be concise.",
  evening_ticket_summary:
    "Generate an evening summary of today's activity. Show what was completed, what changed, and any notable details that should carry into tomorrow. If nothing happened, say so briefly.",
};

interface BriefingSections {
  // Current generic keys
  conditions?: boolean;
  external_updates?: boolean;
  activity_recap?: boolean;
  // Legacy keys — accepted for backward compatibility
  weather?: boolean;
  market_data?: boolean;
  ticket_summary?: boolean;
}

function buildCronPrompt(
  scheduleKey: string | null,
  payload?: Record<string, unknown>
): string {
  // Custom schedules carry their own prompt
  if (payload) {
    const customPrompt = payload.custom_prompt;
    if (typeof customPrompt === "string" && customPrompt.length > 0) {
      return customPrompt;
    }
  }

  if (scheduleKey === "morning_briefing" && payload) {
    const sections = (payload.briefing_sections || {}) as BriefingSections;
    const parts: string[] = [];
    // Accept both new and legacy section keys
    const hasConditions = sections.conditions ?? sections.weather;
    const hasExternalUpdates = sections.external_updates ?? sections.market_data;
    const hasActivityRecap = sections.activity_recap ?? sections.ticket_summary;
    if (hasConditions !== false) {
      parts.push(
        "Include timing-sensitive conditions or external constraints that could affect today's work."
      );
    }
    if (hasExternalUpdates !== false) {
      parts.push(
        "Include relevant external updates, plus any meaningful changes since yesterday."
      );
    }
    if (hasActivityRecap) {
      parts.push(
        "Include a short summary of yesterday's completed work and outstanding follow-ups."
      );
    }
    return `Generate a morning briefing for the team. ${parts.join(" ")} Be concise.`;
  }

  if (scheduleKey && CRON_PROMPTS[scheduleKey]) {
    return CRON_PROMPTS[scheduleKey];
  }
  return "Generate a proactive update for the team based on your role and the current context.";
}

export function createTenantAiWorker(admin: SupabaseClient): TenantRuntimeWorker {
  return {
    kind: "discord_runtime",
    async execute(context: TenantRuntimeWorkerContext): Promise<TenantRuntimeWorkerResult> {
      const { model: primaryModel, modelId: primaryModelId, inputCost: primaryInputCost, outputCost: primaryOutputCost, contextWindowTokens, fastModel } = resolveWorkerModels(context.resolvedModels);
      try {
        // Spending cap + trial expiration circuit breaker
        const { data: custRow } = await admin
          .from("customers")
          .select("spending_paused_at, trial_ends_at, subscription_status")
          .eq("id", context.run.customer_id)
          .single();

        const trialCheck = checkTrialAndSpendingBlock({
          subscription_status: custRow?.subscription_status,
          trial_ends_at: custRow?.trial_ends_at,
          spending_paused_at: custRow?.spending_paused_at,
        });

        if (trialCheck.blocked) {
          const payload = context.run.payload;
          const channelId =
            typeof payload.channel_id === "string" ? payload.channel_id.trim() : "";
          if (channelId && trialCheck.message) {
            const botToken = getDiscordBotToken();
            await sendDiscordChannelMessageSequence(
              { botToken, channelId, contents: [trialCheck.message] },
              fetch
            ).catch(() => {});
          }
          return {
            outcome: "completed",
            result: { paused: true, reason: trialCheck.reason },
          };
        }

        const payload = context.run.payload;
        const channelId =
          typeof payload.channel_id === "string" ? payload.channel_id.trim() : "";
        const content = typeof payload.content === "string" ? payload.content : "";
        const inboundMessageId =
          typeof payload.message_id === "string" ? payload.message_id : null;
        const userId =
          typeof payload.user_id === "string" ? payload.user_id : "unknown";
        const guildId =
          typeof payload.guild_id === "string" ? payload.guild_id : null;
        const actorRole = resolveActorRole(payload);
        const actorId = typeof payload.actor_id === "string" ? payload.actor_id : null;
        const actorDiscordId = typeof payload.actor_discord_id === "string" ? payload.actor_discord_id : null;

        if (!channelId) {
          return {
            outcome: "failed",
            errorMessage: "Missing Discord channel_id in runtime payload",
            result: { failed: true, reason: "missing_channel_id" },
          };
        }

        // Cron messages have synthetic content — replace with a prompt
        const isCron = typeof payload.run_kind === "string" && payload.run_kind === "discord_cron";
        const scheduleKey = typeof payload.schedule_key === "string" ? payload.schedule_key : null;
        const userContent = isCron
          ? buildCronPrompt(scheduleKey, payload)
          : content;

        // Parse attachments from payload
        const attachments = parseAttachmentsFromPayload(payload);
        const imageAttachments = attachments.filter(isImageAttachment);
        const hasAttachments = attachments.length > 0;

        if (!userContent.trim() && !hasAttachments) {
          return {
            outcome: "failed",
            errorMessage: "Missing Discord content in runtime payload",
            result: { failed: true, reason: "missing_content" },
          };
        }

        // Shared array for break-glass secret reveals — populated by reveal_secret tool
        const revealedSecretValues: string[] = [];

        const botToken = getDiscordBotToken();
        const governance = await resolveTenantRuntimeGovernancePolicy(
          admin,
          context.run.tenant_id
        );

        const startTime = Date.now();

        // Mutable delegation context — parentGuardrails/parentRecords/parentToolKeys
        // populated after executor creation (below), before any tool executes.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const delegationCtx: any = {
          currentDepth: 0,
          parentRun: context.run,
          actorRole,
          actorId,
          actorDiscordId,
          workerKind: "discord_runtime" as const,
          resolvedModels: context.resolvedModels,
          revealedSecretValues,
        };

        // Assemble context: resolve agent, build system prompt, persist messages, load history
        const assembled = await assembleContext(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          channelId,
          userId,
          content: userContent || (hasAttachments ? "What's in this image?" : ""),
          messageId: inboundMessageId,
          isDm: !guildId,
          imageUrls: imageAttachments.map((a) => a.url),
          runtimeRun: context.run,
          actorRole,
          actorId,
          actorDiscordId,
          fastModel: fastModel,
          revealedSecretValues,
          // delegationConfig uses a mutable object — parentGuardrails and parentRecords
          // are populated after executor creation (below), before any tool executes.
          delegationConfig: delegationCtx,
        });

        // Custom cron jobs can scope tools to a subset
        let resolvedTools = assembled.tools;
        if (isCron) {
          // Exclude Composio tools from cron runs — they require interactive OAuth context
          const BUILT_IN_PREFIXES = ["memory_", "schedule_", "conversation_"];
          const DELEGATION_TOOLS = ["delegate_task", "delegate_task_async", "delegation_poll", "delegation_cancel"];
          const STANDALONE_TOOLS = ["file_create"];
          const filtered: typeof resolvedTools = {};

          if (Array.isArray(payload.custom_tools) && payload.custom_tools.length > 0) {
            const allowedSkills = new Set(payload.custom_tools as string[]);
            const SKILL_TOOL_PREFIXES: Record<string, string[]> = {};
            const allowedPrefixes = Array.from(allowedSkills).flatMap(
              (s) => SKILL_TOOL_PREFIXES[s] || []
            );
            for (const [name, tool] of Object.entries(resolvedTools)) {
              const isAlwaysAvailable = name.startsWith("memory_") || name.startsWith("schedule_") || DELEGATION_TOOLS.includes(name) || STANDALONE_TOOLS.includes(name);
              const matchesSkill = allowedPrefixes.some((p) => name.startsWith(p));
              if (isAlwaysAvailable || matchesSkill) {
                filtered[name] = tool;
              }
            }
          } else {
            // For standard cron runs, keep all built-in tools but exclude Composio tools
            for (const [name, tool] of Object.entries(resolvedTools)) {
              if (BUILT_IN_PREFIXES.some((p) => name.startsWith(p)) || DELEGATION_TOOLS.includes(name) || STANDALONE_TOOLS.includes(name)) {
                filtered[name] = tool;
              }
            }
          }

          resolvedTools = filtered;
        }

        // Wrap tools with unified executor (policy enforced: denied/approval-required tools blocked)
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
          workerKind: "discord_runtime",
          enforcePolicy: true,
          agentAutonomyLevel:
            agentAutonomy === "assisted" || agentAutonomy === "copilot" || agentAutonomy === "autopilot"
              ? agentAutonomy
              : undefined,
          guardrailConfig,
          middlewarePipeline,
        });
        // Register Composio key mappings so the unified executor can resolve
        // model-facing names (e.g. GITHUB_CREATE_ISSUE) to policy keys (composio.github_create_issue)
        if (assembled.composioKeyMap && assembled.composioKeyMap.size > 0) {
          registerComposioToolKeyMappings(assembled.composioKeyMap);
        }
        if (assembled.mcpKeyMap && assembled.mcpKeyMap.size > 0) {
          registerMcpToolKeyMappings(assembled.mcpKeyMap);
        }

        resolvedTools = executor.wrapAll(resolvedTools);

        // Populate delegation context with executor references (captured by closure)
        delegationCtx.parentGuardrails = executor.guardrails;
        delegationCtx.parentRecords = executor.records as unknown[];
        delegationCtx.parentToolKeys = new Set(Object.keys(resolvedTools));

        const hasTools = Object.keys(resolvedTools).length > 0;

        // Show typing indicator while generating
        await sendDiscordTypingIndicator(botToken, channelId);

        const sentIntermediateTexts: string[] = [];

        const result = await generateText({
          model: primaryModel,
          maxOutputTokens: AI_CONFIG.maxOutputTokens,
          temperature: AI_CONFIG.temperature,
          system: assembled.systemPrompt,
          messages: assembled.messages,
          ...(hasTools ? { tools: resolvedTools, maxSteps: 5 } : {}),
          onStepFinish: async (step) => {
            // Send intermediate text when: step has text AND more steps follow AND not a cron run
            if (
              isCron ||
              step.finishReason !== "tool-calls" ||
              !step.text?.trim()
            ) {
              return;
            }

            let intermediateText = step.text.trim();

            // Redact secrets if any were revealed
            if (revealedSecretValues.length > 0) {
              const stepRedactor = buildRedactor(revealedSecretValues);
              intermediateText = stepRedactor(intermediateText);
            }

            // Fire-and-forget: send progress to Discord (no reply, reserved for final)
            sendDiscordChannelMessage(
              {
                botToken,
                channelId,
                content: intermediateText.slice(0, 1900),
              },
              fetch
            ).catch((err) => {
              console.error("[ai-worker] Intermediate Discord send failed:", safeErrorMessage(err));
            });

            // Refresh typing indicator for next step
            sendDiscordTypingIndicator(botToken, channelId).catch(() => {});

            sentIntermediateTexts.push(intermediateText);
          },
        });

        // Capture multi-step messages for history reconstruction
        const responseMessages = result.response?.messages ?? [];
        const inputTokens = result.totalUsage?.inputTokens ?? 0;
        const outputTokens = result.totalUsage?.outputTokens ?? 0;
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
          console.warn(`[ai-worker] Guardrail halt after model usage: ${usageGuardrailEvent.message}`);
        }

        let responseText = result.text?.trim() || "";

        // Fallback when maxSteps exhausted on a tool-call step with no final text.
        // Build a contextual summary from tool invocation records instead of
        // just listing tool names.
        if (!responseText) {
          const successfulRecords = executor.records.filter((r) => r.success);
          if (successfulRecords.length > 0) {
            const summaryParts = successfulRecords.map((r) => {
              const label = r.toolName.replace(/_/g, " ");
              // Use the output summary (truncated JSON) for context if available
              const output = r.outputSummary?.trim();
              if (output && output !== "{}" && output !== "null") {
                // Extract a human-readable snippet from the output (first 120 chars)
                const snippet = output.length > 120
                  ? `${output.slice(0, 117).trimEnd()}...`
                  : output;
                return `- **${label}**: ${snippet}`;
              }
              return `- **${label}**: completed`;
            });
            responseText = `Done — here's what I did:\n${summaryParts.join("\n")}`;
          } else {
            const allToolNames = result.steps
              .flatMap((s) => s.toolCalls.map((tc) => tc.toolName));
            if (allToolNames.length > 0) {
              responseText = `I attempted ${[...new Set(allToolNames)].map((n) => n.replace(/_/g, " ")).join(", ")} but wasn't able to produce a final result. Let me know if you'd like me to try again.`;
            } else {
              responseText = "I wasn't able to generate a response for that. Could you try rephrasing?";
            }
          }
        }

        // Post-turn redaction: strip revealed secret values from stored text
        const redactor = revealedSecretValues.length > 0
          ? buildRedactor(revealedSecretValues)
          : null;
        if (redactor) {
          responseText = redactor(responseText);
        }

        // Store outbound message
        await storeOutboundMessage(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          sessionId: assembled.sessionId,
          agentId: assembled.agentId,
          content: responseText,
          tokenCount: inputTokens + outputTokens,
          toolCalls: responseMessages.length > 0
            ? responseMessages.map((m) => m as Record<string, unknown>)
            : undefined,
        }).catch((err) => {
          console.error("[ai-worker] Failed to store outbound message:", safeErrorMessage(err));
        });

        // Fire-and-forget session summarization (non-blocking, gated on autoCompress)
        if (assembled.memorySettings.autoCompress) {
          maybeGenerateSummary({
            admin,
            tenantId: context.run.tenant_id,
            customerId: context.run.customer_id,
            sessionId: assembled.sessionId,
            agentId: assembled.agentId ?? undefined,
            captureLevel: assembled.memorySettings.captureLevel,
            excludeCategories: assembled.memorySettings.excludeCategories,
            model: fastModel,
            contextWindowTokens,
          }).catch((err) => {
            console.error("[ai-worker] Session summarization failed:", safeErrorMessage(err));
          });
        }

        // Fire-and-forget: extract behavioral patterns (Feature 6)
        extractBehavioralPatterns(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          sessionId: assembled.sessionId,
          recentMessages: assembled.messages
            .filter((m) => "role" in m && (m.role === "user" || m.role === "assistant"))
            .map((m) => ({
              role: "role" in m ? String(m.role) : "user",
              content: "content" in m && typeof m.content === "string" ? m.content : "",
            })),
          existingPatterns: [],
          model: fastModel,
        }).catch((err) => {
          console.error("[ai-worker] Pattern extraction failed:", safeErrorMessage(err));
        });

        // Fire-and-forget: flush unified tool executor (invocations + telemetry)
        executor.flush().catch((err) => {
          console.error("[ai-worker] Unified executor flush failed:", safeErrorMessage(err));
        });

        // Fire-and-forget: record conversation trace (Feature 7)
        const totalLatencyMs = Date.now() - startTime;
        const browserSessions = await flushBrowserSessionsForRun(context.run.id);
        recordConversationTrace(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          sessionId: assembled.sessionId,
          runId: context.run.id,
          agentId: assembled.agentId,
          agentName: assembled.agentDisplayName,
          toolsAvailable: Object.keys(resolvedTools),
          toolsInvoked: executor.records.map((r) => {
            let inputSummary = r.inputSummary;
            if (redactor) inputSummary = redactor(inputSummary);
            return {
              name: r.toolName,
              input_summary: inputSummary,
              output_summary: r.success ? r.outputSummary : `error: ${r.errorClass}`,
            };
          }),
          memoriesReferenced: assembled.memoryIds?.map((id) => ({
            id,
            content_preview: "",
            score: 0,
          })) || [],
          knowledgeReferenced: assembled.knowledgeIds?.map((id) => ({
            id,
            source: "",
            chunk_preview: "",
          })) || [],
          webCitations: extractWebCitations(executor.records),
          delegationEvents: extractDelegationEvents(
            executor.records,
            assembled.agentId ?? "unknown",
            assembled.agentDisplayName
          ),
          browserSessions: browserSessions.map((session) => ({
            session_id: session.sessionId,
            action_count: session.actionCount,
            duration_ms: session.durationMs,
            status: session.status,
            urls_visited: session.urlsVisited,
            artifact_count: session.artifactCount,
          })),
          modelId: primaryModelId,
          inputTokens,
          outputTokens,
          totalLatencyMs,
          guardrailSummary: executor.guardrails?.getSummary() ?? null,
        }).catch((err) => {
          console.error("[ai-worker] Trace recording failed:", safeErrorMessage(err));
        });

        // Record token usage for billing
        await recordTokenUsage(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          model: primaryModelId,
          inputTokens,
          outputTokens,
          inputCostPerMillion: primaryInputCost,
          outputCostPerMillion: primaryOutputCost,
        }).catch((err) => {
          console.error("[ai-worker] Failed to record usage:", safeErrorMessage(err));
        });

        // Send to Discord
        const responseParts = buildDiscordRuntimeResponseParts(responseText);
        const timeoutFetch: typeof fetch = async (url, init) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), governance.dispatch_timeout_ms);
          try {
            return await fetch(url, { ...init, signal: controller.signal });
          } finally {
            clearTimeout(timeout);
          }
        };

        // Collect any files created by file_create tool during this run
        const pendingFiles = context.run?.id ? collectPendingFiles(context.run.id) : [];

        let sent: { messageIds: string[]; partsSent: number };

        if (pendingFiles.length > 0) {
          // Send text + file attachments together via multipart
          const attachmentText = responseParts.join("\n\n");
          sent = await runWithCircuitBreaker(
            `discord_dispatch:${context.run.tenant_id}`,
            async () => {
              const result = await sendDiscordChannelMessageWithFiles(
                {
                  botToken,
                  channelId,
                  content: attachmentText.slice(0, 1900),
                  files: pendingFiles.map((f) => ({
                    name: f.fileName,
                    data: f.data,
                    contentType: f.contentType,
                  })),
                  replyToMessageId: inboundMessageId,
                },
                timeoutFetch
              );
              return {
                messageIds: result.messageId ? [result.messageId] : [],
                partsSent: 1,
              };
            },
            {
              failureThreshold: CIRCUIT_FAILURE_THRESHOLD,
              cooldownMs: CIRCUIT_COOLDOWN_MS,
            }
          );
        } else {
          // Standard text-only send
          sent = await runWithCircuitBreaker(
            `discord_dispatch:${context.run.tenant_id}`,
            () =>
              sendDiscordChannelMessageSequence(
                {
                  botToken,
                  channelId,
                  contents: responseParts,
                  replyToMessageId: inboundMessageId,
                },
                timeoutFetch
              ),
            {
              failureThreshold: CIRCUIT_FAILURE_THRESHOLD,
              cooldownMs: CIRCUIT_COOLDOWN_MS,
            }
          );
        }

        return {
          outcome: "completed",
          result: {
            ack: "ai_response_dispatched",
            model: primaryModelId,
            agent_id: assembled.agentId,
            agent_name: assembled.agentDisplayName,
            session_id: assembled.sessionId,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            dispatched_channel_id: channelId,
            dispatched_message_ids: sent.messageIds,
            dispatched_message_parts: sent.partsSent,
            response_preview: responseText.slice(0, 500),
            request_trace_id: context.requestTraceId,
            processed_at: new Date().toISOString(),
          },
        };
      } catch (error) {
        await flushBrowserSessionsForRun(context.run.id).catch(() => []);
        const rateLimitError = error instanceof DiscordApiError && error.status === 429;
        const retryAfterSeconds =
          error instanceof DiscordApiError ? error.retryAfterSeconds : null;
        return {
          outcome: "failed",
          errorMessage: safeErrorMessage(error, "AI worker dispatch failed"),
          result: {
            failed: true,
            circuit_breaker_open: error instanceof CircuitBreakerOpenError,
            circuit_breaker_retry_after_ms:
              error instanceof CircuitBreakerOpenError ? error.retryAfterMs : null,
            discord_status: error instanceof DiscordApiError ? error.status : null,
            discord_rate_limited: rateLimitError,
            discord_retry_after_seconds: retryAfterSeconds,
            processed_at: new Date().toISOString(),
          },
        };
      }
    },
  };
}
