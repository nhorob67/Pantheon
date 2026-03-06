import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_CONFIG } from "./client";
import { recordTokenUsage } from "./usage-tracker";
import { resolveWorkerModels } from "./model-resolver";
import { safeErrorMessage } from "@/lib/security/safe-error";
import {
  sendDiscordChannelMessageSequence,
  buildDiscordRuntimeResponseParts,
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
import { DiscordApiError } from "@/lib/runtime/tenant-runtime-discord";

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

export function createHeartbeatAiWorker(admin: SupabaseClient): TenantRuntimeWorker {
  return {
    kind: "discord_heartbeat",
    async execute(context: TenantRuntimeWorkerContext): Promise<TenantRuntimeWorkerResult> {
      const { fastModel, model: primaryModel, modelId, inputCost, outputCost } =
        resolveWorkerModels(context.resolvedModels);

      // Use fast model for heartbeat to minimize cost
      const heartbeatModel = fastModel ?? primaryModel;
      const heartbeatModelId = fastModel ? (context.resolvedModels?.fast.modelId ?? modelId) : modelId;
      const heartbeatInputCost = fastModel ? context.resolvedModels?.fast.inputCostPerMillion : inputCost;
      const heartbeatOutputCost = fastModel ? context.resolvedModels?.fast.outputCostPerMillion : outputCost;

      try {
        const payload = context.run.payload;
        const channelId =
          typeof payload.channel_id === "string" ? payload.channel_id.trim() : "";
        const signalSummaries = Array.isArray(payload.signal_summaries)
          ? (payload.signal_summaries as string[])
          : [];
        const signalData = payload.signal_data ?? {};
        const farmName = typeof payload.farm_name === "string" ? payload.farm_name : "the farm";

        if (!channelId) {
          return {
            outcome: "failed",
            errorMessage: "Missing Discord channel_id in heartbeat payload",
            result: { failed: true, reason: "missing_channel_id" },
          };
        }

        // Build focused heartbeat prompt — no conversation history
        const systemPrompt = [
          `You are a proactive farm monitoring assistant for ${farmName}.`,
          "You periodically check weather, grain markets, scale tickets, and email for items that need the farmer's attention.",
          "Be direct and practical. This is a check-in, not a conversation.",
          "Format as a brief alert — use bullet points for multiple items.",
          "Do NOT include greetings or sign-offs. Just the actionable information.",
        ].join(" ");

        const userPrompt = [
          "The following items need attention:",
          "",
          ...signalSummaries.map((s) => `- ${s}`),
          "",
          "Signal details:",
          JSON.stringify(signalData, null, 2),
          "",
          "Compose a brief, practical alert for the farmer.",
        ].join("\n");

        const botToken = getDiscordBotToken();
        const governance = await resolveTenantRuntimeGovernancePolicy(
          admin,
          context.run.tenant_id
        );

        const result = await generateText({
          model: heartbeatModel,
          maxOutputTokens: 512,
          temperature: AI_CONFIG.temperature,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });

        const responseText = result.text || "[FarmClaw] Heartbeat check completed with no summary.";

        // Record token usage
        await recordTokenUsage(admin, {
          tenantId: context.run.tenant_id,
          customerId: context.run.customer_id,
          model: heartbeatModelId,
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
          inputCostPerMillion: heartbeatInputCost,
          outputCostPerMillion: heartbeatOutputCost,
        }).catch((err) => {
          console.error("[heartbeat-worker] Failed to record usage:", safeErrorMessage(err));
        });

        // Update the heartbeat run row with token usage
        const heartbeatRunId = typeof payload.heartbeat_run_id === "string"
          ? payload.heartbeat_run_id
          : null;
        if (heartbeatRunId) {
          const { error: updateErr } = await admin
            .from("tenant_heartbeat_runs")
            .update({
              tokens_used: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
              runtime_run_id: context.run.id,
            })
            .eq("id", heartbeatRunId);
          if (updateErr) {
            console.error("[heartbeat-worker] Failed to update heartbeat run:", safeErrorMessage(updateErr));
          }
        }

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
              { botToken, channelId, contents: responseParts },
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
            ack: "heartbeat_alert_dispatched",
            model: heartbeatModelId,
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
        return {
          outcome: "failed",
          errorMessage: safeErrorMessage(error, "Heartbeat AI worker dispatch failed"),
          result: {
            failed: true,
            circuit_breaker_open: error instanceof CircuitBreakerOpenError,
            discord_rate_limited: error instanceof DiscordApiError && error.status === 429,
            processed_at: new Date().toISOString(),
          },
        };
      }
    },
  };
}
