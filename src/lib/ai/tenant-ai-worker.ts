import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { farmclawModel, AI_CONFIG } from "./client";
import { recordTokenUsage } from "./usage-tracker";
import { assembleContext } from "./context-assembler";
import { storeOutboundMessage } from "./message-store";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { maybeGenerateSummary } from "./session-summarizer";
import { parseAttachmentsFromPayload, isImageAttachment } from "./attachment-handler";
import { extractBehavioralPatterns } from "./procedural-memory";
import { recordConversationTrace } from "./trace-recorder";
import {
  sendDiscordChannelMessageSequence,
  buildDiscordRuntimeResponseParts,
  DiscordApiError,
} from "@/lib/runtime/tenant-runtime-discord";
import {
  CircuitBreakerOpenError,
  runWithCircuitBreaker,
} from "@/lib/runtime/tenant-runtime-circuit-breaker";
import { resolveTenantRuntimeGovernancePolicy } from "@/lib/runtime/tenant-runtime-governance";
import type {
  TenantRuntimeWorker,
  TenantRuntimeWorkerContext,
  TenantRuntimeWorkerResult,
} from "@/lib/runtime/tenant-runtime-worker";

const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 30_000;
const DISCORD_BOT_TOKEN_ENV = "DISCORD_BOT_TOKEN";
const MODEL_ID = "claude-sonnet-4-5-20250514";

function getDiscordBotToken(): string {
  const token = process.env[DISCORD_BOT_TOKEN_ENV];
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is not set");
  }
  return token;
}

const CRON_PROMPTS: Record<string, string> = {
  morning_weather:
    "Generate a morning weather briefing for the farm. Include today's forecast, temperature range, wind conditions, precipitation chances, and any severe weather alerts. If there are spray windows available, mention the best ones. Be concise — this is a daily briefing.",
  daily_grain_bids:
    "Generate a daily grain bids summary. Show current cash bids from all configured elevators for each crop the farm grows. Highlight the best bids and any significant basis changes from yesterday. Be concise — this is a daily briefing.",
  evening_ticket_summary:
    "Generate an evening summary of today's scale ticket activity. Show how many loads were delivered today, total bushels by crop, and any notable details. If no tickets were logged today, say so briefly.",
};

interface BriefingSections {
  weather?: boolean;
  grain_bids?: boolean;
  ticket_summary?: boolean;
}

function buildCronPrompt(
  scheduleKey: string | null,
  payload?: Record<string, unknown>
): string {
  if (scheduleKey === "morning_briefing" && payload) {
    const sections = (payload.briefing_sections || {}) as BriefingSections;
    const parts: string[] = [];
    if (sections.weather !== false) {
      parts.push(
        "Include today's weather forecast: temperature range, wind, precipitation, spray windows."
      );
    }
    if (sections.grain_bids !== false) {
      parts.push(
        "Include current cash grain bids from configured elevators, best bids, basis changes."
      );
    }
    if (sections.ticket_summary) {
      parts.push(
        "Include yesterday's scale ticket summary: loads delivered, bushels by crop."
      );
    }
    return `Generate a morning briefing for the farm. ${parts.join(" ")} Be concise — this is a daily briefing.`;
  }

  if (scheduleKey && CRON_PROMPTS[scheduleKey]) {
    return CRON_PROMPTS[scheduleKey];
  }
  return "Generate a proactive update for the farmer based on your specialty.";
}

export function createTenantAiWorker(admin: SupabaseClient): TenantRuntimeWorker {
  return {
    kind: "discord_runtime",
    async execute(context: TenantRuntimeWorkerContext): Promise<TenantRuntimeWorkerResult> {
      try {
        // Spending cap circuit breaker: block LLM calls when paused
        const { data: custRow } = await admin
          .from("customers")
          .select("spending_paused_at")
          .eq("id", context.run.customer_id)
          .single();

        if (custRow?.spending_paused_at) {
          const payload = context.run.payload;
          const channelId =
            typeof payload.channel_id === "string" ? payload.channel_id.trim() : "";
          if (channelId) {
            const botToken = getDiscordBotToken();
            const pauseMessage =
              "Your FarmClaw assistant is currently paused because your monthly spending cap has been reached. " +
              "To resume, increase your spending cap in Settings > Billing, or wait for the next billing cycle.";
            await sendDiscordChannelMessageSequence(
              { botToken, channelId, contents: [pauseMessage] },
              fetch
            ).catch(() => {});
          }
          return {
            outcome: "completed",
            result: { paused: true, reason: "spending_cap_exceeded" },
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

        const botToken = getDiscordBotToken();
        const governance = await resolveTenantRuntimeGovernancePolicy(
          admin,
          context.run.tenant_id
        );

        const startTime = Date.now();

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
        });

        const hasTools = Object.keys(assembled.tools).length > 0;
        const result = await generateText({
          model: farmclawModel,
          maxOutputTokens: AI_CONFIG.maxOutputTokens,
          temperature: AI_CONFIG.temperature,
          system: assembled.systemPrompt,
          messages: assembled.messages,
          ...(hasTools ? { tools: assembled.tools, maxSteps: 5 } : {}),
        });

        const responseText = result.text || "[FarmClaw] No response generated.";

        // Store outbound message
        await storeOutboundMessage(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          sessionId: assembled.sessionId,
          agentId: assembled.agentId,
          content: responseText,
          tokenCount: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
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
            captureLevel: assembled.memorySettings.captureLevel,
            excludeCategories: assembled.memorySettings.excludeCategories,
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
        }).catch((err) => {
          console.error("[ai-worker] Pattern extraction failed:", safeErrorMessage(err));
        });

        // Fire-and-forget: record conversation trace (Feature 7)
        const totalLatencyMs = Date.now() - startTime;
        const toolCalls = result.toolCalls || [];
        recordConversationTrace(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          sessionId: assembled.sessionId,
          runId: context.run.id,
          agentId: assembled.agentId,
          agentName: assembled.agentDisplayName,
          toolsAvailable: Object.keys(assembled.tools),
          toolsInvoked: toolCalls.map((tc) => ({
            name: tc.toolName,
            input_summary: JSON.stringify("args" in tc ? tc.args : {}).slice(0, 200),
            output_summary: "",
          })),
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
          modelId: MODEL_ID,
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
          totalLatencyMs,
        }).catch((err) => {
          console.error("[ai-worker] Trace recording failed:", safeErrorMessage(err));
        });

        // Record token usage for billing
        await recordTokenUsage(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          model: MODEL_ID,
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
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

        const sent = await runWithCircuitBreaker(
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

        return {
          outcome: "completed",
          result: {
            ack: "ai_response_dispatched",
            model: MODEL_ID,
            agent_id: assembled.agentId,
            agent_name: assembled.agentDisplayName,
            session_id: assembled.sessionId,
            input_tokens: result.usage?.inputTokens ?? 0,
            output_tokens: result.usage?.outputTokens ?? 0,
            dispatched_channel_id: channelId,
            dispatched_message_ids: sent.messageIds,
            dispatched_message_parts: sent.partsSent,
            request_trace_id: context.requestTraceId,
            processed_at: new Date().toISOString(),
          },
        };
      } catch (error) {
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
