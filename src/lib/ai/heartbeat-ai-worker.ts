import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_CONFIG } from "./client";
import { recordTokenUsage } from "./usage-tracker";
import { resolveWorkerModels } from "./model-resolver";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { markHeartbeatRunDeliveryStatus } from "@/lib/heartbeat/processor";
import { evaluateHeartbeatOutputGuardrails } from "@/lib/heartbeat/guardrails";
import {
  sendDiscordChannelMessageSequence,
  buildDiscordRuntimeResponseParts,
} from "@/lib/runtime/tenant-runtime-discord";
import {
  CircuitBreakerOpenError,
  runWithCircuitBreaker,
} from "@/lib/runtime/tenant-runtime-circuit-breaker";
import { checkTrialAndSpendingBlock } from "./trial-guard";
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
const HEARTBEAT_OUTPUT_EXCERPT_LIMIT = 180;

function getDiscordBotToken(): string {
  const token = process.env[DISCORD_BOT_TOKEN_ENV];
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is not set");
  }
  return token;
}

function truncateHeartbeatExcerpt(value: string): string {
  const normalized = value.trim();
  if (normalized.length <= HEARTBEAT_OUTPUT_EXCERPT_LIMIT) {
    return normalized;
  }

  return `${normalized.slice(0, HEARTBEAT_OUTPUT_EXCERPT_LIMIT - 1)}...`;
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
        // Spending cap + trial expiration check
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
          return {
            outcome: "completed",
            result: { paused: true, reason: trialCheck.reason },
          };
        }

        const payload = context.run.payload;
        const channelId =
          typeof payload.channel_id === "string" ? payload.channel_id.trim() : "";
        const signalSummaries = Array.isArray(payload.signal_summaries)
          ? (payload.signal_summaries as string[])
          : [];
        const signalData = payload.signal_data ?? {};
        const issueContexts = Array.isArray(payload.issue_contexts)
          ? payload.issue_contexts
          : [];
        const heartbeatInstructions =
          typeof payload.heartbeat_instructions === "string"
            ? payload.heartbeat_instructions.trim()
            : "";
        const teamName = typeof payload.team_name === "string" ? payload.team_name : "the team";
        const testMode = payload.test_mode === true;
        let promptRef: Record<string, unknown> | null = null;

        if (!channelId) {
          return {
            outcome: "failed",
            errorMessage: "Missing Discord channel_id in heartbeat payload",
            result: { failed: true, reason: "missing_channel_id" },
          };
        }

        // Build focused heartbeat prompt — no conversation history
        const systemPrompt = [
          `You are a proactive monitoring assistant for ${teamName}.`,
          "You periodically check for items that need attention and surface actionable information.",
          testMode
            ? "This run is a synthetic delivery test requested by an operator. Clearly label it as a test and do not imply there is a real issue."
            : "Be direct and practical. This is a check-in, not a conversation.",
          testMode
            ? "Keep the message short and confirm that delivery is working."
            : "When an issue is marked as new, unresolved, or worsened, preserve that framing in the alert.",
          "Format as a brief alert — use bullet points for multiple items.",
          "Do NOT include greetings or sign-offs. Just the actionable information.",
          heartbeatInstructions ? `Additional heartbeat instructions: ${heartbeatInstructions}` : "",
        ].join(" ");

        const userPrompt = [
          testMode
            ? "This is a synthetic heartbeat delivery test. No live issue is being reported."
            : "The following items need attention:",
          "",
          ...signalSummaries.map((s) => `- ${s}`),
          "",
          "Issue context:",
          JSON.stringify(issueContexts, null, 2),
          "",
          "Signal details:",
          JSON.stringify(signalData, null, 2),
          "",
          "Compose a brief, practical alert for the team.",
        ].join("\n");
        promptRef = {
          system_chars: systemPrompt.length,
          user_chars: userPrompt.length,
          signal_summary_count: signalSummaries.length,
          issue_context_count: issueContexts.length,
          test_mode: testMode,
        };

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

        const responseText = result.text || "[Pantheon] Heartbeat check completed with no summary.";
        const outputGuardrail = evaluateHeartbeatOutputGuardrails(responseText);

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

        if (outputGuardrail.blocked) {
          if (heartbeatRunId) {
            await markHeartbeatRunDeliveryStatus(
              admin,
              heartbeatRunId,
              "suppressed",
              {
                request_trace_id: context.requestTraceId,
                model_id: heartbeatModelId,
                prompt_ref: promptRef,
                output_ref: {
                  output_chars: responseText.length,
                  output_excerpt: truncateHeartbeatExcerpt(responseText),
                  processed_at: new Date().toISOString(),
                },
                guardrail_ref: outputGuardrail.metadata,
                failure_ref: null,
                test_mode: testMode,
              },
              outputGuardrail.reason
            );
          }

          return {
            outcome: "completed",
            result: {
              blocked: true,
              ack: "heartbeat_alert_blocked_guardrail",
              reason: outputGuardrail.reason,
              model: heartbeatModelId,
              input_tokens: result.usage?.inputTokens ?? 0,
              output_tokens: result.usage?.outputTokens ?? 0,
              request_trace_id: context.requestTraceId,
              processed_at: new Date().toISOString(),
            },
          };
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

        if (heartbeatRunId) {
          await markHeartbeatRunDeliveryStatus(admin, heartbeatRunId, "dispatched", {
            request_trace_id: context.requestTraceId,
            model_id: heartbeatModelId,
            prompt_ref: promptRef,
            output_ref: {
              output_chars: responseText.length,
              output_excerpt: truncateHeartbeatExcerpt(responseText),
              dispatched_channel_id: channelId,
              dispatched_message_ids: sent.messageIds,
              dispatched_message_parts: sent.partsSent,
              processed_at: new Date().toISOString(),
            },
            failure_ref: null,
            test_mode: testMode,
          });
        }

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
        const heartbeatRunId = typeof context.run.payload.heartbeat_run_id === "string"
          ? context.run.payload.heartbeat_run_id
          : null;
        const safeMessage = safeErrorMessage(error, "Heartbeat AI worker dispatch failed");
        if (heartbeatRunId) {
          await markHeartbeatRunDeliveryStatus(admin, heartbeatRunId, "dispatch_failed", {
            request_trace_id: context.requestTraceId,
            failure_ref: {
              error_message: safeMessage,
              circuit_breaker_open: error instanceof CircuitBreakerOpenError,
              discord_rate_limited: error instanceof DiscordApiError && error.status === 429,
              processed_at: new Date().toISOString(),
            },
          });
        }

        return {
          outcome: "failed",
          errorMessage: safeMessage,
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
